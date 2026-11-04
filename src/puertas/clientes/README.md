# Fichas de clientes de Puertas

Cada JSON es la ficha de un cliente: código RPS, unidad de su hoja, rollos iniciales, remates, perfiles, rótulos, tipos admitidos y correspondencia de artículos RPS. La carpeta se carga automáticamente en Node y en el cliente Vite; no hay que registrar el archivo en otro sitio.

Para incorporar otro cliente, copia una ficha, dale un `id` y un `codigoRps` únicos y conserva solo sus tipos y artículos contrastados. Elige una confección existente (`calculo: portanova` o `araujo`) únicamente si Oficina Técnica confirma que sirve. Los perfiles de ARAUJO contienen el aumento total de corte y la posición de marca, en cm. La unidad de la hoja es informativa: el configurador y estos parámetros trabajan en cm; el corte del bot usa mm.

Si el cliente necesita reglas aún desconocidas, usa `calculo: pendiente`, `habilitado: false` y un `aviso` que explique qué falta. Una fórmula nueva requiere estudiar sus pedidos anteriores y añadir el cálculo y sus pruebas; una ficha no inventa una confección. General aplica este bloqueo a los códigos sin ficha.

Santa Pau (`038661`, `calculo: santapau`) tiene expediente propio: mirilla por bordes visibles, E.T. sueltas de 9 y faldón rectangular. No se debe copiar su ficha con confección Portanova. Los ejemplos reproducibles están en `__fixtures__/santapau.ts`; `node scripts/contrastar-puertas-santapau.mjs` deja DWG, bot y presentación en `tmp/santapau/salida/`.

Los documentos antiguos sin `clientePuertas` ni `tipoPuerta` conservan su comportamiento: Portanova si no llevan configuración ARAUJO. No se reescriben al abrirlos. Las huellas de compatibilidad están en `../clientes.test.ts`.
