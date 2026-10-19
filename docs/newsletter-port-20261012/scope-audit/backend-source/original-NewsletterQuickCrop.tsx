import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Crop, Square, RectangleHorizontal, RectangleVertical, RotateCcw } from 'lucide-react';
import type { NewsletterBlock } from '@capiro/shared/newsletter';
import { newsletterBundledImageUrl } from '@capiro/shared/newsletter-render';
import { newsletterError } from './api.js';
import { NewsletterImageCropOverlay } from './NewsletterImageCropOverlay.js';
import type { NewsletterCropRect } from './image-editor-crop.js';
import {
  defaultNewsletterImageEdit,
  loadNewsletterImage,
  newsletterEditedImageFile,
} from './image-editor.js';

export interface NewsletterCropSource {
  key: number;
  documentId: string;
  blockId: string;
  url: string;
  alt: string;
  legacyCrop: NewsletterBlock['crop'];
}
type Preset = 'Freeform' | 'Square' | 'Horizontal' | 'Vertical' | 'Original';
type Draft = { crop: NewsletterCropRect; preset: Preset };
const full: NewsletterCropRect = { x: 0, y: 0, width: 100, height: 100 };
const presets = [
  ['Freeform', Crop],
  ['Square', Square],
  ['Horizontal', RectangleHorizontal],
  ['Vertical', RectangleVertical],
  ['Original', RotateCcw],
] as const;

