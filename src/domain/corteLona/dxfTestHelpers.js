function* recorrerPares(texto, inicio) {
  while (inicio < texto.length) {
    const finCodigo = texto.indexOf('\n', inicio);
    if (finCodigo < 0) break;
    const salto = texto.indexOf('\n', finCodigo + 1);
    const finValor = salto < 0 ? texto.length : salto;
    yield [Number(texto.slice(inicio, finCodigo).trim()), texto.slice(finCodigo + 1, finValor).trim()];
    inicio = finValor + 1;
  }
}

export function paresDxf(dxf) {
  return [...recorrerPares(dxf.trimEnd(), 0)];
}

function inicioSeccion(texto, seccion) {
  let inicio = 0, enCabecera = false, alternativo = 0;
  while (inicio < texto.length) {
    const finCodigo = texto.indexOf('\n', inicio);
    if (finCodigo < 0) break;
    const salto = texto.indexOf('\n', finCodigo + 1);
    const finValor = salto < 0 ? texto.length : salto;
    const valor = texto.slice(finCodigo + 1, finValor).trim();
    if (valor === seccion && Number(texto.slice(inicio, finCodigo).trim()) === 2) {
      if (enCabecera) return finValor + 1;
      alternativo ||= finValor + 1;
    }
    enCabecera = valor === 'SECTION' && Number(texto.slice(inicio, finCodigo).trim()) === 0;
    inicio = finValor + 1;
  }
  // Conserva la lectura histórica de los DXF parciales o sin la sección.
  return alternativo;
}

export function registrosDxf(dxf, seccion = 'ENTITIES') {
  const texto = dxf.trimEnd();
  const salida = [];
  for (const [c, v] of recorrerPares(texto, inicioSeccion(texto, seccion))) {
    if (c === 0) {
      if (v === 'ENDSEC') break;
      salida.push({ tipo: v, pares: [] });
    } else salida.at(-1)?.pares.push([c, v]);
  }
  return salida;
}

export const valor = (registro, codigo) => registro.pares.find(([c]) => c === codigo)?.[1];
export const numero = (registro, codigo) => Number(valor(registro, codigo));
export const variable = (dxf, nombre) => {
  const pares = paresDxf(dxf);
  return pares[pares.findIndex(([c, v]) => c === 9 && v === nombre) + 1]?.[1];
};
