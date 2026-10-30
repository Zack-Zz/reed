import { invoke } from '@tauri-apps/api/core';
import type { WorkbenchFileExport } from '@reed/ui';

type ExportInvoke = (command: string, args: { name: string; content: string }) => Promise<string>;

export function createNativeFileExport(options: { invoke?: ExportInvoke } = {}): WorkbenchFileExport {
  const send = options.invoke ?? invoke;
  return { save: ({ name, content }) => send('export_preview_file', { name, content }) };
}
