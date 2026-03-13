#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWorkEntry } from './work/lib/create.mjs';
import { runDeployWorkflow } from './work/lib/deploy.mjs';
import { formatValidationReport, validateWorkEntries } from './work/lib/validate.mjs';
import { readAllProjects } from './work/lib/store.mjs';
import { changedPathsFromPorcelain, isGitRepository, runGit } from './work/lib/git.mjs';
import { loadCategoryDefinitions, saveCategoryDefinitions } from './work/lib/entry-templates.mjs';
import {
  DEFAULT_CATEGORY,
  isKnownCategory,
  normalizeCategoryMeta,
  normalizeTagList,
} from './work/lib/schema.mjs';
import { loadRegisteredTags } from './work/lib/tags.mjs';
import { runDashboard } from './work/ui/dashboard.mjs';
import { runCreateWizard, runEditWizard } from './work/ui/create-wizard.mjs';
import { runEditPicker } from './work/ui/edit-picker.mjs';
import { runTemplateWizard } from './work/ui/template-wizard.mjs';

function printUsage() {
  console.log('Usage: work <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  work                         Launch Ink dashboard (TTY only)');
  console.log('  work create [--from file] [--dry-run] [--replace]');
  console.log('  work edit [slug|--slug slug] [--dry-run]');
  console.log('  work edit-template [category|--category id] [--dry-run]');
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

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function isScopedWorkPath(filePath) {
  const normalized = normalizePath(filePath);
  if (normalized.startsWith('src/content/projects/') && normalized.endsWith('.md')) return true;
  if (normalized === 'src/content/projects/_tags.json') return true;
  if (normalized === 'src/content/projects/_entry-templates.json') return true;
  if (normalized === 'src/content/projects/_work-page-settings.json') return true;
  if (normalized.startsWith('public/images/projects/')) return true;
  if (normalized.startsWith('public/video/projects/')) return true;
  return false;
}

function collectScopedChangedPaths(root = process.cwd()) {
  if (!isGitRepository(root)) return [];
  const status = runGit(['status', '--porcelain'], { cwd: root, allowFailure: true });
  if (!status.ok) return [];
  const scoped = changedPathsFromPorcelain(status.stdout)
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => isScopedWorkPath(filePath));
  return Array.from(new Set(scoped)).sort((a, b) => a.localeCompare(b));
}

function snapshotKeyFromPaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return '';
  return paths.join('\n');
}

function normalizeStringList(values) {
  return Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
}

function normalizeCollaborators(values) {
  return Array.isArray(values)
    ? values
      .map((item) => {
        const name = String(item?.name || '').trim();
        if (!name) return null;
        const role = String(item?.role || '').trim();
        return role ? { name, role } : { name };
      })
      .filter(Boolean)
    : [];
}

