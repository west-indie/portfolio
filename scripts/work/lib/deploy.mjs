import { spawnSync } from 'node:child_process';
import { validateWorkEntries } from './validate.mjs';
import { isGitRepository, runGit, changedPathsFromPorcelain } from './git.mjs';
import { readProjectFile } from './store.mjs';

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function isAllowedPath(filePath) {
  const normalized = normalizePath(filePath);
  if (normalized.startsWith('src/content/projects/') && normalized.endsWith('.md')) return true;
  if (normalized === 'src/content/projects/_tags.json') return true;
  if (normalized === 'src/content/projects/_entry-templates.json') return true;
  if (normalized.startsWith('public/images/projects/')) return true;
  if (normalized.startsWith('public/video/projects/')) return true;
  return false;
}

function runCommand(command, args, { cwd = process.cwd(), dryRun = false, label = null } = {}) {
  const printable = `${command} ${args.join(' ')}`;
  if (dryRun) {
    return {
      ok: true,
      stdout: '',
      stderr: '',
      status: 0,
      error: '',
      command: printable,
      skipped: true,
      label: label || printable,
    };
  }

  let executedCommand = printable;
  let result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  const normalizedCommand = String(command || '').trim().toLowerCase();
  const isWindowsNpmCommand = process.platform === 'win32'
    && (normalizedCommand === 'npm' || normalizedCommand === 'npm.cmd');
  const shouldRetryWithCmd = isWindowsNpmCommand
    && result.error
    && ['EINVAL', 'EPERM', 'ENOENT'].includes(String(result.error.code || '').toUpperCase());

  if (shouldRetryWithCmd) {
    const fallbackShell = process.env.ComSpec || 'cmd.exe';
    const fallbackLine = `npm ${args.join(' ')}`;
    result = spawnSync(fallbackShell, ['/d', '/s', '/c', fallbackLine], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    executedCommand = `${fallbackShell} /d /s /c ${fallbackLine}`;
  }

  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  return {
    ok: result.status === 0,
    stdout,
    stderr,
    status: Number.isFinite(result.status) ? result.status : 1,
    error: result.error ? String(result.error?.message || result.error) : '',
    command: executedCommand,
    label: label || printable,
  };
}

function commandFailureMessage(summary, result = {}) {
  const detail = String(
    result.error
    || result.stderr
    || result.stdout
    || '',
  ).trim();
  return detail ? `${summary}\n${detail}` : summary;
}

function parseNameStatusLines(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      return {
        status: String(parts[0] || '').trim(),
        filePath: normalizePath(String(parts[1] || '').trim()),
      };
    })
    .filter((row) => row.filePath);
}

async function resolveCommitMessage({ cwd }) {
  const stagedProjectRows = parseNameStatusLines(runGit(['diff', '--cached', '--name-status', '--', 'src/content/projects'], { cwd }).stdout)
    .filter((row) => row.filePath.endsWith('.md'));

  if (stagedProjectRows.length === 1 && stagedProjectRows[0].status.startsWith('A')) {
    const only = stagedProjectRows[0];
    try {
      const parsed = await readProjectFile(`${cwd}/${only.filePath}`);
      const slug = String(parsed.data?.slug || '').trim() || only.filePath.split('/').pop().replace(/\.md$/, '');
      const year = String(parsed.data?.year || '').trim() || 'unknown';
      return `work: add ${slug} (${year})`;
    } catch {
      return 'work: update portfolio entries';
    }
  }

  return 'work: update portfolio entries';
}

function collectScopedChangedPaths(cwd) {
  const status = runGit(['status', '--porcelain'], { cwd, allowFailure: true });
  if (!status.ok) return [];
  return changedPathsFromPorcelain(status.stdout)
    .map(normalizePath)
    .filter((filePath) => isAllowedPath(filePath));
}

function collectStagedPaths(cwd) {
  const staged = runGit(['diff', '--cached', '--name-only'], { cwd, allowFailure: true });
  if (!staged.ok) return [];
  return String(staged.stdout || '')
    .split(/\r?\n/)
    .map((line) => normalizePath(line.trim()))
    .filter(Boolean);
}

