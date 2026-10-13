import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ColorField,
  Modal,
  NumberField,
  SelectField,
  TextField,
  NewsletterFontField,
} from './controls.js';
import {
  Crop,
  Flame,
  SlidersHorizontal,
  Droplet,
  Type,
  Bookmark,
  Undo2,
  Redo2,
  Minus,
  Plus,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { newsletterCatalogStyle } from '@capiro/shared/newsletter';
import { NewsletterImageFocusOverlay } from './NewsletterImageFocusOverlay.js';
import { NewsletterImageTextOverlay } from './NewsletterImageTextOverlay.js';
import { NewsletterImageCropOverlay } from './NewsletterImageCropOverlay.js';
import { NewsletterImageRotationRuler } from './NewsletterImageRotationRuler.js';
import {
  newsletterImagePlane,
  rotateNewsletterCrop,
  type NewsletterCropRect,
} from './image-editor-crop.js';
import {
  defaultNewsletterImageEdit,
  drawNewsletterImage,
  drawNewsletterCropPreview,
  IMAGE_ADJUSTMENTS,
  loadNewsletterImage,
  loadNewsletterImageFonts,
  newsletterEditedImageFile,
  newsletterImageTextLayout,
  type NewsletterImageEdit,
  type NewsletterImageTextLayout,
} from './image-editor.js';
const FILTERS = ['None', 'Duotone', 'Black & white', 'Sepia', 'Vintage', 'Vivid', 'Cold', 'Warm'];
const COMMON_CROPS = [
  ['Custom', null],
  ['Square', 1],
  ['Landscape', 4 / 3],
  ['Portrait', 3 / 4],
  ['Wide', 16 / 9],
] as const;
const TEXT_DESIGNS = [
  {
    name: 'Policy headline',
    font: 'Arial',
    size: 54,
    bold: true,
    align: 'left' as const,
    color: '#ffffff',
    background: '#141414',
  },
  {
    name: 'Client briefing',
    font: 'Georgia',
    size: 42,
    bold: false,
    align: 'center' as const,
    color: '#ffffff',
    background: 'transparent',
  },
  {
    name: 'Source caption',
    font: 'Courier New',
    size: 22,
    bold: false,
    align: 'left' as const,
    color: '#141414',
    background: '#ffffff',
  },
];
type ImageHistoryEntry = { edit: NewsletterImageEdit; selectedText: number };
export function NewsletterImageEditor({
  url,
  onClose,
  onSave,
}: {
  url: string;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [edit, setEdit] = useState<NewsletterImageEdit | null>(null);
  const [history, setHistory] = useState<ImageHistoryEntry[]>([]);
  const [future, setFuture] = useState<ImageHistoryEntry[]>([]);
  const [panel, setPanel] = useState('Crop or Resize');
  const [locked, setLocked] = useState(false);
  const [selectedText, setSelectedText] = useState(0);
  const selectedTextRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [validPreview, setValidPreview] = useState(false);
  const [loadingFonts, setLoadingFonts] = useState(false);
  const [zoom, setZoom] = useState(100);
  const canvas = useRef<HTMLCanvasElement>(null);
  const previewArea = useRef<HTMLDivElement>(null);
  const zoomChanged = useRef(false);
  const [textLayouts, setTextLayouts] = useState<NewsletterImageTextLayout[]>([]);
  const dragStart = useRef<ImageHistoryEntry | null>(null);
  const plane =
    image && edit
      ? newsletterImagePlane(
          image.naturalWidth,
          image.naturalHeight,
          edit.rotate,
          edit.quarterTurns,
        )
      : null;
  const cropping = panel === 'Crop or Resize';
  const previewWidth = cropping && plane ? plane.width : (edit?.width ?? 1);
  const previewHeight = cropping && plane ? plane.height : (edit?.height ?? 1);
  const cropRatio =
    plane && edit ? (plane.width * edit.crop.width) / (plane.height * edit.crop.height) : 0;
  const activeCrop = locked
    ? (COMMON_CROPS.find(([, ratio]) => ratio && Math.abs(cropRatio - ratio) < 0.001)?.[0] ??
      'Custom')
    : 'Custom';
  useEffect(() => {
    let cancelled = false;
    void loadNewsletterImage(url)
      .then((value) => {
        if (cancelled) return;
        setImage(value);
        setEdit(defaultNewsletterImageEdit(value.naturalWidth, value.naturalHeight));
      })
      .catch((reason) => {
        if (!cancelled) setError(reason.message);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  useEffect(() => {
    if (!image || !edit || !canvas.current) return;
    let cancelled = false;
    setValidPreview(false);
    setLoadingFonts(!!edit.texts.length);
    void loadNewsletterImageFonts(edit.texts)
      .then(() => {
        if (cancelled || !canvas.current) return;
        const preview = cropping
          ? drawNewsletterCropPreview(image, edit, 1000)
          : drawNewsletterImage(image, edit, 1000);
        const output = canvas.current;
        output.width = preview.width;
        output.height = preview.height;
        const context = output.getContext('2d');
        if (!context) throw new Error('Image editing is unavailable in this browser.');
        context.drawImage(preview, 0, 0);
        setTextLayouts(
          edit.texts.map((text) => newsletterImageTextLayout(context, text, edit.width)),
        );
        setValidPreview(true);
        setError('');
      })
      .catch((reason) => {
        if (!cancelled) setError((reason as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoadingFonts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [image, edit, cropping]);
  useEffect(() => {
    const area = previewArea.current;
    if (!area || !edit || zoomChanged.current) return;
    const fit = () => {
      if (zoomChanged.current) return;
      const bounds = area.getBoundingClientRect();
      setZoom(
        Math.max(
          5,
          Math.min(
            300,
            Math.floor(
              Math.min((bounds.width - 48) / previewWidth, (bounds.height - 48) / previewHeight) *
                100,
            ),
          ),
        ),
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [image, previewWidth, previewHeight]);
  const changeZoom = (value: number) => {
    zoomChanged.current = true;
    setZoom(Math.max(5, Math.min(300, value)));
  };
  const tools = [
    ['Crop or Resize', Crop],
    ['Filters', Flame],
    ['Adjust', SlidersHorizontal],
    ['Focus', Droplet],
    ['Text', Type],
    ['Text Design', Bookmark],
  ] as const;
  function saveImage() {
    if (!image || !edit || busy || !validPreview) return;
    setBusy(true);
    setError('');
    void newsletterEditedImageFile(image, edit)
      .then(onSave)
      .then(onClose)
      .catch((reason) => setError(reason.message))
      .finally(() => setBusy(false));
  }
  function change(update: (value: NewsletterImageEdit) => void) {
    if (!edit || busy) return;
    const previous = { edit, selectedText: selectedTextRef.current };
    const next = structuredClone(edit);
    update(next);
    setHistory((items) => [...items.slice(-24), previous]);
    setFuture([]);
    setEdit(next);
  }
  const overlay = edit?.texts[selectedText];
  function selectText(index: number) {
    selectedTextRef.current = index;
    setSelectedText(index);
  }
  function restore(entry: ImageHistoryEntry) {
    setEdit(entry.edit);
    selectText(Math.min(entry.selectedText, Math.max(0, entry.edit.texts.length - 1)));
  }
  function selectTool(name: string) {
    setPanel(name);
    if (name === 'Text' && edit && !edit.texts.length) addText();
  }
  function finishDrag(cancelled: boolean) {
    const previous = dragStart.current;
    if (previous) {
      if (cancelled) restore(previous);
      else if (JSON.stringify(previous.edit) !== JSON.stringify(edit)) {
        setHistory((items) => [...items.slice(-24), previous]);
        setFuture([]);
      }
    }
    dragStart.current = null;
  }
  function addText(preset?: (typeof TEXT_DESIGNS)[number]) {
    if (!edit || busy) return;
    change((value) => {
      value.texts.push(
        preset
          ? { ...preset, text: preset.name, x: 50, y: 40, lineHeight: 1.1 }
          : {
              text: 'Double click to edit',
              font: 'Open Sans',
              size: 43,
              bold: true,
              fontWeight: 700,
              align: 'center',
              color: '#ffffff',
              background: 'transparent',
              x: 50,
              y: (Math.max(0, (value.height - 43 * 1.1) / 2) * 100) / value.height,
              lineHeight: 1.1,
              boxWidth: 50,
            },
      );
    });
    selectText(edit.texts.length);
  }
  function duplicateText() {
    if (!overlay || !edit || busy) return;
    change((next) => {
      next.texts.push(structuredClone(overlay));
    });
    selectText(edit.texts.length);
  }
  function removeText() {
    if (!overlay || busy) return;
    change((next) => {
      next.texts.splice(selectedText, 1);
    });
    selectText(Math.max(0, selectedText - 1));
  }
  function bringTextToFront() {
    if (!overlay || !edit || busy || selectedText === edit.texts.length - 1) return;
    change((next) => {
      const [text] = next.texts.splice(selectedText, 1);
      next.texts.push(text!);
    });
    selectText(edit.texts.length - 1);
  }
  function crop(ratio: number | null) {
    if (!plane) return;
    setLocked(!!ratio);
    if (!ratio) return;
    change((value) => {
      const naturalRatio = plane.width / plane.height;
      const width = ratio >= naturalRatio ? 100 : (ratio / naturalRatio) * 100;
      const height = ratio <= naturalRatio ? 100 : (naturalRatio / ratio) * 100;
      value.crop = { x: (100 - width) / 2, y: (100 - height) / 2, width, height };
      value.width = Math.round((plane.width * width) / 100);
      value.height = Math.round((plane.height * height) / 100);
    });
  }
  function withCrop(value: NewsletterImageEdit, nextCrop: NewsletterCropRect) {
    const width = (value.width * nextCrop.width) / value.crop.width;
    const height = (value.height * nextCrop.height) / value.crop.height;
    const scale = Math.min(1, 4096 / Math.max(width, height));
    return {
      ...value,
      crop: nextCrop,
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }
  function rotate(clockwise: boolean) {
    change((value) => {
      value.rotate += clockwise ? 90 : -90;
      value.quarterTurns += clockwise ? 1 : -1;
      value.crop = rotateNewsletterCrop(value.crop, clockwise);
      [value.width, value.height] = [value.height, value.width];
      [value.flipX, value.flipY] = [value.flipY, value.flipX];
    });
  }
  function straighten(angle: number, continuous: boolean) {
    if (busy) return;
    const update = (value: NewsletterImageEdit) => {
      value.rotate = value.quarterTurns * 90 + angle;
    };
    if (continuous)
      setEdit((previous) => {
        if (!previous) return previous;
        const next = { ...previous };
        update(next);
        return next;
      });
    else change(update);
  }
  return (
    <Modal
      title="Edit image"
      wide
      className="nl-photo-editor"
      hideHeader
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="nl-photo-toolbar">
        <div className="nl-photo-panel-title">{panel}</div>
        <div className="nl-photo-main-toolbar">
          <div className="nl-photo-history">
            <button
              aria-label="Undo image edit"
              title="Undo"
              disabled={!history.length || busy}
              onClick={() => {
                setFuture((previous) => [{ edit: edit!, selectedText }, ...previous]);
                restore(history.at(-1)!);
                setHistory((previous) => previous.slice(0, -1));
              }}
            >
              <Undo2 size={20} />
            </button>
            <button
              aria-label="Redo image edit"
              title="Redo"
              disabled={!future.length || busy}
              onClick={() => {
                setHistory((previous) => [...previous, { edit: edit!, selectedText }]);
                restore(future[0]!);
                setFuture((previous) => previous.slice(1));
              }}
            >
              <Redo2 size={20} />
            </button>
          </div>
          <div className="nl-photo-zoom">
            <button
              aria-label="Zoom out"
              title="Zoom out"
              disabled={zoom <= 5}
              onClick={() => changeZoom(zoom - 10)}
            >
              <Minus size={14} />
            </button>
            <NumberField label="Zoom (%)" min={5} max={300} value={zoom} onChange={changeZoom} />
            <span>%</span>
            <button
              aria-label="Zoom in"
              title="Zoom in"
              disabled={zoom >= 300}
              onClick={() => changeZoom(zoom + 10)}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="nl-photo-save-actions">
            <button
              aria-label="Save image"
              disabled={!image || !edit || busy || !validPreview}
              onClick={saveImage}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button disabled={busy} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
      <div className="nl-photo-body">
        <div
          className="nl-photo-tools"
          role="tablist"
          aria-label="Photo editing tools"
          aria-orientation="vertical"
        >
          {tools.map(([name, Icon], index) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={panel === name}
              tabIndex={panel === name ? 0 : -1}
              title={name}
              aria-label={name}
              disabled={!edit || busy}
              onClick={() => selectTool(name)}
              onKeyDown={(event) => {
                const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
                if (!direction && !['Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? tools.length - 1
                      : (index + direction + tools.length) % tools.length;
                selectTool(tools[next]![0]);
                (event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
              }}
            >
              <Icon size={23} />
            </button>
          ))}
        </div>
        <aside className="nl-photo-controls">
          <div className="nl-photo-controls-scroll">
            {edit && panel === 'Crop or Resize' && (
              <>
                <button
                  className="nl-photo-reset"
                  disabled={busy}
                  onClick={() => {
                    setLocked(false);
                    image &&
                      change((next) => {
                        const initial = defaultNewsletterImageEdit(
                          image.naturalWidth,
                          image.naturalHeight,
                        );
                        next.crop = initial.crop;
                        next.width = initial.width;
                        next.height = initial.height;
                        next.rotate = 0;
                        next.quarterTurns = 0;
                        next.flipX = false;
                        next.flipY = false;
                      });
                  }}
                >
                  Reset Default
                </button>
                <h3>Common crops</h3>
                <div className="nl-photo-grid nl-photo-crops">
                  {COMMON_CROPS.map(([name, ratio]) => (
                    <button
                      key={name}
                      disabled={busy}
                      aria-pressed={activeCrop === name}
                      onClick={() => crop(ratio)}
                    >
                      <span
                        className={`nl-photo-crop-shape nl-photo-crop--${String(name).toLowerCase()}`}
                      />
                      {name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {edit && panel === 'Filters' && (
              <div className="nl-photo-grid">
                {FILTERS.map((name) => (
                  <button
                    key={name}
                    aria-pressed={edit.filter === name}
                    onClick={() =>
                      change((value) => {
                        value.filter = name;
                      })
                    }
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {edit &&
              panel === 'Adjust' &&
              IMAGE_ADJUSTMENTS.map((key) => (
                <NumberField
                  key={key}
                  label={key}
                  min={key === 'Sharpness' ? 0 : -100}
                  max={100}
                  value={edit.adjustments[key]}
                  onChange={(value) =>
                    change((next) => {
                      next.adjustments[key] = value;
                    })
                  }
                />
              ))}
            {edit && panel === 'Focus' && (
              <>
                <SelectField
                  label="Focus"
                  value={edit.focus}
                  values={['None', 'Radial', 'Mirrored', 'Linear', 'Gaussian']}
                  onChange={(value) =>
                    change((next) => {
                      next.focus = value;
                    })
                  }
                />
                <NumberField
                  label="Blur amount"
                  min={0}
                  max={30}
                  value={edit.blur}
                  onChange={(value) =>
                    change((next) => {
                      next.blur = value;
                    })
                  }
                />
                {!['None', 'Gaussian'].includes(edit.focus) && (
                  <>
                    {(['x', 'y', 'size', 'angle'] as const).map((key) => (
                      <NumberField
                        key={key}
                        label={`Focus ${key}${key === 'angle' ? ' (degrees)' : ' (%)'}`}
                        min={key === 'angle' ? -180 : key === 'size' ? 1 : 0}
                        max={key === 'angle' ? 180 : 100}
                        value={edit.focusRegion[key]}
                        onChange={(value) =>
                          change((next) => {
                            next.focusRegion[key] = value;
                          })
                        }
                      />
                    ))}
                    <p className="nl-muted">
                      Drag the focus area or its handles. Arrow keys move a focused handle; Shift
                      changes it by ten.
                    </p>
                  </>
                )}
              </>
            )}
            {edit && panel === 'Text Design' && (
              <div className="nl-photo-grid">
                {TEXT_DESIGNS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      addText(preset);
                      setPanel('Text');
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
            {edit && panel === 'Text' && (
              <>
                <button onClick={() => addText()}>New text</button>
                {!!edit.texts.length && (
                  <SelectField
                    label="Text layer"
                    value={String(selectedText)}
                    values={edit.texts.map((text, index) => [
                      String(index),
                      text.text.slice(0, 30) || `Text ${index + 1}`,
                    ])}
                    onChange={(value) => selectText(Number(value))}
                  />
                )}
                {overlay && (
                  <>
                    <TextField
                      label="Image text"
                      multiline
                      value={overlay.text}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.text = value;
                        })
                      }
                    />
                    <NewsletterFontField
                      label="Image text font"
                      value={overlay.font}
                      onChange={(value) =>
                        change((next) => {
                          const face = newsletterCatalogStyle(value),
                            text = next.texts[selectedText]!;
                          text.font = value;
                          text.fontWeight = face?.fontWeight ?? 400;
                          text.bold = (face?.fontWeight ?? 400) >= 700;
                          text.italic = face?.fontStyle === 'italic';
                        })
                      }
                    />
                    <NumberField
                      label="Image text size"
                      min={8}
                      max={300}
                      value={overlay.size}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.size = value;
                        })
                      }
                    />
                    <Check
                      label="Image text bold"
                      checked={overlay.bold}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.bold = value;
                          next.texts[selectedText]!.fontWeight = value ? 700 : 400;
                        })
                      }
                    />
                    <Check
                      label="Image text italic"
                      checked={overlay.italic ?? false}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.italic = value;
                        })
                      }
                    />
                    <NumberField
                      label="Image text letter spacing"
                      min={-10}
                      max={100}
                      value={overlay.letterSpacing ?? 0}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.letterSpacing = value;
                        })
                      }
                    />
                    <NumberField
                      label="Image text rotation (degrees)"
                      min={-180}
                      max={180}
                      value={overlay.rotation ?? 0}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.rotation = value;
                        })
                      }
                    />
                    <NumberField
                      label="Image text box width (%)"
                      min={1}
                      max={100}
                      value={
                        overlay.boxWidth ??
                        Math.min(
                          100,
                          ((textLayouts[selectedText]?.width ?? edit.width / 2) * 100) / edit.width,
                        )
                      }
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.boxWidth = value;
                        })
                      }
                    />
                    <SelectField
                      label="Image text alignment"
                      value={overlay.align}
                      values={['left', 'center', 'right']}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.align = value;
                        })
                      }
                    />
                    <ColorField
                      label="Image text color"
                      value={overlay.color}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.color = value;
                        })
                      }
                    />
                    <ColorField
                      label="Image text background"
                      value={overlay.background}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.background = value;
                        })
                      }
                    />
                    <button
                      onClick={() =>
                        change((next) => {
                          next.texts[selectedText]!.background = 'transparent';
                        })
                      }
                    >
                      Remove text background
                    </button>
                    <NumberField
                      label="Image text line spacing"
                      min={0.5}
                      max={3}
                      step={0.1}
                      value={overlay.lineHeight}
                      onChange={(value) =>
                        change((next) => {
                          next.texts[selectedText]!.lineHeight = value;
                        })
                      }
                    />
                    {(['x', 'y'] as const).map((key) => (
                      <NumberField
                        key={key}
                        label={`Image text ${key} (%)`}
                        value={overlay[key]}
                        min={0}
                        max={100}
                        onChange={(value) =>
                          change((next) => {
                            next.texts[selectedText]![key] = value;
                          })
                        }
                      />
                    ))}
                    <button onClick={duplicateText}>Duplicate text</button>
                    <button onClick={removeText}>Remove text</button>
                    <p className="nl-muted">Drag in the preview to position the selected text.</p>
                  </>
                )}
              </>
            )}
          </div>
          {edit && cropping && (
            <fieldset className="nl-photo-crop-dimensions" disabled={busy}>
              <Check label="Lock dimensions" checked={locked} onChange={setLocked} />
              <div className="nl-photo-dimensions">
                {(['width', 'height'] as const).map((key) => (
                  <div key={key}>
                    <NumberField
                      label={`Image ${key} (px)`}
                      value={edit[key]}
                      min={1}
                      max={4096}
                      onChange={(value) =>
                        change((next) => {
                          const other = key === 'width' ? 'height' : 'width';
                          const requested = locked
                            ? Math.min(value, (4096 * next[key]) / next[other])
                            : value;
                          if (locked)
                            next[other] = Math.max(
                              1,
                              Math.round((requested * next[other]) / next[key]),
                            );
                          next[key] = Math.max(1, Math.round(requested));
                        })
                      }
                    />
                    <span>{key === 'width' ? 'w' : 'h'}</span>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </aside>
        <div className="nl-photo-stage">
          <div className="nl-photo-preview" ref={previewArea}>
            {!image && !error && <p role="status">Loading image…</p>}
            {loadingFonts && <p role="status">Loading image fonts…</p>}
            <div
              className="nl-photo-image-surface"
              style={{ width: edit ? `${(previewWidth * zoom) / 100}px` : '100%' }}
            >
              <canvas
                ref={canvas}
                aria-label="Edited image preview"
                style={{ width: '100%', touchAction: 'none' }}
              />
              {edit && plane && cropping && (
                <NewsletterImageCropOverlay
                  crop={edit.crop}
                  width={plane.width}
                  height={plane.height}
                  locked={locked}
                  disabled={busy}
                  onBegin={() => {
                    dragStart.current = { edit, selectedText: selectedTextRef.current };
                  }}
                  onMove={(nextCrop) => {
                    if (!busy)
                      setEdit((previous) => (previous ? withCrop(previous, nextCrop) : previous));
                  }}
                  onFinish={finishDrag}
                  onKeyChange={(nextCrop) =>
                    change((next) => Object.assign(next, withCrop(next, nextCrop)))
                  }
                />
              )}
              {edit && panel === 'Text' && (
                <NewsletterImageTextOverlay
                  edit={edit}
                  layouts={textLayouts}
                  selected={selectedText}
                  disabled={busy}
                  onSelect={selectText}
                  onBegin={() => {
                    dragStart.current = { edit, selectedText: selectedTextRef.current };
                  }}
                  onMove={(index, text) => {
                    if (!busy)
                      setEdit((previous) => {
                        if (!previous) return previous;
                        const texts = [...previous.texts];
                        texts[index] = text;
                        return { ...previous, texts };
                      });
                  }}
                  onFinish={finishDrag}
                  onKeyChange={(index, text) =>
                    change((next) => {
                      next.texts[index] = text;
                    })
                  }
                  onDuplicate={duplicateText}
                  onRemove={removeText}
                  onBringToFront={bringTextToFront}
                />
              )}
              {edit && panel === 'Focus' && (
                <NewsletterImageFocusOverlay
                  edit={edit}
                  disabled={busy}
                  onBegin={() => {
                    dragStart.current = { edit, selectedText: selectedTextRef.current };
                  }}
                  onMove={(region) => {
                    if (!busy)
                      setEdit((previous) =>
                        previous ? { ...previous, focusRegion: region } : previous,
                      );
                  }}
                  onFinish={finishDrag}
                  onKeyChange={(region) =>
                    change((next) => {
                      next.focusRegion = region;
                    })
                  }
                />
              )}
            </div>
          </div>
          {edit && cropping && (
            <div className="nl-photo-transform-controls">
              <button
                aria-label="Flip horizontal"
                title="Flip horizontal"
                aria-pressed={edit.flipX}
                disabled={busy}
                onClick={() =>
                  change((next) => {
                    next.flipX = !next.flipX;
                  })
                }
              >
                <FlipHorizontal size={18} />
              </button>
              <button
                aria-label="Flip vertical"
                title="Flip vertical"
                aria-pressed={edit.flipY}
                disabled={busy}
                onClick={() =>
                  change((next) => {
                    next.flipY = !next.flipY;
                  })
                }
              >
                <FlipVertical size={18} />
              </button>
              <NewsletterImageRotationRuler
                angle={Math.round((edit.rotate - edit.quarterTurns * 90) * 10) / 10}
                disabled={busy}
                onBegin={() => {
                  dragStart.current = { edit, selectedText: selectedTextRef.current };
                }}
                onMove={(angle) => straighten(angle, true)}
                onFinish={finishDrag}
                onKeyChange={(angle) => straighten(angle, false)}
              />
              <button
                aria-label="Rotate left"
                title="Rotate left"
                disabled={busy}
                onClick={() => rotate(false)}
              >
                <RotateCcw size={18} />
              </button>
              <button
                aria-label="Rotate right"
                title="Rotate right"
                disabled={busy}
                onClick={() => rotate(true)}
              >
                <RotateCw size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="nl-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
