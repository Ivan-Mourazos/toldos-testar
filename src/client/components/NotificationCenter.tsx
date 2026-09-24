import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

// Vuelta del foco al cerrar una confirmación. El botón de origen a menudo se desactiva
// justo después (se guarda o se generan archivos) y entonces el navegador deja el foco en
// el <body>. Por eso, durante un rato, mientras el foco siga sin dueño se le devuelve en
// cuanto vuelva a poder recibirlo; una confirmación encadenada que se abra entretanto
// hereda ese destino. Si no llega a poder, va al título de la vista, nunca al <body>.
const FOCUS_RETURN_MS = 3000;
let pendingFocusTarget: HTMLElement | null = null;
let focusRetryTimer = 0;
// Último elemento con foco: si el botón que abre la confirmación se desactiva antes de
// abrirla («Guardar para revisión» → «Guardando…»), el foco ya está en el <body>.
let lastFocused: HTMLElement | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (event) => {
    if (event.target instanceof HTMLElement && event.target !== document.body) lastFocused = event.target;
  });
}

function canTakeFocus(element: HTMLElement) {
  return element.isConnected && !element.matches(':disabled') && !element.closest('[inert]');
}

function focusHasNoOwner() {
  return !document.activeElement || document.activeElement === document.body;
}

function takePendingFocusTarget() {
  window.clearTimeout(focusRetryTimer);
  const target = pendingFocusTarget;
  pendingFocusTarget = null;
  return target;
}

function focusViewHeading() {
  const heading = document.querySelector<HTMLElement>('.topbar h2');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: true });
}

function returnFocus(target: HTMLElement | null) {
  takePendingFocusTarget();
  if (!target || target === document.body) return;
  if (canTakeFocus(target)) target.focus({ preventScroll: true });
  // El origen ya no existe (p. ej. el panel que se ha cerrado): solo si nadie más ha
  // recogido el foco (el panel lo devuelve a su botón).
  if (!target.isConnected) {
    if (focusHasNoOwner()) focusViewHeading();
    return;
  }
  pendingFocusTarget = target;
  const startedAt = performance.now();
  const watch = () => {
    if (pendingFocusTarget !== target) return;
    const owner = document.activeElement;
    // Otro elemento tiene el foco (el usuario siguió, u otro diálogo): se deja.
    if (owner && owner !== document.body && owner !== target) { pendingFocusTarget = null; return; }
    if (owner !== target && canTakeFocus(target)) target.focus({ preventScroll: true });
    if (performance.now() - startedAt > FOCUS_RETURN_MS) {
      pendingFocusTarget = null;
      if (focusHasNoOwner()) focusViewHeading();
      return;
    }
    focusRetryTimer = window.setTimeout(watch, 100);
  };
  focusRetryTimer = window.setTimeout(watch, 100);
}

function ConfirmationDialog({ dialog, onResolve }: { dialog: ActiveDialog; onResolve: (result: DialogResult) => void }) {
  const hostRef = useRef<HTMLDialogElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Mientras está abierto; el evento «close» nativo que llega después de desmontarlo no
  // debe resolver otra confirmación encadenada.
  const active = useRef(false);

  // Es un <dialog> modal nativo para quedar en la capa superior: así también se ve y se
  // usa encima de otro <dialog> modal abierto (el panel «Despiece y dibujo» pregunta antes
  // de descartar un despiece). El modal nativo ya deja inerte el resto de la página, así
  // que #root no se marca. El elemento al que vuelve el foco se toma ANTES de abrirlo
  // (showModal mueve el foco dentro) y se devuelve al cerrarlo.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Una confirmación encadenada (la anterior no pudo devolver el foco) hereda su destino.
    // Si el foco está sin dueño, el último que lo tuvo (el botón que se desactivó).
    const pending = takePendingFocusTarget();
    const previousFocus = focusHasNoOwner()
      ? pending || (lastFocused?.isConnected ? lastFocused : null)
      : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Si ya hay otro modal que bloquea el desplazamiento (el panel), no se toca: al cerrar
    // se le devolvería un «hidden» que ya no le corresponde.
    const locksScroll = document.body.style.overflow !== 'hidden';
    const previousBodyOverflow = document.body.style.overflow;
    active.current = true;
    host.showModal();
    if (locksScroll) document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // Un Esc que ya atendió otro (el panel lo usa para abrir esta misma pregunta, y
        // este oyente se añade mientras ese evento aún sube) no la descarta.
        if (event.defaultPrevented) return;
        // Sin el comportamiento nativo (cancel/close): Chrome cierra el diálogo por su
        // cuenta tras varios cancel evitados, y aquí Esc ya es «descartar».
        event.preventDefault();
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
      active.current = false;
      document.removeEventListener('keydown', handleKeyDown);
      if (host.open) host.close();
      if (locksScroll) document.body.style.overflow = previousBodyOverflow;
      returnFocus(previousFocus);
    };
  }, [onResolve]);

  const tone = dialog.tone || 'default';
  const Icon = tone === 'danger' ? CircleAlert : tone === 'warning' ? TriangleAlert : Info;

  // Esc lo resuelve el manejador de teclado de arriba; el cierre nativo se evita para que
  // el <dialog> se cierre solo al desmontarse. Si aun así se cerrara solo, cuenta como
  // descartar.
  return (
    <dialog
      ref={hostRef}
      className="confirmation-host"
      role="alertdialog"
      aria-labelledby={`confirmation-title-${dialog.id}`}
      aria-describedby={`confirmation-message-${dialog.id}`}
      onCancel={(event) => event.preventDefault()}
      onClose={() => { if (active.current) onResolve('dismiss'); }}
    >
    <div className="confirmation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onResolve('dismiss'); }}>
      <section
        ref={dialogRef}
        className={`confirmation-dialog confirmation-${tone}`}
      >
        <button type="button" className="confirmation-close boton-3d" onClick={() => onResolve('dismiss')} aria-label="Cerrar diálogo"><X aria-hidden="true" /></button>
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
          <button className={tone === 'danger' ? 'danger-button boton-3d' : 'primary-button boton-3d'} type="button" onClick={() => onResolve('confirm')}>{dialog.confirmLabel || 'Continuar'}</button>
        </div>
      </section>
    </div>
    </dialog>
  );
}
