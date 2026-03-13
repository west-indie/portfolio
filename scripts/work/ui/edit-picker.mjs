import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput, useStdout } from 'ink';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pad(value, width) {
  const text = String(value || '');
  if (text.length >= width) return text.slice(0, width);
  return `${text}${' '.repeat(width - text.length)}`;
}

function formatRow(entry) {
  const slug = String(entry?.slug || '').trim() || '(no-slug)';
  const year = String(entry?.year || '').trim() || '----';
  const title = String(entry?.title || '').trim() || '(untitled)';
  return `${slug}  ${year}  ${title}`;
}

function EditPickerApp({ entries, onSelect, onCancel }) {
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
      setSelected((value) => (value - 1 + entries.length) % entries.length);
      return;
    }
    if (key.downArrow) {
      setSelected((value) => (value + 1) % entries.length);
      return;
    }

    if (key.return) {
      onSelect(entries[selected]);
      exit();
      return;
    }

    if (key.escape || (key.ctrl && (input === 'q' || input === 'Q'))) {
      onCancel();
      exit();
    }
  });

  const shell = useMemo(() => {
    const cols = Math.max(84, dimensions.cols || 100);
    const rows = Math.max(20, dimensions.rows || 32);
    const headerHeight = 5;
    const footerHeight = 3;
    const bodyHeight = Math.max(8, rows - headerHeight - footerHeight);
    const listHeight = Math.max(5, bodyHeight - 2);
    return {
      cols,
      rows,
      headerHeight,
      footerHeight,
      bodyHeight,
      listHeight,
    };
  }, [dimensions]);

  const listMax = shell.listHeight;
  const windowStart = clamp(
    selected - Math.floor(listMax / 2),
    0,
    Math.max(0, entries.length - listMax),
  );
  const visibleRows = entries.slice(windowStart, windowStart + listMax);
  const listTextWidth = Math.max(24, shell.cols - 4);

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
        borderColor: 'yellow',
        height: shell.headerHeight,
        flexDirection: 'column',
        paddingX: 1,
      },
      React.createElement(Text, { color: 'yellow', bold: true }, 'LEO NUNEZ // EDIT WORK ENTRY'),
      React.createElement(Text, { color: 'gray' }, `Choose an existing entry (${entries.length} total)`),
      React.createElement(Text, { color: 'gray' }, 'Up/Down to move, Enter to edit, Esc/Ctrl+Q to cancel'),
    ),
    React.createElement(
      Box,
      {
        borderStyle: 'single',
        borderColor: 'yellow',
        height: shell.bodyHeight,
        flexDirection: 'column',
        paddingX: 1,
      },
      ...visibleRows.map((entry, index) => {
        const absoluteIndex = windowStart + index;
        const line = pad(`${absoluteIndex + 1}. ${formatRow(entry)}`, listTextWidth);
        return React.createElement(
          Text,
          absoluteIndex === selected
            ? { key: entry.filePath || entry.slug || String(absoluteIndex), inverse: true }
            : { key: entry.filePath || entry.slug || String(absoluteIndex), color: 'white' },
          line,
        );
      }),
      entries.length > visibleRows.length
        ? React.createElement(
          Text,
          { color: 'gray' },
          `Showing ${windowStart + 1}-${windowStart + visibleRows.length} of ${entries.length}`,
        )
        : null,
    ),
    React.createElement(
      Box,
      {
        borderStyle: 'single',
        borderColor: 'yellow',
        height: shell.footerHeight,
        paddingX: 1,
      },
      React.createElement(Text, { color: 'gray' }, 'Enter edit selected entry   Esc/Ctrl+Q cancel'),
    ),
  );
}

export async function runEditPicker({ entries = [] } = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive edit picker requires a TTY.');
  }

  const list = Array.isArray(entries) ? entries : [];
  if (list.length < 1) return null;

  let selectedEntry = null;
  const app = render(
    React.createElement(EditPickerApp, {
      entries: list,
      onSelect: (entry) => {
        selectedEntry = entry;
      },
      onCancel: () => {},
    }),
    {
      exitOnCtrlC: true,
    },
  );

  await app.waitUntilExit();
  return selectedEntry;
}
