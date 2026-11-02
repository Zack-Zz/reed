import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent } from 'react';
import { Eye, EyeSlash, ImageSquare, LinkSimple } from '@phosphor-icons/react';
import { Markdown, isSafeImageUrl } from './ui.jsx';
import { useI18n } from './i18n.jsx';

/** Original image ceiling before any conversion. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Ceiling for the encoded data URL written into the Markdown text. */
export const MAX_DATA_URL_LENGTH = 800 * 1024;
/** Images wider than this are proportionally downscaled before encoding. */
export const MAX_IMAGE_DIMENSION = 1600;
export const JPEG_QUALITY = 0.82;
/** Default text ceiling; callers with a different model limit pass `maxLength`. */
export const DEFAULT_MARKDOWN_MAX_LENGTH = 400000;

const TOO_LARGE = '图片不能超过 5 MB。';
const TOO_LARGE_AFTER_CONVERSION = '图片转换后仍超过 800 KB，请选择更小的图片。';
const UNREADABLE = '无法读取图片文件，请重试。';
const INVALID_URL = '请输入有效的 HTTP(S) 图片链接。';
const PROCESS_FAILED = '图片处理失败，请重试。';
const CONTENT_TOO_LONG = '插入图片后内容超过允许长度，请缩小图片或减少内容。';

class MarkdownImageError extends Error {}

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onPendingChange?: (pending: boolean) => void;
  name?: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  previewable?: boolean;
}

/** Proportional scaling rule shared by the editor and its tests. */
export function fitImageDimensions(
  width: number,
  height: number,
  maxDimension = MAX_IMAGE_DIMENSION,
): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (width <= maxDimension) return null;
  return {
    width: maxDimension,
    height: Math.max(1, Math.round((height * maxDimension) / width)),
  };
}

export function imageAltFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim();
}

/** Insert an image token at the given selection, keeping the surrounding text. */
export function insertMarkdownImage(
  value: string,
  selectionStart: number | null | undefined,
  selectionEnd: number | null | undefined,
  alt: string,
  url: string,
): { value: string; cursor: number } {
  const start = typeof selectionStart === 'number' ? selectionStart : value.length;
  const end = typeof selectionEnd === 'number' ? selectionEnd : start;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const leading = before && !/\s$/.test(before) ? ' ' : '';
  const trailing = after && !/^\s/.test(after) ? ' ' : '';
  const escapedAlt = alt.replace(/[\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ');
  const escapedUrl = url.replace(
    /[()\\]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  const token = `![${escapedAlt}](${escapedUrl})`;
  return {
    value: `${before}${leading}${token}${trailing}${after}`,
    cursor: start + leading.length + token.length,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new MarkdownImageError(UNREADABLE));
    reader.onerror = () => reject(new MarkdownImageError(UNREADABLE));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new MarkdownImageError(UNREADABLE));
    image.src = dataUrl;
  });
}

