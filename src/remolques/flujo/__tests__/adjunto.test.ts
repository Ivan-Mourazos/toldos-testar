import { describe, expect, it } from "vitest";
import pdfLib from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { adjuntarDatosPedido, leerDatosPedido, nombreAdjunto } from "../adjunto.ts";
import type { PedidoRemolques } from "../tipos.ts";

const pedido: PedidoRemolques = {
  schemaVersion: 1, kind: "remolques", orderCode: "AR2604286", numeroPedido: "AR.26.04286", status: "PRODUCED",
  createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z", createdBy: "IVÁN",
  reviewedAt: "2026-10-01T09:00:00.000Z", reviewedBy: "JAIME", reviewNote: "",
  production: { createdAt: "2026-10-01T09:00:00.000Z", createdBy: "IVÁN", files: [{ type: "pdf", filename: "AR2604286-10.pdf", savedPath: "/p/AR2604286-10.pdf" }] },
  summary: { customer: "TALLERES CAL", orderDate: "2026-09-01", technician: "IVÁN", reviewer: "JAIME", awnings: 0, ofs: [], models: [], diagnostics: 0 },
  params: DEFAULT_PARAMS, elementos: [],
};

async function pdfDePrueba(paginas = 2) {
  const documento = await pdfLib.PDFDocument.create();
  for (let i = 0; i < paginas; i++) documento.addPage([842, 595]);
  return documento.save();
}

async function nombresDeAdjuntos(pdf: Uint8Array) {
  const tarea = getDocument({ data: new Uint8Array(pdf) });
  const documento = await tarea.promise;
  const adjuntos = await documento.getAttachments();
  const lista = adjuntos instanceof Map ? [...adjuntos.values()] : Object.values(adjuntos ?? {});
  const paginas = documento.numPages;
  await tarea.destroy();
  return { paginas, nombres: lista.map((adjunto) => (adjunto as { filename: string }).filename) };
}

describe("los datos del pedido dentro del PDF", () => {
  it("el PDF lleva el pedido entero en AR….remolques.json, conserva sus hojas y se vuelve a leer igual", async () => {
    const conDatos = await adjuntarDatosPedido(await pdfDePrueba(), pedido, new Date("2026-10-01T08:00:00Z"));
    expect(conDatos.subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(await leerDatosPedido(conDatos)).toEqual(pedido);
    expect(await nombresDeAdjuntos(conDatos)).toEqual({ paginas: 2, nombres: [nombreAdjunto("AR2604286")] });
    expect(nombreAdjunto("AR2604286")).toBe("AR2604286.remolques.json");
  });

  it("un PDF sin los datos lo dice", async () => {
    await expect(leerDatosPedido(await pdfDePrueba(1))).rejects.toThrow("El PDF no lleva los datos del pedido de remolques.");
  });

  it("un adjunto que no es un pedido de remolques no se toma por uno", async () => {
    const documento = await pdfLib.PDFDocument.create();
    documento.addPage();
    await documento.attach(Buffer.from(JSON.stringify({ kind: "toldos-testar-review", orderCode: "AR2604286" })), "AR2604286.remolques.json", { mimeType: "application/json" });
    await expect(leerDatosPedido(await documento.save())).rejects.toThrow("Los datos que lleva el PDF no son de un pedido de remolques.");
  });
});
