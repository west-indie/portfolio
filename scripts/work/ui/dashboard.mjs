import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdout } from 'ink';

const MENU = [
  {
    id: 'create',
    label: 'Create Entry',
    description: 'Guided wizard for new /work entries with media import.',
    shortcuts: ['Enter', '1'],
  },
  {
    id: 'edit',
    label: 'Edit Entry',
    description: 'Select and update an existing /work entry.',
    shortcuts: ['Enter', '2'],
  },
  {
    id: 'edit-template',
    label: 'Edit Entry Template',
    description: 'Add/edit category entry lines for create/edit forms.',
    shortcuts: ['Enter', '3'],
  },
  {
    id: 'validate',
    label: 'Validate',
    description: 'Run schema/content checks and media integrity checks.',
    shortcuts: ['Enter', '4'],
  },
  {
    id: 'deploy',
    label: 'Deploy',
    description: 'Preflight, scoped commit, and push current branch.',
    shortcuts: ['Enter', '5'],
  },
  {
    id: 'quit',
    label: 'Quit',
    description: 'Exit the work manager.',
    shortcuts: ['Enter', '6'],
  },
];

function toDisabledSet(workflow) {
  return new Set(Array.isArray(workflow?.disabledMenuIds) ? workflow.disabledMenuIds : []);
}

function indexForMenuId(menuId) {
  return MENU.findIndex((item) => item.id === menuId);
}

function initialSelectedIndex(workflow) {
  const firstRequired = indexForMenuId(workflow?.firstRequired);
  if (firstRequired >= 0) return firstRequired;
  return 0;
}

function blockedHint(item, workflow) {
  const firstRequired = String(workflow?.firstRequired || '').trim();
  if (!item) return 'This action is temporarily locked.';
  if (item.id === 'deploy' && Array.isArray(workflow?.scopedChangedPaths) && workflow.scopedChangedPaths.length === 0) {
    return 'No scoped /work changes to deploy yet.';
  }
  if (firstRequired === 'validate') return 'Validate must run first for current scoped changes.';
  if (firstRequired === 'deploy') return 'Deploy is the next required step.';
  return `${item.label} is currently not required.`;
}

function pad(value, width) {
  const text = String(value || '');
  if (text.length >= width) return text.slice(0, width);
  return `${text}${' '.repeat(width - text.length)}`;
}

function padRight(value, width) {
  const text = String(value || '');
  if (text.length >= width) return text;
  return `${text}${' '.repeat(width - text.length)}`;
}

function StatusRow({ label, value, color = 'cyan' }) {
  return React.createElement(
    Box,
    { width: '100%' },
    React.createElement(Text, { color: 'gray' }, `${pad(label, 12)} `),
    React.createElement(Text, { color }, value),
  );
}

