import { useI18n } from './i18n.jsx';
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CaretDown,
  Check,
  Folder,
  MagnifyingGlass,
  SquaresFour,
  Question,
} from '@phosphor-icons/react';
import {
  filterOptions,
  navigateOptions,
  findTypeaheadIndex,
  nextTypeahead,
  positionSelectPopup,
} from './select-model.js';

function textContent(children) {
  return Children.toArray(children)
    .map((child) => {
      if (isValidElement(child)) return textContent(child.props.children);
      return typeof child === 'string' || typeof child === 'number' ? String(child) : '';
    })
    .join('');
}

function collectOptions(children, group = null, disabled = false, result = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectOptions(child.props.children, group, disabled, result);
    } else if (child.type === 'optgroup') {
      collectOptions(
        child.props.children,
        child.props.label,
        disabled || child.props.disabled,
        result,
      );
    } else if (child.type === 'option') {
      const label = child.props.label ?? textContent(child.props.children);
      result.push({
        index: result.length,
        value: String(child.props.value ?? textContent(child.props.children)),
        label: String(label),
        group,
        disabled: Boolean(disabled || child.props.disabled),
        icon: child.props['data-icon'],
        description: child.props['data-description'],
        selected: child.props.selected,
      });
    }
  });
  return result;
}

function OptionIcon({ kind }) {
  if (kind === 'yunxiao') {
    return <img className="reed-select-source-icon" src="/assets/yunxiao-mark.svg" alt="" />;
  }
  const Icon = { local: Folder, all: SquaresFour, unknown: Question }[kind];
  return Icon ? <Icon className="reed-select-source-icon" size={16} aria-hidden="true" /> : null;
}

