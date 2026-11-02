import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Markdown } from '../src/workbench/ui.jsx';
import { I18nProvider } from '../src/workbench/i18n.jsx';
import {
  MarkdownEditor,
  fitImageDimensions,
  imageAltFromFileName,
  insertMarkdownImage,
} from '../src/workbench/MarkdownEditor';
import { TaskComments } from '../src/workbench/TaskComments';
import { TaskBasicsDialog } from '../src/workbench/TaskBasicsDialog';
import { WorkbenchRuntimeProvider } from '../src/workbench/runtime-context';
import { createInitialState } from '../src/mock/model.js';
import { createMockWorkbenchRuntime } from '../src/mock';

function renderMarkdown(body: string, locale = 'zh-CN') {
  return renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <Markdown body={body} />
    </I18nProvider>,
  );
}

describe('Markdown images and links', () => {
  it.each(['截图[1].png', '截图(1).png', '截图\\[1].png'])(
    'round-trips the file name %s and a URL containing parentheses',
    (name) => {
      const url = 'https://example.com/a(1).png';
      const alt = imageAltFromFileName(name);
      const inserted = insertMarkdownImage('', 0, 0, alt, url);
      const html = renderMarkdown(inserted.value);
      expect(html).toContain('<img');
      expect(html).toContain(`alt="${alt}"`);
      expect(decodeURIComponent(html.match(/src="([^"]+)"/)?.[1] || '')).toBe(url);
    },
  );

  it('preserves complete parenthesized URLs in authored Markdown', () => {
    const url = 'https://example.com/a(1(b)).png';
    const html = renderMarkdown(`![截图](${url})`);
    expect(html).toContain(`src="${url}"`);
  });

  it('still renders inserted images after ordinary text with an unmatched bracket', () => {
    const body =
      '检查项 [待确认 ![截图](https://example.com/a.png) 和 ![另一张](https://example.com/b.png)';
    const html = renderMarkdown(body);
    expect(html).toContain('检查项 [待确认');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('src="https://example.com/b.png"');
  });

  it('renders inline and standalone images with alt text and a caption', () => {
    const html = renderMarkdown(
      [
        '## 截图',
        '文字预览 ![流程图](https://example.com/flow.png) 后续说明',
        '![界面示例](data:image/png;base64,iVBORw0KGgo=)',
      ].join('\n'),
    );
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('src="https://example.com/flow.png"');
    expect(html).toContain('alt="流程图"');
    expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
    expect(html).toContain('alt="界面示例"');
    expect(html).toContain('<figcaption>界面示例</figcaption>');
    expect(html).toContain('文字预览');
    expect(html).toContain('后续说明');
  });

  it('keeps unsafe or non-HTTP(S) image sources as text instead of rendering them', () => {
    const html = renderMarkdown(
      [
        '![坏图](javascript:alert(1))',
        '![本地](file:///tmp/a.png)',
        '![伪造](data:text/html;base64,PHNjcmlwdD4=)',
      ].join('\n'),
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('![坏图](javascript:alert(1))');
    expect(html).toContain('![本地](file:///tmp/a.png)');
    expect(html).toContain('![伪造](data:text/html;base64,PHNjcmlwdD4=)');
  });

  it('renders safe links in a new tab and rejects unsafe schemes', () => {
    const html = renderMarkdown(
      '访问 [示例站点](https://example.com/docs?q=1) 了解详情，另见 [坏链接](javascript:alert(1))。',
    );
    expect(html).toContain('href="https://example.com/docs?q=1"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain('>示例站点</a>');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('[坏链接](javascript:alert(1))');
  });

  it('keeps headings, bullets, notes and preview behavior while parsing inline content', () => {
    const body = [
      '# 一级标题',
      '## 二级标题',
      '- 步骤 ![示意图](https://example.com/step.png) 说明',
      '> 引用 [文档](https://example.com/doc)',
    ].join('\n');
    const html = renderMarkdown(body);
    expect(html).toContain('<h2>一级标题</h2>');
    expect(html).toContain('<h3>二级标题</h3>');
    expect(html).toContain('bullet-row');
    expect(html).toContain('<img ');
    expect(html).toContain('src="https://example.com/step.png"');
    expect(html).toContain('document-note');
    expect(html).toContain('href="https://example.com/doc"');
    expect(renderMarkdown(body)).toContain('一级标题');
  });

  it('hides the leading title in preview mode only', () => {
    const body = '# 预览标题\n正文内容';
    const preview = renderToStaticMarkup(
      <I18nProvider initialLocale="zh-CN">
        <Markdown body={body} preview />
      </I18nProvider>,
    );
    expect(preview).not.toContain('<h2>预览标题</h2>');
    expect(preview).toContain('正文内容');
    expect(renderMarkdown(body)).toContain('<h2>预览标题</h2>');
  });
});

describe('MarkdownEditor', () => {
  function renderEditor(
    overrides: Partial<ComponentProps<typeof MarkdownEditor>> = {},
    locale = 'zh-CN',
  ) {
    return renderToStaticMarkup(
      <I18nProvider initialLocale={locale}>
        <MarkdownEditor value="" onChange={() => {}} {...overrides} />
      </I18nProvider>,
    );
  }

  it('renders image upload, image link and preview controls with a multi-line textarea', () => {
    const html = renderEditor({ name: 'comment', rows: 3, required: true, ariaLabel: '评论正文' });
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="image/*"');
    expect(html).toContain('上传图片');
    expect(html).toContain('插入图片链接');
    expect(html).toContain('预览 Markdown');
    expect(html).toContain('name="comment"');
    expect(html).toContain('rows="3"');
    expect(html).toMatch(/maxlength="400000"/i);
    expect(html).toContain('required=""');
    expect(html).toContain('aria-label="评论正文"');
    expect(html).not.toContain('markdown-editor-preview');
  });

  it('localizes the editor toolbar and lets callers override the length ceiling', () => {
    const html = renderEditor({ maxLength: 1000 }, 'en');
    expect(html).toContain('Upload image');
    expect(html).toContain('Insert image link');
    expect(html).toContain('Preview Markdown');
    expect(html).toMatch(/maxlength="1000"/i);
  });

  it('keeps the caller-provided Markdown text in the controlled textarea', () => {
    const html = renderEditor({ value: '背景 ![截图](https://example.com/a.png)' });
    expect(html).toContain('背景 ![截图](https://example.com/a.png)');
  });

  it('offers no preview control when previews are disabled', () => {
    const html = renderEditor({ previewable: false });
    expect(html).toContain('上传图片');
    expect(html).not.toContain('预览 Markdown');
  });

  it('inserts an image token at the caret and keeps the surrounding text', () => {
    const inserted = insertMarkdownImage('前文后文', 2, 2, '截图', 'https://example.com/a.png');
    expect(inserted.value).toBe('前文 ![截图](https://example.com/a.png) 后文');
    expect(inserted.cursor).toBe(3 + '![截图](https://example.com/a.png)'.length);
    const replaced = insertMarkdownImage('前文后文', 0, 2, '图', 'https://example.com/b.png');
    expect(replaced.value).toBe('![图](https://example.com/b.png) 后文');
    expect(insertMarkdownImage('', null, null, '图', 'https://example.com/c.png').value).toBe(
      '![图](https://example.com/c.png)',
    );
  });

  it('scales images wider than 1600px proportionally and leaves smaller ones untouched', () => {
    expect(fitImageDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitImageDimensions(2400, 1000)).toEqual({ width: 1600, height: 667 });
    expect(fitImageDimensions(800, 600)).toBeNull();
    expect(fitImageDimensions(0, 600)).toBeNull();
  });

  it('derives a readable alt text from the uploaded file name', () => {
    expect(imageAltFromFileName('架构 截图.png')).toBe('架构 截图');
    expect(imageAltFromFileName('screenshot')).toBe('screenshot');
  });
});

describe('TaskComments Markdown bodies', () => {
  const ctx = {
    task: {
      id: 'LOCAL-1',
      comments: [
        {
          id: 'comment-1',
          author: 'You',
          body: '看下 ![截图](https://example.com/comment.png) 的效果\n[文档](https://example.com/doc)',
          createdAt: '2026-10-31T09:00:00.000Z',
        },
      ],
    },
    run: vi.fn(),
  };

  function renderComments(locale = 'zh-CN') {
    return renderToStaticMarkup(
      <I18nProvider initialLocale={locale}>
        <TaskComments ctx={ctx} />
      </I18nProvider>,
    );
  }

  it('renders image and link Markdown inside an authored comment while keeping author and time', () => {
    const html = renderComments();
    expect(html).toContain('src="https://example.com/comment.png"');
    expect(html).toContain('alt="截图"');
    expect(html).toContain('href="https://example.com/doc"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('我');
    expect(html).toContain('task-comment-meta');
    expect(html).not.toContain('![截图](https://example.com/comment.png)');
  });

  it('offers the Markdown editor for new comments with a 400000 character ceiling', () => {
    const html = renderComments();
    expect(html).toContain('上传图片');
    expect(html).toContain('name="comment"');
    expect(html).toMatch(/maxlength="400000"/i);
    expect(html).toContain('添加评论');
  });

  it('keeps the empty state and English copy', () => {
    const empty = renderToStaticMarkup(
      <I18nProvider initialLocale="en">
        <TaskComments ctx={{ ...ctx, task: { id: 'LOCAL-1', comments: [] } }} />
      </I18nProvider>,
    );
    expect(empty).toContain('No comments yet.');
    expect(empty).toContain('Upload image');
    expect(empty).toContain('Add a comment');
  });
});

describe('TaskBasicsDialog description editing', () => {
  it('edits the optional task description through the Markdown editor', () => {
    const model = createInitialState();
    const task = model.tasks.find((item: { id: string }) => item.id === 'LOCAL-1');
    Object.assign(task, { description: '背景 ![示意图](https://example.com/a.png)' });
    const html = renderToStaticMarkup(
      <WorkbenchRuntimeProvider runtime={createMockWorkbenchRuntime()}>
        <I18nProvider initialLocale="zh-CN">
          <TaskBasicsDialog ctx={{ task, model, run: vi.fn(), setModal: vi.fn() }} />
        </I18nProvider>
      </WorkbenchRuntimeProvider>,
    );
    expect(html).toContain('上传图片');
    expect(html).toContain('插入图片链接');
    expect(html).toContain('name="description"');
    expect(html).toContain('背景 ![示意图](https://example.com/a.png)');
    expect(html.match(/<textarea[^>]*name="description"[^>]*>/)?.[0]).not.toContain('required');
  });
});
