"use client";

// Meri Fable owner adaptation: preserve strict exactOptionalPropertyTypes by
// omitting absent onSelect/selectedPath context values, and give a folder's children
// the ARIA group role that treeitem nesting requires and the expand control an accessible
// name. Second owner edit: implement the WAI-ARIA tree keyboard pattern (one roving
// tab stop, aria-expanded/aria-selected treeitems, Up/Down/Left/Right/Home/End and
// Enter/Space handled by the tree, inner buttons out of the tab order); all upstream
// imports/exports are retained.

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../shadcn/collapsible";
import { cn } from "../lib/utils";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface FileTreeContextType {
  expandedPaths: Set<string>;
  togglePath: (path: string) => void;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  tabStopPath?: string;
}

// Default noop for context default value
// oxlint-disable-next-line eslint(no-empty-function)
const noop = () => {};

const FileTreeContext = createContext<FileTreeContextType>({
  // oxlint-disable-next-line eslint-plugin-unicorn(no-new-builtin)
  expandedPaths: new Set(),
  togglePath: noop,
});

// Visible treeitems in document order: descendants of collapsed folders are skipped.
const visibleItems = (tree: HTMLElement | null) =>
  Array.from(
    tree?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []
  ).filter(
    (item) =>
      !item.parentElement?.closest('[role="treeitem"][aria-expanded="false"]')
  );

export type FileTreeProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  expanded?: Set<string>;
  defaultExpanded?: Set<string>;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  onExpandedChange?: (expanded: Set<string>) => void;
};

export const FileTree = ({
  expanded: controlledExpanded,
  defaultExpanded = new Set(),
  selectedPath,
  onSelect,
  onExpandedChange,
  className,
  children,
  onBlur,
  onFocus,
  onKeyDown,
  ...props
}: FileTreeProps) => {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expandedPaths = controlledExpanded ?? internalExpanded;
  const treeRef = useRef<HTMLDivElement>(null);
  const [tabStopPath, setTabStopPath] = useState(selectedPath);

  // Entering the tree lands on the selected item; keep exactly one visible tab stop.
  useEffect(() => {
    if (
      selectedPath !== undefined &&
      !treeRef.current?.contains(document.activeElement)
    ) {
      setTabStopPath(selectedPath);
    }
  }, [selectedPath]);
  useEffect(() => {
    const items = visibleItems(treeRef.current);
    if (!items.some((item) => item.dataset.path === tabStopPath)) {
      setTabStopPath(items[0]?.dataset.path);
    }
  });

  const togglePath = useCallback(
    (path: string) => {
      const newExpanded = new Set(expandedPaths);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
        // Collapsing hides descendants: the folder takes over their tab stop and focus.
        const folder = visibleItems(treeRef.current).find(
          (item) => item.dataset.path === path
        );
        const stop = treeRef.current?.querySelector(
          '[role="treeitem"][tabindex="0"]'
        );
        if (folder && stop && stop !== folder && folder.contains(stop)) {
          setTabStopPath(path);
          const active = document.activeElement;
          if (
            active?.closest('[role="treeitem"]') !== folder &&
            folder.contains(active)
          ) {
            folder.focus();
          }
        }
      } else {
        newExpanded.add(path);
      }
      setInternalExpanded(newExpanded);
      onExpandedChange?.(newExpanded);
    },
    [expandedPaths, onExpandedChange]
  );

  const contextValue = useMemo(
    () => ({
      expandedPaths,
      ...(onSelect === undefined ? {} : { onSelect }),
      ...(selectedPath === undefined ? {} : { selectedPath }),
      ...(tabStopPath === undefined ? {} : { tabStopPath }),
      togglePath,
    }),
    [expandedPaths, onSelect, selectedPath, tabStopPath, togglePath]
  );

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    const item = (event.target as Element).closest<HTMLElement>(
      '[role="treeitem"]'
    );
    if (item?.dataset.path !== undefined) {
      setTabStopPath(item.dataset.path);
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (
      selectedPath !== undefined &&
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setTabStopPath(selectedPath);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    const item = (event.target as Element).closest<HTMLElement>(
      '[role="treeitem"]'
    );
    const path = item?.dataset.path;
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !item ||
      path === undefined
    ) {
      return;
    }
    const items = visibleItems(treeRef.current);
    const index = items.indexOf(item);
    const expanded = item.getAttribute("aria-expanded");
    let next: HTMLElement | null | undefined;
    if (event.key === "ArrowDown") {
      next = items[index + 1];
    } else if (event.key === "ArrowUp") {
      next = items[index - 1];
    } else if (event.key === "Home") {
      next = items[0];
    } else if (event.key === "End") {
      next = items.at(-1);
    } else if (event.key === "ArrowRight" && expanded === "false") {
      togglePath(path);
    } else if (event.key === "ArrowRight" && expanded === "true") {
      next = item.querySelector<HTMLElement>(
        '[role="group"] [role="treeitem"]'
      );
    } else if (event.key === "ArrowLeft" && expanded === "true") {
      togglePath(path);
    } else if (event.key === "ArrowLeft") {
      next = item.parentElement?.closest<HTMLElement>('[role="treeitem"]');
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      event.target === item
    ) {
      onSelect?.(path);
      if (expanded !== null) {
        togglePath(path);
      }
    } else {
      return;
    }
    event.preventDefault();
    if (next && treeRef.current?.contains(next)) {
      setTabStopPath(next.dataset.path);
      next.focus();
    }
  };

  return (
    <FileTreeContext.Provider value={contextValue}>
      <div
        className={cn(
          "rounded-lg border bg-background font-mono text-sm",
          className
        )}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        ref={treeRef}
        role="tree"
        {...props}
      >
        <div className="p-2">{children}</div>
      </div>
    </FileTreeContext.Provider>
  );
};

