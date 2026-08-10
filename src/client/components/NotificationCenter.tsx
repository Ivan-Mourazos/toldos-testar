import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CircleAlert, CircleX, Info, TriangleAlert, X } from 'lucide-react';

export type NotificationTone = 'success' | 'error' | 'warning' | 'info';
export type DialogTone = 'default' | 'warning' | 'danger';
export type DialogResult = 'confirm' | 'cancel' | 'dismiss';

export type NotifyOptions = {
  tone?: NotificationTone;
  title?: string;
  duration?: number;
};

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
  details?: string[];
};

export type Notify = (message: string, options?: NotifyOptions) => void;
export type AskForConfirmation = (options: ConfirmOptions) => Promise<DialogResult>;

type ToastItem = {
  id: number;
  message: string;
  tone: NotificationTone;
  title: string;
  duration: number;
};

type ActiveDialog = ConfirmOptions & { id: number };

const toastTitles: Record<NotificationTone, string> = {
  success: 'Listo',
  error: 'No se pudo completar',
  warning: 'Revisa este dato',
  info: 'Información'
};

export function useNotifications() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const nextId = useRef(1);
  const pendingDialog = useRef<((result: DialogResult) => void) | null>(null);

  const notify = useCallback<Notify>((message, options = {}) => {
    const tone = options.tone || 'info';
    const toast: ToastItem = {
      id: nextId.current++,
      message,
      tone,
      title: options.title || toastTitles[tone],
      duration: options.duration ?? (tone === 'error' ? 7500 : 5500)
    };
    setToasts((current) => [...current, toast].slice(-4));
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const askForConfirmation = useCallback<AskForConfirmation>((options) => {
    if (pendingDialog.current) pendingDialog.current('dismiss');
    const activeDialog = { ...options, id: nextId.current++ };
    setDialog(activeDialog);
    return new Promise<DialogResult>((resolve) => {
      pendingDialog.current = resolve;
    });
  }, []);

  const resolveDialog = useCallback((result: DialogResult) => {
    const resolve = pendingDialog.current;
    pendingDialog.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  useEffect(() => () => {
    pendingDialog.current?.('dismiss');
  }, []);

  return {
    toasts,
    dialog,
    notify,
    askForConfirmation,
    dismissToast,
    resolveDialog
  };
}

export function NotificationCenter({
  toasts,
  dialog,
  onDismissToast,
  onResolveDialog
}: {
  toasts: ToastItem[];
  dialog: ActiveDialog | null;
  onDismissToast: (id: number) => void;
  onResolveDialog: (result: DialogResult) => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="notification-stack" aria-label="Notificaciones">
        {toasts.map((toast) => (
          <NotificationToast key={toast.id} toast={toast} onDismiss={onDismissToast} />
        ))}
      </div>
      {dialog && <ConfirmationDialog key={dialog.id} dialog={dialog} onResolve={onResolveDialog} />}
    </>,
    document.body
  );
}

function NotificationToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);

  useEffect(() => {
    if (remaining.current <= 0 || paused) return undefined;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [toast.id, paused, onDismiss]);

  const Icon = toast.tone === 'success'
    ? CheckCircle2
    : toast.tone === 'error'
      ? CircleX
      : toast.tone === 'warning'
        ? TriangleAlert
        : Info;

  return (
    <div
      className={`app-notification notification-${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <span className="notification-icon"><Icon aria-hidden="true" /></span>
      <span className="notification-copy"><strong>{toast.title}</strong><span>{toast.message}</span></span>
      <button type="button" className="notification-close" onClick={() => onDismiss(toast.id)} aria-label="Cerrar notificación"><X aria-hidden="true" /></button>
      {toast.duration > 0 && <span className="notification-timer" style={{ animationDuration: `${toast.duration}ms` }} aria-hidden="true" />}
    </div>
  );
}

function ConfirmationDialog({ dialog, onResolve }: { dialog: ActiveDialog; onResolve: (result: DialogResult) => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    const rootWasInert = appRoot?.hasAttribute('inert') || false;
    const previousBodyOverflow = document.body.style.overflow;
    appRoot?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onResolve('dismiss');
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') || []);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (appRoot && !rootWasInert) appRoot.removeAttribute('inert');
      document.body.style.overflow = previousBodyOverflow;
      window.setTimeout(() => previousFocus?.focus(), 0);
    };
  }, [onResolve]);

  const tone = dialog.tone || 'default';
  const Icon = tone === 'danger' ? CircleAlert : tone === 'warning' ? TriangleAlert : Info;

  return (
    <div className="confirmation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onResolve('dismiss'); }}>
      <section
        ref={dialogRef}
        className={`confirmation-dialog confirmation-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`confirmation-title-${dialog.id}`}
        aria-describedby={`confirmation-message-${dialog.id}`}
      >
        <button type="button" className="confirmation-close" onClick={() => onResolve('dismiss')} aria-label="Cerrar diálogo"><X aria-hidden="true" /></button>
        <div className="confirmation-heading">
          <span className="confirmation-icon"><Icon aria-hidden="true" /></span>
          <div>
            <span>Confirmación necesaria</span>
            <h2 id={`confirmation-title-${dialog.id}`}>{dialog.title}</h2>
          </div>
        </div>
        <p id={`confirmation-message-${dialog.id}`}>{dialog.message}</p>
        {dialog.details && dialog.details.length > 0 && (
          <ul className="confirmation-details">
            {dialog.details.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}
          </ul>
        )}
        <div className="confirmation-actions">
          <button ref={cancelRef} className="ghost-button" type="button" onClick={() => onResolve('cancel')}>{dialog.cancelLabel || 'Cancelar'}</button>
          <button className={tone === 'danger' ? 'danger-button' : 'primary-button'} type="button" onClick={() => onResolve('confirm')}>{dialog.confirmLabel || 'Continuar'}</button>
        </div>
      </section>
    </div>
  );
}
