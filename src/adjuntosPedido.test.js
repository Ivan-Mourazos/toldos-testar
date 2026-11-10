import PdfKit from 'pdfkit';
import { expect, it } from 'vitest';
import pdfLib from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { adjuntarPedido } from './adjuntosPedido.js';
it('actualizar el pedido sustituye su adjunto y conserva páginas y otros archivos', async () => {
  const inicial = await pdfLib.PDFDocument.create(); inicial.addPage();
  await inicial.attach(Buffer.from('otro documento'), 'manual.txt');
  let bytes = await inicial.save();
  for (let n = 0; n < 3; n++) bytes = await adjuntarPedido(bytes, { orderCode: 'AR2600001', enviosCorte: Array.from({ length: n }, (_, i) => ({ id: String(i) })) }, 'toldos');
  const tarea = getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  try {
    const pdf = await tarea.promise;
    const adjuntos = await pdf.getAttachments();
    const entradas = adjuntos instanceof Map ? [...adjuntos.values()] : Object.values(adjuntos);
    const datos = entradas.filter(a => a.filename === 'AR2600001.toldos.json');
    expect(datos).toHaveLength(1);
    expect(JSON.parse(Buffer.from(datos[0].content ?? await pdf.getAttachmentContent('AR2600001.toldos.json')).toString('utf8')).enviosCorte).toHaveLength(2);
    expect(entradas.some(a => a.filename === 'manual.txt')).toBe(true);
    expect(pdf.numPages).toBe(1);
  } finally { await tarea.destroy(); }
});

it('actualiza también el adjunto de un PDF de revisión creado con PDFKit', async () => {
  const bytes = await new Promise(resolve => {
    const doc = new PdfKit(); const partes = [];
    doc.on('data', b => partes.push(b)); doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.file(Buffer.from(JSON.stringify({ orderCode: 'AR2600001', enviosCorte: [] })), { name: 'AR2600001.toldos.json' });
    doc.text('Planteamiento'); doc.end();
  });
  const actualizado = await adjuntarPedido(bytes, { orderCode: 'AR2600001', enviosCorte: [{ id: 'nuevo' }] }, 'toldos');
  const tarea = getDocument({ data: new Uint8Array(actualizado), verbosity: 0 });
  try {
    const pdf = await tarea.promise;
    const adjuntos = await pdf.getAttachments();
    const entradas = adjuntos instanceof Map ? [...adjuntos.entries()] : Object.entries(adjuntos);
    const [clave, datos] = entradas.find(([, a]) => a.filename === 'AR2600001.toldos.json');
    expect(JSON.parse(Buffer.from(datos.content ?? await pdf.getAttachmentContent(clave)).toString('utf8')).enviosCorte).toHaveLength(1);
  } finally { await tarea.destroy(); }
});
