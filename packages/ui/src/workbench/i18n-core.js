import { selectionMessages, selectionChineseLabels } from './locales/workflow-selection.ts';
import { configurationMessages, configurationChineseLabels } from './locales/configuration.ts';
import { commonMessages, chineseLabels } from './locales/common.js';
import { relationMessages, relationChineseLabels } from './locales/relations.js';
import { connectorMessages } from './locales/connectors.js';
import { workbenchMessages } from './locales/workbench.js';
import { workflowMessages } from './locales/workflow.js';
import { localTaskMessages } from './locales/local-tasks.js';
import { taskFlowMessages, taskFlowChineseLabels } from './locales/task-flow.js';

export const LOCALE_KEY = 'reed-locale';
export const SUPPORTED_LOCALES = ['zh-CN', 'en'];
export const messages = {
  ...workbenchMessages,
  ...connectorMessages,
  ...workflowMessages,
  ...commonMessages,
  ...localTaskMessages,
  ...taskFlowMessages,
  ...relationMessages,
  ...configurationMessages,
  ...selectionMessages,
};
export function normalizeLocale(value) {
  return /^en(?:-|$)/i.test(String(value)) ? 'en' : 'zh-CN';
}
export function loadLocale(storage) {
  try {
    return normalizeLocale((storage ?? globalThis.localStorage)?.getItem(LOCALE_KEY));
  } catch {
    return 'zh-CN';
  }
}
export function saveLocale(storage, locale) {
  try {
    (storage ?? globalThis.localStorage).setItem(LOCALE_KEY, normalizeLocale(locale));
    return true;
  } catch {
    return false;
  }
}
const interpolate = (text, values) =>
  text.replace(/\{(\w+)\}/g, (whole, key) =>
    Object.hasOwn(values, key) ? String(values[key] ?? '') : whole,
  );
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(messages)
  .filter(([key]) => /\{\w+\}/.test(key))
  .map(([key, value]) => {
    const names = [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    const pieces = key.split(/\{\w+\}/g);
    return {
      key,
      value,
      names,
      specificity: pieces.join('').length,
      pattern: new RegExp(`^${pieces.map(escapePattern).join('([\\s\\S]+?)')}$`),
    };
  })
  .sort((a, b) => b.specificity - a.specificity);

export function createTranslator(locale) {
  const english = normalizeLocale(locale) === 'en';
  return function translate(key, values) {
    if (typeof key !== 'string') return key;
    if (Object.hasOwn(messages, key))
      return interpolate(
        english
          ? messages[key]
          : selectionChineseLabels[key] ||
              configurationChineseLabels[key] ||
              relationChineseLabels[key] ||
              taskFlowChineseLabels[key] ||
              chineseLabels[key] ||
              key,
        values || {},
      );
    // Legacy model feedback remains data in storage. Translate only a registered
    // complete format at its UI boundary, preserving captured names and IDs.
    if (english && values === undefined) {
      for (const template of templates) {
        const match = template.pattern.exec(key);
        if (match)
          return interpolate(
            template.value,
            Object.fromEntries(template.names.map((name, i) => [name, match[i + 1]])),
          );
      }
    }
    if (values === undefined && key.includes('；')) {
      const parts = key.split('；'),
        translated = parts.map((part) => translate(part));
      if (translated.every((part, index) => part !== parts[index])) return translated.join(' · ');
    }
    return values ? interpolate(key, values) : key;
  };
}