function normalizeLinks(links) {
  const source = links && typeof links === 'object' ? links : {};
  const direct = [];
  const github = String(source.github || '').trim();
  if (github) direct.push({ title: 'GitHub', url: github });
  const liveDemo = String(source.liveDemo || '').trim();
  if (liveDemo) direct.push({ title: 'Live Demo', url: liveDemo });
  const stack = Array.isArray(source.stack)
    ? source.stack
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const title = String(item.title || '').trim() || `Link ${index + 1}`;
        const url = String(item.url || '').trim();
        if (!url) return null;
        return { title, url };
      })
      .filter(Boolean)
    : [];
  const legacyPress = normalizeStringList(source.press);
  const fallbackStack = stack.length > 0
    ? stack
    : legacyPress.map((url, index) => ({
      title: legacyPress.length > 1 ? `Press ${index + 1}` : 'Press',
      url,
    }));
  const dedupedStack = [];
  const seen = new Set();
  for (const item of [...direct, ...fallbackStack]) {
    const title = String(item?.title || '').trim();
    const url = String(item?.url || '').trim();
    if (!title || !url) continue;
    const key = `${title.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedStack.push({ title, url });
  }
  return {
    ...(dedupedStack.length > 0 ? { stack: dedupedStack } : {}),
  };
}

function normalizeGallery(gallery) {
  return Array.isArray(gallery)
    ? gallery
      .map((item) => {
        const src = String(item?.src || '').trim();
        if (!src) return null;
        const type = String(item?.type || '').trim();
        const caption = String(item?.caption || '').trim();
        return {
          src,
          ...(type ? { type } : {}),
          ...(caption ? { caption } : {}),
        };
      })
      .filter(Boolean)
    : [];
}

function projectEntryToEditInput(entry, categoryDefinitions) {
  const data = entry?.data && typeof entry.data === 'object' ? entry.data : {};
  const slug = String(data.slug || '').trim() || path.basename(String(entry.filePath || ''), '.md');
  const categoryRaw = String(data.category || DEFAULT_CATEGORY).trim();
  return {
    slug,
    title: String(data.title || '').trim(),
    subtitle: String(data.subtitle || '').trim(),
    year: String(data.year || '').trim(),
    month: String(data.month || '').trim(),
    category: isKnownCategory(categoryRaw, categoryDefinitions) ? categoryRaw : DEFAULT_CATEGORY,
    tags: normalizeTagList(data.tags),
    categoryMeta: normalizeCategoryMeta(data.categoryMeta),
    role: String(data.role || '').trim(),
    location: String(data.location || '').trim(),
    disciplines: normalizeStringList(data.disciplines),
    techStack: normalizeStringList(data.techStack),
    collaborators: normalizeCollaborators(data.collaborators),
    links: normalizeLinks(data.links),
    media: {
      heroImage: String(data?.media?.heroImage || '').trim(),
      gallery: normalizeGallery(data?.media?.gallery),
    },
    description: String(entry?.body || '').trim(),
  };
}

async function listEditableEntries(root = process.cwd(), categoryDefinitions = null) {
  const { entries, parseErrors } = await readAllProjects(root);
  const candidates = entries
    .map((entry) => {
      const input = projectEntryToEditInput(entry, categoryDefinitions);
      return {
        slug: input.slug,
        title: input.title,
        year: input.year,
        filePath: entry.filePath,
        input,
      };
    })
    .filter((item) => item.slug)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return { candidates, parseErrors };
}

function findEditableBySlug(candidates, slug) {
  const target = String(slug || '').trim().toLowerCase();
  if (!target) return null;
  return candidates.find((entry) => String(entry.slug || '').trim().toLowerCase() === target) || null;
}

function resolveWorkflowState({ root = process.cwd(), validatedSnapshotKey = '' } = {}) {
  const inGitRepo = isGitRepository(root);
  if (!inGitRepo) {
    return {
      firstRequired: null,
      disabledMenuIds: [],
      reason: 'Workflow hints unavailable (not a git repository).',
      scopedChangedPaths: [],
      snapshotKey: '',
      inGitRepo,
    };
  }

  const scopedChangedPaths = collectScopedChangedPaths(root);
  const snapshotKey = snapshotKeyFromPaths(scopedChangedPaths);

  if (scopedChangedPaths.length === 0) {
    return {
      firstRequired: null,
      disabledMenuIds: ['deploy'],
      reason: 'No scoped /work changes detected. Create/edit content before deploy.',
      scopedChangedPaths,
      snapshotKey,
      inGitRepo,
    };
  }

  if (snapshotKey !== validatedSnapshotKey) {
    return {
      firstRequired: 'validate',
      disabledMenuIds: ['deploy'],
      reason: 'Run Validate first, then Deploy.',
      scopedChangedPaths,
      snapshotKey,
      inGitRepo,
    };
  }

  return {
    firstRequired: 'deploy',
    disabledMenuIds: ['validate'],
    reason: 'Validation is up to date. Deploy is next.',
    scopedChangedPaths,
    snapshotKey,
    inGitRepo,
  };
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
    const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });
    const report = await createWorkEntry({
      input: payload,
      root: process.cwd(),
      dryRun,
      replace,
      categoryDefinitions,
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

  const { tags: availableTags } = await loadRegisteredTags({ root: process.cwd() });
  const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });
  await runCreateWizard({
    categoryDefinitions,
    availableTags,
    onSubmit: async (input) => createWorkEntry({
      input,
      root: process.cwd(),
      dryRun,
      replace,
      categoryDefinitions,
    }),
    onCancel: () => {},
  });
}

async function runEditCommand(rest) {
  const { flags, values } = parseArgs(rest);
  const dryRun = readBooleanFlag(flags, '--dry-run', false);
  const slugArg = String(flags.get('--slug') || values[0] || '').trim();
  const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('work edit requires an interactive TTY.');
  }

  const { candidates, parseErrors } = await listEditableEntries(process.cwd(), categoryDefinitions);
  if (parseErrors.length > 0) {
    console.warn(`work edit: skipped ${parseErrors.length} entries that failed to parse.`);
  }
  if (candidates.length < 1) {
    throw new Error('No project entries found in src/content/projects to edit.');
  }

  let selected = null;
  if (slugArg) {
    selected = findEditableBySlug(candidates, slugArg);
    if (!selected) {
      throw new Error(`No project entry found for slug "${slugArg}".`);
    }
  } else {
    selected = await runEditPicker({ entries: candidates });
    if (!selected) return;
  }

  const { tags: availableTags } = await loadRegisteredTags({ root: process.cwd() });
  await runEditWizard({
    initialInput: selected.input,
    categoryDefinitions,
    availableTags,
    onSubmit: async (input) => {
      const originalSlug = String(selected.input.slug || '').trim();
      const nextSlug = String(input?.slug || '').trim();
      if (nextSlug !== originalSlug) {
        throw new Error(`Slug cannot be changed in edit mode. Keep slug as "${originalSlug}".`);
      }

      return createWorkEntry({
        input,
        root: process.cwd(),
        dryRun,
        replace: true,
        categoryDefinitions,
      });
    },
    onCancel: () => {},
  });
}

async function runEditTemplateCommand(rest) {
  const { flags, values } = parseArgs(rest);
  const dryRun = readBooleanFlag(flags, '--dry-run', false);
  const categoryArg = String(flags.get('--category') || values[0] || '').trim();

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('work edit-template requires an interactive TTY.');
  }

  const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });
  const result = await runTemplateWizard({
    categoryDefinitions,
    initialCategoryId: categoryArg,
  });

  if (!result || result.action === 'cancel') {
    return;
  }

  if (!['save', 'rename', 'delete'].includes(String(result.action || ''))) {
    return;
  }

  const saved = await saveCategoryDefinitions({
    definitions: result.categoryDefinitions,
    root: process.cwd(),
    dryRun,
  });

  const relPath = path.relative(process.cwd(), saved.templatePath).replace(/\\/g, '/');
  const mode = dryRun ? 'dry-run' : 'saved';
  if (result.action === 'rename') {
    console.log(`templates: ${mode} renamed ${result.sourceCategoryId} -> ${result.targetCategoryId} (${relPath})`);
    return;
  }
  if (result.action === 'delete') {
    console.log(`templates: ${mode} deleted ${result.templateId} (${relPath})`);
    return;
  }

  const verb = result.existed ? 'updated' : 'created';
  console.log(`templates: ${mode} ${verb} ${result.templateId} (${relPath})`);
}

async function runValidateCommand(rest) {
  const { flags } = parseArgs(rest);
  const mode = flags.has('--all') ? 'all' : 'changed';
  const asJson = readBooleanFlag(flags, '--json', false);
  const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });

  const report = await validateWorkEntries({
    mode,
    root: process.cwd(),
    categoryDefinitions,
  });

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
  const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });

  const result = await runDeployWorkflow({
    cwd: process.cwd(),
    remote: String(flags.get('--remote') || 'origin').trim() || 'origin',
    dryRun: readBooleanFlag(flags, '--dry-run', false),
    skipLint: readBooleanFlag(flags, '--skip-lint', false),
    skipTest: readBooleanFlag(flags, '--skip-test', false),
    skipBuild: readBooleanFlag(flags, '--skip-build', false),
    noPreflight: readBooleanFlag(flags, '--no-preflight', false),
    categoryDefinitions,
  });

  result.logs.forEach((line) => console.log(line));
  console.log(`deploy: ${result.dryRun ? 'dry-run complete' : `pushed ${result.branch} -> ${result.remote}`}`);
}

async function runInteractiveDashboard() {
  let lastRun = null;
  let validatedSnapshotKey = '';

  while (true) {
    const workflow = resolveWorkflowState({
      root: process.cwd(),
      validatedSnapshotKey,
    });
    const action = await runDashboard({ lastRun, workflow });
    if (action === 'quit') {
      return;
    }

    try {
      if (action === 'create') {
        await runCreateCommand([]);
        validatedSnapshotKey = '';
        lastRun = {
          status: 'ok',
          title: 'Create',
          when: new Date().toLocaleTimeString(),
          lines: ['Create wizard closed.'],
        };
        continue;
      }

      if (action === 'edit') {
        await runEditCommand([]);
        validatedSnapshotKey = '';
        lastRun = {
          status: 'ok',
          title: 'Edit',
          when: new Date().toLocaleTimeString(),
          lines: ['Edit wizard closed.'],
        };
        continue;
      }

      if (action === 'edit-template') {
        await runEditTemplateCommand([]);
        validatedSnapshotKey = '';
        lastRun = {
          status: 'ok',
          title: 'Edit Template',
          when: new Date().toLocaleTimeString(),
          lines: ['Entry template editor closed.'],
        };
        continue;
      }

      if (action === 'validate') {
        const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });
        const report = await validateWorkEntries({
          mode: 'changed',
          root: process.cwd(),
          categoryDefinitions,
        });
        if (report.ok) {
          validatedSnapshotKey = resolveWorkflowState({
            root: process.cwd(),
            validatedSnapshotKey: '',
          }).snapshotKey;
        } else {
          validatedSnapshotKey = '';
        }
        lastRun = {
          status: report.ok ? 'ok' : 'error',
          title: `Validate (--changed): ${report.ok ? 'PASS' : 'FAIL'}`,
          when: new Date().toLocaleTimeString(),
          lines: formatValidationReport(report, process.cwd()).split('\n'),
        };
        continue;
      }

      if (action === 'deploy') {
        const categoryDefinitions = await loadCategoryDefinitions({ root: process.cwd() });
        const result = await runDeployWorkflow({
          cwd: process.cwd(),
          remote: 'origin',
          dryRun: false,
          skipLint: false,
          skipTest: false,
          skipBuild: false,
          noPreflight: false,
          categoryDefinitions,
        });
        validatedSnapshotKey = '';
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
      validatedSnapshotKey = '';
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

  if (command === 'edit') {
    await runEditCommand(rest);
    return;
  }

  if (command === 'edit-template') {
    await runEditTemplateCommand(rest);
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
