/** Keep the saved workflow steps intact while omitting their section from coding v2 pages. */
export function codingV2Body(markdown: string, omitWorkflow: boolean): string {
  if (!omitWorkflow) return markdown;
  const lines = String(markdown || '').split(/\r?\n/);
  const visible: string[] = [];
  let inWorkflow = false;
  let fence = '';
  for (const line of lines) {
    const fenceMarker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMarker) {
      if (!fence) fence = fenceMarker[1][0];
      else if (fence === fenceMarker[1][0]) fence = '';
    }
    if (!fence && /^##\s+Workflow\s*$/i.test(line.trim())) {
      inWorkflow = true;
      continue;
    }
    if (inWorkflow && !fence && /^##\s+\S/.test(line)) inWorkflow = false;
    if (!inWorkflow) visible.push(line);
  }
  return visible.join('\n').trim();
}