export type FileTreeIconProps = HTMLAttributes<HTMLSpanElement>;

export const FileTreeIcon = ({
  className,
  children,
  ...props
}: FileTreeIconProps) => (
  <span className={cn("shrink-0", className)} {...props}>
    {children}
  </span>
);

export type FileTreeNameProps = HTMLAttributes<HTMLSpanElement>;

export const FileTreeName = ({
  className,
  children,
  ...props
}: FileTreeNameProps) => (
  <span className={cn("truncate", className)} {...props}>
    {children}
  </span>
);

interface FileTreeFolderContextType {
  path: string;
  name: string;
  isExpanded: boolean;
}

const FileTreeFolderContext = createContext<FileTreeFolderContextType>({
  isExpanded: false,
  name: "",
  path: "",
});

export type FileTreeFolderProps = HTMLAttributes<HTMLDivElement> & {
  path: string;
  name: string;
};

export const FileTreeFolder = ({
  path,
  name,
  className,
  children,
  ...props
}: FileTreeFolderProps) => {
  const { expandedPaths, togglePath, selectedPath, onSelect, tabStopPath } =
    useContext(FileTreeContext);
  const isExpanded = expandedPaths.has(path);
  const isSelected = selectedPath === path;

  const handleOpenChange = useCallback(() => {
    togglePath(path);
  }, [togglePath, path]);

  const handleSelect = useCallback(() => {
    onSelect?.(path);
  }, [onSelect, path]);

  const folderContextValue = useMemo(
    () => ({ isExpanded, name, path }),
    [isExpanded, name, path]
  );

  return (
    <FileTreeFolderContext.Provider value={folderContextValue}>
      <Collapsible onOpenChange={handleOpenChange} open={isExpanded}>
        <div
          aria-expanded={isExpanded}
          aria-selected={isSelected}
          className={cn("", className)}
          data-path={path}
          role="treeitem"
          tabIndex={tabStopPath === path ? 0 : -1}
          {...props}
        >
          <div
            className={cn(
              "flex w-full items-center gap-1 rounded px-2 py-1 text-left transition-colors hover:bg-muted/50",
              isSelected && "bg-muted"
            )}
          >
            <CollapsibleTrigger asChild>
              <button
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name}`}
                className="flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0"
                tabIndex={-1}
                type="button"
              >
                <ChevronRightIcon
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <button
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left"
              onClick={handleSelect}
              tabIndex={-1}
              type="button"
            >
              <FileTreeIcon>
                {isExpanded ? (
                  <FolderOpenIcon className="size-4 text-blue-500" />
                ) : (
                  <FolderIcon className="size-4 text-blue-500" />
                )}
              </FileTreeIcon>
              <FileTreeName>{name}</FileTreeName>
            </button>
          </div>
          <CollapsibleContent>
            <div className="ml-4 border-l pl-2" role="group">{children}</div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </FileTreeFolderContext.Provider>
  );
};

interface FileTreeFileContextType {
  path: string;
  name: string;
}

const FileTreeFileContext = createContext<FileTreeFileContextType>({
  name: "",
  path: "",
});

export type FileTreeFileProps = HTMLAttributes<HTMLDivElement> & {
  path: string;
  name: string;
  icon?: ReactNode;
};

export const FileTreeFile = ({
  path,
  name,
  icon,
  className,
  children,
  ...props
}: FileTreeFileProps) => {
  const { selectedPath, onSelect, tabStopPath } = useContext(FileTreeContext);
  const isSelected = selectedPath === path;

  const handleClick = useCallback(() => {
    onSelect?.(path);
  }, [onSelect, path]);

  const fileContextValue = useMemo(() => ({ name, path }), [name, path]);

  return (
    <FileTreeFileContext.Provider value={fileContextValue}>
      <div
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-muted/50",
          isSelected && "bg-muted",
          className
        )}
        aria-selected={isSelected}
        data-path={path}
        onClick={handleClick}
        role="treeitem"
        tabIndex={tabStopPath === path ? 0 : -1}
        {...props}
      >
        {children ?? (
          <>
            {/* Spacer for alignment */}
            <span className="size-4 shrink-0" />
            <FileTreeIcon>
              {icon ?? <FileIcon className="size-4 text-muted-foreground" />}
            </FileTreeIcon>
            <FileTreeName>{name}</FileTreeName>
          </>
        )}
      </div>
    </FileTreeFileContext.Provider>
  );
};

export type FileTreeActionsProps = HTMLAttributes<HTMLDivElement>;

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

export const FileTreeActions = ({
  className,
  children,
  ...props
}: FileTreeActionsProps) => (
  <div
    className={cn("ml-auto flex items-center gap-1", className)}
    onClick={stopPropagation}
    onKeyDown={stopPropagation}
    role="group"
    {...props}
  >
    {children}
  </div>
);
