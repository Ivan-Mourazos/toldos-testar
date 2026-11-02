// Superficie vectorial común: las cotas y la geometría siguen en los trazados del dominio.
// No interpreta PDF ni rasteriza. Solo transforma primitivas en nodos SVG serializables.
// Pdfkit se usa como medidor tipográfico para conservar también los saltos de línea antiguos.
export function crearLienzoSvg(medidor, fuentes) {
  return new LienzoSvg(medidor, fuentes);
}

class LienzoSvg {
  constructor(medidor, fuentes) {
    this.medidor = medidor;
    this.fuentes = fuentes;
    this.nodes = [];
    this.pila = [];
    this.trazo = '';
    this.estado = { fill: '#000000', stroke: '#000000', strokeWidth: 1, strokeDasharray: '', transform: '' };
    this.letra = Object.keys(fuentes)[0];
    // _fragment es el punto donde pdfkit ya ha partido la línea y aplicado la elipsis.
    // No se llama al pintado de pdfkit: se conserva la línea y su base para el SVG.
    medidor._fragment = (texto, x, y, opciones) => this.lineaTexto(texto, x, y, opciones);
  }

  get _font() { return this.medidor._font; }
  comprobar(...valores) {
    if (!valores.every(Number.isFinite)) throw new Error('Coordenada no válida en el dibujo SVG.');
  }
  save() { this.pila.push({ ...this.estado }); return this; }
  restore() {
    if (!this.pila.length) throw new Error('Estado SVG sin guardar.');
    this.estado = this.pila.pop();
    return this;
  }
  transformar(texto) { this.estado.transform = `${this.estado.transform} ${texto}`.trim(); return this; }
  translate(x, y) { this.comprobar(x, y); return this.transformar(`translate(${x} ${y})`); }
  scale(x, y = x) { this.comprobar(x, y); return this.transformar(`scale(${x} ${y})`); }
  rotate(angulo, { origin = [0, 0] } = {}) {
    this.comprobar(angulo, ...origin);
    return this.transformar(`rotate(${angulo} ${origin[0]} ${origin[1]})`);
  }
  moveTo(x, y) { this.comprobar(x, y); this.trazo += `M${x} ${y}`; return this; }
  lineTo(x, y) { this.comprobar(x, y); this.trazo += `L${x} ${y}`; return this; }
  bezierCurveTo(...puntos) { this.comprobar(...puntos); this.trazo += `C${puntos.join(' ')}`; return this; }
  closePath() { this.trazo += 'Z'; return this; }
  rect(x, y, w, h) {
    this.comprobar(x, y, w, h);
    return this.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath();
  }
  roundedRect(x, y, w, h, radio) {
    this.comprobar(x, y, w, h, radio);
    // La misma aproximación cúbica que pdfkit, para conservar los encuentros del filete.
    const r = Math.min(radio, w / 2, h / 2), c = r * (1 - 0.5522847498307936);
    return this.moveTo(x + r, y).lineTo(x + w - r, y)
      .bezierCurveTo(x + w - c, y, x + w, y + c, x + w, y + r)
      .lineTo(x + w, y + h - r).bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - r, y + h)
      .lineTo(x + r, y + h).bezierCurveTo(x + c, y + h, x, y + h - c, x, y + h - r)
      .lineTo(x, y + r).bezierCurveTo(x, y + c, x + c, y, x + r, y).closePath();
  }
  circle(x, y, radio) {
    this.comprobar(x, y, radio);
    const c = radio * 0.5522847498307936;
    return this.moveTo(x - radio, y)
      .bezierCurveTo(x - radio, y - c, x - c, y - radio, x, y - radio)
      .bezierCurveTo(x + c, y - radio, x + radio, y - c, x + radio, y)
      .bezierCurveTo(x + radio, y + c, x + c, y + radio, x, y + radio)
      .bezierCurveTo(x - c, y + radio, x - radio, y + c, x - radio, y).closePath();
  }
  polygon(...puntos) {
    puntos.forEach(([x, y], i) => i ? this.lineTo(x, y) : this.moveTo(x, y));
    return this.closePath();
  }
  fillColor(color) { this.estado.fill = color; return this; }
  strokeColor(color) { this.estado.stroke = color; return this; }
  lineWidth(ancho) { this.comprobar(ancho); this.estado.strokeWidth = ancho; return this; }
  dash(largo, { space = largo } = {}) { this.comprobar(largo, space); this.estado.strokeDasharray = `${largo} ${space}`; return this; }
  undash() { this.estado.strokeDasharray = ''; return this; }
  pintar(relleno, linea) {
    if (!this.trazo) throw new Error('Trazo vacío en el dibujo SVG.');
    this.nodes.push({ tag: 'path', attrs: { ...this.estado, d: this.trazo, fill: relleno ? this.estado.fill : 'none', stroke: linea ? this.estado.stroke : 'none' } });
    this.trazo = '';
    return this;
  }
  fill(color) { if (color) this.fillColor(color); return this.pintar(true, false); }
  stroke(color) { if (color) this.strokeColor(color); return this.pintar(false, true); }
  fillAndStroke(relleno, linea) {
    if (relleno) this.fillColor(relleno);
    if (linea) this.strokeColor(linea);
    return this.pintar(true, true);
  }
  font(nombre) {
    if (!this.fuentes[nombre]) throw new Error(`Fuente SVG no disponible: ${nombre}.`);
    this.letra = nombre;
    this.medidor.font(nombre);
    return this;
  }
  fontSize(tamano) { this.comprobar(tamano); this.medidor.fontSize(tamano); return this; }
  widthOfString(...args) { return this.medidor.widthOfString(...args); }
  heightOfString(...args) {
    // La medición llama a _line con otro callback: no añade nodos al dibujo.
    return this.medidor.heightOfString(...args);
  }
  currentLineHeight(...args) { return this.medidor.currentLineHeight(...args); }
  text(...args) { this.medidor.text(...args); return this; }
  lineaTexto(texto, x, y, opciones) {
    texto = String(texto).replaceAll('\n', '');
    if (!texto) return;
    const fuente = this.fuentes[this.letra], size = this.medidor._fontSize;
    if (opciones.width) {
      if (opciones.align === 'center') x += opciones.lineWidth / 2 - opciones.textWidth / 2;
      else if (opciones.align === 'right') x += opciones.lineWidth - this.widthOfString(texto.trimEnd(), opciones);
      else if (opciones.align && opciones.align !== 'left') throw new Error('Alineación SVG no soportada.');
    }
    if (opciones.characterSpacing || opciones.wordSpacing || opciones.rotation || opciones.baseline) throw new Error('Composición tipográfica SVG no soportada.');
    const base = y + this._font.ascender / 1000 * size;
    const ancho = this.widthOfString(texto, opciones);
    this.comprobar(x, base, ancho);
    this.nodes.push({ tag: 'text', text: texto, attrs: {
      x, y: base, fill: this.estado.fill, transform: this.estado.transform,
      fontFamily: fuente.family, fontWeight: fuente.weight, fontStyle: fuente.style, fontSize: size,
      textLength: ancho, lengthAdjust: 'spacingAndGlyphs'
    } });
  }
  resultado() {
    if (this.pila.length || this.trazo) throw new Error('Dibujo SVG sin restaurar o sin terminar.');
    if (!this.nodes.length) throw new Error('Dibujo SVG vacío.');
    return { width: 242, height: 300, nodes: this.nodes };
  }
}

// Propuesta optativa para SVG y pdfkit: no cambia las coordenadas ni los datos del pedido.
export function superficiePlanoTecnico(superficie) {
  const rojo = color => ['#a3241c', '#9a2a22', '#b0453c'].includes(String(color).toLowerCase());
  const trazo = color => rojo(color) ? '#a3241c' : '#000000';
  const relleno = color => color === '#eef5f9' ? '#f2f2f2' : ['#000000', '#000', '#0a4f22', '#24513b'].includes(String(color).toLowerCase()) ? '#000000' : '#ffffff';
  let proxy;
  proxy = new Proxy(superficie, { get(target, key) {
    if (key === 'planoTecnico') return true;
    const valor = target[key];
    if (typeof valor !== 'function') return valor;
    return (...args) => {
      if (key === 'fillColor') args[0] = '#000000';
      if (key === 'strokeColor') args[0] = trazo(args[0]);
      if (key === 'fill' && args.length) args[0] = relleno(args[0]);
      if (key === 'fillAndStroke') args = [relleno(args[0]), trazo(args[1] ?? args[0])];
      if (key === 'fontSize') args[0] = 7.2;
      const result = valor.apply(target, args);
      return result === target ? proxy : result;
    };
  } });
  return proxy;
}
