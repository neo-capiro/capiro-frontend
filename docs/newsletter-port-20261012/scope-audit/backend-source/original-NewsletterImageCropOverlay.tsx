import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import {
  moveNewsletterCrop,
  resizeNewsletterCrop,
  type NewsletterCropHandle,
  type NewsletterCropRect,
  type NewsletterCropInset,
} from './image-editor-crop.js';

const handles = [
  ['nw', 'top left', 0, 0],
  ['n', 'top', 0.5, 0],
  ['ne', 'top right', 1, 0],
  ['e', 'right', 1, 0.5],
  ['se', 'bottom right', 1, 1],
  ['s', 'bottom', 0.5, 1],
  ['sw', 'bottom left', 0, 1],
  ['w', 'left', 0, 0.5],
] as const;
type DragKind = 'move' | NewsletterCropHandle;

export function NewsletterImageCropOverlay({
  crop,
  width,
  height,
  locked,
  disabled = false,
  cornersOnly = false,
  inset = { x: 0, y: 0 },
  inline = false,
  onBegin,
  onMove,
  onFinish,
  onKeyChange,
}: {
  crop: NewsletterCropRect;
  width: number;
  height: number;
  locked: boolean;
  disabled?: boolean;
  cornersOnly?: boolean;
  inset?: NewsletterCropInset;
  inline?: boolean;
  onBegin: () => void;
  onMove: (crop: NewsletterCropRect) => void;
  onFinish: (cancelled: boolean) => void;
  onKeyChange: (crop: NewsletterCropRect) => void;
}) {
  const drag = useRef<{ kind: DragKind; x: number; y: number; crop: NewsletterCropRect } | null>(
    null,
  );
  const x = (crop.x * width) / 100,
    y = (crop.y * height) / 100;
  const w = (crop.width * width) / 100,
    h = (crop.height * height) / 100;
  const handleSize = Math.max(width, height) * 0.014;
  function begin(event: PointerEvent<SVGElement>, kind: DragKind) {
    if (disabled || event.button > 0) return;
    event.preventDefault();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture(event.pointerId);
    drag.current = { kind, x: event.clientX, y: event.clientY, crop: { ...crop } };
    onBegin();
  }
  function keyboard(event: KeyboardEvent<SVGElement>, kind: DragKind) {
    if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const dx =
      ((event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0) * 100) / width;
    const dy =
      ((event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0) * 100) / height;
    onKeyChange(
      kind === 'move'
        ? moveNewsletterCrop(crop, dx, dy)
        : resizeNewsletterCrop(crop, kind, dx, dy, locked, inset),
    );
  }
  return (
    <svg
      className="nl-photo-crop-overlay"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Image crop controls"
      aria-disabled={disabled}
      onPointerMove={(event) => {
        const active = drag.current;
        if (!active || disabled) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const dx = ((event.clientX - active.x) * 100) / bounds.width;
        const dy = ((event.clientY - active.y) * 100) / bounds.height;
        onMove(
          active.kind === 'move'
            ? moveNewsletterCrop(active.crop, dx, dy)
            : resizeNewsletterCrop(active.crop, active.kind, dx, dy, locked, inset),
        );
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
      <path
        d={`M0 0H${width}V${height}H0Z M${x} ${y}V${y + h}H${x + w}V${y}Z`}
        fillRule="evenodd"
        className="nl-photo-crop-mask"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        className="nl-photo-crop-box"
        role="button"
        aria-label="Move image crop"
        tabIndex={disabled ? -1 : 0}
        onPointerDown={(event) => begin(event, 'move')}
        onKeyDown={(event) => keyboard(event, 'move')}
      />
      {[1, 2].map((part) => (
        <g key={part} className="nl-photo-crop-grid">
          <line x1={x + (w * part) / 3} x2={x + (w * part) / 3} y1={y} y2={y + h} />
          <line x1={x} x2={x + w} y1={y + (h * part) / 3} y2={y + (h * part) / 3} />
        </g>
      ))}
      {handles
        .filter(([kind]) => !cornersOnly || kind.length === 2)
        .map(([kind, name, hx, hy]) => {
          const corner = kind.length === 2;
          const props = {
            className: `nl-photo-crop-handle nl-photo-crop-handle--${kind}${inline ? ' nl-photo-inline-handle' : ''}`,
            role: 'button',
            'aria-label': `Resize image crop ${name}`,
            tabIndex: disabled ? -1 : 0,
            onPointerDown: (event: PointerEvent<SVGElement>) => begin(event, kind),
            onKeyDown: (event: KeyboardEvent<SVGElement>) => keyboard(event, kind),
          };
          if (!inline)
            return (
              <rect
                key={kind}
                {...props}
                x={x + w * hx - handleSize / 2}
                y={y + h * hy - handleSize / 2}
                width={handleSize}
                height={handleSize}
              />
            );
          const unitX = inset.x ? (inset.x * width) / 700 : handleSize / 14;
          const unitY = inset.y ? (inset.y * height) / 700 : handleSize / 14;
          const edgeX = x + w * hx,
            edgeY = y + h * hy;
          const cx = edgeX + (corner ? (hx ? -1 : 1) * Math.min(7 * unitX, w / 2) : 0);
          const cy = edgeY + (corner ? (hy ? -1 : 1) * Math.min(7 * unitY, h / 2) : 0);
          const horizontal = kind === 'n' || kind === 's';
          const hitWidth = (corner || horizontal ? 32 : 24) * unitX;
          const hitHeight = (corner || !horizontal ? 32 : 24) * unitY;
          const path = corner
            ? `M${edgeX} ${edgeY + (hy ? -18 : 18) * unitY}V${edgeY}H${edgeX + (hx ? -18 : 18) * unitX}`
            : horizontal
              ? `M${cx - 12 * unitX} ${cy}H${cx + 12 * unitX}`
              : `M${cx} ${cy - 12 * unitY}V${cy + 12 * unitY}`;
          return (
            <g key={kind} {...props}>
              <rect
                className="nl-photo-inline-hit"
                x={cx - hitWidth / 2}
                y={cy - hitHeight / 2}
                width={hitWidth}
                height={hitHeight}
                fill="transparent"
                stroke="none"
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'all' }}
              />
              <path
                d={path}
                fill="none"
                stroke="white"
                strokeWidth={6 * unitX}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          );
        })}
    </svg>
  );
}
