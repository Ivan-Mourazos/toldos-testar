/**
 * Genera src/client/dark.generated.css: el modo oscuro de la web (Iván, 28/09/2026).
 *
 * Los estilos tienen muchos colores escritos a mano (blancos, cremas, grises), así que
 * cambiar solo las variables dejaría media pantalla en blanco. Este script lee
 * styles.css y relieve.css y, para cada color claro de fondo, borde o texto oscuro,
 * escribe la misma regla bajo :root[data-theme="dark"] con su equivalente oscuro:
 *   fondo blanco o gris claro → superficie oscura; tinte crema/verde/rojo/azul → su
 *   tinte oscuro; texto oscuro → texto claro; borde claro → borde oscuro.
 * El amarillo de marca y los colores intensos se quedan igual. Los retoques a mano van
 * en dark.css, que se carga después.
 *
 * Uso: node scripts/generate-dark-theme.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(createRequire(import.meta.url).resolve('vite'));
const postcss = require('postcss');

const sources = ['src/client/styles.css', 'src/client/relieve.css'];
const colorPattern = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]*\)/gi;

function parse(color) {
  const text = color.toLowerCase();
  if (text.startsWith('#')) {
    let hex = text.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: alpha };
  }
  const numbers = text.replace(/rgba?\(|\)/g, '').split(/[\s,/]+/).filter(Boolean).map(Number);
  if (numbers.length < 3 || numbers.some((n) => Number.isNaN(n))) return null;
  return { r: numbers[0], g: numbers[1], b: numbers[2], a: numbers[3] ?? 1 };
}

function hsl({ r, g, b }) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B); const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function tint(h) {
  if (h >= 25 && h < 70) return 'amber';
  if (h >= 70 && h < 175) return 'green';
  if (h >= 175 && h < 270) return 'blue';
  return 'red';
}

const darkTints = {
  background: { amber: '#342b1b', green: '#1e3028', blue: '#242d36', red: '#352425' },
  border: { amber: '#786038', green: '#426854', blue: '#4c6479', red: '#785052' },
  text: { amber: '#f0c565', green: '#86d6a6', blue: '#93c7f0', red: '#f2a3a3' }
};

// Devuelve el color oscuro que corresponde, o null si se queda como está.
function darkColor(kind, color) {
  const rgb = parse(color);
  if (!rgb) return null;
  const { h, s, l } = hsl(rgb);
  if (kind === 'background') {
    if (rgb.a < 0.2) return null;
    if (l < 0.35) return null; // ya es oscuro (barra de arriba, botones negros)
    if (s < 0.28 && l >= 0.9) return 'var(--surface)';
    if (s < 0.3 && l >= 0.7) return 'var(--surface-muted)';
    if (l >= 0.78) return darkTints.background[tint(h)];
    return null; // intensos (amarillo de marca, verdes de estado): se quedan
  }
  if (kind === 'border') {
    if (l < 0.35) return null;
    if (s < 0.3 && l >= 0.6) return 'var(--border)';
    if (l >= 0.7) return darkTints.border[tint(h)];
    return null;
  }
  // texto
  if (l > 0.6) return null; // texto claro (sobre fondo oscuro): se queda
  // Los textos oscuros azulados o verdosos de la marca (#17383e…) son texto normal, no un color.
  if (l < 0.32 && (s < 0.55 || (h >= 160 && h < 220))) return 'var(--text)';
  if (s < 0.3) return 'var(--text-muted)';
  if (l < 0.45) return darkTints.text[tint(h)];
  return null;
}

function kindOf(prop) {
  if (prop === 'background' || prop === 'background-color') return 'background';
  if (prop === 'color') return 'text';
  if (prop.startsWith('border') || prop === 'outline' || prop === 'outline-color') return 'border';
  return null;
}

const output = postcss.root();
output.append(postcss.comment({ text: ' Generado con scripts/generate-dark-theme.mjs. No editar a mano: los retoques van en dark.css. ' }));
let count = 0;

for (const file of sources) {
  const root = postcss.parse(readFileSync(file, 'utf8'), { from: file });
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes/i.test(rule.parent.name)) return;
    if (rule.selector.includes(':root')) return; // variables: las cambia dark.css
    const decls = [];
    // Si la regla deja un fondo claro o intenso (amarillo de la tecla activa…), su letra
    // oscura se queda: pasarla a clara la haría ilegible sobre el amarillo.
    const keepsLightBackground = rule.nodes.some((node) => node.type === 'decl' && kindOf(node.prop) === 'background'
      && (/var\(--tgm-yellow\)/.test(node.value) || (node.value.match(colorPattern) || []).some((color) => {
        const rgb = parse(color);
        return rgb && rgb.a >= 0.2 && hsl(rgb).l >= 0.35 && !darkColor('background', color);
      })));
    rule.walkDecls((decl) => {
      const kind = kindOf(decl.prop);
      if (!kind) return;
      if (kind === 'text' && keepsLightBackground) {
        // Se repite tal cual para ganar a otra regla oscura anterior del mismo elemento.
        if (colorPattern.test(decl.value)) decls.push(postcss.decl({ prop: decl.prop, value: decl.value, important: decl.important }));
        colorPattern.lastIndex = 0;
        return;
      }
      // El negro de la marca escrito como variable también es letra oscura.
      if (kind === 'text' && decl.value.trim() === 'var(--tgm-black)') {
        decls.push(postcss.decl({ prop: decl.prop, value: 'var(--text)', important: decl.important }));
        return;
      }
      let changed = false;
      const value = decl.value.replace(colorPattern, (color) => {
        const dark = darkColor(kind, color);
        if (!dark) return color;
        changed = true;
        return dark;
      });
      // Los fondos se repiten siempre, cambien o no, para que el orden de la cascada sea el
      // mismo que en claro: si no, el fondo oscurecido de la tecla en reposo pisa al de
      // la activa o encendida (que no tiene nada que traducir o usa var()).
      if (changed || kind === 'background')
        decls.push(postcss.decl({ prop: decl.prop, value, important: decl.important }));
    });
    if (!decls.length) return;
    const selector = rule.selectors.map((item) => `:root[data-theme="dark"] ${item}`).join(',\n');
    const darkRule = postcss.rule({ selector });
    decls.forEach((decl) => darkRule.append(decl));
    // Conserva los @media que envuelven la regla.
    let container = darkRule;
    let parent = rule.parent;
    while (parent && parent.type === 'atrule') {
      const wrapper = postcss.atRule({ name: parent.name, params: parent.params });
      wrapper.append(container);
      container = wrapper;
      parent = parent.parent;
    }
    output.append(container);
    count += decls.length;
  });
}

writeFileSync('src/client/dark.generated.css', `${output.toString()}\n`);
console.log(`src/client/dark.generated.css: ${count} declaraciones.`);