export function newsletterQuickCropFit(width: number, height: number, ratio: number, inset = 0) {
  const offset = Math.max(0, Math.min(inset, (Math.min(width, height) - 1) / 2)) * 2;
  const w = Math.min(width - offset, (height - offset) * ratio) + offset,
    h = (w - offset) / ratio + offset;
  const cropWidth = (w / width) * 100,
    cropHeight = (h / height) * 100;
  return {
    x: (100 - cropWidth) / 2,
    y: (100 - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };
}

export function useNewsletterQuickCrop({
  source,
  onCancel,
  onSave,
}: {
  source: NewsletterCropSource | null;
  onCancel: () => void;
  onSave: (file: File, source: NewsletterCropSource) => Promise<void>;
}) {
  const [loaded, setLoaded] = useState<{ key: number; image: HTMLImageElement } | null>(null);
  const [draft, setDraftState] = useState<Draft>({ crop: full, preset: 'Freeform' });
  const draftRef = useRef(draft);
  const initial = useRef(draft);
  const history = useRef<Draft[]>([]),
    future = useRef<Draft[]>([]);
  const [, refresh] = useState(0);
  const [pending, setPending] = useState(false);
  const [gesture, setGesture] = useState(false);
  const gestureStart = useRef<Draft | null>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [viewport, setViewport] = useState<{ key: number; width: number; height: number } | null>(
    null,
  );
  const latest = useRef({ source, onCancel, onSave });
  latest.current = { source, onCancel, onSave };
  const reportViewport = useCallback((width: number, height: number) => {
    const key = latest.current.source?.key;
    if (
      key === undefined ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    )
      return;
    setViewport((previous) =>
      previous?.key === key && previous.width === width && previous.height === height
        ? previous
        : { key, width, height },
    );
  }, []);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const update = (value: Draft) => {
    draftRef.current = value;
    setDraftState(value);
  };
  useEffect(() => {
    let canceled = false;
    setLoaded(null);
    setViewport(null);
    setError('');
    setGesture(false);
    gestureStart.current = null;
    history.current = [];
    future.current = [];
    update({ crop: full, preset: 'Freeform' });
    if (source) {
      loadNewsletterImage(source.url)
        .then((image) => {
          if (canceled) return;
          let crop = { ...full };
          if (source.legacyCrop) {
            crop = newsletterQuickCropFit(
              image.naturalWidth,
              image.naturalHeight,
              source.legacyCrop.width / source.legacyCrop.height,
            );
            crop.x = ((100 - crop.width) * source.legacyCrop.x) / 100;
            crop.y = ((100 - crop.height) * source.legacyCrop.y) / 100;
          }
          initial.current = { crop, preset: 'Freeform' };
          update(initial.current);
          setLoaded({ key: source.key, image });
        })
        .catch((e) => {
          if (!canceled) setError(newsletterError(e));
        });
    }
    return () => {
      canceled = true;
    };
  }, [source?.key, retry]);
  useEffect(() => {
    if (!source) return;
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !(event.target instanceof Element && event.target.closest('[role="dialog"]')) &&
        !inFlight.current
      ) {
        event.preventDefault();
        latest.current.onCancel();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [source?.key]);
  const ready = source && loaded?.key === source.key ? loaded.image : null;
  const plane =
    viewport?.key === source?.key
      ? viewport
      : ready
        ? { width: ready.naturalWidth, height: ready.naturalHeight }
        : null;
  const insetPixels = plane
    ? Math.max(0, Math.min(7, (Math.min(plane.width, plane.height) - 1) / 2))
    : 0;
  const inset = plane
    ? { x: (insetPixels / plane.width) * 100, y: (insetPixels / plane.height) * 100 }
    : { x: 0, y: 0 };
  const change = (value: Draft) => {
    if (JSON.stringify(value) === JSON.stringify(draftRef.current)) return;
    history.current.push(draftRef.current);
    if (history.current.length > 80) history.current.shift();
    future.current = [];
    update(value);
  };
  const cancel = () => {
    if (!inFlight.current) latest.current.onCancel();
  };
  return {
    source,
    reportViewport,
    inset,
    draft,
    ready,
    pending,
    gesture,
    error,
    dirty: !!ready && JSON.stringify(draft.crop) !== JSON.stringify(initial.current.crop),
    canUndo: !!history.current.length && !pending && !gesture,
    canRedo: !!future.current.length && !pending && !gesture,
    cancel,
    retry: () => setRetry((value) => value + 1),
    preset: (preset: Preset) => {
      if (!ready || inFlight.current || gestureStart.current) return;
      if (!plane) return;
      const crop =
        preset === 'Freeform'
          ? { ...full }
          : newsletterQuickCropFit(
              plane.width,
              plane.height,
              preset === 'Original'
                ? ready.naturalWidth / ready.naturalHeight
                : preset === 'Square'
                  ? 1
                  : preset === 'Horizontal'
                    ? 3 / 2
                    : 2 / 3,
              insetPixels,
            );
      change({ crop, preset });
    },
    undo: () => {
      if (inFlight.current || gestureStart.current) return;
      const value = history.current.pop();
      if (value) {
        future.current.push(draftRef.current);
        update(value);
      }
    },
    redo: () => {
      if (inFlight.current || gestureStart.current) return;
      const value = future.current.pop();
      if (value) {
        history.current.push(draftRef.current);
        update(value);
      }
    },
    begin: () => {
      if (inFlight.current) return;
      gestureStart.current = draftRef.current;
      setGesture(true);
    },
    move: (crop: NewsletterCropRect) => {
      if (gestureStart.current && !inFlight.current) update({ ...draftRef.current, crop });
    },
    finish: (cancelled: boolean) => {
      const start = gestureStart.current;
      gestureStart.current = null;
      setGesture(false);
      if (!start) return;
      if (cancelled) update(start);
      else if (JSON.stringify(start) !== JSON.stringify(draftRef.current)) {
        history.current.push(start);
        if (history.current.length > 80) history.current.shift();
        future.current = [];
        refresh((value) => value + 1);
      }
    },
    keyChange: (crop: NewsletterCropRect) => {
      if (!inFlight.current && !gestureStart.current) change({ ...draftRef.current, crop });
    },
    done: async () => {
      if (!ready || !source || inFlight.current || gestureStart.current) return;
      if (JSON.stringify(draftRef.current.crop) === JSON.stringify(initial.current.crop)) {
        cancel();
        return;
      }
      const capture = source;
      const edit = defaultNewsletterImageEdit(ready.naturalWidth, ready.naturalHeight);
      edit.crop = { ...draftRef.current.crop };
      const width = (ready.naturalWidth * edit.crop.width) / 100,
        height = (ready.naturalHeight * edit.crop.height) / 100;
      const scale = Math.min(1, 4096 / Math.max(width, height));
      edit.width = Math.max(1, Math.round(width * scale));
      edit.height = Math.max(1, Math.round(height * scale));
      inFlight.current = true;
      setPending(true);
      setError('');
      try {
        const file = await newsletterEditedImageFile(ready, edit);
        if (mounted.current && latest.current.source?.key === capture.key)
          await latest.current.onSave(file, capture);
      } catch (e) {
        if (mounted.current && latest.current.source?.key === capture.key)
          setError(newsletterError(e));
      } finally {
        inFlight.current = false;
        if (mounted.current) setPending(false);
      }
    },
  };
}
type Controller = ReturnType<typeof useNewsletterQuickCrop>;

export function NewsletterQuickCropSidebar({ crop }: { crop: Controller }) {
  return (
    <section aria-label="Crop image" className="nl-quick-crop-sidebar">
      <h2>Crop</h2>
      <div role="group" aria-label="Crop presets" className="nl-quick-crop-presets">
        {presets.map(([name, Icon]) => (
          <button
            key={name}
            type="button"
            aria-pressed={crop.draft.preset === name}
            disabled={!crop.ready || crop.pending || crop.gesture}
            onClick={() => crop.preset(name)}
          >
            <Icon size={27} />
            <span>{name}</span>
          </button>
        ))}
      </div>
      {!crop.ready && !crop.error && <p role="status">Loading image…</p>}
      {crop.error && <p role="alert">{crop.error}</p>}
      {!crop.ready && crop.error && (
        <button type="button" onClick={crop.retry}>
          Try again
        </button>
      )}
      <footer>
        <button type="button" disabled={crop.pending} onClick={crop.cancel}>
          Cancel
        </button>
        <button
          type="button"
          className="nl-primary"
          disabled={!crop.ready || crop.pending || crop.gesture}
          onClick={() => void crop.done()}
        >
          {crop.pending ? 'Saving image…' : 'Done'}
        </button>
      </footer>
    </section>
  );
}

export function NewsletterQuickCropCanvas({
  crop,
  block,
  style,
}: {
  crop: Controller;
  block: NewsletterBlock;
  style: CSSProperties;
}) {
  const image = useRef<HTMLImageElement>(null);
  const measure = useCallback(() => {
    const bounds = image.current?.getBoundingClientRect();
    if (bounds) crop.reportViewport(bounds.width, bounds.height);
  }, [crop.reportViewport]);
  useLayoutEffect(() => {
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (image.current) observer?.observe(image.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, crop.source?.key, crop.ready]);
  const {
    paddingTop = 12,
    paddingBottom = 12,
    paddingLeft = 0,
    paddingRight = 0,
    margin,
    width,
    height,
    ...imageStyle
  } = style;
  return (
    <div style={{ paddingTop, paddingBottom, paddingLeft, paddingRight, margin }}>
      <div
        className="nl-quick-crop-canvas"
        style={{
          ...imageStyle,
          width: '100%',
          marginLeft: style.textAlign === 'center' || style.textAlign === 'right' ? 'auto' : 0,
          marginRight: style.textAlign === 'right' ? 0 : 'auto',
        }}
      >
        <img
          ref={image}
          onLoad={measure}
          src={newsletterBundledImageUrl(block.imageUrl)}
          alt={block.alt}
        />
        {crop.ready && (
          <NewsletterImageCropOverlay
            crop={crop.draft.crop}
            width={crop.ready.naturalWidth}
            height={crop.ready.naturalHeight}
            locked={crop.draft.preset !== 'Freeform'}
            cornersOnly={crop.draft.preset !== 'Freeform'}
            inset={crop.inset}
            inline
            disabled={crop.pending}
            onBegin={crop.begin}
            onMove={crop.move}
            onFinish={crop.finish}
            onKeyChange={crop.keyChange}
          />
        )}
      </div>
    </div>
  );
}
