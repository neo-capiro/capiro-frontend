import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react';
import { NewsletterImageDescription, NewsletterImageSize } from './NewsletterImageControls.js';
import { NewsletterApps } from './NewsletterApps.js';
import { NewsletterSocialContent, NewsletterSocialStyles } from './NewsletterSocialControls.js';
import { NewsletterVideoDesign } from './NewsletterVideoDesign.js';
import { NewsletterVideoUrlControl } from './NewsletterVideoUrlControl.js';
import { newsletterSocialSettings } from '@capiro/shared/newsletter';
import { useNavigate } from 'react-router-dom';
import { useApiScope } from '../../../../lib/use-api-scope.js';
import {
  LayoutGrid,
  Layers,
  Paintbrush,
  Sparkles,
  Monitor,
  Smartphone,
  Undo2,
  Redo2,
  MessageSquare,
  Eye,
  Copy,
  Trash2,
  GripVertical,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Image,
  Type,
  AlignLeft,
  MousePointer2,
  Minus,
  MoveVertical,
  Video,
  Share2,
  Flag,
  ClipboardList,
  Code,
  Plug,
  ShoppingBag,
  ShoppingBasket,
  PanelBottom,
  X,
  Crop as CropIcon,
  SlidersHorizontal,
  Link2,
} from 'lucide-react';
import {
  createNewsletterBlock,
  createNewsletterSection,
  applyNewsletterBrandKit,
  newsletterBrandButtonStyle,
  newsletterDesignFonts,
  newsletterDesignFontRequests,
  newsletterVideoSource,
  newsletterCustomVideoThumbnail,
  defaultNewsletterStyles,
  findNewsletterBlock,
  NEWSLETTER_BLOCK_KINDS,
  NEWSLETTER_BLOCK_LABELS,
  NEWSLETTER_COLUMN_RATIOS,
  visitNewsletterBlocks,
  type NewsletterBlock,
  type NewsletterBlockKind,
  type NewsletterCampaign,
  type NewsletterCapabilities,
  type NewsletterCheck,
  type NewsletterDesign,
  type NewsletterLibraryItem,
  type NewsletterStyle,
  type NewsletterBrandKit as BrandKit,
} from '@capiro/shared/newsletter';
import {
  newsletterEscape,
  newsletterPlainText,
  newsletterStyleCss,
  newsletterBundledImageUrl,
  newsletterFontCss,
  renderNewsletterBlock,
  renderNewsletterDesign,
} from '@capiro/shared/newsletter-render';
import {
  Check,
  ColorField,
  Field,
  Modal,
  NumberField,
  RichText,
  SelectField,
  StyleFields,
  Tabs,
  TextField,
} from './controls.js';
import {
  cloneSection,
  duplicateBlock,
  locateBlock,
  moveBlock,
  prebuiltSection,
  sanitizeNewsletterMarkup,
  SECTION_CATEGORIES,
} from './model.js';
import {
  newsletterError,
  useNewsletterApi,
  type NewsletterClient,
  type NewsletterHtmlReport,
} from './api.js';
import './newsletter.css';
import { NewsletterComments } from './NewsletterComments.js';
import { NewsletterLinkChecker, NewsletterPreviewFrame } from './NewsletterLinkChecker.js';
import {
  editNewsletterReviewLink,
  newsletterReviewLinks,
  type NewsletterReviewLink,
} from './newsletter-links.js';
import { NewsletterImageAi, saveNewsletterImageRevision } from './NewsletterImageAi.js';
import { NewsletterTemplateChooserSession } from './NewsletterTemplateChooser.js';
import { NewsletterImageEditor } from './NewsletterImageEditor.js';
import { NewsletterAdvancedImageEditor } from './NewsletterAdvancedImageEditor.js';
import { NewsletterBrandKit } from './NewsletterBrandKit.js';
import { NewsletterBrandContext, newsletterFontChoices } from './brand-context.js';
import { NewsletterWebFonts } from './NewsletterFontPicker.js';
import { NewsletterContentStudio } from './NewsletterContentStudio.js';
import { NewsletterImageReplaceMenu } from './NewsletterImageReplaceMenu.js';
import {
  NewsletterQuickCropCanvas,
  NewsletterQuickCropSidebar,
  useNewsletterQuickCrop,
  type NewsletterCropSource,
} from './NewsletterQuickCrop.js';

const icons = {
  image: Image,
  heading: Type,
  paragraph: AlignLeft,
  button: MousePointer2,
  divider: Minus,
  spacer: MoveVertical,
  video: Video,
  social: Share2,
  logo: Flag,
  survey: ClipboardList,
  code: Code,
  apps: Plug,
  product: ShoppingBag,
  'product-rec': ShoppingBasket,
  footer: PanelBottom,
  columns: LayoutGrid,
};
type DropTarget = { sectionId: string; columnId?: string; column?: number; beforeId?: string };
type DragPayload = { id?: string; kind?: NewsletterBlockKind; ratio?: string };
type ModalName =
  | 'preview'
  | 'template'
  | 'save-template'
  | 'save-section'
  | 'assets'
  | 'image-edit'
  | 'advanced-image-edit'
  | 'image-ai'
  | 'ai'
  | 'plain-text'
  | 'details'
  | 'stage'
  | 'brand-kit'
  | null;
const projection = (doc: NewsletterCampaign) =>
  JSON.stringify({ name: doc.name, design: doc.design, config: doc.config });
function cssStyle(value: NewsletterStyle): CSSProperties {
  const node = document.createElement('div');
  node.setAttribute('style', newsletterStyleCss(value));
  const result: Record<string, string> = {};
  for (const name of Array.from(node.style))
    result[name.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase())] =
      node.style.getPropertyValue(name);
  return result as CSSProperties;
}

