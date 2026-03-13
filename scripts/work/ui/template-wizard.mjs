import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdout } from 'ink';
import {
  CATEGORY_DEFINITIONS,
  DEFAULT_CATEGORY,
  categoryOptionsFromDefinitions,
  isKnownCategory,
  slugify,
} from '../lib/schema.mjs';

function parseTemplateLines(value) {
  const rows = String(value || '')
    .split(/\r?\n|,/)
    .map((line) => String(line || '').trim())
    .filter(Boolean);

  const seenKeys = new Set();
  const fields = [];
  for (const row of rows) {
    const required = row.endsWith('*');
    const label = row.replace(/\*+$/g, '').trim();
    if (!label) continue;
    let keyBase = slugify(label);
    if (!keyBase) continue;
    let key = keyBase;
    let suffix = 2;
    while (seenKeys.has(key)) {
      key = `${keyBase}-${suffix}`;
      suffix += 1;
    }
    seenKeys.add(key);
    fields.push({
      key,
      label,
      required,
    });
  }
  return fields;
}

function fieldsToLineSpec(detailFields) {
  const rows = Array.isArray(detailFields)
    ? detailFields.map((field) => {
      const label = String(field?.label || '').trim();
      if (!label) return '';
      return `${label}${field?.required ? '*' : ''}`;
    }).filter(Boolean)
    : [];
  return rows.join('\n');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pad(value, width) {
  const text = String(value || '');
  if (text.length >= width) return text.slice(0, width);
  return `${text}${' '.repeat(width - text.length)}`;
}

function applyTextEdit(value, input, key, { multiline = false } = {}) {
  const current = String(value || '');
  if (key.leftArrow || key.rightArrow || input === '\u001B[D' || input === '\u001B[C') {
    return current;
  }
  if (key.backspace || input === '\u007F' || key.delete) {
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

function TemplateWizardApp({ categoryDefinitions, initialCategoryId, onComplete, onCancel }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    cols: stdout?.columns || 110,
    rows: stdout?.rows || 34,
  });
  const options = useMemo(
    () => categoryOptionsFromDefinitions(categoryDefinitions).sort((a, b) => a.id.localeCompare(b.id)),
    [categoryDefinitions],
  );
  const initialId = String(initialCategoryId || '').trim();
  const safeInitialId = isKnownCategory(initialId, categoryDefinitions)
    ? initialId
    : String(options[0]?.id || DEFAULT_CATEGORY);

  const [stepIndex, setStepIndex] = useState(0);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState(() => {
    const existing = categoryDefinitions[safeInitialId] || CATEGORY_DEFINITIONS[DEFAULT_CATEGORY];
    return {
      sourceCategoryId: safeInitialId,
      categoryId: safeInitialId,
      categoryLabel: String(existing?.label || safeInitialId),
      lineSpec: fieldsToLineSpec(existing?.detailFields),
    };
  });

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        cols: stdout?.columns || 110,
        rows: stdout?.rows || 34,
      });
    };
    stdout?.on('resize', onResize);
    return () => stdout?.off('resize', onResize);
  }, [stdout]);

  const steps = [
    {
      id: 'template',
      label: 'Template',
      fields: [
        { key: 'categoryId', label: `Category ID (${options.map((option) => option.id).join(', ')})` },
        { key: 'categoryLabel', label: 'Category Label' },
      ],
    },
    {
      id: 'lines',
      label: 'Entry Lines',
      fields: [
        { key: 'lineSpec', label: 'Entry lines (one per line, optional * for required)', multiline: true },
      ],
    },
    {
      id: 'summary',
      label: 'Review & Save',
      fields: [],
    },
  ];

  const step = steps[stepIndex];
  const fields = step.fields;
  const field = fields[clamp(fieldIndex, 0, Math.max(0, fields.length - 1))];
  const quickOptions = options.slice(0, 9);

  const shell = useMemo(() => {
    const cols = Math.max(92, dimensions.cols || 110);
    const rows = Math.max(24, dimensions.rows || 34);
    const headerHeight = 5;
    const footerHeight = 3;
    const bodyHeight = Math.max(10, rows - headerHeight - footerHeight);
    const sidebarWidth = Math.min(34, Math.max(24, Math.floor(cols * 0.25)));
    const rightWidth = Math.min(56, Math.max(34, Math.floor(cols * 0.38)));
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
  const sidebarTextWidth = Math.max(16, shell.sidebarWidth - 4);

  const preview = useMemo(() => {
    const nextId = slugify(form.categoryId);
    const detailFields = parseTemplateLines(form.lineSpec);
    return JSON.stringify({
      sourceCategoryId: String(form.sourceCategoryId || '').trim() || null,
      id: nextId,
      label: form.categoryLabel.trim(),
      detailFields,
    }, null, 2).split('\n');
  }, [form]);

  const saveTemplate = () => {
    const categoryId = slugify(form.categoryId);
    if (!categoryId) {
      setError('Category ID is required.');
      return;
    }
    const categoryLabel = String(form.categoryLabel || '').trim();
    if (!categoryLabel) {
      setError('Category label is required.');
      return;
    }
    const detailFields = parseTemplateLines(form.lineSpec);
    const nextDefinitions = { ...categoryDefinitions };
    const existed = Boolean(nextDefinitions[categoryId]);
    nextDefinitions[categoryId] = {
      id: categoryId,
      label: categoryLabel,
      detailFields,
    };
    onComplete({
      action: 'save',
      templateId: categoryId,
      existed,
      categoryDefinitions: nextDefinitions,
    });
    exit();
  };

  const renameTemplate = () => {
    const sourceCategoryId = String(form.sourceCategoryId || '').trim();
    const categoryId = slugify(form.categoryId);
    if (!sourceCategoryId || !categoryDefinitions[sourceCategoryId]) {
      setError('Select an existing category first, then rename it.');
      return;
    }
    if (!categoryId) {
      setError('New category ID is required.');
      return;
    }
    if (sourceCategoryId === categoryId) {
      setError('Set a different category ID to rename.');
      return;
    }
    if (categoryDefinitions[categoryId]) {
      setError(`Cannot rename to "${categoryId}" because it already exists.`);
      return;
    }

    const categoryLabel = String(form.categoryLabel || '').trim();
    if (!categoryLabel) {
      setError('Category label is required.');
      return;
    }
    const detailFields = parseTemplateLines(form.lineSpec);
    const nextDefinitions = { ...categoryDefinitions };
    delete nextDefinitions[sourceCategoryId];
    nextDefinitions[categoryId] = {
      id: categoryId,
      label: categoryLabel,
      detailFields,
    };

    onComplete({
      action: 'rename',
      sourceCategoryId,
      targetCategoryId: categoryId,
      categoryDefinitions: nextDefinitions,
    });
    exit();
  };

  const deleteTemplate = () => {
    const targetId = slugify(form.categoryId);
    if (!targetId || !categoryDefinitions[targetId]) {
      setError('Set Category ID to an existing category to delete.');
      return;
    }
    if (targetId === DEFAULT_CATEGORY) {
      setError(`The "${DEFAULT_CATEGORY}" category cannot be deleted.`);
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      setError(`Press d again to delete "${targetId}".`);
      return;
    }
    const nextDefinitions = { ...categoryDefinitions };
    delete nextDefinitions[targetId];
    onComplete({
      action: 'delete',
      templateId: targetId,
      categoryDefinitions: nextDefinitions,
    });
    exit();
  };

  const commit = () => {
    setConfirmDelete(false);
    setError('');
    saveTemplate();
  };

  useInput((input, key) => {
    if (key.escape) {
      if (stepIndex === 0) {
        onCancel();
        exit();
        return;
      }
      setError('');
      setConfirmDelete(false);
      setStepIndex((value) => Math.max(0, value - 1));
      setFieldIndex(0);
      return;
    }

    if (step.id === 'summary') {
      if (key.return) {
        commit();
        return;
      }
      if (input.toLowerCase() === 'r') {
        setConfirmDelete(false);
        setError('');
        renameTemplate();
        return;
      }
      if (input.toLowerCase() === 'd') {
        deleteTemplate();
        return;
      }
      if (key.tab || key.leftArrow) {
        setConfirmDelete(false);
        setError('');
        setStepIndex(1);
        setFieldIndex(0);
      }
      return;
    }

    if (key.leftArrow) {
      setStepIndex((value) => Math.max(0, value - 1));
      setFieldIndex(0);
      setError('');
      setConfirmDelete(false);
      return;
    }

    if (key.rightArrow) {
      setStepIndex((value) => Math.min(steps.length - 1, value + 1));
      setFieldIndex(0);
      setError('');
      setConfirmDelete(false);
      return;
    }

    if (key.upArrow) {
      setFieldIndex((value) => clamp(value - 1, 0, Math.max(0, fields.length - 1)));
      return;
    }

    if (key.downArrow) {
      setFieldIndex((value) => clamp(value + 1, 0, Math.max(0, fields.length - 1)));
      return;
    }

    if (field?.key === 'categoryId' && /^[1-9]$/.test(input)) {
      const option = quickOptions[Number(input) - 1];
      if (!option) return;
      setForm({
        sourceCategoryId: option.id,
        categoryId: option.id,
        categoryLabel: option.label,
        lineSpec: fieldsToLineSpec(option.detailFields),
      });
      setConfirmDelete(false);
      setError('');
      return;
    }

    if (key.tab || (key.return && !field?.multiline)) {
      if (fieldIndex < fields.length - 1) {
        setFieldIndex((value) => value + 1);
      } else {
        setStepIndex((value) => Math.min(steps.length - 1, value + 1));
        setFieldIndex(0);
      }
      setError('');
      setConfirmDelete(false);
      return;
    }

    if (!field) return;
    const currentValue = String(form[field.key] || '');
    const nextValue = applyTextEdit(currentValue, input, key, { multiline: Boolean(field.multiline) });
    if (nextValue === currentValue) return;

    setForm((current) => {
      const next = {
        ...current,
        [field.key]: nextValue,
      };
      if (field.key === 'categoryId') {
        const candidate = slugify(nextValue);
        if (isKnownCategory(candidate, categoryDefinitions)) {
          const existing = categoryDefinitions[candidate];
          return {
            sourceCategoryId: candidate,
            categoryId: candidate,
            categoryLabel: String(existing.label || candidate),
            lineSpec: fieldsToLineSpec(existing.detailFields),
          };
        }
      }
      return next;
    });
    setError('');
    setConfirmDelete(false);
  });

  const previewMaxLines = Math.max(8, shell.bodyHeight - 6);
  const shownPreview = preview.slice(0, previewMaxLines);

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
        borderColor: 'magenta',
        height: shell.headerHeight,
        flexDirection: 'column',
        paddingX: 1,
      },
      React.createElement(Text, { color: 'magenta', bold: true }, 'LEO NUNEZ // ENTRY TEMPLATE EDITOR'),
      React.createElement(Text, { color: 'gray' }, `Step ${stepIndex + 1}/${steps.length}: ${step.label}`),
      React.createElement(Text, { color: 'gray' }, 'Edit category template lines. Add * at end of a line to mark required.'),
    ),
    React.createElement(
      Box,
      { height: shell.bodyHeight, width: shell.cols },
      React.createElement(
        Box,
        {
          width: shell.sidebarWidth,
          borderStyle: 'single',
          borderColor: 'magenta',
          flexDirection: 'column',
          paddingX: 1,
          marginRight: 1,
        },
        React.createElement(Text, { color: 'gray' }, 'STEPS'),
        ...steps.map((item, index) =>
          React.createElement(
            Text,
            index === stepIndex
              ? { key: item.id, inverse: true }
              : { key: item.id, color: index < stepIndex ? 'green' : 'white' },
            pad(`${index + 1}. ${item.label}`, sidebarTextWidth),
          )),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: 'gray' }, 'QUICK CATEGORY PICK'),
        ...quickOptions.map((option, index) =>
          React.createElement(
            Text,
            {
              key: option.id,
              color: option.id === slugify(form.categoryId) ? 'green' : 'white',
            },
            pad(`${index + 1}. ${option.label} (${option.id})`, sidebarTextWidth),
          )),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: 'gray' }, pad(`Source: ${String(form.sourceCategoryId || '').trim() || '(none)'}`, sidebarTextWidth)),
        confirmDelete
          ? React.createElement(Text, { color: 'yellow' }, 'Delete confirm armed (press d to confirm).')
          : null,
        error ? React.createElement(Text, { color: 'red' }, `Error: ${error}`) : null,
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
            React.createElement(Text, { color: 'gray' }, 'Current fields'),
            ...fields.map((item, index) => {
              const visible = String(form[item.key] || '').replace(/\n/g, ' <NL> ');
              return React.createElement(
                Text,
                index === fieldIndex
                  ? { key: item.key, inverse: true }
                  : { key: item.key, color: 'white' },
                `${item.label}: ${visible}`,
              );
            }),
          )
          : React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(Text, { color: 'green', bold: true }, 'Review & Save'),
            React.createElement(Text, { color: 'gray' }, 'Enter=save/update  r=rename  d=delete'),
            React.createElement(Text, { color: 'gray' }, 'Delete requires confirmation: press d twice.'),
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
        React.createElement(Text, { color: 'yellow', bold: true }, 'TEMPLATE PREVIEW'),
        ...shownPreview.map((line, index) =>
          React.createElement(Text, { key: `preview-${index}`, color: 'white' }, line)),
        preview.length > shownPreview.length
          ? React.createElement(Text, { color: 'gray' }, '...')
          : null,
      ),
    ),
    React.createElement(
      Box,
      {
        borderStyle: 'single',
        borderColor: 'magenta',
        height: shell.footerHeight,
        paddingX: 1,
      },
      React.createElement(Text, { color: 'gray' }, 'Tab/Enter next   Summary: Enter save, r rename, d delete   Esc back/cancel'),
    ),
  );
}

export async function runTemplateWizard({
  categoryDefinitions = CATEGORY_DEFINITIONS,
  initialCategoryId = '',
} = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive template wizard requires a TTY.');
  }

  let outcome = null;
  const app = render(
    React.createElement(TemplateWizardApp, {
      categoryDefinitions,
      initialCategoryId,
      onComplete: (result) => {
        outcome = result;
      },
      onCancel: () => {
        outcome = { action: 'cancel' };
      },
    }),
    {
      exitOnCtrlC: true,
    },
  );

  await app.waitUntilExit();
  return outcome;
}
