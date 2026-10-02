import React, { useEffect, useRef, useState } from 'react';
import {
  Eraser,
  Eye,
  FilePen,
  Save,
  UserRound,
  X, Undo2, Moon, Sun, ArrowUpRight, ArrowLeft } from 'lucide-react';
// Letra de CoordinaOT (Geist y Geist Mono) servida desde el proyecto; Didact Gothic es la
// sustituta de Century Gothic para «Planteamientos» en la cabecera (ver coordina/piezas.css).
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/didact-gothic/latin-400.css';
// Todos los estilos entran por estilos.css: lo de siempre va en `@layer legacy` y la capa
// de CoordinaOT (coordina/) sin capa, así que esta gana siempre (ver coordina/README.md).
import './estilos.css';
import type { ActiveTab, Catalog, DraftState, OrderAutofill, ReviewPackage, WorkflowReadiness, WorkflowSettings } from './types';
import { useDraft } from './hooks/useDraft';
import { useCalculation } from './hooks/useCalculation';
import { TabButton } from './components/TabButton';
import { OrderActions } from './components/OrderActions';
import { OrderSearch } from './components/OrderSearch';
import { normalizarNumeroPedidoRps } from '../remolques/rps/numero-pedido.ts';
import type { PedidoRps } from '../remolques/rps/types.ts';
import { incompleteAwningLines } from './incompleteAwnings';
import { pendingFabricProposalMessage } from './fabricProposal';
import { PdfPreviewViewer } from './components/PdfPreviewViewer';
import { controlLabel } from './components/controlLabels';
import { OrderView } from './views/OrderView';
import { ParametersView, type VistaRemolques } from './views/ParametersView';
import { useParameters, type SaveDraftResult } from './hooks/useParameters';
import { ParametersSaveBar } from './components/ParametersSaveBar';
import { ParametersHistory } from './components/ParametersHistory';
import { formOptions } from '../domain/modelBehavior.js';
import { ReviewsView } from './views/ReviewsView';
import { SettingsView } from './views/SettingsView';
import { NotificationCenter, useNotifications } from './components/NotificationCenter';
import { todayIso } from './constants';
import { readCurrentUser, saveCurrentUser } from './currentUser';
import { WhoAreYouDialog } from './components/WhoAreYouDialog';
import { personaDe, tintaSobre } from './personas';
import { stampAuthorship } from './authorship';
import { usePendingReviews } from './hooks/usePendingReviews';
import { buscarBorradorAlObtener, contenidoBorradorToldos, guardarBorradorPreguntando, TITULO_BORRADOR_EN_CORRECCION } from './borradores';
import type { PedidoRemolques } from '../remolques/flujo/tipos.ts';
import type { Borrador, BorradorRemolques } from '../borradores/tipos.ts';
import type { ModoCarga } from './remolques/guardarPedido';
import { RemolquesView } from './remolques/RemolquesView';
import { RemolquesParametersView } from './remolques/RemolquesParametersView';
import { useRemolquesParameters } from './remolques/useRemolquesParameters';
import { ClientesRemolquesView } from './remolques/ClientesRemolquesView';
import { useFichasClientes } from './remolques/useFichasClientes';
import { SelectorProducto, guardarProducto, leerProducto, type Producto, type ResumenPedido } from './remolques/SelectorProducto';

