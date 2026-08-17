'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';

type CloseGuardState = {
  hasUnsavedChanges: boolean;
  isBusy: boolean;
};

type MasterFaskesDialogContextValue = {
  requestClose: () => void;
  registerCloseGuard: (state: CloseGuardState) => void;
};

const MasterFaskesDialogContext =
  createContext<MasterFaskesDialogContextValue | null>(null);

const noOperation = () => undefined;

export function useMasterFaskesDialogClose(fallback?: () => void) {
  const context = useContext(MasterFaskesDialogContext);
  return context?.requestClose ?? fallback ?? noOperation;
}

export function useMasterFaskesDialogGuard({
  hasUnsavedChanges,
  isBusy = false,
}: CloseGuardState) {
  const context = useContext(MasterFaskesDialogContext);

  useEffect(() => {
    if (!context) return;

    context.registerCloseGuard({ hasUnsavedChanges, isBusy });
    return () => {
      context.registerCloseGuard({
        hasUnsavedChanges: false,
        isBusy: false,
      });
    };
  }, [context, hasUnsavedChanges, isBusy]);
}

type MasterFaskesDialogProps = {
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function MasterFaskesDialog({
  open,
  label,
  onClose,
  children,
  className = 'max-w-2xl',
}: MasterFaskesDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const closeStateRef = useRef({
    hasUnsavedChanges: false,
    isBusy: false,
    onClose,
    showDiscardConfirm: false,
  });

  useEffect(() => {
    closeStateRef.current.onClose = onClose;
    closeStateRef.current.showDiscardConfirm = showDiscardConfirm;
  }, [onClose, showDiscardConfirm]);

  const registerCloseGuard = useCallback((state: CloseGuardState) => {
    closeStateRef.current = {
      ...closeStateRef.current,
      ...state,
    };
  }, []);

  const requestClose = useCallback(() => {
    const current = closeStateRef.current;
    if (current.isBusy || current.showDiscardConfirm) return;

    if (current.hasUnsavedChanges) {
      closeStateRef.current.showDiscardConfirm = true;
      setShowDiscardConfirm(true);
      return;
    }

    current.onClose();
  }, []);

  const discardChanges = useCallback(() => {
    closeStateRef.current.showDiscardConfirm = false;
    setShowDiscardConfirm(false);
    closeStateRef.current.onClose();
  }, []);

  const contextValue = useMemo(
    () => ({ requestClose, registerCloseGuard }),
    [registerCloseGuard, requestClose],
  );

  useEffect(() => {
    if (!open) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = panel?.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute('disabled'));

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <MasterFaskesDialogContext.Provider value={contextValue}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/35 p-4"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
      >
        <div
          ref={panelRef}
          className={`max-h-[calc(100vh-2rem)] w-full overflow-y-auto ${className}`}
        >
          {children}
        </div>
      </div>
      <UnsavedChangesDialog
        open={showDiscardConfirm}
        onOpenChange={(openState) => {
          closeStateRef.current.showDiscardConfirm = openState;
          setShowDiscardConfirm(openState);
        }}
        onConfirm={discardChanges}
      />
    </MasterFaskesDialogContext.Provider>
  );
}
