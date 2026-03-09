import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdout } from 'ink';
import { isYearValid, normalizeHttpUrl, parseCollaboratorsCsv, slugify, splitCsv } from '../lib/schema.mjs';

const STEPS = [
  {
    id: 'identity',
    label: 'Identity',
    fields: [
      { key: 'year', label: 'Year' },
      { key: 'title', label: 'Title' },
      { key: 'subtitle', label: 'Subtitle' },
      { key: 'slug', label: 'Slug' },
    ],
  },
  {
    id: 'basics',
    label: 'Role / Location / Disciplines',
    fields: [
      { key: 'role', label: 'Role' },
      { key: 'location', label: 'Location' },
      { key: 'disciplines', label: 'Disciplines (comma-separated)' },
    ],
  },
  {
    id: 'details',
    label: 'Details',
    fields: [
      { key: 'techStack', label: 'Tech stack (comma-separated)' },
      { key: 'collaborators', label: 'Collaborators (Name:Role, ...)' },
      { key: 'github', label: 'GitHub URL (optional)' },
      { key: 'liveDemo', label: 'Live demo URL (optional)' },
      { key: 'press', label: 'Press URLs (comma-separated, optional)' },
    ],
  },
  {
    id: 'media',
    label: 'Media Import',
    fields: [
      { key: 'heroImage', label: 'Hero image path/URL' },
      { key: 'gallery', label: 'Gallery paths/URLs (comma or newline separated)' },
    ],
  },
  {
    id: 'description',
    label: 'Description',
    fields: [
      { key: 'description', label: 'Description (Enter = newline)', multiline: true },
    ],
  },
  {
    id: 'summary',
    label: 'Review & Confirm',
    fields: [],
  },
];

function currentYear() {
  return String(new Date().getFullYear());
}

function defaultForm() {
  return {
    year: currentYear(),
    title: '',
    subtitle: '',
    slug: '',
    slugTouched: false,
    role: '',
    location: '',
    disciplines: '',
    techStack: '',
    collaborators: '',
    github: '',
    liveDemo: '',
    press: '',
    heroImage: '',
    gallery: '',
    description: '',
  };
}

function validateStep(stepId, form) {
  if (stepId === 'identity') {
    if (!String(form.year || '').trim()) return 'Year is required.';
    if (!isYearValid(form.year)) return 'Year must be 4 digits between 1900 and 2100.';
    if (!String(form.title || '').trim()) return 'Title is required.';
    if (!String(form.subtitle || '').trim()) return 'Subtitle is required.';
    if (!String(form.slug || '').trim()) return 'Slug is required.';
  }

  if (stepId === 'basics') {
    if (!String(form.role || '').trim()) return 'Role is required.';
    if (!String(form.location || '').trim()) return 'Location is required.';
    if (splitCsv(form.disciplines).length < 1) return 'At least one discipline is required.';
  }

  if (stepId === 'media') {
    if (!String(form.heroImage || '').trim()) return 'Hero image path is required.';
  }

  if (stepId === 'description') {
    if (!String(form.description || '').trim()) return 'Description is required.';
  }

  return null;
}

function buildInput(form) {
  const press = splitCsv(form.press).map((value) => normalizeHttpUrl(value));

  return {
    year: form.year,
    title: form.title,
    subtitle: form.subtitle,
    slug: form.slug,
    role: form.role,
    location: form.location,
    disciplines: splitCsv(form.disciplines),
    techStack: splitCsv(form.techStack),
    collaborators: parseCollaboratorsCsv(form.collaborators),
    links: {
      ...(form.github ? { github: normalizeHttpUrl(form.github.trim()) } : {}),
      ...(form.liveDemo ? { liveDemo: normalizeHttpUrl(form.liveDemo.trim()) } : {}),
      ...(press.length > 0 ? { press } : {}),
    },
    media: {
      heroImage: form.heroImage.trim(),
      gallery: splitCsv(form.gallery).map((src) => ({ src })),
    },
    description: form.description,
  };
}

function formatSubmitError(error) {
  if (!error) return 'Unknown error.';
  if (Array.isArray(error.issues) && error.issues.length > 0) {
    return error.issues
      .map((issue) => {
        const path = Array.isArray(issue.path) && issue.path.length > 0 ? issue.path.join('.') : 'input';
        return `${path}: ${issue.message}`;
      })
      .join(' | ');
  }
  return String(error.message || error);
}

