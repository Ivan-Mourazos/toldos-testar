import type sql from "mssql";
import { getRpsPoolForRemolques } from "../../rpsCatalog.js";

// Adaptador: en Remolques-TGM este fichero abría su propio pool. Aquí se reutiliza
// la conexión de solo lectura de toldos (src/rpsCatalog.js) para no duplicar
// configuración ni conexiones. La firma es la misma que la del original.
export function getRpsPool(): Promise<sql.ConnectionPool> | null {
  return getRpsPoolForRemolques() as Promise<sql.ConnectionPool> | null;
}
