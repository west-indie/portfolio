#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWorkEntry } from './work/lib/create.mjs';
import { runDeployWorkflow } from './work/lib/deploy.mjs';
import { formatValidationReport, validateWorkEntries } from './work/lib/validate.mjs';
import { runDashboard } from './work/ui/dashboard.mjs';
import { runCreateWizard } from './work/ui/create-wizard.mjs';

function printUsage() {
  console.log('Usage: work <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  work                         Launch Ink dashboard (TTY only)');
  console.log('  work create [--from file] [--dry-run] [--replace]');
  console.log('  work validate [--changed|--all] [--json]');
  console.log('  work deploy [--remote origin] [--dry-run] [--skip-lint] [--skip-test] [--skip-build] [--no-preflight]');
}

function parseArgs(argv) {
  const flags = new Map();
  const values = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] || '');
    if (!token.startsWith('--')) {
      values.push(token);
      continue;
    }

    const [name, inlineValue] = token.split('=', 2);
    if (inlineValue !== undefined) {
      flags.set(name, inlineValue);
      continue;
    }

    const next = argv[index + 1];
    if (next && !String(next).startsWith('--')) {
      flags.set(name, String(next));
      index += 1;
    } else {
      flags.set(name, 'true');
    }
  }

  return { flags, values };
}

function readBooleanFlag(flags, key, fallback = false) {
  if (!flags.has(key)) return fallback;
  const value = String(flags.get(key) || '').trim().toLowerCase();
  if (!value) return true;
  if (['true', '1', 'yes', 'on'].includes(value)) return true;
  if (['false', '0', 'no', 'off'].includes(value)) return false;
  return true;
}

async function runCreateCommand(rest) {
  const { flags } = parseArgs(rest);
  const dryRun = readBooleanFlag(flags, '--dry-run', false);
  const replace = readBooleanFlag(flags, '--replace', false);
  const fromPath = flags.get('--from');

  if (fromPath) {
    const absolute = path.resolve(process.cwd(), fromPath);
    const source = await fs.readFile(absolute, 'utf8');
    const payload = JSON.parse(source);
    const report = await createWorkEntry({
      input: payload,
      root: process.cwd(),
      dryRun,
      replace,
    });

    console.log(`created: ${report.relativeFilePath}`);
    report.mediaOperations.forEach((operation) => {
      console.log(`media:${operation.kind}: ${operation.source} -> ${operation.destination}`);
    });

    if (dryRun) {
      console.log('--- dry-run markdown preview ---');
      console.log(report.markdown.trim());
      console.log('--- end preview ---');
    }

    return;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('work create in non-interactive mode requires --from <json-file>.');
  }

  await runCreateWizard({
    onSubmit: async (input) => createWorkEntry({
      input,
      root: process.cwd(),
      dryRun,
      replace,
    }),
    onCancel: () => {},
  });
}

async function runValidateCommand(rest) {
  const { flags } = parseArgs(rest);
  const mode = flags.has('--all') ? 'all' : 'changed';
  const asJson = readBooleanFlag(flags, '--json', false);

  const report = await validateWorkEntries({ mode, root: process.cwd() });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatValidationReport(report, process.cwd()));
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

async function runDeployCommand(rest) {
  const { flags } = parseArgs(rest);

  const result = await runDeployWorkflow({
    cwd: process.cwd(),
    remote: String(flags.get('--remote') || 'origin').trim() || 'origin',
    dryRun: readBooleanFlag(flags, '--dry-run', false),
    skipLint: readBooleanFlag(flags, '--skip-lint', false),
    skipTest: readBooleanFlag(flags, '--skip-test', false),
    skipBuild: readBooleanFlag(flags, '--skip-build', false),
    noPreflight: readBooleanFlag(flags, '--no-preflight', false),
  });

  result.logs.forEach((line) => console.log(line));
  console.log(`deploy: ${result.dryRun ? 'dry-run complete' : `pushed ${result.branch} -> ${result.remote}`}`);
}

async function runInteractiveDashboard() {
  let lastRun = null;

  while (true) {
    const action = await runDashboard({ lastRun });
    if (action === 'quit') {
      return;
    }

    try {
      if (action === 'create') {
        await runCreateCommand([]);
        lastRun = {
          status: 'ok',
          title: 'Create',
          when: new Date().toLocaleTimeString(),
          lines: ['Create wizard closed.'],
        };
        continue;
      }

      if (action === 'validate') {
        const report = await validateWorkEntries({ mode: 'changed', root: process.cwd() });
        lastRun = {
          status: report.ok ? 'ok' : 'error',
          title: `Validate (--changed): ${report.ok ? 'PASS' : 'FAIL'}`,
          when: new Date().toLocaleTimeString(),
          lines: formatValidationReport(report, process.cwd()).split('\n'),
        };
        continue;
      }

      if (action === 'deploy') {
        const result = await runDeployWorkflow({
          cwd: process.cwd(),
          remote: 'origin',
          dryRun: false,
          skipLint: false,
          skipTest: false,
          skipBuild: false,
          noPreflight: false,
        });
        lastRun = {
          status: 'ok',
          title: `Deploy: pushed ${result.branch} -> ${result.remote}`,
          when: new Date().toLocaleTimeString(),
          lines: result.logs,
        };
        continue;
      }

      return;
    } catch (error) {
      lastRun = {
        status: 'error',
        title: 'Command Failed',
        when: new Date().toLocaleTimeString(),
        lines: [String(error?.message || error)],
      };
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const [command, ...rest] = argv;

  if (!command) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      printUsage();
      process.exitCode = 1;
      return;
    }
    await runInteractiveDashboard();
    return;
  }

  if (['--help', '-h', 'help'].includes(command)) {
    printUsage();
    return;
  }

  if (command === 'create') {
    await runCreateCommand(rest);
    return;
  }

  if (command === 'validate') {
    await runValidateCommand(rest);
    return;
  }

  if (command === 'deploy') {
    await runDeployCommand(rest);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`work: ${String(error?.message || error)}`);
  process.exit(1);
});