function applyTextEdit(value, input, key, { multiline = false } = {}) {
  const current = String(value || '');
  const left = key.leftArrow || input === '\u001B[D';
  const right = key.rightArrow || input === '\u001B[C';
  if (left || right) return current;

  if (key.backspace || input === '\u007F') {
    return current.slice(0, -1);
  }

  if (key.delete) {
    return current.slice(0, -1);
  }

  if (multiline && key.return) {
    return `${current}\n`;
  }

  if (input && !key.ctrl && !key.meta && input !== '\r' && input !== '\n' && input !== '\t') {
    return `${current}${input}`;
  }

  return current;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function CreateWizardApp({ onCancel, onSubmit }) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [dimensions, setDimensions] = useState({
    cols: stdout?.columns || 120,
    rows: stdout?.rows || 36,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [form, setForm] = useState(defaultForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        cols: stdout?.columns || 120,
        rows: stdout?.rows || 36,
      });
    };
    stdout?.on('resize', onResize);
    return () => stdout?.off('resize', onResize);
  }, [stdout]);

  const step = STEPS[stepIndex];
  const field = step.fields[fieldIndex];

  const previewLines = useMemo(() => JSON.stringify(buildInput(form), null, 2).split('\n'), [form]);

  const shell = useMemo(() => {
    const cols = Math.max(90, dimensions.cols || 120);
    const rows = Math.max(24, dimensions.rows || 36);
    const headerHeight = 5;
    const footerHeight = 3;
    const bodyHeight = Math.max(10, rows - headerHeight - footerHeight);
    const sidebarWidth = Math.min(30, Math.max(24, Math.floor(cols * 0.22)));
    const rightWidth = Math.min(56, Math.max(34, Math.floor(cols * 0.4)));

    return {
      cols,
      rows,
      headerHeight,
      footerHeight,
      bodyHeight,
      sidebarWidth,
      rightWidth,
    };
  }, [dimensions]);

  const nextStep = () => {
    const validationError = validateStep(step.id, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setStepIndex((value) => Math.min(STEPS.length - 1, value + 1));
    setFieldIndex(0);
  };

  const prevStep = () => {
    setError('');
    setStepIndex((value) => Math.max(0, value - 1));
    setFieldIndex(0);
  };

  useInput(async (input, key) => {
    if (busy) return;

    if (result) {
      if (key.escape || input.toLowerCase() === 'q') {
        exit();
      }
      if (input.toLowerCase() === 'n') {
        setForm(defaultForm());
        setStepIndex(0);
        setFieldIndex(0);
        setError('');
        setResult(null);
      }
      return;
    }

    if (key.escape) {
      if (stepIndex === 0) {
        onCancel?.();
        exit();
        return;
      }
      prevStep();
      return;
    }

    if (key.leftArrow) {
      prevStep();
      return;
    }

    if (key.rightArrow) {
      if (step.id === 'summary') return;
      nextStep();
      return;
    }

    if (step.id === 'summary') {
      if (key.return) {
        setBusy(true);
        setError('');
        try {
          const output = await onSubmit(buildInput(form));
          setResult(output);
        } catch (submitError) {
          setError(formatSubmitError(submitError));
        } finally {
          setBusy(false);
        }
      }
      if (key.tab) {
        prevStep();
      }
      return;
    }

    if (key.upArrow) {
      setFieldIndex((value) => clamp(value - 1, 0, step.fields.length - 1));
      return;
    }

    if (key.downArrow) {
      setFieldIndex((value) => clamp(value + 1, 0, step.fields.length - 1));
      return;
    }

    if (key.tab || (key.return && !field?.multiline)) {
      if (fieldIndex < step.fields.length - 1) {
        setFieldIndex((value) => value + 1);
        return;
      }
      nextStep();
      return;
    }

    if (!field) return;

    const nextValue = applyTextEdit(form[field.key], input, key, { multiline: Boolean(field.multiline) });
    if (nextValue !== form[field.key]) {
      setForm((current) => {
        const next = { ...current, [field.key]: nextValue };
        if (field.key === 'title' && !current.slugTouched) {
          next.slug = slugify(nextValue);
        }
        if (field.key === 'slug') {
          next.slugTouched = true;
        }
        return next;
      });
    }
  });

  const previewMaxLines = Math.max(6, shell.bodyHeight - 6);
  const shownPreview = previewLines.slice(0, previewMaxLines);

  return React.createElement(
    Box,
    {
      flexDirection: 'column',
      width: shell.cols,
      height: shell.rows,
    },
    React.createElement(
      Box,
      {
        borderStyle: 'double',
        borderColor: 'green',
        height: shell.headerHeight,
        flexDirection: 'column',
        paddingX: 1,
      },
      React.createElement(Text, { color: 'green', bold: true }, 'LEO NUNEZ // WORK ENTRY WIZARD'),
      React.createElement(Text, { color: 'gray' }, `Step ${stepIndex + 1}/${STEPS.length}: ${step.label}`),
      React.createElement(Text, { color: 'gray' }, 'Up/Down fields, Left/Right steps, Tab advance, Esc back/cancel'),
    ),

    React.createElement(
      Box,
      { height: shell.bodyHeight, width: shell.cols },

      React.createElement(
        Box,
        {
          width: shell.sidebarWidth,
          borderStyle: 'single',
          borderColor: 'green',
          flexDirection: 'column',
          paddingX: 1,
          marginRight: 1,
        },
        React.createElement(Text, { color: 'gray' }, 'STEPS'),
        ...STEPS.map((item, index) =>
          React.createElement(
            Text,
            index === stepIndex
              ? { key: item.id, inverse: true }
              : { key: item.id, color: index < stepIndex ? 'green' : 'white' },
            `${index + 1}. ${item.label}`,
          )),
        error ? React.createElement(Text, { color: 'red' }, `Error: ${error}`) : null,
        busy ? React.createElement(Text, { color: 'yellow' }, 'Submitting...') : null,
      ),

      React.createElement(
        Box,
        {
          flexGrow: 1,
          borderStyle: 'single',
          borderColor: 'blue',
          flexDirection: 'column',
          paddingX: 1,
          marginRight: 1,
        },
        step.id !== 'summary'
          ? React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: 'blue', bold: true }, step.label),
            React.createElement(Text, { color: 'gray' }, 'Current step fields'),
            ...step.fields.map((item, index) =>
              React.createElement(
                Text,
                index === fieldIndex
                  ? { key: item.key, inverse: true }
                  : { key: item.key, color: 'white' },
                `${item.label}: ${String(form[item.key] || '').replace(/\n/g, ' ↵ ')}`,
              )),
          )
          : React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: 'green', bold: true }, 'Review & Confirm'),
            React.createElement(Text, { color: 'gray' }, 'Press Enter to create entry.'),
            result
              ? React.createElement(
                Box,
                { flexDirection: 'column', marginTop: 1 },
                React.createElement(Text, { color: 'green' }, `Created: ${result.relativeFilePath}`),
                ...result.mediaOperations.map((operation, index) =>
                  React.createElement(
                    Text,
                    { key: `op-${index}`, color: 'white' },
                    `${operation.kind}: ${operation.source} -> ${operation.destination}`,
                  )),
                React.createElement(Text, { color: 'gray' }, 'Press n for another entry, or Esc/q to exit.'),
              )
              : null,
          ),
      ),

      React.createElement(
        Box,
        {
          width: shell.rightWidth,
          borderStyle: 'single',
          borderColor: 'yellow',
          flexDirection: 'column',
          paddingX: 1,
        },
        React.createElement(Text, { color: 'yellow', bold: true }, 'LIVE JSON PREVIEW'),
        ...shownPreview.map((line, index) =>
          React.createElement(Text, { key: `preview-${index}`, color: 'white' }, line)),
        previewLines.length > shownPreview.length
          ? React.createElement(Text, { color: 'gray' }, '...')
          : null,
      ),
    ),

    React.createElement(
      Box,
      {
        borderStyle: 'single',
        borderColor: 'green',
        height: shell.footerHeight,
        paddingX: 1,
      },
      React.createElement(Text, { color: 'gray' }, result
        ? 'n new entry   Esc/q exit'
        : 'Enter confirm   Tab next   Left/Right step nav   Esc back/cancel'),
    ),
  );
}

export async function runCreateWizard({ onSubmit, onCancel } = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive create wizard requires a TTY.');
  }

  const app = render(React.createElement(CreateWizardApp, { onSubmit, onCancel }), {
    exitOnCtrlC: true,
  });
  await app.waitUntilExit();
}
