import { describe, expect, it } from 'vitest';
import { documentExportName } from '../src/workbench/document-export';

describe('shared document export names', () => {
  it('keeps approved existing Markdown filenames unchanged', () => {
    expect(documentExportName('补偿方案.md')).toBe('补偿方案.md');
    expect(documentExportName('Design.MD')).toBe('Design.MD');
  });

  it('gives documents without a filename extension a Markdown download name', () => {
    expect(documentExportName('接口设计')).toBe('接口设计.md');
  });

  it('exports display titles with path and platform-reserved characters safely', () => {
    expect(documentExportName('API/v2 设计.md')).toBe('API-v2 设计.md');
    expect(documentExportName('API: v2\\验证?')).toBe('API- v2-验证-.md');
    expect(documentExportName('../设计.md')).toBe('-设计.md');
    expect(documentExportName('CON')).toBe('_CON.md');
  });

  it('keeps UTF-8 filename bytes within the native bound without splitting characters', () => {
    const name = documentExportName('界'.repeat(100) + '😀.md');
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(180);
    expect(name.endsWith('.md')).toBe(true);
    expect(name).not.toContain('\uFFFD');
  });
});
