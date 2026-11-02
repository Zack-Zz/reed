interface MarkdownReference {
  start: number;
  end: number;
  image: boolean;
  label: string;
  url: string;
}

const unescape = (text: string) => text.replace(/\\([\\[\]()])/g, '$1');

function matchingEnds(text: string, opening: string, closing: string): Map<number, number> {
  const stack: number[] = [];
  const ends = new Map<number, number>();
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\\') {
      index++;
      continue;
    }
    if (text[index] === opening) stack.push(index);
    else if (text[index] === closing && stack.length) ends.set(stack.pop()!, index);
  }
  return ends;
}

/** Read the existing inline link/image subset, including escaped labels and balanced URLs. */
export function markdownReferences(text: string): MarkdownReference[] {
  const references: MarkdownReference[] = [];
  // Pair once so unmatched ordinary text cannot swallow a later valid reference
  // or cause a repeated scan of the remaining line for every opening bracket.
  const labels = matchingEnds(text, '[', ']');
  const urls = matchingEnds(text, '(', ')');
  for (let start = 0; start < text.length; start++) {
    if (text[start] === '\\') {
      start++;
      continue;
    }
    const image = text.startsWith('![', start);
    if (!image && text[start] !== '[') continue;
    const labelOpen = start + (image ? 1 : 0);
    const labelEnd = labels.get(labelOpen);
    if (labelEnd === undefined || text[labelEnd + 1] !== '(') continue;
    const end = urls.get(labelEnd + 1);
    if (end === undefined) continue;
    const url = unescape(text.slice(labelEnd + 2, end));
    if (url && !/\s/.test(url))
      references.push({
        start,
        end: end + 1,
        image,
        label: unescape(text.slice(labelOpen + 1, labelEnd)),
        url,
      });
    start = end;
  }
  return references;
}
