export function paresDxf(dxf) {
  const lineas = dxf.replace(/\r\n/g, '\n').trimEnd().split('\n');
  const pares = [];
  for (let i = 0; i + 1 < lineas.length; i += 2) pares.push([Number(lineas[i].trim()), lineas[i + 1].trim()]);
  return pares;
}

export function registrosDxf(dxf, seccion = 'ENTITIES') {
  const pares = paresDxf(dxf);
  const inicio = pares.findIndex(([c, v]) => c === 2 && v === seccion);
  const salida = [];
  for (const [c, v] of pares.slice(inicio + 1)) {
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