/**
 * @typedef {Omit<import('react').SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
 *   searchable?: boolean,
 *   searchPlaceholder?: string,
 *   onChange?: (event: { target: { value: string }, currentTarget: { value: string } }) => void
 * }} SelectProps
 * @param {SelectProps} props
 */
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  name,
  required = false,
  disabled = false,
  className = '',
  searchable,
  searchPlaceholder = '搜索选项…',
  id,
  form,
  autoComplete,
  autoFocus,
  title,
  style,
  onInvalid,
  onInput,
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}) {
  const { t } = useI18n();
  const generatedId = useId();
  const controlId = id || `reed-select-${generatedId}`;
  const listId = `${controlId}-list`;
  const errorId = `${controlId}-error`;
  const options = useMemo(() => collectOptions(children), [children]);
  const initialValue =
    defaultValue ??
    options.find((option) => option.selected)?.value ??
    options.find((option) => !option.disabled)?.value ??
    '';
  const [localValue, setLocalValue] = useState(String(initialValue));
  const rawValue = value === undefined ? localValue : String(value);
  const selected =
    options.find((option) => option.value === rawValue) ??
    options.find((option) => !option.disabled);
  const selectedValue = selected?.value ?? '';
  const canSearch = searchable ?? options.length >= 7;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const [inferredLabel, setInferredLabel] = useState('');
  const [portalTarget, setPortalTarget] = useState(null);
  const [position, setPosition] = useState(null);
  const isPositioned = position !== null;
  const triggerRef = useRef(null);
  const nativeRef = useRef(null);
  const popupRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const typeaheadRef = useRef({ text: '', time: 0 });
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);
  const activeOption = filtered[active];
  const activeId = activeOption ? `${listId}-${activeOption.index}` : undefined;
  const accessibleName = t(ariaLabel || inferredLabel || name || '选项');

  function close(focusTrigger = false, keepTypeahead = false) {
    // Avoid native popover focus restoration stealing focus from an outside click.
    if (!focusTrigger && popupRef.current?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    setOpen(false);
    setQuery('');
    if (!keepTypeahead) typeaheadRef.current = { text: '', time: 0 };
    if (focusTrigger) triggerRef.current?.focus({ preventScroll: true });
  }

  function expand(key) {
    if (disabled) return;
    setPortalTarget(triggerRef.current?.closest('dialog') || document.body);
    setQuery('');
    setPosition(null);
    const selectedIndex = options.findIndex(
      (option) => option.value === selectedValue && !option.disabled,
    );
    setActive(
      key === 'Home' || key === 'End'
        ? navigateOptions(options, -1, key)
        : selectedIndex >= 0
          ? selectedIndex
          : navigateOptions(options, -1, key || 'Home'),
    );
    setOpen(true);
  }

  function choose(option, keepTypeahead = false) {
    if (!option || option.disabled || disabled) return;
    const native = nativeRef.current;
    if (option.value !== selectedValue && native) {
      if (value === undefined) setLocalValue(option.value);
      // Set the real form control before notifying the form's draft-saving onInput.
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(
        native,
        option.value,
      );
      native.dispatchEvent(new Event('input', { bubbles: true }));
      onChange?.({
        type: 'change',
        target: native,
        currentTarget: native,
        preventDefault() {},
        stopPropagation() {},
      });
    }
    setInvalid(Boolean(required && !option.value));
    close(true, keepTypeahead);
  }

  function moveFocusPastTrigger(backwards) {
    const trigger = triggerRef.current;
    const dialog = trigger?.closest('dialog');
    const scope = dialog || document;
    const candidates = [
      ...scope.querySelectorAll('button, input, select, textarea, summary, a[href], [tabindex]'),
    ].filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.disabled &&
        !popupRef.current?.contains(element) &&
        element.getClientRects().length,
    );
    const index = candidates.indexOf(trigger);
    const next =
      candidates[index + (backwards ? -1 : 1)] ||
      (dialog ? candidates[backwards ? candidates.length - 1 : 0] : null);
    close();
    if (next) next.focus({ preventScroll: true });
    return Boolean(next);
  }

  function handleKeyDown(event, fromSearch = false) {
    if (!fromSearch) onKeyDown?.(event);
    if (event.defaultPrevented || disabled || event.nativeEvent.isComposing) return;
    const key = event.key;
    if (open && key === 'Tab') {
      event.stopPropagation();
      if (moveFocusPastTrigger(event.shiftKey)) event.preventDefault();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      if (fromSearch && (event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!open) expand(key);
      else setActive((index) => navigateOptions(filtered, index, key));
      return;
    }
    if (key === 'Enter' || (key === ' ' && !fromSearch)) {
      event.preventDefault();
      event.stopPropagation();
      if (open) choose(activeOption);
      else expand();
      return;
    }
    if (!fromSearch && key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      typeaheadRef.current = nextTypeahead(typeaheadRef.current, key, Date.now());
      const source = open ? filtered : options;
      const current = open ? active : source.findIndex((option) => option.value === selectedValue);
      const next = findTypeaheadIndex(source, typeaheadRef.current.text, current);
      if (next >= 0) {
        if (open) setActive(next);
        else choose(source[next], true);
      }
    }
  }

  useEffect(() => {
    if (disabled) close();
  }, [disabled]);

  useEffect(() => {
    if (!required || selectedValue) setInvalid(false);
  }, [required, selectedValue]);

  useLayoutEffect(() => {
    if (ariaLabel || ariaLabelledBy) return;
    const labels = [
      ...new Set([...(nativeRef.current?.labels || []), ...(triggerRef.current?.labels || [])]),
    ];
    const text = labels
      .map((label) => {
        const clone = label.cloneNode(true);
        clone.querySelectorAll('.reed-select').forEach((control) => control.remove());
        return clone.textContent.trim();
      })
      .filter(Boolean)
      .join(' ');
    setInferredLabel(text);
  }, [ariaLabel, ariaLabelledBy, children]);

  useEffect(() => {
    const native = nativeRef.current;
    const parentForm = native?.form;
    if (!parentForm || value !== undefined) return;
    const reset = () => {
      setLocalValue(String(initialValue));
      setInvalid(false);
      close();
    };
    parentForm.addEventListener('reset', reset);
    return () => parentForm.removeEventListener('reset', reset);
  }, [value, initialValue, form]);

  useLayoutEffect(() => {
    if (!open || !popupRef.current) return;
    const popup = popupRef.current;
    // Manual popovers escape clipping and join the native dialog's top layer.
    if (typeof popup.showPopover === 'function') {
      try {
        popup.showPopover();
      } catch {
        /* In-dialog fixed positioning remains available. */
      }
    }
    return () => {
      if (typeof popup.hidePopover === 'function') {
        try {
          popup.hidePopover();
        } catch {
          /* Already hidden or detached. */
        }
      }
    };
  }, [open, portalTarget]);

  useLayoutEffect(() => {
    if (!open || !popupRef.current) return;
    function place() {
      if (!triggerRef.current?.isConnected) return;
      const viewport = window.visualViewport;
      const rect = triggerRef.current.getBoundingClientRect();
      const searchHeight = canSearch ? searchRef.current?.parentElement.offsetHeight || 46 : 0;
      const hintHeight = popupRef.current.querySelector('.reed-select-hint')?.offsetHeight || 0;
      const contentHeight = (listRef.current?.scrollHeight || 70) + searchHeight + hintHeight + 18;
      setPosition(
        positionSelectPopup(
          rect,
          {
            width: viewport?.width || window.innerWidth,
            height: viewport?.height || window.innerHeight,
            offsetLeft: viewport?.offsetLeft || 0,
            offsetTop: viewport?.offsetTop || 0,
          },
          {
            preferredWidth: canSearch || options.some((option) => option.description) ? 264 : 196,
            preferredHeight: Math.min(360, contentHeight),
          },
        ),
      );
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
      resizeObserver?.disconnect();
    };
  }, [open, canSearch, filtered, options]);

  useLayoutEffect(() => {
    if (open && canSearch && isPositioned) searchRef.current?.focus({ preventScroll: true });
  }, [open, canSearch, isPositioned]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const option = activeId && document.getElementById(activeId);
    if (!open || !list || !option) return;
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.top < listRect.top) list.scrollTop -= listRect.top - optionRect.top;
    else if (optionRect.bottom > listRect.bottom)
      list.scrollTop += optionRect.bottom - listRect.bottom;
  }, [open, activeId, position?.maxHeight]);

  useEffect(() => {
    if (!open) return;
    function outside(event) {
      if (!triggerRef.current?.contains(event.target) && !popupRef.current?.contains(event.target))
        close();
    }
    function escape(event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
    function focusOutside(event) {
      if (!triggerRef.current?.contains(event.target) && !popupRef.current?.contains(event.target))
        close();
    }
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    document.addEventListener('focusin', focusOutside);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape, true);
      document.removeEventListener('focusin', focusOutside);
    };
  }, [open]);

  const describedBy =
    [ariaDescribedBy, invalid ? errorId : ''].filter(Boolean).join(' ') || undefined;
  const popup =
    open &&
    portalTarget &&
    createPortal(
      <div
        ref={popupRef}
        className="reed-select-popup"
        popover="manual"
        data-placement={position?.placement}
        style={
          position
            ? {
                left: position.left,
                top: position.top,
                width: position.width,
                maxHeight: position.maxHeight,
              }
            : { visibility: 'hidden' }
        }
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {canSearch && (
          <div className="reed-select-search">
            <MagnifyingGlass size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              role="searchbox"
              aria-label={t('搜索{label}', { label: accessibleName })}
              aria-controls={listId}
              aria-activedescendant={activeId}
              autoComplete="off"
              placeholder={t(searchPlaceholder)}
              value={query}
              onInput={(event) => event.stopPropagation()}
              onChange={(event) => {
                event.stopPropagation();
                const next = event.target.value;
                setQuery(next);
                const visible = filterOptions(options, next);
                const selectedIndex = visible.findIndex(
                  (option) => option.value === selectedValue && !option.disabled,
                );
                setActive(
                  selectedIndex >= 0 ? selectedIndex : navigateOptions(visible, -1, 'Home'),
                );
              }}
              onKeyDown={(event) => handleKeyDown(event, true)}
            />
            <span className="reed-select-key" aria-hidden="true">
              esc
            </span>
          </div>
        )}
        <div
          ref={listRef}
          id={listId}
          className="reed-select-list"
          role="listbox"
          aria-label={accessibleName}
        >
          {filtered.map((option, index) => (
            <Fragment key={option.index}>
              {option.group && option.group !== filtered[index - 1]?.group && (
                <div className="reed-select-group" role="presentation">
                  {option.group}
                </div>
              )}
              <div
                id={`${listId}-${option.index}`}
                className="reed-select-option"
                role="option"
                aria-selected={option.value === selectedValue}
                aria-disabled={option.disabled || undefined}
                data-active={active === index || undefined}
                onPointerMove={(event) => {
                  if (event.pointerType !== 'touch' && !option.disabled) setActive(index);
                }}
                onPointerDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  choose(option);
                }}
              >
                <OptionIcon kind={option.icon} />
                <span className="reed-select-option-copy">
                  <span>{option.label}</span>
                  {option.description && <small>{option.description}</small>}
                </span>
                <Check className="reed-select-check" size={15} weight="bold" aria-hidden="true" />
              </div>
            </Fragment>
          ))}
          {!filtered.length && (
            <div className="reed-select-empty" role="status">
              <MagnifyingGlass size={19} aria-hidden="true" />
              <span>{t('没有匹配的选项')}</span>
              <small>{t('换个关键词试试')}</small>
            </div>
          )}
        </div>
        {canSearch && (
          <div className="reed-select-hint" aria-hidden="true">
            <span>{t('↑ ↓ 选择')}</span>
            <span>{t('↵ 确认')}</span>
          </div>
        )}
      </div>,
      portalTarget,
    );

  return (
    <span
      className={`reed-select ${className}`}
      style={style}
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <select
        ref={nativeRef}
        className="reed-select-native"
        id={`${controlId}-native`}
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        form={form}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        value={selectedValue}
        onClick={(event) => {
          // A wrapping <label> forwards activation to its first labelable control.
          // Route that activation to the custom control, never the browser menu.
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) {
            triggerRef.current?.focus({ preventScroll: true });
            if (!open) expand();
          }
        }}
        onInput={onInput}
        onChange={(event) => {
          if (value === undefined) setLocalValue(event.target.value);
          setInvalid(false);
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          onInvalid?.(event);
          setInvalid(true);
          triggerRef.current?.focus({ preventScroll: true });
          expand();
        }}
      >
        {options.map((option) => (
          <option key={option.index} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        {...props}
        ref={triggerRef}
        id={controlId}
        type="button"
        className="reed-select-trigger"
        role="combobox"
        aria-label={ariaLabel || (!ariaLabelledBy && inferredLabel) || undefined}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? activeId : undefined}
        aria-required={required || undefined}
        aria-invalid={invalid || props['aria-invalid'] || undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        title={title || selected?.label}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
          if (!event.defaultPrevented) {
            if (open) close();
            else expand();
          }
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={(event) => handleKeyDown(event)}
      >
        <OptionIcon kind={selected?.icon} />
        <span className="reed-select-value">{selected?.label || t('选择选项')}</span>
        <CaretDown className="reed-select-caret" size={13} aria-hidden="true" />
      </button>
      {invalid && (
        <span className="reed-select-error" id={errorId} role="alert">
          {t('请选择一个选项。')}
        </span>
      )}
      {popup}
    </span>
  );
}
