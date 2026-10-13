import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BringToFront, Copy, Trash2 } from 'lucide-react';
import {
  newsletterImageTextCenter,
  newsletterImageTextFont,
  newsletterImageTextLayout,
  type NewsletterImageEdit,
  type NewsletterImageText,
  type NewsletterImageTextLayout,
} from './image-editor.js';

type Kind = 'move' | 'resize' | 'width' | 'rotate';
const bound = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const angle = (value: number) => ((((value + 180) % 360) + 360) % 360) - 180;

export function NewsletterImageTextOverlay({
  edit,
  layouts,
  selected,
  disabled,
  onSelect,
  onBegin,
  onMove,
  onFinish,
  onKeyChange,
  onDuplicate,
  onRemove,
  onBringToFront,
}: {
  edit: NewsletterImageEdit;
  layouts: NewsletterImageTextLayout[];
  selected: number;
  disabled: boolean;
  onSelect: (index: number) => void;
  onBegin: () => void;
  onMove: (index: number, text: NewsletterImageText) => void;
  onFinish: (cancelled: boolean) => void;
  onKeyChange: (index: number, text: NewsletterImageText) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onBringToFront: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const drag = useRef<{
    kind: Kind;
    index: number;
    text: NewsletterImageText;
    layout: NewsletterImageTextLayout;
    start: { x: number; y: number };
    center: { x: number; y: number };
    side: number;
  } | null>(null);
  const measure = (text: NewsletterImageText) => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return null;
    return newsletterImageTextLayout(context, text, edit.width);
  };
  const keepCenter = (text: NewsletterImageText, center: { x: number; y: number }) => {
    const layout = measure(text);
    if (!layout) return text;
    const aligned = text.align === 'center' ? 0.5 : text.align === 'right' ? 1 : 0;
    return {
      ...text,
      x: bound(((center.x - layout.width * (0.5 - aligned)) * 100) / edit.width),
      y: bound(((center.y - layout.height / 2) * 100) / edit.height),
    };
  };
  const point = (event: { clientX: number; clientY: number }) => {
    const bounds = svg.current?.getBoundingClientRect();
    return bounds?.width && bounds.height
      ? {
          x: ((event.clientX - bounds.left) * edit.width) / bounds.width,
          y: ((event.clientY - bounds.top) * edit.height) / bounds.height,
        }
      : null;
  };
  const begin = (event: PointerEvent<SVGElement>, index: number, kind: Kind, side = 1) => {
    if (disabled || editing !== null) return;
    const start = point(event),
      text = edit.texts[index],
      layout = layouts[index];
    if (!start || !text || !layout || !svg.current) return;
    event.preventDefault();
    svg.current.setPointerCapture(event.pointerId);
    drag.current = {
      kind,
      index,
      text: { ...text },
      layout,
      start,
      center: newsletterImageTextCenter(text, layout, edit.width, edit.height),
      side,
    };
    onSelect(index);
    onBegin();
  };
  const keyboard = (event: KeyboardEvent<SVGElement>, index: number, kind: Kind) => {
    if (disabled) return;
    if (event.key === 'Escape' && drag.current) {
      event.preventDefault();
      event.stopPropagation();
      onFinish(true);
      drag.current = null;
      return;
    }
    const text = edit.texts[index],
      layout = layouts[index];
    if (!text || !layout) return;
    if (kind === 'move' && event.key === 'Enter') {
      event.preventDefault();
      onSelect(index);
      onBegin();
      setEditing(index);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    let next = { ...text };
    const delta = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -step : step;
    if (kind === 'move') {
      if (event.key === 'ArrowLeft') next.x = bound(next.x - step);
      if (event.key === 'ArrowRight') next.x = bound(next.x + step);
      if (event.key === 'ArrowUp') next.y = bound(next.y - step);
      if (event.key === 'ArrowDown') next.y = bound(next.y + step);
    } else if (kind === 'rotate') next.rotation = angle((next.rotation ?? 0) + delta);
    else {
      const center = newsletterImageTextCenter(text, layout, edit.width, edit.height);
      if (kind === 'width')
        next.boxWidth = bound((text.boxWidth ?? (layout.width * 100) / edit.width) + delta, 1);
      else {
        next.size = bound(text.size + delta, 8, 300);
        next.boxWidth = bound(
          ((text.boxWidth ?? (layout.width * 100) / edit.width) * next.size) / text.size,
          1,
        );
      }
      next = keepCenter(next, center);
    }
    onSelect(index);
    onKeyChange(index, next);
  };
  const activeText = edit.texts[selected],
    activeLayout = layouts[selected];
  const center =
    activeText && activeLayout
      ? newsletterImageTextCenter(activeText, activeLayout, edit.width, edit.height)
      : null;
  const handle = Math.max(edit.width, edit.height) * 0.006;
  return (
    <>
      <svg
        ref={svg}
        className="nl-photo-text-overlay"
        viewBox={`0 0 ${edit.width} ${edit.height}`}
        role="group"
        aria-label="Image text layer controls"
        aria-disabled={disabled}
        onPointerMove={(event) => {
          const active = drag.current,
            current = point(event);
          if (!active || !current || disabled) return;
          let next = { ...active.text };
          if (active.kind === 'move') {
            next.x = bound(next.x + ((current.x - active.start.x) * 100) / edit.width);
            next.y = bound(next.y + ((current.y - active.start.y) * 100) / edit.height);
          } else if (active.kind === 'rotate') {
            const initial = Math.atan2(
              active.start.y - active.center.y,
              active.start.x - active.center.x,
            );
            const now = Math.atan2(current.y - active.center.y, current.x - active.center.x);
            next.rotation = angle((next.rotation ?? 0) + ((now - initial) * 180) / Math.PI);
          } else {
            if (active.kind === 'resize') {
              const initial = Math.hypot(
                active.start.x - active.center.x,
                active.start.y - active.center.y,
              );
              const now = Math.hypot(current.x - active.center.x, current.y - active.center.y);
              next.size = bound(
                active.text.size *
                  (1 +
                    (now - initial) /
                      Math.hypot(active.layout.width / 2, active.layout.height / 2)),
                8,
                300,
              );
              next.boxWidth = bound(
                ((active.text.boxWidth ?? (active.layout.width * 100) / edit.width) * next.size) /
                  active.text.size,
                1,
              );
            } else {
              const rotation = ((next.rotation ?? 0) * Math.PI) / 180;
              const dx =
                (current.x - active.start.x) * Math.cos(rotation) +
                (current.y - active.start.y) * Math.sin(rotation);
              next.boxWidth = bound(
                ((active.layout.width + 2 * dx * active.side) * 100) / edit.width,
                1,
              );
            }
            next = keepCenter(next, active.center);
          }
          onMove(active.index, next);
        }}
        onPointerUp={() => {
          if (drag.current) onFinish(false);
          drag.current = null;
        }}
        onPointerCancel={() => {
          if (drag.current) onFinish(true);
          drag.current = null;
        }}
      >
        {edit.texts.map((text, index) => {
          const layout = layouts[index];
          if (!layout) return null;
          const middle = newsletterImageTextCenter(text, layout, edit.width, edit.height);
          const chosen = index === selected;
          return (
            <g
              key={index}
              transform={`translate(${middle.x} ${middle.y}) rotate(${text.rotation ?? 0})`}
            >
              <rect
                x={-layout.width / 2}
                y={-layout.height / 2}
                width={layout.width}
                height={layout.height}
                className={`nl-photo-text-box${chosen ? ' is-selected' : ''}`}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={chosen ? 'Move image text' : `Select image text ${index + 1}`}
                onPointerDown={(event) => begin(event, index, 'move')}
                onClick={() => onSelect(index)}
                onKeyDown={(event) => keyboard(event, index, 'move')}
                onDoubleClick={() => {
                  if (!disabled) {
                    onSelect(index);
                    onBegin();
                    setEditing(index);
                  }
                }}
              />
              {chosen && editing !== index && (
                <>
                  {[-1, 1].flatMap((x) =>
                    [-1, 1].map((y) => (
                      <circle
                        key={`${x}:${y}`}
                        cx={(x * layout.width) / 2}
                        cy={(y * layout.height) / 2}
                        r={handle}
                        className="nl-photo-text-handle"
                        role="button"
                        tabIndex={disabled ? -1 : 0}
                        aria-label={`Resize image text ${y < 0 ? 'top' : 'bottom'} ${x < 0 ? 'left' : 'right'}`}
                        onPointerDown={(event) => begin(event, index, 'resize')}
                        onKeyDown={(event) => keyboard(event, index, 'resize')}
                      />
                    )),
                  )}
                  {[-1, 1].map((side) => (
                    <rect
                      key={side}
                      x={(side * layout.width) / 2 - handle / 2}
                      y={-handle}
                      width={handle}
                      height={handle * 2}
                      className="nl-photo-text-handle"
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      aria-label={`Resize image text width ${side < 0 ? 'left' : 'right'}`}
                      onPointerDown={(event) => begin(event, index, 'width', side)}
                      onKeyDown={(event) => keyboard(event, index, 'width')}
                    />
                  ))}
                  <line
                    x1={0}
                    x2={0}
                    y1={layout.height / 2}
                    y2={layout.height / 2 + handle * 4}
                    className="nl-photo-text-line"
                  />
                  <circle
                    cy={layout.height / 2 + handle * 4}
                    r={handle}
                    className="nl-photo-text-handle"
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label="Rotate image text"
                    onPointerDown={(event) => begin(event, index, 'rotate')}
                    onKeyDown={(event) => keyboard(event, index, 'rotate')}
                  />
                </>
              )}
              {editing === index && (
                <foreignObject
                  x={-layout.width / 2}
                  y={-layout.height / 2}
                  width={layout.width}
                  height={Math.max(layout.height, text.size * 2)}
                >
                  <textarea
                    autoFocus
                    aria-label="Edit image text"
                    value={text.text}
                    className="nl-photo-inline-text"
                    style={{
                      font: newsletterImageTextFont(text),
                      lineHeight: text.lineHeight,
                      letterSpacing: text.letterSpacing ?? 0,
                      textAlign: text.align,
                      color: text.color,
                    }}
                    onChange={(event) =>
                      onMove(index, { ...text, text: event.currentTarget.value })
                    }
                    onBlur={() => {
                      onFinish(false);
                      setEditing(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        onFinish(true);
                        setEditing(null);
                      } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        onFinish(false);
                        setEditing(null);
                      }
                    }}
                  />
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
      {center && activeLayout && editing === null && (
        <div
          className="nl-photo-layer-tools"
          style={{
            left: `${bound((center.x * 100) / edit.width, 5, 95)}%`,
            top: `${bound(((center.y - activeLayout.height / 2) * 100) / edit.height, 8, 95)}%`,
          }}
        >
          <button
            disabled={disabled}
            aria-label="Bring image text to front"
            title="Bring to front"
            onClick={onBringToFront}
          >
            <BringToFront size={18} />
          </button>
          <button
            disabled={disabled}
            aria-label="Duplicate image text"
            title="Duplicate text"
            onClick={onDuplicate}
          >
            <Copy size={18} />
          </button>
          <button
            disabled={disabled}
            aria-label="Remove image text"
            title="Remove text"
            onClick={onRemove}
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </>
  );
}