export default function App() {
  const draft = useDraft();
  const ruleSettings = useParameters();
  const remolquesSettings = useRemolquesParameters();
  const fichasClientes = useFichasClientes();
  // Parámetros › Remolques: la hoja general o la de clientes (fase 3); null = la de un modelo de toldo.
  const [remolquesVista, setRemolquesVista] = useState<VistaRemolques | null>(null);
  const showRemolquesParameters = remolquesVista !== null;
  // Las fichas de cliente se guardan cada una con su botón: la barra común es solo de los parámetros.
  const enFichasClientes = remolquesVista === 'clientes';
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  // Toldos o Remolques en Nuevo pedido (diseño 30/09/2026, fase 2a). Remolques se monta la primera
  // vez que se elige y se queda montado (oculto) para no perder el pedido a medias al cambiar
  // de producto o de pestaña; los toldos ya viven en `draft`, que es de esta pantalla.
  const [producto, setProducto] = useState<Producto>(() => leerProducto());
  const [remolquesMontado, setRemolquesMontado] = useState(producto === 'remolques');
  const [resumenRemolques, setResumenRemolques] = useState<ResumenPedido>({ numero: '', elementos: 0 });
  const [accionesPedido, setAccionesPedido] = useState<HTMLDivElement | null>(null);
  const [numeroBusqueda, setNumeroBusqueda] = useState<string | null>(null);
  const [editorPedidoAbierto, setEditorPedidoAbierto] = useState(false);
  function chooseProducto(next: Producto) {
    setEditorPedidoAbierto(true);
    setNumeroBusqueda(null);
    setProducto(next);
    guardarProducto(next);
    if (next === 'remolques') setRemolquesMontado(true);
  }
  const [working, setWorking] = useState<'review' | 'preview' | 'draft' | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const previewDialogRef = useRef<HTMLDivElement>(null);
  const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettings | null>(null);
  const [workflowReadiness, setWorkflowReadiness] = useState<WorkflowReadiness | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [autofillLoading, setAutofillLoading] = useState(false);
  // Contador de «Obtener datos»: abrir un borrador o guardar uno sube el número y la respuesta de RPS
  // que llegue después (de una petición anterior) se ignora, para que no pise el formulario.
  const autofillSeq = useRef(0);
  // Número del pedido en pantalla, para comprobar tras un await que sigue siendo el mismo.
  const orderCodeRef = useRef('');
  // Número del pedido ya guardado que se está corrigiendo (Pedidos › Corregir); null si no hay.
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [autofill, setAutofill] = useState<OrderAutofill | null>(null);
  const [pedidoSolicitado, setPedidoSolicitado] = useState<{ numero: string; id: number; pedidoRps?: PedidoRps } | null>(null);
  // Un pedido de remolques guardado que Pedidos manda abrir en Remolques («Corregir» o
  // «Reutilizar datos», fase 5); `id` distingue una petición de la siguiente.
  const [pedidoGuardadoSolicitado, setPedidoGuardadoSolicitado] = useState<{ id: number; pedido: PedidoRemolques; modo: ModoCarga } | null>(null);
  // Un borrador de remolques que se manda abrir en Remolques (Pedidos o «Obtener datos» de Toldos);
  // la pantalla de remolques pregunta si tiene datos (`preguntar`).
  const [borradorRemolquesSolicitado, setBorradorRemolquesSolicitado] = useState<{ id: number; borrador: BorradorRemolques; preguntar: boolean } | null>(null);
  // «Limpiar» de Remolques: cada pulsación sube el contador y la pantalla de remolques, que es
  // quien tiene el pedido, pregunta y limpia.
  const [limpiarRemolques, setLimpiarRemolques] = useState(0);
  // Nota del revisor al devolver un pedido: se ve en Pedido mientras se corrige.
  const [returnNote, setReturnNote] = useState<{ by: string; at: string; note: string } | null>(null);
  // OF del pedido según RPS, junto al pedido al que pertenecen. Solo valen si ese
  // pedido es el que está en pantalla: así una revisión abierta o un formulario
  // vaciado no se comparan con las OF del pedido anterior. null = no se conocen y
  // no se avisa de nada.
  const [orderOfs, setOrderOfs] = useState<{ orderCode: string; ofs: string[] } | null>(null);
  // Quién usa este navegador (diseño 24/09/2026, apartado 2): pone el autor/revisor
  // del pedido al guardar sin preguntarlo.
  const [currentUser, setCurrentUser] = useState(() => readCurrentUser());
  // Círculo del chip de usuario: iniciales y color de la persona, como en CoordinaOT.
  const currentAvatar = personaDe(currentUser);
  const [choosingUser, setChoosingUser] = useState(false);
  // Modo oscuro (Iván, 28/09/2026): se recuerda en este navegador.
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return window.localStorage.getItem('toldos-tema') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  // Enlace a la web de remolques (diseño 29/09/2026, fase 1): se lee una vez; si falla, sin enlace.
  const [remolquesUrl, setRemolquesUrl] = useState('');
  useEffect(() => {
    fetch('/api/app-info')
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => { if (info && typeof info.remolquesUrl === 'string') setRemolquesUrl(info.remolquesUrl); })
      .catch(() => { /* sin datos de la barra: no sale el enlace */ });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // La barra del navegador, del --bg de CoordinaOT de cada modo (como la cabecera).
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1a1b1f' : '#d6dbe2');
    try { window.localStorage.setItem('toldos-tema', theme); } catch { /* sin almacenamiento: dura hasta recargar */ }
  }, [theme]);
  function chooseUser(name: string) { saveCurrentUser(name); setCurrentUser(name); setChoosingUser(false); }
  const { toasts, dialog, notify, askForConfirmation, dismissToast, resolveDialog } = useNotifications();
  // Pendientes de generar (año actual y anterior): alimentan la bandeja y el contador
  // «Pedidos · N» desde que carga la página, y se releen al guardar o generar.
  const pendingReviews = usePendingReviews(reviewRefresh, notify);
  const pendingCount = pendingReviews.reviews.length;

  const { calculation, calculationState } = useCalculation({
    activeTab,
    orderCode: draft.orderCode,
    customer: draft.customer,
    orderDate: draft.orderDate,
    technician: draft.technician,
    reviewer: draft.reviewer,
    fabric: draft.fabric,
    sameFabric: draft.sameFabric,
    remate: draft.remate,
    remateColor: draft.remateColor,
    structureColor: draft.structureColor,
    rotTela: draft.rotTela,
    rotBamba: draft.rotBamba,
    awnings: draft.awnings,
    parameters: ruleSettings.parameters
  });

  useEffect(() => {
    fetch('/api/catalog')
      .then((response) => response.json())
      .then(setCatalog)
      .catch(() => notify('No se pudo cargar el catálogo.', { tone: 'error' }));
  }, [notify]);

  useEffect(() => {
    fetch('/api/workflow/settings')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setWorkflowSettings(data.settings);
        setWorkflowReadiness(data.readiness);
      })
      .catch(() => notify('No se pudo cargar la configuración de carpetas.', { tone: 'error' }));
  }, [notify]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!previewUrl) return;
    const focusFrame = requestAnimationFrame(() => previewDialogRef.current?.querySelector<HTMLElement>('.pdf-carousel')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setPreviewUrl('');
      requestAnimationFrame(() => previewButtonRef.current?.focus());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewUrl]);

  async function trailerPedidoOf(orderCode: string): Promise<PedidoRps | null> {
    try {
      const response = await fetch(`/api/remolques/rps-pedido?numero=${encodeURIComponent(orderCode)}`);
      if (!response.ok) return null;
      const data = await response.json() as { pedido: PedidoRps | null };
      return data.pedido;
    } catch {
      return null;
    }
  }

  function openInTrailers(numero: string, pedidoRps: PedidoRps) {
    chooseProducto('remolques');
    setPedidoSolicitado({ numero, id: Date.now(), pedidoRps });
  }

  // La pregunta de si sustituir lo que haya en Remolques la hace la propia pantalla, que es quien lo sabe.
  function abrirPedidoRemolques(pedido: PedidoRemolques, modo: ModoCarga) {
    chooseProducto('remolques');
    setActiveTab('order');
    setPedidoGuardadoSolicitado({ id: Date.now(), pedido, modo });
  }

  // Abrir un borrador del servidor (diseño 01/10/2026): «Seguir con el borrador» de Pedidos o «Abrir
  // borrador» al obtener un pedido. Los de remolques los abre su pantalla; los de toldos, el formulario,
  // con los parámetros actuales (un borrador es siempre de un pedido nuevo).
  async function abrirBorrador(borrador: Borrador, { preguntar = true }: { preguntar?: boolean } = {}) {
    if (borrador.kind === 'remolques') {
      chooseProducto('remolques');
      setActiveTab('order');
      setBorradorRemolquesSolicitado({ id: Date.now(), borrador, preguntar });
      return;
    }
    const hasDraftData = Boolean(
      draft.orderCode || draft.customer || draft.fabric || draft.notes
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (preguntar && hasDraftData) {
      const choice = await askForConfirmation({
        title: `Seguir con el borrador de ${borrador.orderCode}`,
        message: 'Los datos que haya ahora en Nuevo pedido se sustituirán por los del borrador. El borrador sigue en Pedidos hasta que lo guardes para revisión o lo descartes.',
        confirmLabel: 'Seguir con el borrador',
        cancelLabel: 'Conservar formulario',
        tone: 'warning'
      });
      if (choice !== 'confirm') return;
    }
    autofillSeq.current += 1;
    setAutofillLoading(false);
    draft.loadOrder(borrador.contenido.order as unknown as DraftState);
    setAutofill(null);
    setReturnNote(null);
    setCorrigiendo(null);
    ruleSettings.restoreParameters();
    chooseProducto('toldos');
    setActiveTab('order');
    notify(`Borrador de ${borrador.orderCode} abierto: sigue con él y guárdalo para revisión cuando esté listo.`, { tone: 'info', title: 'Borrador' });
  }

  const buscandoBorrador = useRef(false);
  async function autofillOrder(numero = draft.orderCode) {
    const orderCode = numero.trim();
    if (!orderCode) {
      notify('Indica primero el número de pedido.', { tone: 'warning' });
      return;
    }
    // Un doble clic no abre dos preguntas ni lanza dos consultas.
    if (buscandoBorrador.current || autofillLoading) return;
    buscandoBorrador.current = true;
    const seq = ++autofillSeq.current;
    setAutofillLoading(true);
    try {
      // Si este número tiene borrador (diseño 01/10/2026), se pregunta antes de ir a RPS.
      const conBorrador = await buscarBorradorAlObtener(orderCode, producto, askForConfirmation);
      if (seq !== autofillSeq.current) return;
      if (conBorrador.accion === 'cancelar') return;
      if (conBorrador.accion === 'abrir') {
        // Aquí mismo sin volver a preguntar salvo que el formulario tenga datos; si es de remolques,
        // su pantalla pregunta si tiene datos.
        const formularioConDatos = Boolean(draft.customer || draft.fabric || draft.notes || draft.awnings.length > 0);
        await abrirBorrador(conBorrador.borrador, { preguntar: conBorrador.borrador.kind !== 'toldos' || formularioConDatos });
        return;
      }
      const response = await fetch(`/api/orders/${encodeURIComponent(orderCode)}/autofill`);
      const data = await response.json();
      if (seq !== autofillSeq.current) return;
      if (!response.ok) throw new Error(data.error || 'No se pudieron obtener los datos del pedido.');
      const result = data as OrderAutofill;
      // Un pedido sin ningún toldo puede ser de remolques: se pregunta a la ruta de RPS de
      // remolques (la que decide qué es una línea de remolque). Los pedidos con toldos no
      // pasan por aquí y, si la consulta falla, todo sigue como antes.
      if (result.order.awnings.length === 0) {
        const trailers = await trailerPedidoOf(orderCode);
        if (seq !== autofillSeq.current) return;
        if (trailers && trailers.lineas.length > 0) {
          if (resumenRemolques.numero.trim() && normalizarNumeroPedidoRps(resumenRemolques.numero) !== normalizarNumeroPedidoRps(orderCode)) {
            const choice = await askForConfirmation({
              title: `Abrir ${orderCode} en Remolques`,
              message: 'Se sustituirá el pedido que tienes abierto en Remolques por el encontrado. El pedido de Toldos conserva sus datos.',
              confirmLabel: 'Abrir pedido', cancelLabel: 'Conservar formulario', tone: 'warning'
            });
            if (choice !== 'confirm' || seq !== autofillSeq.current) return;
          }
          openInTrailers(orderCode, trailers);
          return;
        }
      }
      // Solo se confirma la sustitución del formulario que corresponde al pedido encontrado.
      const hasFormData = Boolean(draft.customer || draft.fabric || draft.notes || draft.awnings.length > 0);
      if (hasFormData) {
        const choice = await askForConfirmation({
          title: `Obtener datos de ${orderCode}`,
          message: 'Los datos actuales del formulario se sustituirán por lo disponible en RPS. Después podrás editar libremente todos los campos.',
          confirmLabel: 'Obtener y rellenar',
          cancelLabel: 'Conservar formulario',
          tone: 'warning'
        });
        if (choice !== 'confirm' || seq !== autofillSeq.current) return;
      }
      chooseProducto('toldos');
      const currentResult = { ...result, order: { ...result.order, orderDate: todayIso() } };
      draft.loadOrder({ ...currentResult.order, fabricProposals: currentResult.fabricProposals ?? [], confirmedFabricProposals: [] });
      setAutofill(currentResult);
      setCorrigiendo(null);
      const elements = result.order.awnings.length;
      notify(
        `${result.recovered.length} campos y ${elements} ${elements === 1 ? 'elemento recuperado' : 'elementos recuperados'}. ${result.pending.length === 1 ? 'Queda 1 dato' : `Quedan ${result.pending.length} datos`} por revisar.`,
        { tone: result.pending.length > 0 ? 'info' : 'success', title: 'Pedido autocompletado' }
      );
    } catch (error) {
      if (seq !== autofillSeq.current) return;
      notify(error instanceof Error ? error.message : 'No se pudieron obtener los datos del pedido.', { tone: 'error' });
    } finally {
      buscandoBorrador.current = false;
      if (seq === autofillSeq.current) setAutofillLoading(false);
    }
  }

  function updateOrderCode(value: string) {
    draft.setOrderCode(value);
    if (autofill && value !== autofill.order.orderCode) setAutofill(null);
  }

  // Se consulta cada vez que cambia el pedido, venga de teclearlo, del autorrelleno o
  // de abrir una revisión, con una pausa para no preguntar a cada tecla. Cualquier
  // fallo deja el estado en desconocido y en silencio: se puede plantear un pedido
  // sin RPS y eso no cambia.
  const currentOrderCode = draft.orderCode.trim();
  orderCodeRef.current = currentOrderCode;
  const enCorreccion = corrigiendo !== null && corrigiendo === currentOrderCode;
  useEffect(() => {
    // Con el pedido vacío no se pregunta: la lista guardada deja de coincidir con él y
    // `knownOfs` queda en null sin tocar el estado.
    if (!currentOrderCode) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(currentOrderCode)}/ofs`);
        const data = response.ok ? await response.json() as { ofs?: string[] } : null;
        if (!cancelled) setOrderOfs(Array.isArray(data?.ofs) ? { orderCode: currentOrderCode, ofs: data.ofs } : null);
      } catch {
        if (!cancelled) setOrderOfs(null);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentOrderCode]);
  const knownOfs = orderOfs && orderOfs.orderCode === currentOrderCode ? orderOfs.ofs : null;

  async function editReview(review: ReviewPackage) {
    const hasDraftData = Boolean(
      draft.orderCode || draft.customer || draft.fabric || draft.notes
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (hasDraftData) {
      const choice = await askForConfirmation({
        title: `Corregir ${review.orderCode}`,
        message: 'Los datos que haya ahora en Nuevo pedido se sustituirán por los de este pedido. Los archivos ya guardados no se modificarán hasta que vuelvas a guardar.',
        confirmLabel: 'Abrir para corregir',
        cancelLabel: 'Conservar formulario',
        tone: 'warning'
      });
      if (choice !== 'confirm') return;
    }
    draft.loadOrder(review.order);
    setAutofill(null);
    setCorrigiendo(review.orderCode);
    setReturnNote(review.status === 'CHANGES_REQUESTED' && review.reviewNote
      ? { by: review.reviewedBy, at: review.reviewedAt || '', note: review.reviewNote }
      : null);
    if (review.order.parameters) ruleSettings.loadParameters(review.order.parameters, review.order.parametersVersion ?? null);
    chooseProducto('toldos');
    setActiveTab('order');
    notify(`Pedido ${review.orderCode} cargado en el formulario para corregirlo.`, { tone: 'info', title: 'Modo de corrección' });
  }

  async function reuseReview(review: ReviewPackage) {
    const choice = await askForConfirmation({
      title: `Reutilizar ${review.orderCode}`,
      message: 'Se sustituirá el formulario por los datos históricos, incluidos el número de pedido y las OF, y se recalculará con los parámetros actuales. Cámbialos antes de guardar si vas a crear un pedido nuevo.',
      confirmLabel: 'Reutilizar datos',
      cancelLabel: 'Conservar formulario',
      tone: 'warning'
    });
    if (choice !== 'confirm') return;
    draft.reuseOrder(review.order);
    // Es un pedido nuevo: el autor lo pone quien lo guarde, no el del histórico reutilizado.
    draft.setTechnician('');
    draft.setReviewer('');
    setAutofill(null);
    setCorrigiendo(null);
    chooseProducto('toldos');
    setActiveTab('order');
    notify(`Datos de ${review.orderCode} cargados en el formulario.`, { tone: 'success', title: 'Datos reutilizados' });
  }

  function currentOrderPayload() {
    const authorship = stampAuthorship({ technician: draft.technician, reviewer: draft.reviewer }, currentUser);
    return {
      orderCode: draft.orderCode,
      customer: draft.customer,
      orderDate: draft.orderDate,
      technician: authorship.technician,
      reviewer: authorship.reviewer,
      fabric: draft.fabric,
      sameFabric: draft.sameFabric,
      remate: draft.remate,
      remateColor: draft.remateColor,
      structureColor: draft.structureColor,
      rotTela: draft.rotTela,
      rotBamba: draft.rotBamba,
      notes: draft.notes,
      awnings: draft.awnings,
      fabricProposals: draft.fabricProposals,
      confirmedFabricProposals: draft.confirmedFabricProposals,
      parameters: ruleSettings.parameters,
      parametersVersion: ruleSettings.parametersVersion
    };
  }

  async function discardParameterDraft() {
    const choice = await askForConfirmation({
      title: 'Descartar cambios de parámetros',
      message: 'Se perderán los cambios que no has guardado. Los parámetros comunes no cambian.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
      tone: 'warning'
    });
    if (choice === 'confirm') {
      remolquesSettings.discardDraft();
    }
  }

  function notifyParameterSave(result: SaveDraftResult) {
    if (result.status === 'saved') notify('Los parámetros nuevos ya se usan en todos los puestos.', { tone: 'success', title: 'Parámetros guardados' });
    else if (result.status === 'conflict') notify('Otro puesto guardó cambios antes. Tu borrador sigue aquí: revísalo y vuelve a guardar.', { tone: 'warning', title: 'Parámetros actualizados por otro puesto' });
    else notify(result.message || 'No se pudieron guardar los parámetros.', { tone: 'error' });
  }

  async function saveForReview(confirmOverwrite = false, confirmIncomplete = false, confirmProposals = false) {
    const incomplete = incompleteAwningLines(draft.awnings, { fabric: draft.fabric, sameFabric: draft.sameFabric });
    // Sin ningún toldo calculado no se manda a revisar (Iván, 01/10/2026): saldría en «Por
    // revisar» sin despiece ni reserva. Para dejar un pedido a medias, el borrador.
    if (!calculation || calculation.ofs.length === 0) {
      notify(incomplete.length ? incomplete.join('. ') : 'Añade al menos un toldo antes de guardarlo para revisión.', { tone: 'warning', title: 'Faltan datos' });
      return;
    }
    const proposalMessage = pendingFabricProposalMessage(draft);
    if (proposalMessage && !confirmProposals) {
      const choice = await askForConfirmation({
        title: 'Hay telas sin comprobar',
        message: proposalMessage,
        confirmLabel: 'Guardar igualmente',
        cancelLabel: 'Volver al pedido',
        tone: 'warning'
      });
      if (choice !== 'confirm') return;
    }
    if (incomplete.length && !confirmIncomplete) {
      const choice = await askForConfirmation({
        title: 'Hay elementos sin completar',
        message: 'Se puede guardar como borrador para revisión, pero no se podrán generar los archivos definitivos hasta completarlos.',
        confirmLabel: 'Guardar igualmente',
        cancelLabel: 'Seguir completando',
        tone: 'warning',
        details: incomplete
      });
      if (choice !== 'confirm') return;
    }
    if (!draft.orderCode.trim()) {
      notify('Indica el número de pedido para crear el archivo de revisión.', { tone: 'warning' });
      return;
    }
    setWorking('review');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrderPayload(), confirmOverwrite, savedBy: currentUser })
      });
      const data = await response.json();
      if (response.status === 409 && data.needsConfirmation) {
        const choice = await askForConfirmation({
          title: `Actualizar ${draft.orderCode}`,
          message: 'Este pedido ya está guardado en Pedidos. Si continúas, el PDF actual se sustituirá por los datos del formulario.',
          confirmLabel: 'Actualizar pedido',
          cancelLabel: 'Conservar el actual',
          tone: 'warning',
          details: data.existing
        });
        if (choice === 'confirm') await saveForReview(true, true, true);
        return;
      }
      if (!response.ok) {
        notify(data.error || 'No se pudo guardar el pedido para revisión.', { tone: 'error' });
        return;
      }
      setReviewRefresh((value) => value + 1);
      setReturnNote(null);
      setCorrigiendo(null);
      draft.resetDraft();
      setAutofill(null);
      ruleSettings.restoreParameters();
      notify(`Guardado en Pedidos para revisión: ${data.review.orderCode}.pdf`, { tone: 'success', title: 'Guardado para revisión' });
    } catch {
      notify('No se pudo guardar el pedido para revisión.', { tone: 'error' });
    } finally {
      setWorking(null);
    }
  }

  // «Guardar borrador» (diseño 01/10/2026): el pedido a medias, aunque no tenga toldos ni esté
  // calculado, queda en el servidor para seguirlo desde cualquier puesto. Pide número y «Soy».
  async function saveDraftToServer() {
    const orderCode = draft.orderCode.trim();
    if (!orderCode) {
      notify('Indica el número de pedido para guardar el borrador.', { tone: 'warning', title: 'Falta el número' });
      return;
    }
    if (!currentUser) {
      setChoosingUser(true);
      notify('Elige quién eres en «Soy» antes de guardar el borrador.', { tone: 'warning' });
      return;
    }
    autofillSeq.current += 1;
    setAutofillLoading(false);
    setWorking('draft');
    try {
      const result = await guardarBorradorPreguntando({
        numero: orderCode,
        cuerpo: { kind: 'toldos', savedBy: currentUser, contenido: contenidoBorradorToldos(draft) },
        confirmar: askForConfirmation
      });
      if (!result.ok) {
        if (result.mensaje) notify(result.mensaje, { tone: 'error' });
        return;
      }
      setReviewRefresh((value) => value + 1);
      // Si mientras tanto el técnico ha cambiado de pedido, el formulario no se toca.
      if (orderCodeRef.current === orderCode) {
        setReturnNote(null);
        setCorrigiendo(null);
        draft.resetDraft();
        setAutofill(null);
        ruleSettings.restoreParameters();
      }
      notify(`Borrador guardado: ${result.borrador.orderCode}.`, { tone: 'success', title: 'Borrador guardado' });
    } finally {
      setWorking(null);
    }
  }

  async function openPlanteamientoPreview() {
    if (!calculation || calculation.ofs.length === 0) {
      const incomplete = incompleteAwningLines(draft.awnings, { fabric: draft.fabric, sameFabric: draft.sameFabric });
      notify(incomplete.length ? incomplete.join('. ') : 'Añade al menos un toldo para ver el planteamiento.', { tone: 'warning', title: 'Faltan datos' });
      return;
    }
    setWorking('preview');
    try {
      const response = await fetch('/api/planteamiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: currentOrderPayload() })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        notify(data.error || 'No se pudo generar la vista previa.', { tone: 'error' });
        return;
      }
      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      notify('No se pudo generar la vista previa.', { tone: 'error' });
    } finally {
      setWorking(null);
    }
  }

  function closePreview() {
    setPreviewUrl('');
    requestAnimationFrame(() => previewButtonRef.current?.focus());
  }

  async function clearForm() {
    const hasData = Boolean(
      draft.orderCode || draft.customer || draft.fabric
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (hasData) {
      const choice = await askForConfirmation({
        title: 'Limpiar el formulario',
        message: 'Se borrarán todos los datos del pedido actual. Esta acción no elimina los archivos que ya estén guardados.',
        confirmLabel: 'Limpiar formulario',
        cancelLabel: 'Volver al pedido',
        tone: 'danger'
      });
      if (choice !== 'confirm') return;
    }
    draft.resetDraft();
    ruleSettings.restoreParameters();
    setAutofill(null);
    setReturnNote(null);
    setCorrigiendo(null);
    setActiveTab('order');
    notify('El formulario está listo para un pedido nuevo.', { tone: 'success', title: 'Formulario limpio' });
  }

  const viewTitle = activeTab === 'order'
    ? 'Nuevo pedido'
    : activeTab === 'parameters'
      ? (remolquesVista === 'clientes' ? 'Clientes de remolques' : showRemolquesParameters ? 'Parámetros de remolques' : 'Parámetros de modelos')
      : activeTab === 'reviews'
        ? 'Pedidos'
        : 'Configuración de carpetas';

  return (
    <main className={`app-shell${activeTab === 'order' ? ' is-new-order' : ''}`}>
      {/* Cabecera como la de CoordinaOT (diseño 29/09/2026, estilo CoordinaOT): del color de
          la página, logo a la izquierda, pestañas como teclas sueltas y, a la derecha, el modo
          y «Soy» como su chip de usuario. Las clases salen de src/client/coordina/. */}
      <header className="cabecera glass-header">
        <div className="cabecera-logo">
          <img src="/logo-tgm-transparent.png" alt="TGM" />
          <h1>Planteamientos</h1>
        </div>
        <nav className="cabecera-pestanas tira-3d glass-chip" aria-label="Vistas">
          <TabButton active={activeTab === 'order'} disabled={working === 'review'} label="Nuevo pedido" onClick={() => setActiveTab('order')} />
          <TabButton active={activeTab === 'reviews'} disabled={working === 'review'} label="Pedidos" count={pendingCount} onClick={() => setActiveTab('reviews')} />
          <TabButton active={activeTab === 'parameters'} disabled={working === 'review'} label="Parámetros" onClick={() => setActiveTab('parameters')} />
          <TabButton active={activeTab === 'settings'} disabled={working === 'review'} label="Configuración" onClick={() => setActiveTab('settings')} />
          {remolquesUrl && (
            <a className="pestana" href={remolquesUrl} title="Abrir la aplicación de Remolques">Remolques<ArrowUpRight aria-hidden="true" /></a>
          )}
        </nav>
        <div className="cabecera-derecha">
          <button type="button" className="cabecera-modo glass-chip" onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} aria-label={theme === 'dark' ? 'Pasar a modo claro' : 'Pasar a modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
          <button type="button" className="cabecera-usuario glass-chip" onClick={() => setChoosingUser(true)} aria-label="Cambiar quién soy">
            {/* El avatar con las iniciales, como el chip de usuario de CoordinaOT. */}
            <span className="cabecera-avatar" aria-hidden="true" style={currentAvatar.color ? { background: currentAvatar.color, color: tintaSobre(currentAvatar.color) } : undefined}>
              {currentUser ? currentAvatar.iniciales : <UserRound />}
            </span>
            <span className="cabecera-usuario-nombre">Soy: {currentUser ? controlLabel(currentUser) : '—'}</span>
          </button>
        </div>
      </header>

      <section className="app-workspace">
        <header className="topbar" hidden={activeTab === 'order' && !editorPedidoAbierto}>
          <div className="workspace-heading">
            {activeTab !== 'order' && <h2>{viewTitle}</h2>}
            {activeTab === 'order' && <button type="button" className="ghost-button order-entry-back" disabled={Boolean(working) || autofillLoading} onClick={() => { setNumeroBusqueda(''); setEditorPedidoAbierto(false); }}><ArrowLeft aria-hidden="true" />Buscar otro pedido</button>}
            {activeTab === 'order' && <SelectorProducto producto={producto} onChange={chooseProducto} pedidos={{ toldos: { numero: draft.orderCode, elementos: draft.awnings.length }, remolques: resumenRemolques }} />}
            {/* La versión de los parámetros, en una línea junto al título (Iván, 25/09/2026). */}
            {activeTab === 'parameters' && (enFichasClientes
              ? null
              : showRemolquesParameters
                ? <ParametersHistory key="remolques" version={remolquesSettings.saved.version} endpoint="/api/remolques/parametros/history" labels={{ lona: 'Lona y contorno', ollaos: 'Ollaos', recogidas: 'Recogidas', baqueton: 'Baquetón', clientesBaqueton: 'Clientes con baquetón' }} onLoadVersion={remolquesSettings.loadVersion} />
                : <ParametersHistory key="toldos" />)}
          </div>
          <div className="order-actions-host" ref={setAccionesPedido} hidden={activeTab !== 'order' || !editorPedidoAbierto}>
          {activeTab === 'order' && producto === 'toldos' && (
            <OrderActions>
              <button className="ghost-button clear-form-button" type="button" disabled={Boolean(working)} onClick={() => void clearForm()}>
                <Eraser aria-hidden="true" />
                Limpiar
              </button>
              <button ref={previewButtonRef} className="ghost-button" type="button" disabled={Boolean(working) || calculationState === 'validating' || draft.awnings.length === 0} onClick={openPlanteamientoPreview}>
                <Eye aria-hidden="true" />
                {working === 'preview' ? 'Preparando…' : 'Vista previa'}
              </button>
              <button className="ghost-button" type="button" disabled={Boolean(working) || autofillLoading || !draft.orderCode.trim() || enCorreccion} title={enCorreccion ? TITULO_BORRADOR_EN_CORRECCION : draft.orderCode.trim() ? undefined : 'Escribe el número de pedido para guardar el borrador.'} onClick={() => void saveDraftToServer()}>
                <FilePen aria-hidden="true" />
                {working === 'draft' ? 'Guardando…' : 'Guardar borrador'}
              </button>
              <button className="primary-button" type="button" disabled={Boolean(working) || calculationState === 'validating' || draft.awnings.length === 0} onClick={() => void saveForReview()}>
                <Save aria-hidden="true" />
                {working === 'review' ? 'Guardando…' : 'Guardar para revisión'}
              </button>
            </OrderActions>
          )}
          </div>
        </header>

        <div className="workspace-content">
          {activeTab === 'order' && !editorPedidoAbierto && <section className="order-entry" aria-label="Inicio del pedido">
            <OrderSearch number={numeroBusqueda ?? ''} onChange={setNumeroBusqueda} loading={autofillLoading} onSearch={() => void autofillOrder(numeroBusqueda ?? '')} />
            <span className="order-entry-or">o</span>
            <SelectorProducto inicio disabled={autofillLoading} producto={producto} onChange={chooseProducto} pedidos={{ toldos: { numero: draft.orderCode, elementos: draft.awnings.length }, remolques: resumenRemolques }} />
          </section>}
          {activeTab === 'order' && editorPedidoAbierto && producto === 'toldos' && returnNote && (
            <div className="review-state-note is-returned order-return-note" role="status">
              <Undo2 aria-hidden="true" />
              <span>
                <strong>Devuelto por {controlLabel(returnNote.by) || 'el revisor'}{returnNote.at ? ` · ${new Date(returnNote.at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</strong>
                {returnNote.note}
              </span>
            </div>
          )}
          {activeTab === 'order' && editorPedidoAbierto && producto === 'toldos' && (
            <fieldset className="order-form-fieldset" disabled={working === 'review'} aria-busy={working === 'review'}>
              <OrderView
                availableModelNames={catalog?.models.map((model) => model.code) ?? []}
                orderCode={draft.orderCode}
                customer={draft.customer}
                orderDate={draft.orderDate}
                fabric={draft.fabric}
                sameFabric={draft.sameFabric}
                notes={draft.notes}
                remate={draft.remate}
                remateColor={draft.remateColor}
                awnings={draft.awnings}
                calculation={calculation}
                calculationState={calculationState}
                parameters={ruleSettings.parameters}
                setOrderCode={updateOrderCode}
                setCustomer={draft.setCustomer}
                setOrderDate={draft.setOrderDate}
                setFabric={draft.setFabric}
                setSameFabric={draft.setSameFabric}
                setNotes={draft.setNotes}
                setRemate={draft.setRemate}
                setRemateColor={draft.setRemateColor}
                addAwning={draft.addAwning}
                duplicateAwning={draft.duplicateAwning}
                removeAwning={draft.removeAwning}
                updateAwning={draft.updateAwning}
                onAutofill={() => void autofillOrder()}
                autofillLoading={autofillLoading}
                autofill={autofill}
                fabricProposals={draft.fabricProposals}
                confirmedFabricProposals={draft.confirmedFabricProposals}
                onConfirmFabricProposal={draft.confirmFabricProposal}
                knownOfs={knownOfs}
                getPanelOrder={currentOrderPayload}
                onConfirm={askForConfirmation}
                onNotify={notify}
              />
            </fieldset>
          )}

          {remolquesMontado && (
            <div className="remolques-pantalla" hidden={activeTab !== 'order' || !editorPedidoAbierto || producto !== 'remolques'}>
              <RemolquesView usuario={currentUser} notify={notify} askForConfirmation={askForConfirmation} pedidoSolicitado={pedidoSolicitado} limpiarSolicitado={limpiarRemolques}
                accionesDestino={accionesPedido} accionesVisibles={activeTab === 'order' && editorPedidoAbierto && producto === 'remolques'} onResumenChange={setResumenRemolques}
                onLimpiar={() => setLimpiarRemolques((n) => n + 1)}
                pedidoGuardadoSolicitado={pedidoGuardadoSolicitado}
                borradorSolicitado={borradorRemolquesSolicitado}
                onAbrirBorradorToldos={(borrador) => void abrirBorrador(borrador)}
                onGuardado={() => setReviewRefresh((value) => value + 1)} />
            </div>
          )}

          {activeTab === 'parameters' && (
            <>
            {showRemolquesParameters && !enFichasClientes && <ParametersSaveBar
              dirty={remolquesSettings.dirty}
              saving={remolquesSettings.saving}
              technicians={formOptions.tecnicos}
              onDiscard={() => void discardParameterDraft()}
              onSave={remolquesSettings.saveDraft}
              onResult={notifyParameterSave}
            />}
            <ParametersView
              remolquesVista={remolquesVista}
              remolquesPendientes={{ generales: remolquesSettings.dirty, clientes: fichasClientes.pendientes.length > 0 }}
              onSelectRemolques={setRemolquesVista}
              remolquesClientes={<>
                {fichasClientes.error && <div role="alert" className="parameter-note">{fichasClientes.error} <button type="button" className="ghost-button" onClick={() => void fichasClientes.refresh()}>Reintentar</button></div>}
                {!fichasClientes.ready && !fichasClientes.error && <p role="status">Cargando fichas de cliente…</p>}
                <ClientesRemolquesView fichas={fichasClientes.fichas} guardadas={fichasClientes.guardadas} pendientes={fichasClientes.pendientes} motivos={fichasClientes.motivos} usuario={currentUser}
                  recogidasGenerales={remolquesSettings.saved.parameters.recogidas.map((r) => r.nombre)} disabled={!fichasClientes.ready || fichasClientes.saving} guardando={fichasClientes.saving}
                  acciones={{ onUpdate: fichasClientes.update, onGuardar: fichasClientes.guardar, onDescartar: fichasClientes.descartar, onMotivo: fichasClientes.setMotivo, onCrear: fichasClientes.crear, onQuitar: fichasClientes.quitar, onCargarVersion: fichasClientes.cargarVersion, notify, askForConfirmation }} />
              </>}
              remolques={<>
                {remolquesSettings.error && <div role="alert" className="parameter-note">{remolquesSettings.error} <button type="button" className="ghost-button" onClick={() => void remolquesSettings.refresh()}>Reintentar</button></div>}
                {!remolquesSettings.ready && !remolquesSettings.error && <p role="status">Cargando parámetros de remolques…</p>}
                <RemolquesParametersView parameters={remolquesSettings.parameters} disabled={!remolquesSettings.ready || remolquesSettings.saving} onUpdate={remolquesSettings.update} onReset={remolquesSettings.reset} />
              </>}
              parameters={ruleSettings.generalParameters}
              onUpdateArzua={ruleSettings.updateArzua}
              onUpdateGalicia={ruleSettings.updateGalicia}
              onResetArzua={ruleSettings.resetArzua}
              onResetGalicia={ruleSettings.resetGalicia}
              onUpdatePerlaBox={ruleSettings.updatePerlaBox}
              onResetPerlaBox={ruleSettings.resetPerlaBox}
              onUpdateCoralBox={ruleSettings.updateCoralBox}
              onResetCoralBox={ruleSettings.resetCoralBox}
              onUpdateCuarzoBox={ruleSettings.updateCuarzoBox}
              onResetCuarzoBox={ruleSettings.resetCuarzoBox}
              onUpdateCortina={ruleSettings.updateCortina}
              onResetCortina={ruleSettings.resetCortina}
              onUpdateSelena={ruleSettings.updateSelena}
              onResetSelena={ruleSettings.resetSelena}
              onUpdateCambioCortina={ruleSettings.updateCambioCortina}
              onResetCambioCortina={ruleSettings.resetCambioCortina}
              onUpdateXacobeo={ruleSettings.updateXacobeo}
              onResetXacobeo={ruleSettings.resetXacobeo}
              onUpdatePuntoRecto={ruleSettings.updatePuntoRecto}
              onResetPuntoRecto={ruleSettings.resetPuntoRecto}
              onUpdateMonoblock350={ruleSettings.updateMonoblock350}
              onResetMonoblock350={ruleSettings.resetMonoblock350}
              onUpdateMaxiscreem={ruleSettings.updateMaxiscreem}
              onResetMaxiscreem={ruleSettings.resetMaxiscreem}
              onUpdateElectra={ruleSettings.updateElectra}
              onResetElectra={ruleSettings.resetElectra}
              onUpdateAmbarBox={ruleSettings.updateAmbarBox}
              onResetAmbarBox={ruleSettings.resetAmbarBox}
              onUpdateAgataBox={ruleSettings.updateAgataBox}
              onResetAgataBox={ruleSettings.resetAgataBox}
              onUpdateFabricJobs={ruleSettings.updateFabricJobs}
              onResetFabricJobs={ruleSettings.resetFabricJobs}
              onUpdateDrawings={ruleSettings.updateDrawings}
            />
            </>
          )}

          {activeTab === 'reviews' && (
            <ReviewsView
              refreshKey={reviewRefresh}
              parameters={ruleSettings.parameters}
              currentUser={currentUser}
              pending={pendingReviews.reviews}
              pendingLoading={pendingReviews.loading}
              onChanged={() => setReviewRefresh((value) => value + 1)}
              onOpen={editReview}
              onReuse={reuseReview}
              onEditRemolques={(pedido) => abrirPedidoRemolques(pedido, 'corregir')}
              onReuseRemolques={(pedido) => abrirPedidoRemolques(pedido, 'reutilizar')}
              onSeguirBorrador={(borrador) => abrirBorrador(borrador)}
              onToast={notify}
              onConfirm={askForConfirmation}
            />
          )}
          {activeTab === 'settings' && (
            workflowSettings && workflowReadiness
              ? <SettingsView
                  settings={workflowSettings}
                  readiness={workflowReadiness}
                  onSaved={(settings, readiness) => { setWorkflowSettings(settings); setWorkflowReadiness(readiness); }}
                  onToast={notify}
                />
              : <section className="settings-panel panel panel-3d">Cargando configuración…</section>
          )}
        </div>
      </section>
      <NotificationCenter
        toasts={toasts}
        dialog={dialog}
        onDismissToast={dismissToast}
        onResolveDialog={resolveDialog}
      />
      {previewUrl && (
        <div ref={previewDialogRef} className="pdf-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa del planteamiento">
          <div className="pdf-preview-window">
            <PdfPreviewViewer key={previewUrl} url={previewUrl} heading={<strong>Vista previa del planteamiento</strong>} actions={<>
                <button className="ghost-button" type="button" onClick={openPlanteamientoPreview}><Eye aria-hidden="true" />Actualizar</button>
                <button className="icon-button" type="button" onClick={closePreview} aria-label="Cerrar vista previa"><X aria-hidden="true" /></button>
            </>} />
          </div>
        </div>
      )}
      {(!currentUser || choosingUser) && (
        <WhoAreYouDialog current={currentUser} onChoose={chooseUser} onCancel={currentUser ? () => setChoosingUser(false) : undefined} />
      )}
    </main>
  );
}
