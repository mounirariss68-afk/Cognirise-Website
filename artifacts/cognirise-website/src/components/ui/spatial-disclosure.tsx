import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useId, ReactNode, KeyboardEvent } from "react";

interface SpatialDisclosureContextType {
  selectedIndex: string | null;
  previewIndex: string | null;
  activeIndex: string | null;
  toggle: (id: string) => void;
  preview: (id: string | null) => void;
  registerItem: (id: string, ref: React.RefObject<HTMLElement | null>) => void;
  unregisterItem: (id: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>, id: string) => void;
  orientation: "horizontal" | "vertical";
  allowCollapse: boolean;
  mode: "editorial" | "disclosure";
  enablePreview: boolean;
  previewExpands: boolean;
  firstItemId: string | null;
  instanceId: string;
}

const SpatialDisclosureContext = createContext<SpatialDisclosureContextType | null>(null);

export function resolveSpatialDisclosureActiveIndex(
  selectedIndex: string | null,
  previewIndex: string | null,
  previewOverridesSelection = false,
) {
  return previewOverridesSelection
    ? previewIndex ?? selectedIndex
    : selectedIndex ?? previewIndex;
}

export function useSpatialDisclosure() {
  const ctx = useContext(SpatialDisclosureContext);
  if (!ctx) throw new Error("useSpatialDisclosure must be used within a SpatialDisclosure");
  return ctx;
}

export function SpatialDisclosure({
  children,
  value,
  defaultValue = null,
  onChange,
  orientation = "vertical",
  allowCollapse = true,
  mode = "disclosure",
  preview: previewEnabled,
  previewOverridesSelection = false,
  previewExpands = false,
  className,
}: {
  children: ReactNode;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (val: string | null) => void;
  orientation?: "horizontal" | "vertical";
  allowCollapse?: boolean;
  mode?: "editorial" | "disclosure";
  preview?: boolean;
  previewOverridesSelection?: boolean;
  previewExpands?: boolean;
  className?: string;
}) {
  const [uncontrolled, setUncontrolled] = useState<string | null>(defaultValue);
  const reactId = useId();
  const instanceId = `spatial-disclosure-${reactId.replaceAll(":", "")}`;
  const isControlled = value !== undefined;
  const selectedIndex = isControlled ? value : uncontrolled;

  const setSelectedIndex = useCallback((val: string | null) => {
    if (!isControlled) setUncontrolled(val);
    onChange?.(val);
  }, [isControlled, onChange]);

  const [previewIndex, setPreviewIndex] = useState<string | null>(null);
  const activeIndex = resolveSpatialDisclosureActiveIndex(
    selectedIndex,
    previewIndex,
    previewOverridesSelection,
  );
  const enablePreview = previewEnabled ?? mode === "editorial";

  const itemRefs = useRef<Map<string, React.RefObject<HTMLElement | null>>>(new Map());
  const itemIds = useRef<string[]>([]);
  const [, setItemVersion] = useState(0);

  const registerItem = useCallback((id: string, ref: React.RefObject<HTMLElement | null>) => {
    itemRefs.current.set(id, ref);
    if (!itemIds.current.includes(id)) {
      itemIds.current.push(id);
      setItemVersion((version) => version + 1);
    }
  }, []);

  const unregisterItem = useCallback((id: string) => {
    itemRefs.current.delete(id);
    itemIds.current = itemIds.current.filter((i) => i !== id);
    setItemVersion((version) => version + 1);
  }, []);

  const toggle = useCallback((id: string) => {
    if (selectedIndex === id && allowCollapse) {
      setSelectedIndex(null);
    } else {
      setSelectedIndex(id);
    }
    setPreviewIndex(null);
  }, [selectedIndex, allowCollapse, setSelectedIndex]);

  const preview = useCallback((id: string | null) => {
    setPreviewIndex(id);
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLElement>, id: string) => {
    const ids = itemIds.current;
    const currentIndex = ids.indexOf(id);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    let handled = false;

    if (e.key === "Home") {
      nextIndex = 0;
      handled = true;
    } else if (e.key === "End") {
      nextIndex = ids.length - 1;
      handled = true;
    } else if (orientation === "horizontal") {
      if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
        handled = true;
      } else if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % ids.length;
        handled = true;
      }
    } else {
      if (e.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
        handled = true;
      } else if (e.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % ids.length;
        handled = true;
      }
    }

    if (handled) {
      e.preventDefault();
      const nextId = ids[nextIndex];
      itemRefs.current.get(nextId)?.current?.focus();
    }
  }, [orientation]);

  return (
    <SpatialDisclosureContext.Provider
      value={{
        selectedIndex,
        previewIndex,
        activeIndex,
        toggle,
        preview,
        registerItem,
        unregisterItem,
        onKeyDown,
        orientation,
        allowCollapse,
        mode,
        enablePreview,
        previewExpands,
        firstItemId: itemIds.current[0] ?? null,
        instanceId,
      }}
    >
      <div
        className={className}
        data-spatial-disclosure={instanceId}
        onMouseLeave={() => preview(null)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            preview(null);
          }
        }}
      >
        {children}
      </div>
    </SpatialDisclosureContext.Provider>
  );
}

