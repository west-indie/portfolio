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
    id: 'validate',
    label: 'Validate',
    description: 'Run schema/content checks and media integrity checks.',
    shortcuts: ['Enter', '2'],
  },
  {
    id: 'deploy',
    label: 'Deploy',
    description: 'Preflight, scoped commit, and push current branch.',
    shortcuts: ['Enter', '3'],
  },
  {
    id: 'quit',
    label: 'Quit',
    description: 'Exit the work manager.',
    shortcuts: ['Enter', '4'],
  },
];

function pad(value, width) {
  const text = String(value || '');
  if (text.length >= width) return text.slice(0, width);
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

function DashboardApp({ onSelect, lastRun = null }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [selected, setSelected] = useState(0);
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

  useInput((input, key) => {
    if (key.upArrow) {
      setSelected((value) => (value - 1 + MENU.length) % MENU.length);
      return;
    }
    if (key.downArrow) {
      setSelected((value) => (value + 1) % MENU.length);
      return;
    }

    if (input === '1' || input === '2' || input === '3' || input === '4') {
      const next = Number(input) - 1;
      if (next >= 0 && next < MENU.length) {
        onSelect(MENU[next].id);
        exit();
      }
      return;
    }

    if (key.return) {
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
    const sidebarWidth = Math.min(34, Math.max(26, Math.floor(cols * 0.3)));

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
  const lastRunLines = Array.isArray(lastRun?.lines) ? lastRun.lines : [];
  const lastRunPreview = lastRunLines.slice(0, Math.max(4, shell.bodyHeight - 16));
  const statusColor = lastRun?.status === 'error' ? 'red' : 'green';

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
        ...MENU.map((item, index) =>
          React.createElement(
            Text,
            index === selected
              ? { key: item.id, inverse: true }
              : { key: item.id, color: 'white' },
            `${index + 1}. ${item.label}`,
          )),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: 'gray' }, 'Use Up/Down + Enter'),
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
        React.createElement(Text, { color: 'blue', bold: true }, current.label),
        React.createElement(Text, { color: 'white' }, current.description),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(StatusRow, { label: 'Brand', value: 'Leo Nunez Portfolio', color: 'white' }),
        React.createElement(StatusRow, { label: 'Scope', value: '/work + /work/:slug content', color: 'white' }),
        React.createElement(StatusRow, { label: 'Command', value: `work ${current.id === 'quit' ? '' : current.id}`.trim(), color: 'green' }),
        React.createElement(StatusRow, { label: 'Shortcuts', value: current.shortcuts.join(', '), color: 'yellow' }),
        React.createElement(Text, { color: 'gray' }, ''),
        React.createElement(Text, { color: 'gray' }, 'Designed as terminal-native web app shell.'),
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
      React.createElement(Text, { color: 'gray' }, 'Enter select   1-4 quick nav   Esc/Ctrl+Q quit'),
    ),
  );
}

export async function runDashboard({ lastRun = null } = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return 'quit';
  }

  let action = 'quit';
  const app = render(
    React.createElement(DashboardApp, {
      lastRun,
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
