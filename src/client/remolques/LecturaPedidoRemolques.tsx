import React, { useMemo, useState } from 'react';
import { calcBaqueton, type BaquetonInput } from '../../remolques/calc/baqueton.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { ElementoEscena } from '../../remolques/escena/tipos.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { estadoLinea, type LineaPedido } from '../../remolques/workspace/lineas.ts';
import { medidasSuficientes } from '../../remolques/workspace/selectores.ts';
import { ReadModeContext } from '../components/ReadMode';
import { DibujoElemento } from './DibujoElemento';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';
import { PestanasElementos } from './PestanasElementos';
import { pantallaGanchos, ResultadosBaqueton, ResultadosLona } from './Resultados';
import { rotuloElemento } from './rotulo';

// El pedido de remolques guardado, en solo lectura, como el de toldos en Pedidos: las pestañas de
// sus elementos y, del elegido, el formulario con su aspecto de siempre pero sin poder escribir,
// su dibujo (3D o técnico) y sus resultados. Todo se calcula con los parámetros con que se guardó
// el pedido (`pedido.params`), los mismos de su hoja de taller, no con los comunes de ahora.

const nada = () => undefined;

/** Un elemento guardado con su cálculo, hecho con los parámetros del pedido. */
export function elementoConCalculo(linea: Pick<LineaPedido, 'tipo' | 'input'>, params: CalcParams): ElementoEscena {
  if (linea.tipo === 'lona') {
    const input = linea.input as LonaInput;
    return { tipo: 'lona', input, res: calcLona(input, params) };
  }
  const input = linea.input as BaquetonInput;
  return { tipo: 'baqueton', input, res: calcBaqueton(input, params) };
}

function ResultadosElemento({ elemento, params }: { elemento: ElementoEscena; params: CalcParams }) {
  if (!medidasSuficientes(elemento.input)) {
    return <p className="rem-vacio-resultado">Faltan medidas: no se pueden calcular los paños ni el reparto de ollaos.</p>;
  }
  const { input } = elemento;
  const comunes = {
    modoOllaos: input.modoOllaos,
    primerOllao: input.primerOllao ?? params.primerOllao,
    onOllaosChange: nada,
    ganchos: pantallaGanchos(input, undefined, nada),
  };
  return elemento.tipo === 'lona'
    ? <ResultadosLona res={elemento.res} {...comunes} />
    : <ResultadosBaqueton res={elemento.res} {...comunes} />;
}

export function LecturaPedidoRemolques({ pedido, versionInicial }: {
  pedido: PedidoRemolques;
  /** El elemento que se abre primero (por su versión); sin él, el primero del pedido. */
  versionInicial?: string;
}) {
  const lineas = useMemo<LineaPedido[]>(
    () => pedido.elementos.map(({ version, tipo, input }) => ({ version, tipo, input })),
    [pedido],
  );
  const estadosLinea = useMemo(
    () => Object.fromEntries(lineas.map((linea) => [linea.version, estadoLinea(linea)])),
    [lineas],
  );
  const [elegida, setElegida] = useState<string | null>(versionInicial ?? null);
  // Si al releer el pedido ya no está el elegido, se abre el primero.
  const indice = Math.max(lineas.findIndex((linea) => linea.version === elegida), 0);
  const linea = lineas[indice];
  const params = pedido.params;
  const elemento = useMemo(() => (linea ? elementoConCalculo(linea, params) : null), [linea, params]);
  if (!linea || !elemento) return null;
  const rotulo = rotuloElemento(linea, indice);
  const estado = estadosLinea[linea.version];

  return (
    // Sin un fieldset desactivado alrededor de todo: las pestañas y el 3D se siguen usando para mirar.
    // Solo el formulario y los resultados van dentro de uno.
    <div className="review-readonly-order rem-lectura" role="group" aria-label="Pedido de remolques en solo lectura">
      <PestanasElementos
        lineas={lineas}
        estadosLinea={estadosLinea}
        versionActiva={linea.version}
        puedeAnadir={false}
        onSeleccionar={setElegida}
        onEliminar={nada}
        onNuevo={nada}
        soloLectura
      />
      <section className="panel-vidrio rem-editor" aria-label={`Datos de ${rotulo}`}>
        <header className="rem-editor-cabecera">
          <p className="rem-editor-etiqueta">{`Solo lectura · ${pedido.numeroPedido}`}</p>
          <h2>{rotulo}</h2>
        </header>
        <div className="rem-editor-cuerpo">
          <div className="rem-editor-izquierda">
            {/* Las observaciones se leen como nota, igual que en la ficha de lectura de los toldos. */}
            <ReadModeContext.Provider value>
              <fieldset className="rem-lectura-campos" disabled>
                <legend className="sr-only">{`Formulario de ${rotulo}, solo lectura`}</legend>
                {/* key: los «Sí» pulsados a mano del formulario son de cada elemento. */}
                {elemento.tipo === 'lona' ? (
                  <FormularioLona key={linea.version} input={elemento.input} materiales={[]} params={params}
                    onChange={nada} />
                ) : (
                  <FormularioBaqueton key={linea.version} input={elemento.input} materiales={[]} params={params}
                    onChange={nada} />
                )}
              </fieldset>
            </ReadModeContext.Provider>
            {!estado?.lista && estado?.falta && (
              <p className="rem-editor-estado" role="status">{`Falta: ${estado.falta}`}</p>
            )}
          </div>
          <div className="rem-editor-derecha">
            <DibujoElemento elemento={elemento} params={params} />
            <fieldset className="rem-lectura-campos" disabled>
              <legend className="sr-only">{`Resultados de ${rotulo}`}</legend>
              <ResultadosElemento elemento={elemento} params={params} />
            </fieldset>
          </div>
        </div>
      </section>
    </div>
  );
}
