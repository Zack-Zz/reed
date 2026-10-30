import { describe, expect, it, vi } from 'vitest';
import { createNativeFileExport } from '../src/export-transport';

describe('restricted preview file export transport', () => {
  it('passes only file name and text to the fixed shell command', async () => {
    const send = vi.fn(async () => '方案 (1).md');
    const transport = createNativeFileExport({ invoke: send });
    await expect(transport.save({ name: '方案.md', content: '中文正文', mimeType: 'text/plain' })).resolves.toBe('方案 (1).md');
    expect(send).toHaveBeenCalledWith('export_preview_file', { name: '方案.md', content: '中文正文' });
  });
  it('preserves a safe error code for localized UI feedback', async () => {
    const transport = createNativeFileExport({ invoke: async () => { throw 'too-large'; } });
    await expect(transport.save({ name: 'demo.json', content: '{}' })).rejects.toBe('too-large');
  });
});
