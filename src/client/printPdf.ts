// Imprime un PDF con el diálogo del navegador, donde se elige impresora, páginas, copias, etc.
// El PDF se carga en un marco oculto y se llama a su print(): el visor de PDF de Chromium imprime
// el documento tal cual, con sus tamaños de página (A5 de estructura y A4 de telas).
// El marco se queda hasta la siguiente impresión: quitarlo con el diálogo abierto la cancela.

let frame: HTMLIFrameElement | null = null;
let frameUrl = '';

function clearFrame() {
  frame?.remove();
  frame = null;
  if (frameUrl) URL.revokeObjectURL(frameUrl);
  frameUrl = '';
}

export async function printPdf(url: string): Promise<void> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo abrir el PDF (${response.status}).`);
  const blob = new Blob([await response.arrayBuffer()], { type: 'application/pdf' });
  clearFrame();
  frameUrl = URL.createObjectURL(blob);
  const current = document.createElement('iframe');
  frame = current;
  current.className = 'pdf-print-frame';
  current.title = 'PDF para imprimir';
  current.tabIndex = -1;
  current.setAttribute('aria-hidden', 'true');
  // Oculto pero cargado: con display:none Chromium no arranca su visor de PDF y no imprime nada.
  current.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  // Un navegador sin visor de PDF no llega a cargarlo: a los 10 s se da por fallido.
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('El navegador no abrió el PDF para imprimir.')), 10000);
    current.addEventListener('load', () => { window.clearTimeout(timer); resolve(); }, { once: true });
    current.src = frameUrl;
    document.body.appendChild(current);
  });
  const view = current.contentWindow;
  if (!view) throw new Error('No se pudo preparar la impresión.');
  view.focus();
  view.print();
}
