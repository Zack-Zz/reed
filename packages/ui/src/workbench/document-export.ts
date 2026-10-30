/** Export naming belongs to presentation, never to the stored document title. */
export function documentExportName(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f]/g, '-')
    .replace(/^[. ]+|[. ]+$/g, '');
  const extension = cleaned.match(/\.md$/i)?.[0] ?? '.md';
  let stem = cleaned.replace(/\.md$/i, '').replace(/[. ]+$/g, '') || 'document';
  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem.split('.')[0].trim())) {
    stem = `_${stem}`;
  }
  // Leave the extension intact and respect the shell's 180-byte UTF-8 limit.
  const encoder = new TextEncoder();
  let result = '';
  let bytes = encoder.encode(extension).length;
  for (const character of stem) {
    const length = encoder.encode(character).length;
    if (bytes + length > 180) break;
    result += character;
    bytes += length;
  }
  return `${result.replace(/[. ]+$/g, '') || 'document'}${extension}`;
}
