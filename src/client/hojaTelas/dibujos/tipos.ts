export interface DibujoSvgDatos {
  width: number;
  height: number;
  nodes: Array<
    | { tag: 'path'; attrs: { d: string; fill: string; stroke: string; strokeWidth: number; strokeDasharray: string; transform: string } }
    | { tag: 'text'; text: string; attrs: { x: number; y: number; fill: string; transform: string; fontFamily: string; fontWeight: number; fontStyle: string; fontSize: number; textLength: number; lengthAdjust: 'spacingAndGlyphs' } }
  >;
}
