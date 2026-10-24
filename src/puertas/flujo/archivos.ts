import fs from "node:fs/promises";
import path from "node:path";
import { carpetaCorte } from "../../corteLonaArchivos.js";
import { writeFileAtomic } from "../../workflow.js";
import { escribirPlanoPuertas } from "../plano.ts";
import { exigirOfsPuertas } from "./pedido.ts";
import type { PlanoPuertas } from "./servicio.ts";

// El plano de un pedido de puertas: la presentación A4 de la oficina con el alzado de cada puerta y el corte,
// pasada a DWG con ODA, en la carpeta de planos del corte (Oficina Tecnica/<año>/AR….dwg), como los de toldos
// y remolques. Si ODA no está, se guarda en DXF y se avisa.

interface Oda {
  disponible: boolean;
  convertir(contenido: Uint8Array, opciones?: { desde?: "dxf" | "dwg"; hasta?: "dxf" | "dwg" }): Promise<Uint8Array>;
}

export function crearPlanoPuertas({ ajustes, oda, ofStockSacos }: {
  ajustes: () => Promise<{ corteLonaPlanoDirectory?: string }>;
  oda: Oda;
  /** Los mismos sacos de stock que el DXF del bot. */
  ofStockSacos?: () => Promise<{ of: string }>;
}): PlanoPuertas {
  return {
    async preparar(pedido, revisor, carpetaBorradores) {
      exigirOfsPuertas(pedido);
      // El borrador del flujo del DWG va a su carpeta, sin año ni técnico; el plano de revisión, a la de planos.
      const corteLonaPlanoDirectory = carpetaBorradores ?? (await ajustes()).corteLonaPlanoDirectory;
      if (!corteLonaPlanoDirectory) {
        return { fichero: null, avisos: ["Falta la carpeta de planos del corte en Configuración: no se ha escrito el plano."] };
      }
      const s = pedido.summary;
      const dxf = escribirPlanoPuertas({
        pedido: { ...pedido, summary: undefined },
        cabecera: { cliente: s.customer, tecnico: s.technician, revisor, fecha: s.orderDate },
        ofStockSacos: (await ofStockSacos?.())?.of || undefined,
      });
      const avisos: string[] = [];
      let contenido: Uint8Array = Buffer.from(dxf, "utf8");
      let extension = "dxf";
      if (oda.disponible) {
        try {
          contenido = await oda.convertir(contenido);
          extension = "dwg";
        } catch (error) {
          const codigo = ((error as { cause?: { code?: string } }).cause)?.code;
          if (!codigo || !["ENOENT", "EACCES"].includes(codigo)) throw error;
        }
      }
      if (extension === "dxf") avisos.push(`ODA no disponible: el plano de ${pedido.orderCode} se ha guardado en DXF.`);
      const filename = `${pedido.orderCode}.${extension}`;
      const carpeta = carpetaBorradores ?? carpetaCorte(corteLonaPlanoDirectory, { orderCode: pedido.orderCode, technician: s.technician });
      return { fichero: { type: "plano-puertas", filename, savedPath: path.join(carpeta, filename), contenido }, avisos };
    },

    // Flujo del DWG: el plano tal como está en su carpeta (quizá cambiado en ZWCAD), en DXF para leer su corte.
    async leer(ruta) {
      const contenido = await fs.readFile(ruta);
      if (!ruta.toLowerCase().endsWith(".dwg")) return contenido.toString("utf8");
      if (!oda.disponible) throw new Error("ODA no está disponible: no se puede leer el DWG del corte.");
      return Buffer.from(await oda.convertir(contenido, { desde: "dwg", hasta: "dxf" })).toString("utf8");
    },

    async escribir(fichero) {
      // La carpeta del año se crea si falta, como la de los planos de toldos y remolques.
      await fs.mkdir(path.dirname(fichero.savedPath), { recursive: true });
      await writeFileAtomic(fichero.savedPath, fichero.contenido);
    },
  };
}
