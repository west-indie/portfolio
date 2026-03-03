import { spawnSync } from 'node:child_process';

export function runGit(args, { cwd = process.cwd(), allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  const out = {
    ok: result.status === 0,
    status: result.status,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    command: `git ${args.join(' ')}`,
  };

  if (!allowFailure && !out.ok) {
    const detail = `${out.command}\n${out.stderr || out.stdout}`.trim();
    throw new Error(detail || `${out.command} failed`);
  }
  return out;
}

export function isGitRepository(cwd = process.cwd()) {
  const probe = runGit(['rev-parse', '--is-inside-work-tree'], { cwd, allowFailure: true });
  return probe.ok && probe.stdout.trim() === 'true';
}

export function parsePorcelainPath(rawPath) {
  const trimmed = String(rawPath || '').trim();
  if (!trimmed) return '';
  const renameParts = trimmed.split('->');
  if (renameParts.length > 1) {
    return renameParts[renameParts.length - 1].trim().replace(/^"|"$/g, '');
  }
  return trimmed.replace(/^"|"$/g, '');
}

export function changedPathsFromPorcelain(stdout) {
  const lines = String(stdout || '').split(/\r?\n/).filter(Boolean);
  const out = [];
  for (const line of lines) {
    if (line.length < 4) continue;
    const pathPart = line.slice(3);
    const filePath = parsePorcelainPath(pathPart);
    if (!filePath) continue;
    out.push(filePath);
  }
  return out;
}
