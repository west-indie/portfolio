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
      command: printable,
      skipped: true,
      label: label || printable,
    };
  }

  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  return {
    ok: result.status === 0,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    status: result.status,
    command: printable,
    label: label || printable,
  };
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
} = {}) {
  if (!isGitRepository(cwd)) {
    throw new Error('Not inside a git repository.');
  }

  const logs = [];

  if (!noPreflight) {
    const validation = await validateWorkEntries({ mode: 'changed', root: cwd });
    logs.push(`validate: checked=${validation.checkedFiles.length} errors=${validation.errors.length} warnings=${validation.warnings.length}`);
    if (!validation.ok) {
      throw new Error('Deploy blocked: validation failed. Run `work validate --changed` for details.');
    }

    if (!skipLint) {
      const lintResult = runCommand('npm', ['run', 'lint'], { cwd, dryRun, label: 'npm run lint' });
      logs.push(lintResult.label);
      if (!lintResult.ok) throw new Error('Deploy blocked: lint failed.');
    }

    if (!skipTest) {
      const testResult = runCommand('npm', ['test', '--', '--run'], { cwd, dryRun, label: 'npm test -- --run' });
      logs.push(testResult.label);
      if (!testResult.ok) throw new Error('Deploy blocked: tests failed.');
    }

    if (!skipBuild) {
      const buildResult = runCommand('npm', ['run', 'build'], { cwd, dryRun, label: 'npm run build' });
      logs.push(buildResult.label);
      if (!buildResult.ok) throw new Error('Deploy blocked: build failed.');
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
