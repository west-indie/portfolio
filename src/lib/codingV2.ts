/** Keep the saved workflow steps intact while omitting their section from coding v2 pages. */
export function codingV2Body(markdown: string, omitWorkflow: boolean): string {
  if (!omitWorkflow) return markdown;
  const lines = String(markdown || '').split(/\r?\n/);
  const sections: string[][] = [[]];
  let fence = '';
  for (const line of lines) {
    const fenceMarker = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMarker) {
      if (!fence) fence = fenceMarker[1][0];
      else if (fence === fenceMarker[1][0]) fence = '';
    }
    if (!fence && /^##\s+\S/.test(line)) sections.push([line]);
    else sections[sections.length - 1].push(line);
  }
  return sections
    .filter((section) => {
      const content = section.join('\n');
      const heading = String(section[0] || '').trim();
      return !content.includes('codingv2-workflow') && !/^##\s+Workflow\s*$/i.test(heading);
    })
    .map((section) => section.join('\n').trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}
