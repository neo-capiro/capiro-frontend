import { useRef } from 'react';

const bound = (value: number) => Math.max(-45, Math.min(45, Math.round(value * 10) / 10));
export function NewsletterImageRotationRuler({
  angle,
  disabled,
  onBegin,
  onMove,
  onFinish,
  onKeyChange,
}: {
  angle: number;
  disabled: boolean;
  onBegin: () => void;
  onMove: (angle: number) => void;
  onFinish: (cancelled: boolean) => void;
  onKeyChange: (angle: number) => void;
}) {
  const drag = useRef<{ x: number; angle: number } | null>(null);
  return (
    <div
      className="nl-photo-rotation-ruler"
      role="slider"
      aria-label="Straighten image"
      aria-valuemin={-45}
      aria-valuemax={45}
      aria-valuenow={angle}
      aria-valuetext={`${angle} degrees`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={(event) => {
        if (disabled || event.button > 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, angle };
        onBegin();
      }}
      onPointerMove={(event) => {
        if (!drag.current || disabled) return;
        onMove(bound(drag.current.angle + (drag.current.x - event.clientX) / 4));
      }}
      onPointerUp={() => {
        if (drag.current) onFinish(false);
        drag.current = null;
      }}
      onPointerCancel={() => {
        if (drag.current) onFinish(true);
        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        let value: number;
        if (event.key === 'Home') value = -45;
        else if (event.key === 'End') value = 45;
        else if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key))
          value =
            angle +
            (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1) * (event.shiftKey ? 10 : 1);
        else return;
        event.preventDefault();
        onKeyChange(bound(value));
      }}
    >
      <span className="nl-photo-ruler-ticks" style={{ backgroundPositionX: `${-angle * 4}px` }} />
      <strong>{angle}°</strong>
    </div>
  );
}