/** Mailchimp's authoring flow adapted to Capiro's Workspace/Outreach boundary. */
export function NewsletterEditor({ documentId }: { documentId: string }) {
  const identity = useApiScope();
  const api = useNewsletterApi();
  return (
    <NewsletterEditorSession
      key={`${JSON.stringify(identity)}:${documentId}`}
      documentId={documentId}
      api={api}
    />
  );
}
export function NewsletterEditorSession({
  documentId,
  api,
}: {
  documentId: string;
  api: NewsletterClient;
}) {
  const navigate = useNavigate();
  const [document, setDocument] = useState<NewsletterCampaign | null>(null);
  const current = useRef<NewsletterCampaign | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saveState, setSaveState] = useState('Loading…');
  const [busy, setBusy] = useState(false);
  const persisted = useRef('');
  const serial = useRef(Promise.resolve());
  const conflicted = useRef(false);
  const mounted = useRef(true);
  const history = useRef<NewsletterCampaign[]>([]);
  const future = useRef<NewsletterCampaign[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (selected)
      window.document
        .getElementById(`nl-editor-block-${selected}`)
        ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selected]);
  const [rail, setRail] = useState('Blocks');
  const [tab, setTab] = useState('Content');
  const [sectionTab, setSectionTab] = useState('Manage');
  const [device, setDevice] = useState('Desktop');
  const [styleCategory, setStyleCategory] = useState('Background');
  const [textLevel, setTextLevel] = useState<'p' | 'h1' | 'h2' | 'h3' | 'h4'>('p');
  const [modal, setModal] = useState<ModalName>(null);
  const [actions, setActions] = useState(false);
  const actionsMenu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!actions) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionsMenu.current?.contains(event.target))
        setActions(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setActions(false);
      actionsMenu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    };
    window.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeWithEscape, true);
    return () => {
      window.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeWithEscape, true);
    };
  }, [actions]);
  const [saveName, setSaveName] = useState('');
  const [folder, setFolder] = useState('');
  const [sections, setSections] = useState<NewsletterLibraryItem[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [cropSource, setCropSourceState] = useState<NewsletterCropSource | null>(null);
  const cropSourceRef = useRef<NewsletterCropSource | null>(null);
  const cropSequence = useRef(0);
  const [imageEditSource, setImageEditSource] = useState<NewsletterCropSource | null>(null);
  const imageEditSourceRef = useRef<NewsletterCropSource | null>(null);
  const setCropSource = (source: NewsletterCropSource | null) => {
    cropSourceRef.current = source;
    setCropSourceState(source);
  };
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('Recent');
  const [libraryEdit, setLibraryEdit] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [capabilities, setCapabilities] = useState<NewsletterCapabilities | null>(null);
  const [checks, setChecks] = useState<NewsletterCheck[]>([]);
  const [htmlReport, setHtmlReport] = useState<NewsletterHtmlReport | null>(null);
  const [htmlCheckError, setHtmlCheckError] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewDocument, setPreviewDocument] = useState<NewsletterCampaign | null>(null);
  const [previewDevice, setPreviewDevice] = useState('Desktop');
  const [mergeTags, setMergeTags] = useState(false);
  const [linkCheck, setLinkCheck] = useState(false);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [reviewedLinks, setReviewedLinks] = useState<Set<string>>(() => new Set());
  const [aiSource, setAiSource] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiKind, setAiKind] = useState('Refine text');
  const [aiDestination, setAiDestination] = useState<'block' | 'column'>('block');
  const dragPayload = useRef<DragPayload | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageUploadTarget = useRef<NewsletterCropSource | null>(null);
  const imageUploadPending = useRef(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const assetTarget = useRef<NewsletterCropSource | null>(null);
  const imageLinkInput = useRef<HTMLInputElement>(null);
  const [focusImageLink, setFocusImageLink] = useState(false);
  useEffect(() => {
    if (focusImageLink && imageLinkInput.current) {
      imageLinkInput.current.focus();
      setFocusImageLink(false);
    }
  }, [focusImageLink, selected]);
  const apply = useCallback((doc: NewsletterCampaign) => {
    current.current = doc;
    setDocument(doc);
  }, []);
  useEffect(() => {
    mounted.current = true;
    let canceled = false;
    api
      .get(documentId)
      .then((doc) => {
        if (!canceled) {
          persisted.current = projection(doc);
          apply(doc);
          setSaveState('Changes saved');
        }
      })
      .catch((e) => {
        if (!canceled) setError(newsletterError(e));
      });
    api
      .capabilities()
      .then((c) => {
        if (!canceled) setCapabilities(c);
      })
      .catch(() => {});
    api
      .brandKit()
      .then((kit) => {
        if (!canceled) setBrandKit(kit);
      })
      .catch(() => {});
    return () => {
      canceled = true;
      mounted.current = false;
    };
  }, [api, documentId, apply]);
  const mutate = (edit: (draft: NewsletterCampaign) => void) => {
    if (!current.current) return;
    history.current.push(structuredClone(current.current));
    if (history.current.length > 80) history.current.shift();
    future.current = [];
    const draft = structuredClone(current.current);
    if (brandKit)
      draft.design.fonts = [
        ...new Map(
          [...newsletterDesignFonts(draft.design), ...brandKit.fonts.uploaded].map((font) => [
            font.assetId,
            font,
          ]),
        ).values(),
      ];
    edit(draft);
    draft.status = 'draft';
    apply(draft);
    setSaveState('Unsaved changes');
  };
  const quickCrop = useNewsletterQuickCrop({
    source: cropSource,
    onCancel: () => setCropSource(null),
    onSave: async (file, source) => {
      const isCurrent = () =>
        mounted.current &&
        cropSourceRef.current?.key === source.key &&
        current.current?.id === source.documentId &&
        findNewsletterBlock(current.current.design, source.blockId)?.imageUrl === source.url;
      if (!isCurrent())
        throw new Error('The image changed. Reopen Crop to edit its current version.');
      const asset = await saveNewsletterImageRevision(api, source.url, file, source.documentId);
      if (!isCurrent())
        throw new Error('The image changed. The cropped version is available in Content Studio.');
      mutate((draft) => {
        const image = findNewsletterBlock(draft.design, source.blockId);
        if (image) {
          image.imageUrl = asset.url;
          newsletterCustomVideoThumbnail(image);
          image.crop = null;
        }
      });
      setCropSource(null);
    },
  });
  const cropHasUnsavedChanges = useRef(false);
  cropHasUnsavedChanges.current = quickCrop.dirty || quickCrop.pending;
  const save = useCallback(async () => {
    let result: NewsletterCampaign | null = null;
    const operation = serial.current
      .catch(() => {})
      .then(async () => {
        const snapshot = current.current;
        if (!snapshot) throw new Error('Newsletter is loading.');
        if (conflicted.current)
          throw new Error('Reload the newsletter to resolve the conflicting edit.');
        const fingerprint = projection(snapshot);
        if (fingerprint === persisted.current) {
          result = snapshot;
          return;
        }
        if (mounted.current) setSaveState('Saving…');
        try {
          const saved = await api.save(snapshot);
          persisted.current = projection(saved);
          if (current.current) {
            const unchanged = projection(current.current) === fingerprint;
            const next = unchanged
              ? saved
              : { ...current.current, revision: saved.revision, updatedAt: saved.updatedAt };
            current.current = next;
            result = next;
            if (mounted.current) {
              setDocument(next);
              setSaveState(unchanged ? 'Changes saved' : 'Unsaved changes');
            }
          }
        } catch (e) {
          if ((e as { response?: { status: number } }).response?.status === 409)
            conflicted.current = true;
          if (mounted.current) {
            setError(newsletterError(e));
            setSaveState('Changes not saved');
          }
          throw e;
        }
      });
    serial.current = operation;
    await operation;
    return result || current.current!;
  }, [api]);
  const fingerprint = document ? projection(document) : '';
  useEffect(() => {
    if (!document || fingerprint === persisted.current || conflicted.current) return;
    const timer = window.setTimeout(() => {
      void save().catch(() => {});
    }, 800);
    return () => window.clearTimeout(timer);
  }, [fingerprint, document, save]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (
        cropHasUnsavedChanges.current ||
        (current.current && projection(current.current) !== persisted.current)
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(newsletterError(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const block = document && selected ? findNewsletterBlock(document.design, selected) : null;
  const section = document?.design.sections.find((s) => s.id === selected) || null;
  const editBlock = (edit: (block: NewsletterBlock) => void) =>
    mutate((draft) => {
      const b = findNewsletterBlock(draft.design, selected || '');
      if (b) edit(b);
    });
  const openBrandKit = () =>
    void run(async () => {
      const kit = await api.brandKit();
      if (mounted.current) {
        setBrandKit(kit);
        setModal('brand-kit');
        setActions(false);
      }
    });
  const brandNewBlock = (block: NewsletterBlock): NewsletterBlock => {
    if (!brandKit) return block;
    const logo = brandKit.logos.find((item) => item.assetId === brandKit.primaryLogoId);
    const button = brandKit.buttons.find((item) => item.id === brandKit.primaryButtonId);
    if (logo && block.kind === 'logo')
      Object.assign(block, {
        imageUrl: logo.url,
        url: logo.link,
        linkType: 'web',
        alt: logo.alt,
        text: '',
        crop: null,
      });
    if (button && block.kind === 'button')
      Object.assign(block.style, newsletterBrandButtonStyle(button));
    return block;
  };
  const select = (id: string) => {
    if (quickCrop.pending) return;
    if (cropSource && cropSource.blockId !== id) setCropSource(null);
    setSelected(id);
    setRail('Blocks');
    setTab('Content');
  };
  const startCrop = (image: NewsletterBlock) => {
    if (!current.current || !image.imageUrl || quickCrop.pending) return;
    select(image.id);
    setActions(false);
    setCropSource({
      key: ++cropSequence.current,
      documentId: current.current.id,
      blockId: image.id,
      url: image.imageUrl,
      alt: image.alt,
      legacyCrop: image.crop,
    });
  };
  const startImageEdit = (image: NewsletterBlock, advanced = false) => {
    if (!current.current || !image.imageUrl || quickCrop.pending) return;
    select(image.id);
    const source = {
      key: ++cropSequence.current,
      documentId: current.current.id,
      blockId: image.id,
      url: image.imageUrl,
      alt: image.alt,
      legacyCrop: image.crop,
    };
    imageEditSourceRef.current = source;
    setImageEditSource(source);
    setModal(advanced ? 'advanced-image-edit' : 'image-edit');
  };
  const closeImageEdit = () => {
    imageEditSourceRef.current = null;
    setImageEditSource(null);
    setModal(null);
  };
  const saveImageEdit = async (file: File) => {
    const source = imageEditSource;
    const isCurrent = () =>
      source &&
      mounted.current &&
      imageEditSourceRef.current?.key === source.key &&
      current.current?.id === source.documentId &&
      findNewsletterBlock(current.current.design, source.blockId)?.imageUrl === source.url;
    if (!source || !isCurrent())
      throw new Error('The image changed. Reopen the editor for its current version.');
    const asset = await saveNewsletterImageRevision(api, source.url, file, source.documentId);
    if (!isCurrent())
      throw new Error('The image changed. The edited version is available in Content Studio.');
    mutate((draft) => {
      const image = findNewsletterBlock(draft.design, source.blockId);
      if (image) {
        image.imageUrl = asset.url;
        newsletterCustomVideoThumbnail(image);
        image.crop = null;
      }
    });
  };
  const undo = () => {
    const previous = history.current.pop();
    if (!previous || !current.current) return;
    future.current.push(current.current);
    apply({
      ...previous,
      revision: current.current.revision,
      updatedAt: current.current.updatedAt,
    });
    setNotice('');
    setSaveState('Unsaved changes');
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next || !current.current) return;
    history.current.push(current.current);
    apply({ ...next, revision: current.current.revision, updatedAt: current.current.updatedAt });
    setNotice('');
    setSaveState('Unsaved changes');
  };
  const openLibrary = async () => {
    const ss = await api.library('section');
    setSections(ss);
  };
  const openPreview = () =>
    void run(async () => {
      const saved = await save();
      const preview = await api.preview(saved.id, mergeTags);
      setPreviewHtml(preview.html);
      setPreviewDocument(structuredClone(saved));
      setChecks(preview.checks);
      setLinkCheck(false);
      setSelectedLink(null);
      setPreviewDevice('Desktop');
      setModal('preview');
    });
  const saveReviewedLink = async (link: NewsletterReviewLink, url: string) => {
    if (busy || !current.current) throw new Error('Wait for the current operation to finish.');
    setBusy(true);
    try {
      const draft = structuredClone(current.current);
      if (editNewsletterReviewLink(draft, link, url))
        mutate((next) => {
          editNewsletterReviewLink(next, link, url);
        });
      const saved = await save();
      const preview = await api.preview(saved.id, mergeTags);
      const next = newsletterReviewLinks(saved).find(
        (item) => item.blockId === link.blockId && item.index === link.index,
      );
      if (!next) throw new Error('The link changed. Reopen the preview to review it.');
      if (mounted.current) {
        setPreviewHtml(preview.html);
        setPreviewDocument(structuredClone(saved));
        setChecks(preview.checks);
      }
      return next;
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const replacementSource = (image: NewsletterBlock): NewsletterCropSource | null =>
    current.current
      ? {
          key: ++cropSequence.current,
          documentId: current.current.id,
          blockId: image.id,
          url: image.imageUrl,
          alt: image.alt,
          legacyCrop: image.crop,
        }
      : null;
  const currentReplacement = (source: NewsletterCropSource) =>
    mounted.current &&
    current.current?.id === source.documentId &&
    findNewsletterBlock(current.current.design, source.blockId)?.imageUrl === source.url;
  const chooseImageFile = (image: NewsletterBlock) => {
    if (imageUploadPending.current || busy || quickCrop.pending) return;
    imageUploadTarget.current = replacementSource(image);
    if (fileInput.current) {
      fileInput.current.accept =
        image.kind === 'video'
          ? 'image/png,image/jpeg,image/gif'
          : 'image/png,image/jpeg,image/gif,image/webp';
      fileInput.current.click();
    }
  };
  const openAssets = (image: NewsletterBlock) => {
    if (imageUploadPending.current || busy || quickCrop.pending) return;
    assetTarget.current = replacementSource(image);
    setModal('assets');
  };
  const upload = (file?: File) => {
    const source = imageUploadTarget.current;
    if (!file || !source || imageUploadPending.current || !currentReplacement(source)) return;
    imageUploadPending.current = true;
    setUploadingImage(true);
    void run(async () => {
      try {
        if (!file.size) throw new Error('Choose an image that is not empty.');
        if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller.');
        if (
          findNewsletterBlock(current.current!.design, source.blockId)?.kind === 'video' &&
          !['image/png', 'image/jpeg', 'image/gif'].includes(file.type)
        )
          throw new Error('Video thumbnails must be PNG, JPG or GIF files.');
        const asset = await api.upload(file);
        if (!mounted.current) return;
        if (imageUploadTarget.current?.key !== source.key || !currentReplacement(source)) {
          setNotice('The image changed during upload. Your upload is available in Content Studio.');
          return;
        }
        mutate((draft) => {
          const image = findNewsletterBlock(draft.design, source.blockId);
          if (!image) return;
          image.imageUrl = asset.url;
          newsletterCustomVideoThumbnail(image);
          image.crop = null;
          if (!image.alt) image.alt = file.name.replace(/\.[^.]+$/, '');
        });
        imageUploadTarget.current = null;
        setNotice('Image added.');
      } finally {
        imageUploadPending.current = false;
        if (mounted.current) setUploadingImage(false);
      }
    });
  };
  const startDrag = (e: DragEvent, payload: DragPayload) => {
    dragPayload.current = payload;
    e.dataTransfer.setData('application/x-capiro-newsletter', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = payload.id ? 'move' : 'copy';
  };
  const drop = (e: DragEvent, target: DropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    if (cropSource) return;
    let payload = dragPayload.current;
    try {
      payload = JSON.parse(
        e.dataTransfer.getData('application/x-capiro-newsletter'),
      ) as DragPayload;
    } catch {
      /* Native drop may omit custom formats. */
    }
    if (!payload) return;
    const data = payload;
    mutate((draft) => {
      if (data.id) {
        moveBlock(draft.design, data.id, target);
        setSelected(data.id);
        return;
      }
      if (!data.kind) return;
      const b = brandNewBlock(
        createNewsletterBlock(
          data.kind,
          data.ratio
            ? {
                ratio: data.ratio,
                columns: Array.from(
                  { length: data.ratio.includes(':') ? 2 : Number(data.ratio) },
                  () => [],
                ),
              }
            : {},
        ),
      );
      const s = draft.design.sections.find((s) => s.id === target.sectionId);
      const parent = target.columnId ? findNewsletterBlock(draft.design, target.columnId) : null;
      const list = parent ? parent.columns[target.column || 0] : s?.blocks;
      if (!list) return;
      const index = target.beforeId ? list.findIndex((b) => b.id === target.beforeId) : list.length;
      list.splice(index < 0 ? list.length : index, 0, b);
      setSelected(b.id);
      setTab('Content');
    });
    dragPayload.current = null;
  };
  const addBlock = (kind: NewsletterBlockKind, ratio?: string) =>
    mutate((draft) => {
      const b = brandNewBlock(
        createNewsletterBlock(
          kind,
          ratio
            ? {
                ratio,
                columns: Array.from({ length: ratio.includes(':') ? 2 : Number(ratio) }, () => []),
              }
            : {},
        ),
      );
      const location = selected ? locateBlock(draft.design, selected) : null;
      const section =
        draft.design.sections.find((s) => s.id === selected) ||
        draft.design.sections.find((s) => s.name === 'Body') ||
        draft.design.sections[0];
      if (location) location.list.splice(location.index + 1, 0, b);
      else {
        if (section) section.blocks.push(b);
        else draft.design.sections.push(createNewsletterSection('Body', [b]));
      }
      setSelected(b.id);
      setTab('Content');
    });
  const removeBlock = (id: string) =>
    mutate((draft) => {
      const location = locateBlock(draft.design, id);
      if (location) location.list.splice(location.index, 1);
      if (selected === id) setSelected(null);
    });
  const moveSelected = (id: string, direction: number) =>
    mutate((draft) => {
      const location = locateBlock(draft.design, id);
      if (
        !location ||
        location.index + direction < 0 ||
        location.index + direction >= location.list.length
      )
        return;
      const [b] = location.list.splice(location.index, 1);
      location.list.splice(location.index + direction, 0, b!);
    });
  const effectiveStyle = (b: NewsletterBlock) => {
    const styles = document!.design.styles;
    const types = device === 'Mobile' && !styles.linkedStyles ? styles.mobileText : styles.text;
    const defaults =
      b.kind === 'heading'
        ? types[`h${b.headingLevel}`]
        : ['paragraph', 'footer', 'code', 'apps'].includes(b.kind)
          ? types.p
          : b.kind === 'button' || (b.kind === 'survey' && !!b.survey)
            ? device === 'Mobile' && !styles.linkedStyles
              ? { ...styles.button, ...styles.mobileButton }
              : styles.button
            : {};
    return {
      ...defaults,
      ...(b.kind === 'apps' && b.app?.showBackground ? { color: '#1f2937' } : {}),
      ...b.style,
      ...(device === 'Mobile' && !b.linkedStyles ? b.mobileStyle : {}),
    };
  };
  const renderList = (blocks: NewsletterBlock[], target: DropTarget) => (
    <>
      {blocks.map((b) => (
        <div key={b.id}>
          <div
            className="nl-drop-line"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, { ...target, beforeId: b.id })}
          />
          <div
            className={`nl-canvas-block${selected === b.id ? ' is-selected' : ''}${b.visibility.mode === 'custom' ? ' is-conditional' : ''}`}
            id={`nl-editor-block-${b.id}`}
            data-block-id={b.id}
            onClick={(e) => {
              e.stopPropagation();
              if ((e.target as HTMLElement).closest('a')) e.preventDefault();
              if (selected !== b.id) select(b.id);
            }}
          >
            <div className="nl-block-bar" hidden={!!cropSource}>
              <span>{NEWSLETTER_BLOCK_LABELS[b.kind]}</span>
              <button
                draggable
                onDragStart={(e) => startDrag(e, { id: b.id })}
                aria-label={`Move ${NEWSLETTER_BLOCK_LABELS[b.kind]}`}
                title="Drag to move"
              >
                <GripVertical size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveSelected(b.id, -1);
                }}
                aria-label="Move up"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveSelected(b.id, 1);
                }}
                aria-label="Move down"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  mutate((draft) => {
                    const id = duplicateBlock(draft.design, b.id);
                    if (id) setSelected(id);
                  });
                }}
                aria-label="Duplicate block"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeBlock(b.id);
                }}
                aria-label="Remove block"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {cropSource?.blockId === b.id ? (
              <NewsletterQuickCropCanvas
                crop={quickCrop}
                block={b}
                style={cssStyle({
                  ...(b.kind === 'logo'
                    ? document!.design.styles.logo
                    : document!.design.styles.image),
                  ...effectiveStyle(b),
                })}
              />
            ) : b.kind === 'columns' ? (
              <div
                className={`nl-columns${device === 'Mobile' && b.mobileOrientation === 'stacked' ? ' nl-columns--stack' : ''}`}
                style={{
                  ...cssStyle(effectiveStyle(b)),
                  gridTemplateColumns: b.ratio.includes(':')
                    ? b.ratio
                        .split(':')
                        .map((v) => `${v}fr`)
                        .join(' ')
                    : `repeat(${b.columns.length},minmax(0,1fr))`,
                }}
              >
                {b.columns.map((column, index) => (
                  <div
                    key={index}
                    className="nl-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) =>
                      drop(e, { sectionId: target.sectionId, columnId: b.id, column: index })
                    }
                  >
                    {renderList(column, {
                      sectionId: target.sectionId,
                      columnId: b.id,
                      column: index,
                    })}
                    <div className="nl-column-drop">Drop content here</div>
                  </div>
                ))}
              </div>
            ) : selected === b.id && ['paragraph', 'heading'].includes(b.kind) ? (
              <RichText
                key={b.id}
                className="nl-inline-editor"
                label={`${NEWSLETTER_BLOCK_LABELS[b.kind]} text`}
                html={b.html || newsletterEscape(b.text).replace(/\n/g, '<br>')}
                style={{
                  ...cssStyle(effectiveStyle(b)),
                  paddingTop: b.style.paddingTop ?? 12,
                  paddingBottom: b.style.paddingBottom ?? 12,
                }}
                onChange={(html) =>
                  editBlock((block) => {
                    block.html = html;
                    block.text =
                      new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
                  })
                }
              />
            ) : (
              <div
                className="nl-rendered"
                dangerouslySetInnerHTML={{
                  __html: renderNewsletterBlock(
                    {
                      ...b,
                      style: effectiveStyle(b),
                      ...(b.social && device === 'Mobile' && !b.linkedStyles
                        ? { social: { ...b.social, desktop: b.social.mobile } }
                        : {}),
                    },
                    document!.design,
                    document!.config,
                    { sanitizeHtml: sanitizeNewsletterMarkup, editor: true },
                  ),
                }}
              />
            )}
            {!cropSource && selected === b.id && b.kind === 'video' && (
              <NewsletterVideoUrlControl
                url={b.url}
                disabled={busy}
                onChange={(url) =>
                  mutate((draft) => {
                    const target = findNewsletterBlock(draft.design, b.id);
                    if (target?.kind === 'video') {
                      target.url = url;
                      target.linkType = 'web';
                    }
                  })
                }
              />
            )}
            {!cropSource && selected === b.id && ['image', 'logo'].includes(b.kind) && (
              <div
                role="toolbar"
                aria-label="Image actions"
                className="nl-image-actions"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={!b.imageUrl}
                  onClick={() => {
                    select(b.id);
                    setModal('image-ai');
                  }}
                >
                  <Sparkles size={16} /> Refine with AI
                </button>
                <NewsletterImageReplaceMenu
                  canvas
                  disabled={uploadingImage || busy}
                  canEdit={!!b.imageUrl}
                  onUpload={() => chooseImageFile(b)}
                  onBrowse={() => {
                    select(b.id);
                    openAssets(b);
                  }}
                  onAdvanced={() => startImageEdit(b, true)}
                />
                <button type="button" disabled={!b.imageUrl} onClick={() => startCrop(b)}>
                  <CropIcon size={16} /> Crop
                </button>
                <button type="button" disabled={!b.imageUrl} onClick={() => startImageEdit(b)}>
                  <SlidersHorizontal size={16} /> Edit
                </button>
                <button
                  type="button"
                  disabled={!b.imageUrl}
                  onClick={() => startImageEdit(b, true)}
                >
                  Advanced editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    select(b.id);
                    setFocusImageLink(true);
                  }}
                >
                  <Link2 size={16} /> Add link
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
      <div
        className="nl-drop-line nl-drop-line--last"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => drop(e, target)}
      />
    </>
  );

  if (!document)
    return (
      <div className="nl-root nl-loading">
        <h1>Weekly newsletter</h1>
        <p role={error ? 'alert' : 'status'}>{error || 'Opening the newsletter…'}</p>
        <button onClick={() => navigate('/workspace/documents')}>Back to Workspace</button>
      </div>
    );
  const mobileStyle = device === 'Mobile' && block && !block.linkedStyles;
  const filteredSections = sections
    .filter(
      (s) =>
        (!folder || s.folder === folder) && s.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'Name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt),
    );
  const reviewLinks = previewDocument ? newsletterReviewLinks(previewDocument) : [];
  const reviewedLink = reviewLinks.find((link) => link.key === selectedLink);
  return (
    <NewsletterBrandContext.Provider
      value={{
        fonts: newsletterFontChoices([
          ...new Map(
            [...newsletterDesignFonts(document.design), ...(brandKit?.fonts.uploaded ?? [])].map(
              (font) => [font.assetId, font],
            ),
          ).values(),
        ]),
        colors: brandKit ? [...brandKit.colors.primary, ...brandKit.colors.secondary] : [],
      }}
    >
      <div className="nl-root">
        <NewsletterWebFonts requests={newsletterDesignFontRequests(document.design)} />
        <style>
          {newsletterFontCss([
            ...newsletterDesignFonts(document.design),
            ...(brandKit?.fonts.uploaded ?? []),
          ])}
        </style>
        <input
          ref={fileInput}
          type="file"
          hidden
          disabled={uploadingImage}
          aria-label="Upload newsletter image"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <header className="nl-header">
          <button
            className="nl-back"
            aria-label="Back to Workspace"
            disabled={!!cropSource}
            onClick={() =>
              void run(async () => {
                await save();
                navigate('/workspace/documents');
              })
            }
          >
            C<span>◁</span>
          </button>
          <div className="nl-title">
            <input
              aria-label="Newsletter name"
              value={document.name}
              onChange={(e) =>
                mutate((d) => {
                  d.name = e.target.value;
                })
              }
            />
            <span role="status">{saveState}</span>
          </div>
          <div className="nl-header-actions">
            <button onClick={openPreview}>
              <Eye size={16} />
              Preview
            </button>
            <button
              disabled={busy || !!cropSource}
              onClick={() =>
                void run(async () => {
                  await save();
                  navigate('/workspace/documents');
                })
              }
            >
              Save and exit
            </button>
            <div className="nl-menu-wrap" ref={actionsMenu}>
              <button
                disabled={quickCrop.pending}
                aria-expanded={actions}
                onClick={() => setActions(!actions)}
              >
                Actions
                <ChevronDown size={15} />
              </button>
              {actions && (
                <div className="nl-menu">
                  <button disabled={busy} onClick={openBrandKit}>
                    Brand Kit
                  </button>
                  <button
                    onClick={() => {
                      setActions(false);
                      setSaveName(document.name);
                      setFolder('');
                      setModal('save-template');
                    }}
                  >
                    Save as a template
                  </button>
                  <button
                    onClick={() => {
                      setActions(false);
                      setModal('template');
                      setSearch('');
                      void run(openLibrary);
                    }}
                  >
                    Change template
                  </button>
                  <button
                    onClick={() => {
                      setActions(false);
                      setModal('details');
                    }}
                  >
                    Newsletter details
                  </button>
                  <button
                    onClick={() => {
                      setActions(false);
                      setModal('plain-text');
                    }}
                  >
                    Plain-text version
                  </button>
                  <button
                    onClick={() => {
                      const file = new Blob(
                        [
                          renderNewsletterDesign(document.design, document.config, {
                            sanitizeHtml: sanitizeNewsletterMarkup,
                            editor: true,
                          }),
                        ],
                        { type: 'text/html' },
                      );
                      const url = URL.createObjectURL(file);
                      const a = window.document.createElement('a');
                      a.href = url;
                      a.download = `${document.name.replace(/[^a-z0-9_-]/gi, '_')}.html`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setActions(false);
                    }}
                  >
                    Export HTML
                  </button>
                </div>
              )}
            </div>
            <button
              className="nl-primary"
              disabled={busy || !!cropSource}
              onClick={() => setModal('stage')}
            >
              Stage in Outreach →
            </button>
          </div>
        </header>
        {error && (
          <div className="nl-alert" role="alert">
            <span>{error}</span>
            {conflicted.current && (
              <>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(current.current, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    a.download = 'newsletter-unsaved-edits.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download unsaved edits
                </button>
                <button
                  onClick={() =>
                    void run(async () => {
                      const doc = await api.get(documentId);
                      conflicted.current = false;
                      persisted.current = projection(doc);
                      apply(doc);
                      history.current = [];
                      future.current = [];
                      setSaveState('Changes saved');
                    })
                  }
                >
                  Reload saved version
                </button>
              </>
            )}
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div className="nl-notice" role="status">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
              ×
            </button>
          </div>
        )}
        <div className="nl-workbench">
          <nav className="nl-rail" aria-label="Newsletter tools">
            {[
              ['Blocks', LayoutGrid],
              ['Sections', Layers],
              ['Styles', Paintbrush],
              ['Optimize', Sparkles],
            ].map(([name, Icon]) => {
              const Glyph = Icon as typeof LayoutGrid;
              return (
                <button
                  key={name as string}
                  aria-pressed={rail === name}
                  disabled={quickCrop.pending}
                  onClick={() => {
                    setCropSource(null);
                    setRail(name as string);
                    setSelected(null);
                    if (name === 'Sections') void run(openLibrary);
                    if (name === 'Optimize')
                      void run(async () => {
                        const saved = await save();
                        setChecks((await api.preview(saved.id)).checks);
                      });
                  }}
                >
                  <Glyph size={22} />
                  <span>{name as string}</span>
                </button>
              );
            })}
          </nav>
          <aside className="nl-sidebar">
            {cropSource ? (
              <NewsletterQuickCropSidebar crop={quickCrop} />
            ) : (
              <>
                {rail === 'Blocks' && !selected && (
                  <>
                    <h2>Add content</h2>
                    <p className="nl-muted">Drag a block into your email or click to add it.</p>
                    <div className="nl-block-grid">
                      {NEWSLETTER_BLOCK_KINDS.filter(
                        (k) => !['columns', 'product', 'product-rec', 'survey'].includes(k),
                      ).map((kind) => {
                        const Glyph = icons[kind];
                        return (
                          <button
                            key={kind}
                            draggable
                            onDragStart={(e) => startDrag(e, { kind })}
                            onClick={() => addBlock(kind)}
                          >
                            <Glyph size={24} />
                            <span>{NEWSLETTER_BLOCK_LABELS[kind]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <h3>AI-generated columns</h3>
                    <div className="nl-ai-grid">
                      {[
                        'Article summary',
                        'Upcoming event',
                        'Legislative update',
                        'People update',
                      ].map((kind) => (
                        <button
                          key={kind}
                          onClick={() => {
                            setAiKind(kind);
                            setAiPrompt(
                              `Write a concise ${kind.toLowerCase()} for a government affairs client newsletter.`,
                            );
                            setAiSource('');
                            setAiResult('');
                            setAiDestination('column');
                            setModal('ai');
                          }}
                        >
                          <Sparkles size={16} />
                          {kind}
                        </button>
                      ))}
                    </div>
                    <h3>Columns</h3>
                    <div className="nl-ratio-grid">
                      {NEWSLETTER_COLUMN_RATIOS.map((ratio) => (
                        <button
                          key={ratio}
                          draggable
                          onDragStart={(e) => startDrag(e, { kind: 'columns', ratio })}
                          onClick={() => addBlock('columns', ratio)}
                        >
                          <span
                            className="nl-ratio-mini"
                            style={{
                              gridTemplateColumns: ratio.includes(':')
                                ? ratio
                                    .split(':')
                                    .map((v) => `${v}fr`)
                                    .join(' ')
                                : `repeat(${ratio},1fr)`,
                            }}
                          >
                            {Array.from(
                              { length: ratio.includes(':') ? 2 : Number(ratio) },
                              (_, i) => (
                                <i key={i} />
                              ),
                            )}
                          </span>
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {rail === 'Blocks' && section && (
                  <>
                    <div className="nl-panel-head">
                      <h2>Section</h2>
                      <button aria-label="Back to blocks" onClick={() => setSelected(null)}>
                        ×
                      </button>
                    </div>
                    <TextField
                      label="Section name"
                      value={section.name}
                      onChange={(value) =>
                        mutate((d) => {
                          const s = d.design.sections.find((s) => s.id === section.id);
                          if (s) s.name = value;
                        })
                      }
                    />
                    <StyleFields
                      style={section.style}
                      typography={false}
                      onChange={(style) =>
                        mutate((d) => {
                          const s = d.design.sections.find((s) => s.id === section.id);
                          if (s) s.style = style;
                        })
                      }
                    />
                  </>
                )}
                {rail === 'Blocks' && block && (
                  <>
                    <div className="nl-panel-head">
                      <h2>{NEWSLETTER_BLOCK_LABELS[block.kind]}</h2>
                      <button aria-label="Back to blocks" onClick={() => setSelected(null)}>
                        ×
                      </button>
                    </div>
                    <Tabs
                      value={
                        (block.kind === 'video' || block.survey) && tab !== 'Visibility'
                          ? 'Design'
                          : tab
                      }
                      values={
                        block.kind === 'columns'
                          ? ['Styles', 'Visibility']
                          : block.kind === 'video' || block.survey
                            ? ['Design', 'Visibility']
                            : ['Content', 'Styles', 'Visibility', 'Code']
                      }
                      onChange={(value) => setTab(value === 'Design' ? 'Content' : value)}
                    />
                    {block.kind === 'survey' && block.survey && tab !== 'Visibility' && (
                      <section aria-label="Survey block">
                        <p>
                          Hosted surveys are not enabled for newsletters. Remove this block before
                          staging.
                        </p>
                        <button type="button" onClick={() => removeBlock(block.id)}>
                          Remove survey block
                        </button>
                      </section>
                    )}
                    {block.kind === 'video' && tab !== 'Visibility' && (
                      <NewsletterVideoDesign
                        key={`${document.id}:${block.id}`}
                        block={block}
                        api={api}
                        documentId={document.id}
                        onChange={editBlock}
                        onBeforeLoad={save}
                        uploading={uploadingImage}
                        disabled={busy}
                        altAvailable={!!capabilities?.altTextAi?.available}
                        altReason={capabilities?.altTextAi?.reason}
                        onUpload={() => chooseImageFile(block)}
                        onBrowse={() => openAssets(block)}
                        onAdvanced={() => startImageEdit(block, true)}
                        onThumbnail={(result, source) => {
                          const live =
                            current.current &&
                            findNewsletterBlock(current.current.design, block.id);
                          if (
                            !mounted.current ||
                            !live ||
                            live.kind !== 'video' ||
                            live.imageUrl !== source.imageUrl ||
                            live.video?.thumbnail === 'custom' ||
                            newsletterVideoSource(live.url)?.url !== source.url ||
                            newsletterVideoSource(result.sourceUrl)?.url !== source.url
                          )
                            return false;
                          mutate((draft) => {
                            const target = findNewsletterBlock(draft.design, block.id);
                            if (target) {
                              target.imageUrl = result.imageUrl;
                              target.crop = null;
                              target.video = {
                                ...target.video,
                                thumbnail: 'auto',
                                sourceUrl: target.url,
                              };
                            }
                          });
                          return true;
                        }}
                        onAltGenerated={(text, source) => {
                          const live =
                            current.current &&
                            findNewsletterBlock(current.current.design, block.id);
                          if (!live || live.imageUrl !== source.imageUrl || live.alt !== source.alt)
                            return false;
                          mutate((draft) => {
                            const target = findNewsletterBlock(draft.design, block.id);
                            if (target) target.alt = text;
                          });
                          return true;
                        }}
                      />
                    )}
                    {tab === 'Content' && block.kind !== 'video' && !block.survey && (
                      <>
                        {block.kind === 'apps' && (
                          <NewsletterApps
                            key={`${document.id}:${block.id}`}
                            api={api}
                            documentId={document.id}
                            app={block.app}
                            onBeforeLoad={save}
                            onChange={(app) =>
                              mutate((draft) => {
                                const target = findNewsletterBlock(draft.design, block.id);
                                if (target?.kind === 'apps') target.app = app;
                              })
                            }
                          />
                        )}
                        {['heading', 'paragraph', 'button', 'logo', 'video', 'code'].includes(
                          block.kind,
                        ) && (
                          <TextField
                            label={block.kind === 'button' ? 'Button text' : 'Text'}
                            multiline={block.kind !== 'button'}
                            value={block.text}
                            onChange={(value) =>
                              editBlock((b) => {
                                b.text = value;
                                b.html = '';
                              })
                            }
                          />
                        )}
                        {block.kind === 'heading' && (
                          <SelectField
                            label="Heading level"
                            value={String(block.headingLevel)}
                            values={['1', '2', '3', '4']}
                            onChange={(v) =>
                              editBlock((b) => {
                                b.headingLevel = Number(v) as 1 | 2 | 3 | 4;
                              })
                            }
                          />
                        )}
                        {['heading', 'paragraph', 'code'].includes(block.kind) && (
                          <button
                            className="nl-secondary"
                            onClick={() => {
                              setAiKind('Refine text');
                              setAiSource(block.text);
                              setAiPrompt('Make this clearer and more concise.');
                              setAiResult('');
                              setAiDestination('block');
                              setModal('ai');
                            }}
                          >
                            <Sparkles size={16} />
                            Write with AI
                          </button>
                        )}
                        {['image', 'logo', 'video'].includes(block.kind) && (
                          <>
                            {block.kind === 'logo' && (
                              <section className="nl-brand-picker" aria-label="Brand Kit logos">
                                <div className="nl-flex">
                                  <h3>Brand Kit logos</h3>
                                  <button disabled={busy} onClick={openBrandKit}>
                                    Update Brand Kit
                                  </button>
                                </div>
                                <div className="nl-brand-logo-options">
                                  {brandKit?.logos.map((logo) => (
                                    <button
                                      key={logo.assetId}
                                      aria-label={`Use logo ${logo.name}`}
                                      onClick={() =>
                                        editBlock((b) => {
                                          Object.assign(b, {
                                            imageUrl: logo.url,
                                            url: logo.link,
                                            linkType: 'web',
                                            alt: logo.alt,
                                            text: '',
                                            crop: null,
                                          });
                                        })
                                      }
                                    >
                                      <img src={logo.url} alt={logo.name} />
                                    </button>
                                  ))}
                                </div>
                                {!brandKit?.logos.length && (
                                  <p className="nl-muted">
                                    Add your firm’s logos to reuse them in newsletters.
                                  </p>
                                )}
                              </section>
                            )}
                            <div className="nl-image-preview">
                              {block.imageUrl ? (
                                <img
                                  src={newsletterBundledImageUrl(block.imageUrl)}
                                  alt={block.alt}
                                />
                              ) : (
                                <Image size={48} />
                              )}
                            </div>
                            <div className="nl-flex">
                              <NewsletterImageReplaceMenu
                                disabled={uploadingImage || busy}
                                canEdit={!!block.imageUrl}
                                onUpload={() => chooseImageFile(block)}
                                onBrowse={() => openAssets(block)}
                                onAdvanced={() => startImageEdit(block, true)}
                              />
                              <button
                                disabled={uploadingImage || busy}
                                onClick={() => chooseImageFile(block)}
                              >
                                Choose file
                              </button>
                              <button disabled={!block.imageUrl} onClick={() => startCrop(block)}>
                                Crop
                              </button>
                              <button
                                disabled={!block.imageUrl}
                                onClick={() => startImageEdit(block)}
                              >
                                Edit image
                              </button>
                              <button
                                disabled={!block.imageUrl}
                                onClick={() => startImageEdit(block, true)}
                              >
                                Advanced editor
                              </button>
                              <button
                                disabled={!block.imageUrl}
                                onClick={() => setModal('image-ai')}
                              >
                                Refine with AI
                              </button>
                            </div>
                            {uploadingImage && <p role="status">Uploading image…</p>}
                            <TextField
                              label="Image URL"
                              value={block.imageUrl}
                              placeholder="https://"
                              onChange={(v) =>
                                editBlock((b) => {
                                  b.imageUrl = v;
                                })
                              }
                            />
                            <NewsletterImageSize
                              size={block.imageSize}
                              scale={block.imageScale}
                              onSize={(v) =>
                                editBlock((b) => {
                                  b.imageSize = v;
                                })
                              }
                              onScale={(v) =>
                                editBlock((b) => {
                                  b.imageScale = v;
                                })
                              }
                            />
                            <NewsletterImageDescription
                              key={`${documentId}:${block.id}`}
                              api={api}
                              documentId={documentId}
                              imageUrl={block.imageUrl}
                              alt={block.alt}
                              available={!!capabilities?.altTextAi?.available}
                              reason={capabilities?.altTextAi?.reason}
                              onChange={(v) =>
                                editBlock((b) => {
                                  b.alt = v;
                                })
                              }
                              onGenerated={(text, source) => {
                                const live =
                                  current.current &&
                                  findNewsletterBlock(current.current.design, block.id);
                                if (
                                  !live ||
                                  live.imageUrl !== source.imageUrl ||
                                  live.alt !== source.alt
                                )
                                  return false;
                                mutate((draft) => {
                                  const target = findNewsletterBlock(draft.design, block.id);
                                  if (target) target.alt = text;
                                });
                                return true;
                              }}
                            />
                          </>
                        )}
                        {['button', 'image', 'logo', 'video', 'survey'].includes(block.kind) && (
                          <>
                            <h3>Link to</h3>
                            <SelectField
                              label="Link type"
                              value={block.linkType}
                              values={[
                                ['web', 'Web'],
                                ['email', 'Email'],
                                ['phone', 'Phone'],
                                ['file', 'File'],
                                ['anchor', 'Anchor'],
                              ]}
                              onChange={(v) =>
                                editBlock((b) => {
                                  b.linkType = v;
                                })
                              }
                            />
                            <TextField
                              label="Link destination"
                              inputRef={imageLinkInput}
                              value={block.url}
                              placeholder={
                                block.linkType === 'email'
                                  ? 'mailto:name@example.com'
                                  : block.linkType === 'phone'
                                    ? 'tel:+12025550100'
                                    : 'https://'
                              }
                              onChange={(v) =>
                                editBlock((b) => {
                                  b.url = v;
                                })
                              }
                            />
                            <Check
                              label="Open in a new tab"
                              checked={block.openNewTab}
                              onChange={(v) =>
                                editBlock((b) => {
                                  b.openNewTab = v;
                                })
                              }
                            />
                          </>
                        )}
                        {block.kind === 'button' && brandKit && (
                          <section className="nl-brand-picker" aria-label="Brand Kit buttons">
                            <div className="nl-flex">
                              <h3>Brand Kit buttons</h3>
                              <button disabled={busy} onClick={openBrandKit}>
                                Update Brand Kit
                              </button>
                            </div>
                            <div className="nl-brand-button-options">
                              {brandKit.buttons.map((button) => (
                                <button
                                  key={button.id}
                                  aria-label={`Use button ${button.name}`}
                                  onClick={() =>
                                    editBlock((b) => {
                                      Object.assign(b.style, newsletterBrandButtonStyle(button));
                                      Object.assign(
                                        b.mobileStyle,
                                        newsletterBrandButtonStyle(button),
                                      );
                                    })
                                  }
                                >
                                  <span style={cssStyle(newsletterBrandButtonStyle(button))}>
                                    {button.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </section>
                        )}
                        {block.kind === 'spacer' && (
                          <NumberField
                            label="Height"
                            max={500}
                            value={block.style.height || 24}
                            onChange={(v) =>
                              editBlock((b) => {
                                b.style.height = v;
                              })
                            }
                          />
                        )}
                        {block.kind === 'divider' && (
                          <StyleFields
                            typography={false}
                            style={block.style}
                            onChange={(v) =>
                              editBlock((b) => {
                                b.style = v;
                              })
                            }
                          />
                        )}
                        {block.kind === 'survey' && (
                          <>
                            <TextField
                              label="Survey question"
                              value={block.question}
                              onChange={(v) =>
                                editBlock((b) => {
                                  b.question = v;
                                })
                              }
                            />
                            {block.options.map((answer, index) => (
                              <div className="nl-flex" key={index}>
                                <TextField
                                  label={`Option ${index + 1}`}
                                  value={answer}
                                  onChange={(v) =>
                                    editBlock((b) => {
                                      b.options[index] = v;
                                    })
                                  }
                                />
                                <button
                                  aria-label={`Remove option ${index + 1}`}
                                  onClick={() =>
                                    editBlock((b) => {
                                      b.options.splice(index, 1);
                                    })
                                  }
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              disabled={block.options.length >= 10}
                              onClick={() =>
                                editBlock((b) => {
                                  b.options.push('New option');
                                })
                              }
                            >
                              Add option
                            </button>
                            <p className="nl-muted">
                              Responses are collected from the delivered newsletter in Outreach.
                            </p>
                          </>
                        )}
                        {block.kind === 'social' && (
                          <NewsletterSocialContent block={block} onChange={editBlock} />
                        )}
                        {['product', 'product-rec'].includes(block.kind) && (
                          <>
                            <p className="nl-muted">Choose the services or resources to feature.</p>
                            {block.items.map((item, index) => (
                              <div key={index} className="nl-item-card">
                                <TextField
                                  label="Label"
                                  value={item.label}
                                  onChange={(v) =>
                                    editBlock((b) => {
                                      b.items[index]!.label = v;
                                    })
                                  }
                                />
                                <TextField
                                  label="Destination"
                                  value={item.url}
                                  onChange={(v) =>
                                    editBlock((b) => {
                                      b.items[index]!.url = v;
                                    })
                                  }
                                />
                                {
                                  <>
                                    <TextField
                                      label="Image URL"
                                      value={item.imageUrl || ''}
                                      onChange={(v) =>
                                        editBlock((b) => {
                                          b.items[index]!.imageUrl = v;
                                        })
                                      }
                                    />
                                    <TextField
                                      label="Description"
                                      value={item.description || ''}
                                      multiline
                                      onChange={(v) =>
                                        editBlock((b) => {
                                          b.items[index]!.description = v;
                                        })
                                      }
                                    />
                                    <TextField
                                      label="Price / label"
                                      value={item.price || ''}
                                      onChange={(v) =>
                                        editBlock((b) => {
                                          b.items[index]!.price = v;
                                        })
                                      }
                                    />
                                  </>
                                }
                                <button
                                  onClick={() =>
                                    editBlock((b) => {
                                      b.items.splice(index, 1);
                                    })
                                  }
                                >
                                  Remove
                                </button>
                                <button
                                  disabled={index === 0}
                                  onClick={() =>
                                    editBlock((b) => {
                                      const [item] = b.items.splice(index, 1);
                                      b.items.splice(index - 1, 0, item!);
                                    })
                                  }
                                >
                                  Move up
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() =>
                                editBlock((b) => {
                                  b.items.push({ label: 'New link', url: '' });
                                })
                              }
                            >
                              Add item
                            </button>
                          </>
                        )}
                        {block.kind === 'footer' && (
                          <>
                            <TextField
                              label="Company / firm"
                              value={document.config.company}
                              onChange={(v) =>
                                mutate((d) => {
                                  d.config.company = v;
                                })
                              }
                            />
                            <TextField
                              label="Mailing address"
                              multiline
                              value={document.config.mailingAddress}
                              onChange={(v) =>
                                mutate((d) => {
                                  d.config.mailingAddress = v;
                                })
                              }
                            />
                            <TextField
                              label="Permission reminder"
                              multiline
                              value={document.config.permissionReminder}
                              onChange={(v) =>
                                mutate((d) => {
                                  d.config.permissionReminder = v;
                                })
                              }
                            />
                            <p className="nl-muted">
                              Unsubscribe and preference links are completed when Outreach prepares
                              delivery.
                            </p>
                          </>
                        )}
                      </>
                    )}
                    {block.kind !== 'video' &&
                      !block.survey &&
                      (tab === 'Styles' || (block.kind === 'columns' && tab === 'Content')) && (
                        <>
                          {block.kind === 'columns' && (
                            <>
                              <NumberField
                                label="Number of columns"
                                min={1}
                                max={4}
                                value={block.columns.length}
                                onChange={(v) =>
                                  editBlock((b) => {
                                    const count = Math.round(v);
                                    if (count < b.columns.length) {
                                      b.columns[count - 1]!.push(...b.columns.slice(count).flat());
                                    }
                                    b.columns = Array.from(
                                      { length: count },
                                      (_, i) => b.columns[i] || [],
                                    );
                                    b.ratio = String(count);
                                  })
                                }
                              />
                              <SelectField
                                label="Desktop column ratio"
                                value={block.ratio}
                                values={NEWSLETTER_COLUMN_RATIOS.filter((r) =>
                                  r.includes(':')
                                    ? block.columns.length === 2
                                    : Number(r) === block.columns.length,
                                )}
                                onChange={(v) =>
                                  editBlock((b) => {
                                    b.ratio = v;
                                  })
                                }
                              />
                              <SelectField
                                label="Mobile orientation"
                                value={block.mobileOrientation}
                                values={[
                                  ['stacked', 'Stacked'],
                                  ['horizontal', 'Horizontal'],
                                ]}
                                onChange={(v) =>
                                  editBlock((b) => {
                                    b.mobileOrientation = v;
                                  })
                                }
                              />
                            </>
                          )}
                          <Check
                            label="Link Desktop and Mobile styles"
                            checked={block.linkedStyles}
                            onChange={(v) =>
                              editBlock((b) => {
                                b.linkedStyles = v;
                                if (!v) b.mobileStyle = { ...b.style };
                                if (!v && b.kind === 'social') {
                                  b.social = structuredClone(newsletterSocialSettings(b));
                                  b.social.mobile = { ...b.social.desktop };
                                }
                              })
                            }
                          />
                          <Tabs
                            value={device}
                            values={['Desktop', 'Mobile']}
                            onChange={setDevice}
                          />
                          {block.kind === 'social' && (
                            <NewsletterSocialStyles
                              block={block}
                              mobile={!!mobileStyle}
                              onChange={editBlock}
                            />
                          )}
                          <StyleFields
                            typography={
                              [
                                'paragraph',
                                'heading',
                                'button',
                                'logo',
                                'footer',
                                'code',
                                'apps',
                              ].includes(block.kind) ||
                              (block.kind === 'social' &&
                                newsletterSocialSettings(block).display !== 'icon')
                            }
                            style={mobileStyle ? block.mobileStyle : block.style}
                            onChange={(v) =>
                              editBlock((b) => {
                                if (mobileStyle) b.mobileStyle = v;
                                else b.style = v;
                              })
                            }
                          />
                          {block.kind === 'button' && (
                            <>
                              <SelectField
                                label="Shape"
                                value={
                                  block.style.radius === 1000
                                    ? 'pill'
                                    : block.style.radius === 8
                                      ? 'round'
                                      : block.style.radius
                                        ? 'custom'
                                        : 'square'
                                }
                                values={['square', 'round', 'pill', 'custom']}
                                onChange={(v) =>
                                  editBlock((b) => {
                                    b.style.radius =
                                      v === 'pill'
                                        ? 1000
                                        : v === 'round'
                                          ? 8
                                          : v === 'square'
                                            ? 0
                                            : 16;
                                  })
                                }
                              />
                              <SelectField
                                label="Size"
                                value={(() => {
                                  const style = mobileStyle ? block.mobileStyle : block.style;
                                  const size = style.paddingTop;
                                  return size &&
                                    style.paddingBottom === size &&
                                    style.paddingLeft === size * 2 &&
                                    style.paddingRight === size * 2
                                    ? size === 8
                                      ? 'small'
                                      : size === 12
                                        ? 'medium'
                                        : size === 18
                                          ? 'large'
                                          : 'custom'
                                    : 'custom';
                                })()}
                                values={['small', 'medium', 'large', 'custom']}
                                onChange={(v) =>
                                  editBlock((b) => {
                                    if (v !== 'custom') {
                                      const size = v === 'small' ? 8 : v === 'medium' ? 12 : 18;
                                      const style = mobileStyle ? b.mobileStyle : b.style;
                                      style.paddingTop = size;
                                      style.paddingBottom = size;
                                      style.paddingLeft = size * 2;
                                      style.paddingRight = size * 2;
                                    }
                                  })
                                }
                              />
                            </>
                          )}
                          <div className="nl-flex">
                            <button
                              onClick={() =>
                                editBlock((b) => {
                                  if (mobileStyle) b.mobileStyle = {};
                                  else b.style = {};
                                })
                              }
                            >
                              Clear styles
                            </button>
                            <button
                              onClick={() =>
                                mutate((d) => {
                                  visitNewsletterBlocks(d.design, (b) => {
                                    if (b.kind === block.kind) {
                                      if (mobileStyle) b.mobileStyle = { ...block.mobileStyle };
                                      else b.style = { ...block.style };
                                    }
                                  });
                                })
                              }
                            >
                              Apply to all
                            </button>
                          </div>
                        </>
                      )}
                    {tab === 'Visibility' && (
                      <>
                        <h3>Recipients</h3>
                        <SelectField
                          label="Show to"
                          value={block.visibility.mode}
                          values={[
                            ['all', 'All recipients'],
                            ['custom', 'Customize recipients'],
                          ]}
                          onChange={(v) =>
                            editBlock((b) => {
                              b.visibility.mode = v;
                              if (v === 'custom' && !b.visibility.rules.length)
                                b.visibility.rules = [
                                  { field: 'company', operator: 'is', value: '' },
                                ];
                            })
                          }
                        />
                        {block.visibility.mode === 'custom' && (
                          <>
                            <p className="nl-muted">
                              Show this block when all rules match. Up to five rules.
                            </p>
                            {block.visibility.rules.map((rule, index) => (
                              <div className="nl-item-card" key={index}>
                                <SelectField
                                  label={`Audience field ${index + 1}`}
                                  value={rule.field}
                                  values={[
                                    ['email', 'Email'],
                                    ['firstName', 'First name'],
                                    ['lastName', 'Last name'],
                                    ['address', 'Address'],
                                    ['phone', 'Phone'],
                                    ['birthday', 'Birthday'],
                                    ['company', 'Company'],
                                    ['client', 'Client'],
                                    ['tags', 'Tags'],
                                  ]}
                                  onChange={(v) =>
                                    editBlock((b) => {
                                      b.visibility.rules[index]!.field = v;
                                    })
                                  }
                                />
                                <SelectField
                                  label="Condition"
                                  value={rule.operator}
                                  values={[
                                    ['is', 'Is'],
                                    ['is-not', 'Is not'],
                                    ['contains', 'Contains'],
                                    ['does-not-contain', 'Does not contain'],
                                    ['is-empty', 'Is empty'],
                                    ['is-not-empty', 'Is not empty'],
                                  ]}
                                  onChange={(v) =>
                                    editBlock((b) => {
                                      b.visibility.rules[index]!.operator = v;
                                    })
                                  }
                                />
                                {!rule.operator.endsWith('empty') && (
                                  <TextField
                                    label="Value"
                                    value={rule.value}
                                    onChange={(v) =>
                                      editBlock((b) => {
                                        b.visibility.rules[index]!.value = v;
                                      })
                                    }
                                  />
                                )}
                                <button
                                  disabled={block.visibility.rules.length <= 1}
                                  onClick={() =>
                                    editBlock((b) => {
                                      b.visibility.rules.splice(index, 1);
                                    })
                                  }
                                >
                                  Remove rule
                                </button>
                              </div>
                            ))}
                            <button
                              disabled={block.visibility.rules.length >= 5}
                              onClick={() =>
                                editBlock((b) => {
                                  b.visibility.rules.push({
                                    field: 'company',
                                    operator: 'is',
                                    value: '',
                                  });
                                })
                              }
                            >
                              Add another rule
                            </button>
                            <button
                              onClick={() =>
                                editBlock((b) => {
                                  b.visibility = { mode: 'all', rules: [] };
                                })
                              }
                            >
                              Reset
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {tab === 'Code' && block.kind !== 'video' && !block.survey && (
                      <>
                        <p className="nl-muted">
                          Basic email HTML is supported. Scripts and embedded forms are removed.
                        </p>
                        <TextField
                          label="HTML code"
                          multiline
                          value={block.html || newsletterEscape(block.text)}
                          onChange={(v) =>
                            editBlock((b) => {
                              b.html = v;
                            })
                          }
                        />
                        <button
                          onClick={() =>
                            editBlock((b) => {
                              b.html = sanitizeNewsletterMarkup(b.html);
                            })
                          }
                        >
                          Apply code
                        </button>
                      </>
                    )}
                  </>
                )}
                {rail === 'Sections' && (
                  <>
                    <h2>Sections</h2>
                    <Tabs
                      value={sectionTab}
                      values={['Manage', 'Pre-built', 'Saved']}
                      onChange={setSectionTab}
                    />
                    {sectionTab === 'Manage' && (
                      <>
                        {document.design.sections.map((s, index) => (
                          <div className="nl-section-row" key={s.id}>
                            <button onClick={() => select(s.id)}>
                              <Layers size={16} />
                              {s.name}
                            </button>
                            <button
                              aria-label={`Move ${s.name} up`}
                              disabled={index === 0}
                              onClick={() =>
                                mutate((d) => {
                                  const [s] = d.design.sections.splice(index, 1);
                                  d.design.sections.splice(index - 1, 0, s!);
                                })
                              }
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              aria-label={`Move ${s.name} down`}
                              disabled={index === document.design.sections.length - 1}
                              onClick={() =>
                                mutate((d) => {
                                  const [s] = d.design.sections.splice(index, 1);
                                  d.design.sections.splice(index + 1, 0, s!);
                                })
                              }
                            >
                              <ArrowDown size={14} />
                            </button>
                            <details>
                              <summary aria-label={`${s.name} more options`}>⋯</summary>
                              <div className="nl-menu">
                                <button
                                  onClick={() => {
                                    const name = window.prompt('Section name', s.name);
                                    if (name)
                                      mutate((d) => {
                                        d.design.sections[index]!.name = name;
                                      });
                                  }}
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() =>
                                    mutate((d) => {
                                      d.design.sections.splice(index + 1, 0, cloneSection(s));
                                    })
                                  }
                                >
                                  Duplicate
                                </button>
                                <button
                                  onClick={() => {
                                    setSelected(s.id);
                                    setSaveName(s.name);
                                    setFolder('');
                                    setModal('save-section');
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() =>
                                    mutate((d) => {
                                      d.design.sections.splice(index, 1);
                                    })
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </details>
                          </div>
                        ))}
                        <button
                          className="nl-secondary"
                          onClick={() =>
                            mutate((d) => {
                              const section = createNewsletterSection('New section');
                              d.design.sections.push(section);
                              setSelected(section.id);
                            })
                          }
                        >
                          + Add blank section
                        </button>
                      </>
                    )}
                    {sectionTab === 'Pre-built' && (
                      <>
                        <SelectField
                          label="Category"
                          value={categoryFilter}
                          values={['All', ...SECTION_CATEGORIES]}
                          onChange={setCategoryFilter}
                        />
                        {SECTION_CATEGORIES.filter(
                          (c) => categoryFilter === 'All' || c === categoryFilter,
                        ).map((category) => (
                          <div className="nl-prebuilt" key={category}>
                            <h3>
                              {category}
                              <button
                                className="nl-link"
                                onClick={() => setCategoryFilter(category)}
                              >
                                See all
                              </button>
                            </h3>
                            {[0, 1, 2].map((variant) => (
                              <button
                                key={variant}
                                onClick={() =>
                                  mutate((d) => {
                                    d.design.sections.push(prebuiltSection(category, variant));
                                  })
                                }
                              >
                                <span className="nl-section-mini">
                                  <i />
                                  <b />
                                  <i />
                                </span>
                                {category}{' '}
                                {variant === 0 ? 'banner' : variant === 1 ? 'columns' : 'center'}
                              </button>
                            ))}
                          </div>
                        ))}
                      </>
                    )}
                    {sectionTab === 'Saved' && (
                      <>
                        <TextField
                          label="Search saved sections"
                          value={search}
                          onChange={setSearch}
                        />
                        <SelectField
                          label="Folder"
                          value={folder}
                          values={['', ...new Set(sections.map((s) => s.folder).filter(Boolean))]}
                          onChange={setFolder}
                        />
                        <SelectField
                          label="Sort"
                          value={sort}
                          values={['Recent', 'Name']}
                          onChange={setSort}
                        />
                        <button onClick={() => setLibraryEdit(!libraryEdit)}>
                          {libraryEdit ? 'Done editing' : 'Edit library'}
                        </button>
                        {filteredSections.map((s) => (
                          <div className="nl-item-card" key={s.id}>
                            <button
                              onClick={() =>
                                mutate((d) => {
                                  if (s.section) d.design.sections.push(cloneSection(s.section));
                                })
                              }
                            >
                              {s.name}
                              <small>{s.folder || 'No folder'}</small>
                            </button>
                            {libraryEdit && (
                              <>
                                <button
                                  onClick={() => {
                                    const name = window.prompt('Section name', s.name);
                                    const folder = window.prompt('Folder', s.folder);
                                    if (name && folder !== null)
                                      void run(async () => {
                                        await api.updateLibrary(s.id, name, folder);
                                        await openLibrary();
                                      });
                                  }}
                                >
                                  Rename / move
                                </button>
                                <button
                                  onClick={() =>
                                    void run(async () => {
                                      await api.removeLibrary(s.id);
                                      await openLibrary();
                                    })
                                  }
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                        {!filteredSections.length && (
                          <p className="nl-muted">
                            No saved sections yet. Save one from Manage to reuse it.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
                {rail === 'Styles' && (
                  <>
                    <h2>Email styles</h2>
                    <div className="nl-flex">
                      <button disabled={busy} onClick={openBrandKit}>
                        Update Brand Kit
                      </button>
                      <button
                        disabled={!brandKit}
                        onClick={() =>
                          mutate((draft) => {
                            if (brandKit) applyNewsletterBrandKit(draft.design, brandKit);
                          })
                        }
                      >
                        Apply Brand Kit
                      </button>
                    </div>
                    <div className="nl-style-tabs">
                      {['Background', 'Text', 'Link', 'Button', 'Divider', 'Image', 'Logo'].map(
                        (c) => (
                          <button
                            key={c}
                            aria-pressed={styleCategory === c}
                            onClick={() => setStyleCategory(c)}
                          >
                            {c}
                          </button>
                        ),
                      )}
                    </div>
                    {styleCategory === 'Background' ? (
                      <>
                        <ColorField
                          label="Email background"
                          value={document.design.styles.background}
                          onChange={(v) =>
                            mutate((d) => {
                              d.design.styles.background = v;
                            })
                          }
                        />
                        <ColorField
                          label="Content background"
                          value={document.design.styles.content}
                          onChange={(v) =>
                            mutate((d) => {
                              d.design.styles.content = v;
                            })
                          }
                        />
                        <TextField
                          label="Background image URL"
                          value={document.design.styles.backgroundImage}
                          onChange={(v) =>
                            mutate((d) => {
                              d.design.styles.backgroundImage = v;
                            })
                          }
                        />
                        <NumberField
                          label="Content width"
                          value={document.design.styles.width}
                          min={320}
                          max={1200}
                          onChange={(v) =>
                            mutate((d) => {
                              d.design.styles.width = v;
                            })
                          }
                        />
                        <NumberField
                          label="Mobile left/right padding"
                          value={document.design.styles.mobilePadding}
                          max={100}
                          onChange={(v) =>
                            mutate((d) => {
                              d.design.styles.mobilePadding = v;
                            })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <Check
                          label="Link Desktop and Mobile styles"
                          checked={document.design.styles.linkedStyles}
                          onChange={(v) =>
                            mutate((d) => {
                              d.design.styles.linkedStyles = v;
                            })
                          }
                        />
                        <Tabs value={device} values={['Desktop', 'Mobile']} onChange={setDevice} />
                        {styleCategory === 'Text' && (
                          <Tabs
                            value={textLevel}
                            values={['p', 'h1', 'h2', 'h3', 'h4']}
                            onChange={(v) => setTextLevel(v as typeof textLevel)}
                          />
                        )}
                        <StyleFields
                          typography={!['Image', 'Divider', 'Logo'].includes(styleCategory)}
                          style={
                            styleCategory === 'Text'
                              ? device === 'Mobile' && !document.design.styles.linkedStyles
                                ? document.design.styles.mobileText[textLevel]
                                : document.design.styles.text[textLevel]
                              : document.design.styles[
                                  (device === 'Mobile' &&
                                  !document.design.styles.linkedStyles &&
                                  styleCategory !== 'Link'
                                    ? `mobile${styleCategory}`
                                    : styleCategory.toLowerCase()) as 'button'
                                ]
                          }
                          onChange={(v) =>
                            mutate((d) => {
                              if (styleCategory === 'Text') {
                                const key =
                                  device === 'Mobile' && !d.design.styles.linkedStyles
                                    ? 'mobileText'
                                    : 'text';
                                d.design.styles[key][textLevel] = v;
                              } else {
                                const key = (
                                  device === 'Mobile' &&
                                  !d.design.styles.linkedStyles &&
                                  styleCategory !== 'Link'
                                    ? `mobile${styleCategory}`
                                    : styleCategory.toLowerCase()
                                ) as 'button';
                                d.design.styles[key] = v;
                              }
                            })
                          }
                        />
                      </>
                    )}
                    <button
                      onClick={() =>
                        mutate((d) => {
                          d.design.styles = defaultNewsletterStyles();
                        })
                      }
                    >
                      Reset email styles
                    </button>
                  </>
                )}
                {rail === 'Optimize' && (
                  <>
                    <h2>Optimize your email</h2>
                    <p className="nl-muted">
                      Check links, merge tags and accessibility before staging.
                    </p>
                    {checks.map((check) => (
                      <button
                        key={check.id}
                        className={`nl-check-card nl-check-card--${check.severity}`}
                        onClick={() => {
                          if (check.blockId) select(check.blockId);
                        }}
                      >
                        <strong>
                          {check.severity === 'pass' ? '✓' : check.severity === 'error' ? '!' : '△'}{' '}
                          {check.label}
                        </strong>
                        <span>{check.detail}</span>
                      </button>
                    ))}
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const saved = await save();
                          setChecks((await api.preview(saved.id)).checks);
                        })
                      }
                    >
                      Check again
                    </button>
                  </>
                )}
              </>
            )}
          </aside>
          <main className="nl-canvas-area">
            <div className="nl-canvas-tools">
              <div>
                <button
                  title="Desktop"
                  aria-label="Desktop canvas"
                  aria-pressed={device === 'Desktop'}
                  onClick={() => setDevice('Desktop')}
                >
                  <Monitor size={18} />
                </button>
                <button
                  title="Mobile"
                  aria-label="Mobile canvas"
                  aria-pressed={device === 'Mobile'}
                  onClick={() => setDevice('Mobile')}
                >
                  <Smartphone size={18} />
                </button>
              </div>
              <div>
                <button
                  title="Undo"
                  aria-label="Undo"
                  disabled={cropSource ? !quickCrop.canUndo : !history.current.length}
                  onClick={cropSource ? quickCrop.undo : undo}
                >
                  <Undo2 size={18} />
                </button>
                <button
                  title="Redo"
                  aria-label="Redo"
                  disabled={cropSource ? !quickCrop.canRedo : !future.current.length}
                  onClick={cropSource ? quickCrop.redo : redo}
                >
                  <Redo2 size={18} />
                </button>
                <button
                  aria-label="Comments"
                  aria-pressed={commentsOpen}
                  onClick={() => {
                    setCommentsOpen(!commentsOpen);
                  }}
                >
                  <MessageSquare size={18} />
                </button>
                <button onClick={openPreview}>
                  <Eye size={17} />
                  Preview
                </button>
              </div>
            </div>
            <div className="nl-canvas-scroll">
              <div
                className="nl-canvas"
                style={{
                  width: device === 'Mobile' ? 375 : document.design.styles.width,
                  background: document.design.styles.content,
                  padding: device === 'Mobile' ? document.design.styles.mobilePadding : 24,
                }}
                onClick={() => {
                  if (!cropSource) setSelected(null);
                }}
              >
                {document.design.sections.map((s) => (
                  <section
                    key={s.id}
                    className={`nl-canvas-section${selected === s.id ? ' is-selected' : ''}`}
                    style={cssStyle(s.style)}
                  >
                    <button
                      className="nl-section-label"
                      onClick={(e) => {
                        e.stopPropagation();
                        select(s.id);
                      }}
                    >
                      {s.name}
                    </button>
                    {renderList(s.blocks, { sectionId: s.id })}
                  </section>
                ))}
                {!document.design.sections.length && (
                  <button
                    className="nl-empty-canvas"
                    onClick={() =>
                      mutate((d) => {
                        d.design.sections.push(createNewsletterSection('Body'));
                      })
                    }
                  >
                    + Add your first section
                  </button>
                )}
              </div>
              <p className="nl-canvas-caption">Weekly newsletter · {device.toLowerCase()} design</p>
            </div>
          </main>
          {commentsOpen && (
            <NewsletterComments
              api={api}
              documentId={document.id}
              blockId={block?.id}
              onClose={() => setCommentsOpen(false)}
              onAnchor={select}
              beforeComment={save}
            />
          )}
        </div>
        {(modal === 'save-template' || modal === 'save-section') && (
          <Modal
            title={modal === 'save-template' ? 'Save as a template' : 'Save section'}
            onClose={() => setModal(null)}
          >
            <div className="nl-modal-body">
              <TextField label="Name" value={saveName} onChange={setSaveName} />
              <TextField label="Folder" value={folder} onChange={setFolder} />
              <p className="nl-muted">
                Keep this edited layout in your Workspace library for future newsletters.
              </p>
            </div>
            <footer>
              <button onClick={() => setModal(null)}>Cancel</button>
              <button
                className="nl-primary"
                disabled={!saveName.trim() || busy}
                onClick={() =>
                  void run(async () => {
                    await save();
                    await api.saveLibrary(
                      document.id,
                      saveName,
                      folder,
                      modal === 'save-section' ? selected || undefined : undefined,
                    );
                    await openLibrary();
                    setNotice(modal === 'save-section' ? 'Section saved.' : 'Template saved.');
                    setModal(null);
                  })
                }
              >
                Save
              </button>
            </footer>
          </Modal>
        )}
        {modal === 'template' && (
          <Modal title="Change template" wide onClose={() => setModal(null)}>
            <NewsletterTemplateChooserSession
              api={api}
              onApply={(design) => {
                setCropSource(null);
                mutate((d) => {
                  d.design = structuredClone(design);
                });
                setSelected(null);
                setModal(null);
              }}
            />
          </Modal>
        )}
        {modal === 'assets' && (
          <NewsletterContentStudio
            api={api}
            onClose={() => {
              assetTarget.current = null;
              setModal(null);
            }}
            onInsert={(asset) => {
              const source = assetTarget.current;
              if (!source || !currentReplacement(source)) {
                setModal(null);
                setNotice('The image changed. Reopen Content Studio for its current version.');
                return;
              }
              mutate((draft) => {
                const image = findNewsletterBlock(draft.design, source.blockId);
                if (!image) return;
                image.imageUrl = asset.url;
                newsletterCustomVideoThumbnail(image);
                if (asset.altText !== undefined) image.alt = asset.altText;
                image.crop = null;
              });
              assetTarget.current = null;
              setModal(null);
              setNotice('Image added.');
            }}
          />
        )}
        {modal === 'image-edit' && imageEditSource && (
          <NewsletterImageEditor
            key={imageEditSource.key}
            url={imageEditSource.url}
            onClose={closeImageEdit}
            onSave={saveImageEdit}
          />
        )}
        {modal === 'advanced-image-edit' && imageEditSource && (
          <NewsletterAdvancedImageEditor
            key={imageEditSource.key}
            url={imageEditSource.url}
            onClose={closeImageEdit}
            onSave={saveImageEdit}
          />
        )}
        {modal === 'image-ai' && block && (
          <NewsletterImageAi
            api={api}
            documentId={document.id}
            url={block.imageUrl}
            available={!!capabilities?.imageAi?.available}
            reason={capabilities?.imageAi?.reason}
            onClose={() => setModal(null)}
            onGenerated={() => setNotice('Generated images saved in Content Studio.')}
            onApply={(item) =>
              editBlock((value) => {
                value.imageUrl = item.url;
                newsletterCustomVideoThumbnail(value);
                value.crop = null;
              })
            }
          />
        )}
        {modal === 'ai' && (
          <Modal title={aiKind} onClose={() => setModal(null)}>
            <div className="nl-modal-body">
              <TextField
                label="Source text and source URLs"
                multiline
                value={aiSource}
                onChange={setAiSource}
              />
              <TextField label="Instructions" multiline value={aiPrompt} onChange={setAiPrompt} />
              {capabilities && !capabilities.ai.available && (
                <p role="status">{capabilities.ai.reason}</p>
              )}
              <button
                disabled={busy || !aiSource.trim() || !capabilities?.ai.available}
                onClick={() =>
                  void run(async () => {
                    await save();
                    setAiResult(await api.write(document.id, aiPrompt, aiSource, aiKind));
                  })
                }
              >
                Generate
              </button>
              {aiResult && (
                <TextField label="Draft text" multiline value={aiResult} onChange={setAiResult} />
              )}
            </div>
            <footer>
              <button onClick={() => setModal(null)}>Cancel</button>
              <button
                className="nl-primary"
                disabled={!aiResult}
                onClick={() => {
                  if (aiDestination === 'block')
                    editBlock((b) => {
                      b.text = aiResult;
                      b.html = '';
                    });
                  else
                    mutate((d) => {
                      const paragraph = createNewsletterBlock('paragraph', { text: aiResult });
                      const col = createNewsletterBlock('columns', { columns: [[paragraph], []] });
                      const s =
                        d.design.sections.find((s) => s.name === 'Body') || d.design.sections[0];
                      if (s) s.blocks.push(col);
                      else d.design.sections.push(createNewsletterSection('Body', [col]));
                      setSelected(paragraph.id);
                    });
                  setModal(null);
                }}
              >
                Use text
              </button>
            </footer>
          </Modal>
        )}
        {modal === 'details' && (
          <Modal title="Newsletter details" onClose={() => setModal(null)}>
            <div className="nl-modal-body">
              <TextField
                label="Subject"
                value={document.config.subject}
                onChange={(v) =>
                  mutate((d) => {
                    d.config.subject = v;
                  })
                }
              />
              <TextField
                label="Preview text"
                value={document.config.previewText}
                onChange={(v) =>
                  mutate((d) => {
                    d.config.previewText = v;
                  })
                }
              />
              <TextField
                label="Firm name"
                value={document.config.company}
                onChange={(v) =>
                  mutate((d) => {
                    d.config.company = v;
                  })
                }
              />
              <TextField
                label="Mailing address"
                multiline
                value={document.config.mailingAddress}
                onChange={(v) =>
                  mutate((d) => {
                    d.config.mailingAddress = v;
                  })
                }
              />
              <p className="nl-muted">
                Choose recipients and sender in Engagement Outreach after staging.
              </p>
            </div>
            <footer>
              <button className="nl-primary" onClick={() => setModal(null)}>
                Done
              </button>
            </footer>
          </Modal>
        )}
        {modal === 'plain-text' && (
          <Modal title="Plain-text version" wide onClose={() => setModal(null)}>
            <div className="nl-modal-body">
              <p className="nl-muted">
                This version is available for preview and export. Outreach currently sends the HTML
                version of your newsletter.
              </p>
              <Check
                label="Regenerate automatically from the design"
                checked={document.config.plainTextAuto}
                onChange={(v) =>
                  mutate((d) => {
                    d.config.plainTextAuto = v;
                  })
                }
              />
              <TextField
                label="Plain text"
                multiline
                value={
                  document.config.plainTextAuto
                    ? newsletterPlainText(document.design, document.config, { editor: true })
                    : document.config.plainText
                }
                onChange={(v) =>
                  mutate((d) => {
                    d.config.plainTextAuto = false;
                    d.config.plainText = v;
                  })
                }
              />
              <button
                onClick={() =>
                  mutate((d) => {
                    d.config.plainText = newsletterPlainText(d.design, d.config, { editor: true });
                    d.config.plainTextAuto = false;
                  })
                }
              >
                Regenerate from HTML
              </button>
            </div>
            <footer>
              <button className="nl-primary" onClick={() => setModal(null)}>
                Save and close
              </button>
            </footer>
          </Modal>
        )}
        {modal === 'preview' && (
          <Modal
            title="Preview"
            wide
            onClose={() => {
              if (!busy) setModal(null);
            }}
          >
            <div className="nl-preview-toolbar">
              <Tabs
                value={previewDevice}
                values={['Desktop', 'Mobile', 'Inbox']}
                onChange={setPreviewDevice}
                disabled={busy}
              />
              <button
                disabled={busy}
                onClick={() => {
                  setModal('stage');
                }}
              >
                Stage in Outreach
              </button>
            </div>
            {previewDevice === 'Inbox' ? (
              <div className="nl-modal-body">
                <h3>Check your HTML, then test your inbox</h3>
                <p>
                  Use Mailtrap’s free sandbox HTML Check to find HTML and CSS compatibility issues.
                  Then stage your newsletter in Outreach and use Send test to myself to inspect the
                  delivered email in your own inbox.
                </p>
                <p className="nl-muted">
                  HTML checks flag compatibility issues. Your test email shows how your own email
                  app renders the newsletter.
                </p>
                <button
                  className="nl-primary"
                  disabled={busy || !capabilities?.htmlCheck?.available}
                  onClick={() =>
                    void run(async () => {
                      setHtmlCheckError('');
                      try {
                        const saved = await save();
                        setHtmlReport(await api.htmlCheck(saved.id, saved.revision));
                      } catch (error) {
                        setHtmlCheckError(newsletterError(error));
                      }
                    })
                  }
                >
                  {busy ? 'Checking HTML…' : 'Run HTML compatibility check'}
                </button>
                {htmlCheckError && <p role="alert">{htmlCheckError}</p>}
                {htmlReport && (
                  <div>
                    <h4>Mailtrap HTML report</h4>
                    <p>
                      Checked saved revision {htmlReport.revision} ·{' '}
                      {new Date(htmlReport.checkedAt).toLocaleString()}
                    </p>
                    {htmlReport.revision !== document.revision && (
                      <p role="status">
                        The newsletter has changed since this check. Run it again for the latest
                        version.
                      </p>
                    )}
                    {htmlReport.issues.length ? (
                      <ul>
                        {htmlReport.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No compatibility issues were reported.</p>
                    )}
                    <details>
                      <summary>Full HTML report</summary>
                      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                        {JSON.stringify(htmlReport.report, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
                <a href="https://mailtrap.io/email-sandbox/" target="_blank" rel="noreferrer">
                  Open Mailtrap HTML Check
                </a>
                <p className="nl-muted">
                  Each check uses one message from your Mailtrap sandbox allowance.
                  {capabilities?.htmlCheck?.available
                    ? ''
                    : ' Connect a sandbox account to enable checks inside Capiro.'}
                </p>
              </div>
            ) : (
              <div className="nl-preview-layout">
                <div className="nl-preview-frame">
                  <NewsletterPreviewFrame
                    html={previewHtml}
                    links={reviewLinks}
                    selected={linkCheck ? reviewedLink : null}
                    onSelect={
                      linkCheck
                        ? (key) => {
                            if (!busy) setSelectedLink(key);
                          }
                        : undefined
                    }
                    style={{
                      width:
                        previewDevice === 'Mobile'
                          ? 375
                          : Math.max(660, document.design.styles.width),
                    }}
                  />
                </div>
                <aside>
                  {linkCheck ? (
                    <NewsletterLinkChecker
                      links={reviewLinks}
                      selectedKey={selectedLink}
                      checked={reviewedLinks}
                      onReview={(key) => setReviewedLinks((previous) => new Set(previous).add(key))}
                      onSelect={setSelectedLink}
                      onSave={saveReviewedLink}
                      onBack={() => {
                        setLinkCheck(false);
                        setSelectedLink(null);
                      }}
                    />
                  ) : (
                    <>
                      <h3>Email information</h3>
                      <Check
                        label="Enable live merge tag info"
                        checked={mergeTags}
                        onChange={(v) => {
                          setMergeTags(v);
                          void run(async () =>
                            setPreviewHtml((await api.preview(document.id, v)).html),
                          );
                        }}
                      />
                      <dl>
                        <dt>To</dt>
                        <dd>Select in Outreach</dd>
                        <dt>From</dt>
                        <dd>Select in Outreach</dd>
                        <dt>Subject</dt>
                        <dd>{document.config.subject || 'Add a subject in newsletter details'}</dd>
                        <dt>Preview text</dt>
                        <dd>{document.config.previewText || '—'}</dd>
                      </dl>
                      <button
                        onClick={() => {
                          setLinkCheck(true);
                          setSelectedLink(null);
                        }}
                      >
                        Check email links
                      </button>
                      <p>{checks.find((c) => c.id === 'size')?.detail}</p>
                    </>
                  )}
                </aside>
              </div>
            )}
          </Modal>
        )}
        {modal === 'stage' && (
          <Modal title="Stage in Outreach" onClose={() => setModal(null)}>
            <div className="nl-modal-body">
              <h3>{document.name}</h3>
              <p>
                Save this version and stage it in Engagement Outreach. There you can select
                destinations from the directories, review a preview, and send from your connected
                mailbox.
              </p>
              <p className="nl-muted">Further edits in Workspace can be staged as a new version.</p>
            </div>
            <footer>
              <button onClick={() => setModal(null)}>Cancel</button>
              <button
                className="nl-primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const saved = await save();
                    const stage = await api.stage(document.id, saved.revision);
                    navigate(stage.route);
                  })
                }
              >
                {busy ? 'Staging…' : 'Stage in Outreach'}
              </button>
            </footer>
          </Modal>
        )}
        {modal === 'brand-kit' && brandKit && (
          <NewsletterBrandKit
            api={api}
            initial={brandKit}
            onSaved={setBrandKit}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </NewsletterBrandContext.Provider>
  );
}