function assertOnlyAllowedStaged(cwd) {
  const staged = collectStagedPaths(cwd);
  const disallowed = staged.filter((filePath) => !isAllowedPath(filePath));
  if (disallowed.length > 0) {
    throw new Error(`Unrelated staged files detected: ${disallowed.join(', ')}`);
  }
  return staged;
}

export async function runDeployWorkflow({
  cwd = process.cwd(),
  remote = 'origin',
  dryRun = false,
  skipLint = false,
  skipTest = false,
  skipBuild = false,
  noPreflight = false,
  categoryDefinitions = null,
} = {}) {
  if (!isGitRepository(cwd)) {
    throw new Error('Not inside a git repository.');
  }

  const logs = [];

  if (!noPreflight) {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const validation = await validateWorkEntries({
      mode: 'changed',
      root: cwd,
      categoryDefinitions,
    });
    logs.push(`validate: checked=${validation.checkedFiles.length} errors=${validation.errors.length} warnings=${validation.warnings.length}`);
    if (!validation.ok) {
      throw new Error('Deploy blocked: validation failed. Run `work validate --changed` for details.');
    }

    if (!skipLint) {
      const lintResult = runCommand(npmCommand, ['run', 'lint'], { cwd, dryRun, label: 'npm run lint' });
      logs.push(lintResult.label);
      if (!lintResult.ok) throw new Error(commandFailureMessage('Deploy blocked: lint failed.', lintResult));
    }

    if (!skipTest) {
      const testResult = runCommand(npmCommand, ['test', '--', '--run'], { cwd, dryRun, label: 'npm test -- --run' });
      logs.push(testResult.label);
      if (!testResult.ok) throw new Error(commandFailureMessage('Deploy blocked: tests failed.', testResult));
    }

    if (!skipBuild) {
      const buildResult = runCommand(npmCommand, ['run', 'build'], { cwd, dryRun, label: 'npm run build' });
      logs.push(buildResult.label);
      if (!buildResult.ok) throw new Error(commandFailureMessage('Deploy blocked: build failed.', buildResult));
    }
  }

  assertOnlyAllowedStaged(cwd);

  const scopedChanged = collectScopedChangedPaths(cwd);
  if (scopedChanged.length === 0) {
    throw new Error('No scoped work/media changes found to deploy.');
  }

  const stageArgs = ['add', '-A', '--', ...scopedChanged];
  if (dryRun) {
    logs.push(`git ${stageArgs.join(' ')}`);
  } else {
    runGit(stageArgs, { cwd });
    logs.push(`git ${stageArgs.join(' ')}`);
  }

  const stagedAfterAdd = dryRun ? scopedChanged : assertOnlyAllowedStaged(cwd);
  if (stagedAfterAdd.length === 0) {
    throw new Error('No staged scoped changes after git add.');
  }

  const commitMessage = await resolveCommitMessage({ cwd });
  if (dryRun) {
    logs.push(`git commit -m "${commitMessage}"`);
  } else {
    runGit(['commit', '-m', commitMessage], { cwd });
    logs.push(`git commit -m "${commitMessage}"`);
  }

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd }).stdout.trim();
  if (!branch || branch === 'HEAD') {
    throw new Error('Detached HEAD is not deployable.');
  }

  const upstreamProbe = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { cwd, allowFailure: true });
  const hasUpstream = upstreamProbe.ok;
  const pushArgs = hasUpstream
    ? ['push', remote, branch]
    : ['push', '--set-upstream', remote, branch];

  if (dryRun) {
    logs.push(`git ${pushArgs.join(' ')}`);
  } else {
    runGit(pushArgs, { cwd });
    logs.push(`git ${pushArgs.join(' ')}`);
  }

  return {
    ok: true,
    branch,
    remote,
    dryRun,
    commitMessage,
    staged: stagedAfterAdd,
    logs,
  };
}