function encodeJpeg(image: HTMLImageElement, target: { width: number; height: number } | null) {
  const width = target?.width ?? (image.naturalWidth || image.width);
  const height = target?.height ?? (image.naturalHeight || image.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new MarkdownImageError(PROCESS_FAILED);
  // JPEG has no alpha channel; paint an opaque background first.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

async function prepareImageDataUrl(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new MarkdownImageError(TOO_LARGE);
  const raw = await readFileAsDataUrl(file);
  const image = await loadImage(raw);
  const target = fitImageDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
  );
  if (!target && raw.length <= MAX_DATA_URL_LENGTH) return raw;
  let encoded: string;
  try {
    encoded = encodeJpeg(image, target);
  } catch (error) {
    throw error instanceof MarkdownImageError ? error : new MarkdownImageError(PROCESS_FAILED);
  }
  if (encoded.length > MAX_DATA_URL_LENGTH)
    throw new MarkdownImageError(TOO_LARGE_AFTER_CONVERSION);
  return encoded;
}

export function MarkdownEditor({
  value,
  onChange,
  onPendingChange,
  name,
  rows = 4,
  maxLength = DEFAULT_MARKDOWN_MAX_LENGTH,
  placeholder,
  ariaLabel,
  required = false,
  autoFocus = false,
  disabled = false,
  className = '',
  previewable = true,
}: MarkdownEditorProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const pendingCaret = useRef<number | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  const pendingChanged = useRef(onPendingChange);
  pendingChanged.current = onPendingChange;
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current = false;
      pendingChanged.current?.(false);
    };
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || pendingCaret.current === null) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  }, [value]);

  const insertAtCursor = (alt: string, url: string) => {
    const textarea = textareaRef.current;
    // Read the latest committed text so asynchronous image processing cannot
    // overwrite text typed while the file was converted.
    const next = insertMarkdownImage(
      valueRef.current,
      textarea?.selectionStart,
      textarea?.selectionEnd,
      alt,
      url,
    );
    if (next.value.length > maxLength) {
      setError(CONTENT_TOO_LONG);
      return null;
    }
    pendingCaret.current = next.cursor;
    valueRef.current = next.value;
    onChange(next.value);
    setError(null);
    return next;
  };

  const insertImageFile = async (file: File) => {
    if (disabled || pending.current) return;
    pending.current = true;
    setProcessing(true);
    pendingChanged.current?.(true);
    try {
      const dataUrl = await prepareImageDataUrl(file);
      if (!mounted.current) return;
      insertAtCursor(imageAltFromFileName(file.name) || t('图片'), dataUrl);
    } catch (failure) {
      if (mounted.current)
        setError(failure instanceof MarkdownImageError ? failure.message : PROCESS_FAILED);
    } finally {
      if (mounted.current) {
        pending.current = false;
        setProcessing(false);
        pendingChanged.current?.(false);
      }
    }
  };

  const confirmLink = () => {
    const url = linkUrl.trim();
    if (!isSafeImageUrl(url)) {
      setError(INVALID_URL);
      return;
    }
    if (!insertAtCursor(t('图片'), url)) return;
    setLinkUrl('');
    setLinkOpen(false);
  };

  const cancelLink = () => {
    setLinkUrl('');
    setLinkOpen(false);
    setError(null);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      void insertImageFile(file);
      return;
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void insertImageFile(file);
  };

  return (
    <div className={`markdown-editor ${className}`.trim()} aria-busy={processing}>
      <div className="markdown-editor-toolbar" role="toolbar" aria-label={t('Markdown 编辑工具栏')}>
        <button
          type="button"
          className="quiet small"
          disabled={disabled || processing}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageSquare size={15} />
          {t('上传图片')}
        </button>
        <button
          type="button"
          className="quiet small"
          disabled={disabled || processing}
          aria-expanded={linkOpen}
          onClick={() => {
            setLinkOpen((open) => !open);
            setError(null);
          }}
        >
          <LinkSimple size={15} />
          {t('插入图片链接')}
        </button>
        {previewable && (
          <button
            type="button"
            className="quiet small"
            disabled={disabled}
            aria-pressed={showPreview}
            onClick={() => setShowPreview((open) => !open)}
          >
            {showPreview ? <EyeSlash size={15} /> : <Eye size={15} />}
            {showPreview ? t('隐藏 Markdown 预览') : t('预览 Markdown')}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          disabled={disabled || processing}
          aria-label={t('上传图片')}
          onChange={handleFileChange}
        />
      </div>
      {processing && (
        <p className="footnote" role="status">
          {t('正在处理图片，请稍候。')}
        </p>
      )}
      {linkOpen && (
        <div className="markdown-editor-link-row">
          <input
            type="text"
            value={linkUrl}
            aria-label={t('图片链接地址')}
            placeholder={t('图片链接地址')}
            onChange={(event) => {
              setLinkUrl(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                confirmLink();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                cancelLink();
              }
            }}
          />
          <button type="button" className="secondary small" onClick={confirmLink}>
            {t('插入图片')}
          </button>
          <button type="button" className="quiet small" onClick={cancelLink}>
            {t('取消')}
          </button>
        </div>
      )}
      {error && (
        <p className="scope-note" role="alert">
          {t(error)}
        </p>
      )}
      <label className="markdown-editor-input">
        {!ariaLabel && <span className="sr-only">{t('Markdown 内容')}</span>}
        <textarea
          ref={textareaRef}
          name={name}
          rows={rows}
          maxLength={maxLength}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
        />
      </label>
      {showPreview && (
        <div className="markdown-editor-preview">
          <Markdown body={value} />
        </div>
      )}
    </div>
  );
}