export function SpatialDisclosureItem({
  id,
  children,
  className,
  ...props
}: {
  id: string;
  children: ReactNode | ((state: { isActive: boolean; isSelected: boolean; isPreview: boolean }) => ReactNode);
  className?: string | ((state: { isActive: boolean; isSelected: boolean; isPreview: boolean }) => string);
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  const { activeIndex, selectedIndex, previewIndex } = useSpatialDisclosure();
  const isActive = activeIndex === id;
  const isSelected = selectedIndex === id;
  const isPreview = previewIndex === id;

  const state = { isActive, isSelected, isPreview };
  const resolvedClassName = typeof className === "function" ? className(state) : className;
  
  return (
    <div
      className={resolvedClassName}
      data-state={isActive ? "active" : "inactive"}
      data-selected={isSelected ? "true" : "false"}
      data-preview={isPreview ? "true" : "false"}
      {...props}
    >
      {typeof children === "function" ? children(state) : children}
    </div>
  );
}

export function SpatialDisclosureTrigger({
  id,
  children,
  className,
  asChild,
  ...props
}: {
  id: string;
  children: ReactNode;
  className?: string;
  asChild?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const {
    toggle,
    preview,
    registerItem,
    unregisterItem,
    onKeyDown,
    activeIndex,
    selectedIndex,
    previewIndex,
    mode,
    allowCollapse,
    enablePreview,
    previewExpands,
    firstItemId,
    instanceId,
  } = useSpatialDisclosure();
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    registerItem(id, ref);
    return () => unregisterItem(id);
  }, [id, registerItem, unregisterItem]);

  const isActive = activeIndex === id;
  const isSelected = selectedIndex === id;
  const isPreview = previewIndex === id && selectedIndex === null;

  const composeEvent = <E extends React.SyntheticEvent>(
    theirHandler?: (e: E) => void,
    ourHandler?: (e: E) => void
  ) => (e: E) => {
    theirHandler?.(e);
    if (!e.defaultPrevented) {
      ourHandler?.(e);
    }
  };

  const handleMouseEnter = () => {
    if (enablePreview) preview(id);
  };
  const handleFocus = () => {
    if (enablePreview) preview(id);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    toggle(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape" && allowCollapse) {
      if (selectedIndex === id) {
        toggle(id);
        e.preventDefault();
        return;
      }
    }
    if (mode === "editorial") {
      onKeyDown(e, id);
    }
  };

  const isEditorial = mode === "editorial";
  const commonProps = {
    id: `${instanceId}-trigger-${id}`,
    "aria-controls": `${instanceId}-panel-${id}`,
    "data-disclosure-trigger": id,
    "data-state": isActive ? "active" : "inactive",
    "data-selected": isSelected ? "true" : "false",
    "data-preview": isPreview ? "true" : "false",
    ...(isEditorial ? {
      "aria-expanded": previewExpands ? isActive : isSelected,
      tabIndex: selectedIndex === null
        ? (firstItemId === null || firstItemId === id ? 0 : -1)
        : (isSelected ? 0 : -1),
    } : {
      "aria-expanded": isActive,
      tabIndex: 0,
    })
  };

  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<any>;
    return React.cloneElement(childElement, {
      ...commonProps,
      ref,
      onClick: composeEvent(childElement.props.onClick, handleClick),
      onMouseEnter: composeEvent(childElement.props.onMouseEnter, handleMouseEnter),
      onFocus: composeEvent(childElement.props.onFocus, handleFocus),
      onKeyDown: composeEvent(childElement.props.onKeyDown, handleKeyDown),
    });
  }

  return (
    <button
      {...props}
      {...commonProps}
      type={props.type ?? "button"}
      ref={ref}
      className={className}
      onClick={composeEvent(props.onClick, handleClick)}
      onMouseEnter={composeEvent(props.onMouseEnter, handleMouseEnter)}
      onFocus={composeEvent(props.onFocus, handleFocus)}
      onKeyDown={composeEvent(props.onKeyDown, handleKeyDown)}
    >
      {children}
    </button>
  );
}

export function SpatialDisclosurePanel({
  id,
  children,
  className,
  ...props
}: {
  id: string;
  children: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "id" | "children" | "className">) {
  const { activeIndex, selectedIndex, mode, instanceId, previewExpands } = useSpatialDisclosure();
  const isActive = mode === "editorial" && !previewExpands
    ? selectedIndex === id
    : activeIndex === id;

  return (
    <div
      id={`${instanceId}-panel-${id}`}
      role="region"
      aria-labelledby={`${instanceId}-trigger-${id}`}
      data-disclosure-panel={id}
      aria-hidden={!isActive}
      inert={!isActive ? true : undefined}
      className={className}
      data-state={isActive ? "active" : "inactive"}
      {...props}
    >
      {children}
    </div>
  );
}