function DashboardApp({ onSelect, lastRun = null, workflow = null }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [selected, setSelected] = useState(() => initialSelectedIndex(workflow));
  const [blockedMessage, setBlockedMessage] = useState('');
  const [dimensions, setDimensions] = useState({
    cols: stdout?.columns || 100,
    rows: stdout?.rows || 32,
  });

  useEffect(() => {
    const onResize = () => {
      setDimensions({
        cols: stdout?.columns || 100,
        rows: stdout?.rows || 32,
      });
    };
    stdout?.on('resize', onResize);
    return () => stdout?.off('resize', onResize);
  }, [stdout]);

  const disabledMenuIds = useMemo(() => toDisabledSet(workflow), [workflow]);
  const firstRequired = String(workflow?.firstRequired || '').trim() || null;

  useInput((input, key) => {
    if (key.upArrow) {
      setBlockedMessage('');
      setSelected((value) => (value - 1 + MENU.length) % MENU.length);
      return;
    }
    if (key.downArrow) {
      setBlockedMessage('');
      setSelected((value) => (value + 1) % MENU.length);
      return;
    }

    if (/^[1-9]$/.test(input)) {
      const next = Number(input) - 1;
      if (next >= 0 && next < MENU.length) {
        const target = MENU[next];
        if (disabledMenuIds.has(target.id)) {
          setBlockedMessage(blockedHint(target, workflow));
          return;
        }
        onSelect(MENU[next].id);
        exit();
      }
      return;
    }

    if (key.return) {
      const target = MENU[selected];
      if (disabledMenuIds.has(target.id)) {
        setBlockedMessage(blockedHint(target, workflow));
        return;
      }
      onSelect(MENU[selected].id);
      exit();
      return;
    }

    if (key.escape || (key.ctrl && (input === 'q' || input === 'Q'))) {
      onSelect('quit');
      exit();
    }
  });

  const shell = useMemo(() => {
    const cols = Math.max(80, dimensions.cols || 100);
    const rows = Math.max(24, dimensions.rows || 32);
    const headerHeight = 7;
    const footerHeight = 3;
    const bodyHeight = Math.max(10, rows - headerHeight - footerHeight);
    const sidebarWidth = Math.min(40, Math.max(30, Math.floor(cols * 0.34)));

    return {
      cols,
      rows,
      headerHeight,
      footerHeight,
      bodyHeight,
      sidebarWidth,
    };
  }, [dimensions]);

  const current = MENU[selected];
  const currentDisabled = disabledMenuIds.has(current.id);
  const scopedChangedPaths = Array.isArray(workflow?.scopedChangedPaths) ? workflow.scopedChangedPaths : [];
  const workflowSummary = blockedMessage || String(workflow?.reason || '').trim() || 'Create, edit, template-edit, validate, and deploy from one shell.';
  const quickNavHint = `1-${Math.min(9, MENU.length)}`;
  const lastRunLines = Array.isArray(lastRun?.lines) ? lastRun.lines : [];
  const lastRunPreview = lastRunLines.slice(0, Math.max(4, shell.bodyHeight - 16));
  const statusColor = lastRun?.status === 'error' ? 'red' : 'green';
  const navTextWidth = Math.max(18, shell.sidebarWidth - 4);

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
        borderColor: 'cyan',
        flexDirection: 'column',
        height: shell.headerHeight,
        paddingX: 1,
      },
      React.createElement(Text, { color: 'cyan', bold: true }, 'LEO NUNEZ // PORTFOLIO WORK MANAGER'),
      React.createElement(Text, { color: 'gray' }, 'Creative technologist workflow for /work content'),
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(Text, { color: 'green' }, '[LIVE] '),
        React.createElement(Text, { color: 'white' }, 'Ink Fullscreen TUI'),
        React.createElement(Text, { color: 'gray' }, '   '),
        React.createElement(Text, { color: 'yellow' }, '[MODE] '),
        React.createElement(Text, { color: 'white' }, 'Dashboard'),
      ),
    ),

    React.createElement(
      Box,
      {
        height: shell.bodyHeight,
        width: shell.cols,
      },
      React.createElement(
        Box,
        {
          width: shell.sidebarWidth,
          borderStyle: 'single',
          borderColor: 'cyan',
          flexDirection: 'column',
          paddingX: 1,
          marginRight: 1,
        },
        React.createElement(Text, { color: 'gray' }, 'NAVIGATION'),
        ...MENU.map((item, index) => {
          const itemDisabled = disabledMenuIds.has(item.id);
          const itemIsSelected = index === selected;
          const itemIsNext = firstRequired === item.id;
          const line = padRight(`${index + 1}. ${item.label}`, navTextWidth);

          const props = itemDisabled
            ? (itemIsSelected
              ? { key: item.id, color: 'gray', inverse: true }
              : { key: item.id, color: 'gray', dimColor: true })
            : itemIsSelected
              ? { key: item.id, inverse: true }
              : itemIsNext
                ? { key: item.id, color: 'green', bold: true }
                : { key: item.id, color: 'white' };

          return React.createElement(Text, props, line);
        }),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: 'gray' }, padRight('Use Up/Down + Enter', navTextWidth)),
        React.createElement(Text, { color: 'gray' }, padRight('Green = next, Gray = locked', navTextWidth)),
      ),

      React.createElement(
        Box,
        {
          flexGrow: 1,
          borderStyle: 'single',
          borderColor: 'blue',
          flexDirection: 'column',
          paddingX: 1,
        },
        React.createElement(Text, { color: currentDisabled ? 'gray' : 'blue', bold: true }, current.label),
        React.createElement(Text, { color: currentDisabled ? 'gray' : 'white' }, current.description),
        currentDisabled
          ? React.createElement(Text, { color: 'yellow' }, blockedHint(current, workflow))
          : null,
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(StatusRow, { label: 'Brand', value: 'Leo Nunez Portfolio', color: 'white' }),
        React.createElement(StatusRow, { label: 'Scope', value: '/work + /work/:slug content', color: 'white' }),
        React.createElement(
          StatusRow,
          {
            label: 'Workflow',
            value: firstRequired ? `Next: ${firstRequired}` : 'No blocking step',
            color: firstRequired ? 'green' : 'white',
          },
        ),
        React.createElement(StatusRow, { label: 'Scoped chg', value: String(scopedChangedPaths.length), color: 'white' }),
        React.createElement(
          StatusRow,
          {
            label: 'Command',
            value: `work ${current.id === 'quit' ? '' : current.id}`.trim(),
            color: currentDisabled ? 'gray' : 'green',
          },
        ),
        React.createElement(StatusRow, { label: 'Shortcuts', value: current.shortcuts.join(', '), color: 'yellow' }),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: blockedMessage ? 'yellow' : 'gray' }, workflowSummary),
        lastRun
          ? React.createElement(
            Box,
            { flexDirection: 'column', marginTop: 1 },
            React.createElement(Text, { color: 'gray' }, `LAST RUN${lastRun.when ? ` (${lastRun.when})` : ''}`),
            React.createElement(Text, { color: statusColor, bold: true }, lastRun.title || 'Result'),
            ...lastRunPreview.map((line, index) =>
              React.createElement(
                Text,
                {
                  key: `last-run-${index}`,
                  color: String(line).startsWith('[ERROR]') ? 'red' : 'white',
                },
                line,
              )),
            lastRunLines.length > lastRunPreview.length
              ? React.createElement(Text, { color: 'gray' }, '...')
              : null,
          )
          : null,
      ),
    ),

    React.createElement(
      Box,
      {
        borderStyle: 'single',
        borderColor: 'cyan',
        height: shell.footerHeight,
        paddingX: 1,
      },
      React.createElement(Text, { color: 'gray' }, `Enter select   ${quickNavHint} quick nav   Gray options locked   Esc/Ctrl+Q quit`),
    ),
  );
}

export async function runDashboard({ lastRun = null, workflow = null } = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return 'quit';
  }

  let action = 'quit';
  const app = render(
    React.createElement(DashboardApp, {
      lastRun,
      workflow,
      onSelect: (next) => {
        action = next;
      },
    }),
    {
      exitOnCtrlC: true,
    },
  );

  await app.waitUntilExit();
  return action;
}
