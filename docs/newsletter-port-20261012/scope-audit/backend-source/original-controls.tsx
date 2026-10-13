import { useEffect, useRef, useContext, useState, type ReactNode, type Ref } from 'react';
import { newsletterSafeUrl } from '@capiro/shared/newsletter-render';
import {
  NEWSLETTER_FONT_CATALOG,
  newsletterCatalogStyle,
  type NewsletterStyle,
} from '@capiro/shared/newsletter';
import { sanitizeNewsletterMarkup } from './model.js';
import { NewsletterBrandContext } from './brand-context.js';
import { NewsletterFontPicker } from './NewsletterFontPicker.js';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="nl-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  inputRef,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          disabled={props.disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={props.placeholder}
          rows={4}
        />
      ) : (
        <input {...props} ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}
export function SelectField<T extends string>({
  label,
  value,
  values,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  values: readonly (T | [T, string])[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {values.map((v) =>
          Array.isArray(v) ? (
            <option key={v[0]} value={v[0]}>
              {v[1]}
            </option>
          ) : (
            <option key={v} value={v}>
              {v}
            </option>
          ),
        )}
      </select>
    </Field>
  );
}
export function NewsletterFontField({
  label = 'Font',
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const brand = useContext(NewsletterBrandContext);
  return (
    <div className="nl-field">
      <span>{label}</span>
      <NewsletterFontPicker label={label} value={value} choices={brand.fonts} onChange={onChange} />
    </div>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="nl-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  max = 1000,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
    </Field>
  );
}
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const brand = useContext(NewsletterBrandContext);
  return (
    <Field label={label}>
      <span className="nl-color">
        <input
          aria-label={`${label} picker`}
          type="color"
          value={/^#[a-f0-9]{6}$/i.test(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {!!brand.colors.length && (
          <span className="nl-brand-swatches">
            {[...new Set(brand.colors)].map((color) => (
              <button
                type="button"
                key={color}
                style={{ background: color }}
                aria-label={`Use brand color ${color} for ${label}`}
                onClick={() => onChange(color)}
              />
            ))}
          </span>
        )}
      </span>
    </Field>
  );
}
export function Tabs({
  value,
  values,
  onChange,
  disabled = false,
}: {
  value: string;
  values: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="nl-tabs" role="tablist">
      {values.map((v) => (
        <button
          type="button"
          key={v}
          role="tab"
          aria-selected={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = '',
  hideHeader = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  hideHeader?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== ref.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab') {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input,select,textarea,a[href],[tabindex="0"]',
          ) || [],
        ).filter((el) => el.offsetParent !== null);
        if (!nodes.length) return;
        if (event.shiftKey && document.activeElement === nodes[0]) {
          event.preventDefault();
          nodes[nodes.length - 1]?.focus();
        } else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) {
          event.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="nl-modal-backdrop">
      <div
        ref={ref}
        tabIndex={-1}
        className={`nl-modal${wide ? ' nl-modal--wide' : ''} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {!hideHeader && (
          <header>
            <h2>{title}</h2>
            <button aria-label="Close" onClick={onClose}>
              ×
            </button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
export function StyleFields({
  style,
  onChange,
  typography = true,
}: {
  style: NewsletterStyle;
  onChange: (style: NewsletterStyle) => void;
  typography?: boolean;
}) {
  const set = (key: keyof NewsletterStyle, value: unknown) =>
    onChange({
      ...style,
      [key]: value,
      ...(key === 'bold' ? { fontWeight: value ? 700 : 400 } : {}),
    });
  const fontFlag = (key: 'bold' | 'italic' | 'underline' | 'strike') =>
    key === 'bold'
      ? (style.bold ??
        (style.fontWeight ??
          newsletterCatalogStyle(style.fontFamily ?? 'Arial')?.fontWeight ??
          400) >= 700)
      : key === 'italic'
        ? (style.italic ??
          newsletterCatalogStyle(style.fontFamily ?? 'Arial')?.fontStyle === 'italic')
        : !!style[key];
  return (
    <>
      {typography && (
        <>
          <NewsletterFontField
            label="Font"
            value={style.fontFamily || 'Arial'}
            onChange={(v) => {
              const font = newsletterCatalogStyle(v);
              onChange({
                ...style,
                fontFamily: v,
                fontWeight: font?.fontWeight ?? 400,
                bold: (font?.fontWeight ?? 400) >= 700,
                italic: font?.fontStyle === 'italic',
              });
            }}
          />
          <div className="nl-grid2">
            <NumberField
              label="Font size"
              value={style.fontSize ?? 14}
              max={200}
              min={1}
              onChange={(v) => set('fontSize', v)}
            />
            <NumberField
              label="Letter spacing"
              value={style.letterSpacing ?? 0}
              max={30}
              step={0.1}
              onChange={(v) => set('letterSpacing', v)}
            />
          </div>
          <ColorField
            label="Text color"
            value={style.color || '#ffffff'}
            onChange={(v) => set('color', v)}
          />
          <div className="nl-format">
            {(['bold', 'italic', 'underline', 'strike'] as const).map((key) => (
              <button
                key={key}
                title={key}
                aria-label={key}
                aria-pressed={fontFlag(key)}
                onClick={() => set(key, !fontFlag(key))}
              >
                {key === 'bold' ? (
                  <b>B</b>
                ) : key === 'italic' ? (
                  <i>I</i>
                ) : key === 'underline' ? (
                  <u>U</u>
                ) : (
                  <s>S</s>
                )}
              </button>
            ))}
          </div>
          <div className="nl-grid2">
            <NumberField
              label="Line height"
              value={style.lineHeight ?? 1.4}
              max={4}
              min={0.5}
              step={0.1}
              onChange={(v) => set('lineHeight', v)}
            />
            <NumberField
              label="Paragraph spacing"
              value={style.paragraphSpacing ?? 12}
              max={100}
              onChange={(v) => set('paragraphSpacing', v)}
            />
          </div>
          <SelectField
            label="Text direction"
            value={style.direction || 'ltr'}
            values={[
              ['ltr', 'Left to right'],
              ['rtl', 'Right to left'],
            ]}
            onChange={(v) => set('direction', v)}
          />
        </>
      )}
      <SelectField
        label="Alignment"
        value={style.align || 'left'}
        values={['left', 'center', 'right']}
        onChange={(v) => set('align', v)}
      />
      <ColorField
        label="Background color"
        value={style.background || '#141414'}
        onChange={(v) => set('background', v)}
      />
      <h4>Border & corners</h4>
      <SelectField
        label="Border style"
        value={style.borderStyle || 'none'}
        values={[
          'none',
          'solid',
          'dashed',
          'dotted',
          'double',
          'inset',
          'outset',
          'groove',
          'ridge',
        ]}
        onChange={(v) => set('borderStyle', v)}
      />
      <ColorField
        label="Border color"
        value={style.borderColor || '#777777'}
        onChange={(v) => set('borderColor', v)}
      />
      <div className="nl-grid2">
        <NumberField
          label="Border width"
          value={style.borderWidth || 0}
          max={30}
          onChange={(v) => set('borderWidth', v)}
        />
        <NumberField
          label="Rounded corners"
          value={style.radius || 0}
          max={1000}
          onChange={(v) => set('radius', v)}
        />
      </div>
      <h4>Padding</h4>
      <div className="nl-grid2">
        {(['Top', 'Bottom', 'Left', 'Right'] as const).map((side) => (
          <NumberField
            key={side}
            label={side}
            value={style[`padding${side}`] ?? 0}
            max={200}
            onChange={(v) => set(`padding${side}`, v)}
          />
        ))}
      </div>
      <button
        className="nl-link"
        onClick={() =>
          onChange({
            ...style,
            paddingTop: style.paddingTop || 0,
            paddingBottom: style.paddingTop || 0,
            paddingLeft: style.paddingTop || 0,
            paddingRight: style.paddingTop || 0,
          })
        }
      >
        Apply to all sides
      </button>
      <NumberField
        label="Margin"
        value={style.margin || 0}
        max={200}
        onChange={(v) => set('margin', v)}
      />
    </>
  );
}
export function RichText({
  html,
  onChange,
  label,
  className,
  style,
}: {
  html: string;
  onChange: (html: string) => void;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const brand = useContext(NewsletterBrandContext);
  const fontValue = (family: string, weight: string | number, italic: string) => {
    const name = family
      .split(',')[0]!
      .trim()
      .replace(/^['"]|['"]$/g, '');
    const face = NEWSLETTER_FONT_CATALOG.find(
      (font) =>
        font.family.toLowerCase() === name.toLowerCase() &&
        font.weight === Number(weight) &&
        font.italic === (italic === 'italic'),
    );
    if (face) return face.label;
    const choice = brand.fonts.find((item) => {
      const value = Array.isArray(item) ? item[0] : item;
      return (
        value
          .split(',')[0]!
          .trim()
          .replace(/^['"]|['"]$/g, '') === name
      );
    });
    return choice ? (Array.isArray(choice) ? choice[0] : choice) : family || 'Arial';
  };
  const [richFont, setRichFont] = useState(() =>
    fontValue(style?.fontFamily || 'Arial', style?.fontWeight || 400, style?.fontStyle || 'normal'),
  );
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const remember = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && ref.current?.contains(selection.anchorNode)) {
      savedRange.current = selection.getRangeAt(0).cloneRange();
      const node = selection.anchorNode;
      const element =
        node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
      if (element) {
        const css = window.getComputedStyle(element);
        setRichFont(fontValue(css.fontFamily, css.fontWeight, css.fontStyle));
      }
    }
  };
  const restore = () => {
    ref.current?.focus();
    const range = savedRange.current;
    if (!range || !ref.current?.contains(range.commonAncestorContainer)) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current)
      ref.current.innerHTML = sanitizeNewsletterMarkup(html);
  }, [html]);
  const emit = () => {
    if (ref.current) onChange(sanitizeNewsletterMarkup(ref.current.innerHTML));
  };
  const command = (name: string, value?: string) => {
    restore();
    document.execCommand(name, false, value);
    remember();
    emit();
  };
  const format = (property: string, value: string) => {
    restore();
    const range = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null;
    if (!range || !ref.current?.contains(range.commonAncestorContainer)) return;
    const span = document.createElement('span');
    const font = property === 'font-family' ? newsletterCatalogStyle(value) : undefined;
    if (font) {
      span.style.fontFamily = font.fontFamily;
      span.style.fontWeight = String(font.fontWeight);
      span.style.fontStyle = font.fontStyle;
    } else span.style.setProperty(property, value);
    span.append(range.extractContents());
    if (!span.textContent) span.textContent = '\u200b';
    range.insertNode(span);
    range.selectNodeContents(span);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    remember();
    emit();
  };
  return (
    <div className={className}>
      <div
        className="nl-rich-toolbar"
        onMouseDown={(e) => {
          remember();
          if ((e.target as HTMLElement).closest('button')) e.preventDefault();
        }}
      >
        <select
          aria-label="Text type"
          defaultValue="p"
          onChange={(e) => command('formatBlock', e.target.value)}
        >
          <option value="p">Paragraph</option>
          {[1, 2, 3, 4].map((level) => (
            <option key={level} value={`h${level}`}>
              Heading {level}
            </option>
          ))}
        </select>
        <NewsletterFontPicker
          label="Font"
          value={richFont}
          choices={[...brand.fonts, 'Arial Black']}
          onChange={(value) => {
            setRichFont(value);
            format('font-family', value);
          }}
        />
        <input
          aria-label="Text size"
          type="number"
          min={8}
          max={96}
          defaultValue={14}
          onChange={(e) =>
            format('font-size', `${Math.max(8, Math.min(96, Number(e.target.value)))}px`)
          }
          style={{ width: 52 }}
        />
        <label title="Text color">
          A
          <input
            aria-label="Text color"
            type="color"
            defaultValue="#ffffff"
            onChange={(e) => format('color', e.target.value)}
          />
        </label>
        <label title="Highlight color">
          ▰
          <input
            aria-label="Highlight color"
            type="color"
            defaultValue="#f05f26"
            onChange={(e) => format('background-color', e.target.value)}
          />
        </label>
        {[
          ['bold', 'Bold', 'B'],
          ['italic', 'Italic', 'I'],
          ['underline', 'Underline', 'U'],
          ['strikeThrough', 'Strikethrough', 'S'],
          ['insertUnorderedList', 'Bulleted list', '•'],
          ['insertOrderedList', 'Numbered list', '1.'],
          ['justifyLeft', 'Align left', '≡'],
          ['justifyCenter', 'Align center', '☷'],
          ['justifyRight', 'Align right', '≡'],
          ['outdent', 'Decrease indent', '←'],
          ['indent', 'Increase indent', '→'],
        ].map(([cmd, title, text]) => (
          <button key={cmd} title={title} aria-label={title} onClick={() => command(cmd!)}>
            {text}
          </button>
        ))}
        <button
          aria-label="Add link"
          onClick={() => {
            const url = window.prompt('Link destination', 'https://');
            if (url && newsletterSafeUrl(url)) command('createLink', url);
          }}
        >
          ↗
        </button>
        <button aria-label="Remove link" onClick={() => command('unlink')}>
          ⌁
        </button>
        <button aria-label="Clear formatting" onClick={() => command('removeFormat')}>
          Tx
        </button>
        <button
          aria-label="Insert anchor"
          onClick={() => {
            const id = window.prompt('Anchor name');
            if (id && /^[a-z\d_-]{1,100}$/i.test(id)) command('insertHTML', `<a id="${id}"></a>`);
          }}
        >
          ⚓
        </button>
        <button
          aria-label="Add merge tag"
          onClick={() => {
            const tag = window.prompt('Merge tag', '*|FNAME|*');
            if (tag) command('insertText', tag);
          }}
        >
          *| |*
        </button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        style={style}
        onBlur={emit}
        onInput={emit}
        onMouseUp={remember}
        onKeyUp={remember}
        onPaste={(e) => {
          e.preventDefault();
          command(
            'insertHTML',
            sanitizeNewsletterMarkup(
              e.clipboardData.getData('text/html') ||
                e.clipboardData
                  .getData('text/plain')
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/\n/g, '<br>'),
            ),
          );
        }}
      />
    </div>
  );
}
