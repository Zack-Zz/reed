import { en } from './en.js';
import { zhCN } from './zh-CN.js';

export type Locale = 'en' | 'zh-CN';
export const messages = { en, 'zh-CN': zhCN };
export const locales: Locale[] = ['en', 'zh-CN'];
