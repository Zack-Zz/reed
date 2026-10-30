import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  GearSix,
  Monitor,
  Sun,
  Moon,
  Check,
  Translate,
  X,
  Info,
  CaretRight,
} from '@phosphor-icons/react';
import { useI18n } from './i18n.jsx';

export function SettingsControl({ theme, setTheme, dark, openAbout, openConfiguration }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState(null);
  const trigger = useRef(null),
    panel = useRef(null);
  const close = (restore = false) => {
    setOpen(false);
    if (restore) trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open) return;
    const popup = panel.current;
    if (popup.showPopover) popup.showPopover();
    return () => {
      if (popup.hidePopover && popup.isConnected) {
        try {
          popup.hidePopover();
        } catch {
          /* Already closed. */
        }
      }
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const popup = panel.current;
    const place = () => {
      const rect = trigger.current.getBoundingClientRect(),
        width = Math.min(302, window.innerWidth - 24);
      const height = popup.offsetHeight;
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top:
          rect.top > height + 18
            ? rect.top - height - 8
            : Math.min(rect.bottom + 8, window.innerHeight - height - 12),
        width,
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, locale]);
  useEffect(() => {
    if (!open) return;

    const outside = (event) => {
      if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target))
        close();
    };
    const key = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [open]);
  const positioned = position !== null;
  useEffect(() => {
    if (open && positioned)
      panel.current?.querySelector('input:checked')?.focus({ preventScroll: true });
  }, [open, positioned]);
  return (
    <>
      <button
        ref={trigger}
        className="settings-entry"
        aria-label={t('设置')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="reed-settings"
        onClick={() => {
          setPosition(null);
          setOpen(!open);
        }}
      >
        <GearSix size={18} />
        <span>{t('设置')}</span>
      </button>
      {open &&
        createPortal(
          <section
            id="reed-settings"
            ref={panel}
            className="settings-panel"
            role="dialog"
            aria-labelledby="reed-settings-title"
            popover="manual"
            style={position || { visibility: 'hidden' }}
          >
            <header>
              <h2 id="reed-settings-title">{t('设置')}</h2>
              <button
                className="icon-button"
                aria-label={t('关闭设置')}
                onClick={() => close(true)}
              >
                <X size={16} />
              </button>
            </header>
            <fieldset>
              <legend>{t('外观')}</legend>
              <div className="appearance-options">
                {[
                  ['system', '跟随系统', Monitor],
                  ['light', '浅色', Sun],
                  ['dark', '深色', Moon],
                ].map(([value, label, Icon]) => (
                  <label key={value} className={theme === value ? 'chosen' : ''}>
                    <input
                      type="radio"
                      name="reed-appearance"
                      value={value}
                      checked={theme === value}
                      onChange={() => setTheme(value)}
                    />
                    <Icon size={16} />
                    <span>{t(label)}</span>
                  </label>
                ))}
              </div>
              <p>{t('系统当前为{p0}', { p0: t(dark ? '深色' : '浅色') })}</p>
            </fieldset>
            <fieldset className="language-section">
              <legend>
                <Translate size={15} />
                {t('语言')}
              </legend>
              <div className="language-options">
                {[
                  ['zh-CN', '简体中文', 'zh-CN'],
                  ['en', 'English', 'en'],
                ].map(([value, label, lang]) => (
                  <label key={value} className={locale === value ? 'chosen' : ''}>
                    <input
                      type="radio"
                      name="reed-language"
                      value={value}
                      checked={locale === value}
                      onChange={() => setLocale(value)}
                    />
                    <span lang={lang}>{label}</span>
                    {locale === value && <Check size={14} weight="bold" />}
                  </label>
                ))}
              </div>
            </fieldset>
            <footer>
              {openConfiguration && (
                <button
                  type="button"
                  className="settings-about"
                  onClick={() => {
                    close(true);
                    openConfiguration();
                  }}
                >
                  <GearSix size={15} />
                  <span>{t('config.title')}</span>
                  <CaretRight size={13} />
                </button>
              )}

              <button
                type="button"
                className="settings-about"
                onClick={() => {
                  close(true);
                  openAbout();
                }}
              >
                <Info size={15} />
                <span>{t('关于 Reed')}</span>
                <CaretRight size={13} />
              </button>
              <p>{t('偏好仅保存在此浏览器')}</p>
            </footer>
          </section>,
          document.body,
        )}
    </>
  );
}
