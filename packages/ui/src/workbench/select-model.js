const normalize = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim();

export function filterOptions(options, query = '') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return options;
  return options.filter((option) => {
    const text = normalize(
      [option.label, option.value, option.description, option.group].join(' '),
    );
    return terms.every((term) => text.includes(term));
  });
}

export function navigateOptions(options, current, key) {
  if (!options.length) return -1;
  const backwards = key === 'ArrowUp' || key === 'End';
  const direction = backwards ? -1 : 1;
  const edge = key === 'Home' || key === 'End';
  let index = edge || current < 0 ? (backwards ? options.length : -1) : current;
  for (let step = 0; step < options.length; step++) {
    index = (index + direction + options.length) % options.length;
    if (!options[index].disabled) return index;
  }
  return -1;
}

export function findTypeaheadIndex(options, query, current = -1) {
  const text = normalize(query);
  if (!text) return -1;
  for (let step = 1; step <= options.length; step++) {
    const index = (current + step + options.length) % options.length;
    if (!options[index].disabled && normalize(options[index].label).startsWith(text)) return index;
  }
  return -1;
}

export function nextTypeahead(previous, character, time) {
  const key = normalize(character);
  const fresh = time - previous.time > 650;
  const repeated = previous.text && [...previous.text].every((letter) => letter === key);
  return { text: fresh || repeated ? key : previous.text + key, time };
}

export function positionSelectPopup(
  rect,
  viewport,
  { preferredWidth = 240, preferredHeight = 320, gap = 6, margin = 8 } = {},
) {
  const minLeft = (viewport.offsetLeft || 0) + margin;
  const minTop = (viewport.offsetTop || 0) + margin;
  const right = (viewport.offsetLeft || 0) + viewport.width - margin;
  const bottom = (viewport.offsetTop || 0) + viewport.height - margin;
  const width = Math.min(Math.max(rect.width, preferredWidth), Math.max(0, right - minLeft));
  const below = Math.max(0, bottom - rect.bottom - gap);
  const above = Math.max(0, rect.top - minTop - gap);
  const placement = below >= preferredHeight || below >= above ? 'bottom' : 'top';
  const maxHeight = Math.min(preferredHeight, placement === 'bottom' ? below : above);
  const top = placement === 'bottom' ? rect.bottom + gap : rect.top - gap - maxHeight;
  return {
    left: Math.max(minLeft, Math.min(rect.left, right - width)),
    top: Math.max(minTop, Math.min(top, bottom - maxHeight)),
    width,
    maxHeight,
    placement,
  };
}
