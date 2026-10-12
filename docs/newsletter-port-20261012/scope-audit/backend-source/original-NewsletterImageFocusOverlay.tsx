import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { newsletterFocusGeometry, type NewsletterImageEdit } from './image-editor.js';

type Region = NewsletterImageEdit['focusRegion'];
type DragKind = 'move' | 'resize' | 'rotate';
const bound = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/** Focus handles use the same output coordinates as the raster mask. */
export function NewsletterImageFocusOverlay({
  edit,
  disabled = false,
  onBegin,
  onMove,
  onFinish,
  onKeyChange,
}: {
  edit: NewsletterImageEdit;
  disabled?: boolean;
  onBegin: () => void;
  onMove: (region: Region) => void;
  onFinish: (cancelled: boolean) => void;
  onKeyChange: (region: Region) => void;
}) {
  const drag = useRef<{ kind: DragKind; x: number; y: number; region: Region } | null>(null);
  if (edit.focus === 'None' || edit.focus === 'Gaussian') return null;
  const { width, height } = edit;
  const region = newsletterFocusGeometry(edit, width, height);
  const handle = Math.max(width, height) * 0.009;
  const line = Math.hypot(width, height);
  const angle = edit.focusRegion.angle;
  const begin = (event: PointerEvent<SVGElement>, kind: DragKind) => {
    if (disabled) return;
    event.preventDefault();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture(event.pointerId);
    drag.current = { kind, x: event.clientX, y: event.clientY, region: { ...edit.focusRegion } };
    onBegin();
  };
  const keyboard = (event: KeyboardEvent<SVGElement>, kind: DragKind) => {
    if (disabled) return;
    const step = event.shiftKey ? 10 : 1;
    const next = { ...edit.focusRegion };
    if (kind === 'move') {
      if (event.key === 'ArrowLeft') next.x = bound(next.x - step);
      else if (event.key === 'ArrowRight') next.x = bound(next.x + step);
      else if (event.key === 'ArrowUp') next.y = bound(next.y - step);
      else if (event.key === 'ArrowDown') next.y = bound(next.y + step);
      else return;
    } else {
      if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) return;
      const delta = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -step : step;
      if (kind === 'resize') next.size = bound(next.size + delta, 1);
      else next.angle = ((((next.angle + delta + 180) % 360) + 360) % 360) - 180;
    }
    event.preventDefault();
    onKeyChange(next);
  };
  return (
    <svg
      className="nl-photo-focus-overlay"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Focus region controls"
      aria-disabled={disabled}
      onPointerMove={(event) => {
        const active = drag.current;
        if (!active || disabled) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = ((event.clientX - bounds.left) * width) / bounds.width;
        const y = ((event.clientY - bounds.top) * height) / bounds.height;
        const next = { ...active.region };
        if (active.kind === 'move') {
          next.x = bound(active.region.x + ((event.clientX - active.x) * 100) / bounds.width);
          next.y = bound(active.region.y + ((event.clientY - active.y) * 100) / bounds.height);
        } else if (active.kind === 'resize') {
          const centerX = (width * active.region.x) / 100,
            centerY = (height * active.region.y) / 100;
          const distance =
            edit.focus === 'Radial'
              ? Math.hypot(x - centerX, y - centerY)
              : Math.abs((x - centerX) * region.normalX + (y - centerY) * region.normalY);
          next.size = bound((distance * 200) / Math.min(width, height), 1);
        } else {
          next.angle =
            (Math.atan2(y - (height * active.region.y) / 100, x - (width * active.region.x) / 100) *
              180) /
            Math.PI;
        }
        onMove(next);
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
      <g transform={`translate(${region.x} ${region.y}) rotate(${angle})`}>
        {edit.focus === 'Radial' ? (
          <circle
            r={region.radius}
            className="nl-photo-focus-shape"
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Move focus region"
            onPointerDown={(event) => begin(event, 'move')}
            onKeyDown={(event) => keyboard(event, 'move')}
          />
        ) : (
          <>
            <rect
              x={-line}
              y={-region.radius}
              width={line * 2}
              height={region.radius * 2}
              className="nl-photo-focus-band"
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label="Move focus region"
              onPointerDown={(event) => begin(event, 'move')}
              onKeyDown={(event) => keyboard(event, 'move')}
            />
            {(edit.focus === 'Mirrored' ? [-1, 1] : [0]).map((edge) => (
              <line
                key={edge}
                x1={-line}
                x2={line}
                y1={region.radius * edge}
                y2={region.radius * edge}
                className="nl-photo-focus-line"
              />
            ))}
          </>
        )}
        <circle
          cx={edit.focus === 'Radial' ? region.radius : 0}
          cy={edit.focus === 'Radial' ? 0 : region.radius}
          r={handle}
          className="nl-photo-focus-handle"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Resize focus region"
          onPointerDown={(event) => begin(event, 'resize')}
          onKeyDown={(event) => keyboard(event, 'resize')}
        />
        {edit.focus !== 'Radial' && (
          <circle
            cx={region.radius + handle * 4}
            r={handle}
            className="nl-photo-focus-handle"
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Rotate focus region"
            onPointerDown={(event) => begin(event, 'rotate')}
            onKeyDown={(event) => keyboard(event, 'rotate')}
          />
        )}
      </g>
    </svg>
  );
}
