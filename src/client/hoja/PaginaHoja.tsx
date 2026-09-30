import React from 'react';
import type { PaginaHojaDatos, TablaPosiciones } from '../../remolques/hoja/pagina.ts';
import type { CapturaVista, VistaHoja } from '../remolques/render/captura';
import { CapaCotasHoja } from './CapaCotasHoja';
import { tamanoVista } from './medidas';

// Una hoja de taller (A4 apaisado) de un elemento del pedido. Mismo contenido y orden que la hoja
// de la web vieja, con el dibujo nuevo: arriba las dos 3/4 sin cotas, abajo las vistas rectas con
// cotas y la posición de cada ollao y gancho. Sin notas del cálculo: lo único escrito aparte son
// las observaciones del técnico.

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

const NOMBRE_VISTA: Record<VistaHoja, string> = {
  'tres-cuartos': '3/4 DESDE DELANTE',
  'tres-cuartos-detras': '3/4 DESDE DETRÁS',
  delante: 'VISTA DE DELANTE',
  detras: 'VISTA DE DETRÁS',
  lateral: 'VISTA LATERAL',
};

function DatoCabecera({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="hoja-cab-dato"><span>{etiqueta}</span><strong>{valor}</strong></div>;
}

function Vista({ vista, captura, conGanchos }: { vista: VistaHoja; captura: CapturaVista | null; conGanchos: boolean }) {
  const { ancho, alto } = tamanoVista(vista, conGanchos);
  return (
    // El nombre va encima del recuadro, fuera: dentro pisaba los rótulos DELANTE / DETRÁS.
    <figure className={`hoja-vista hoja-vista-${vista}`} style={{ width: `${ancho}mm` }}>
      <figcaption>{NOMBRE_VISTA[vista]}</figcaption>
      <div className="hoja-vista-marco" style={{ height: `${alto}mm` }}>
        {captura ? (
          <>
            <img src={captura.png} alt={NOMBRE_VISTA[vista]} />
            <CapaCotasHoja captura={captura} />
          </>
        ) : <span className="hoja-sin-dibujo">SIN DIBUJO</span>}
      </div>
    </figure>
  );
}

function Tabla({ tabla }: { tabla: TablaPosiciones }) {
  const columnas = Array.from({ length: tabla.columnas }, (_, i) => i);
  return (
    <section className="hoja-tabla-bloque">
      <span className="hoja-rotulo">{tabla.titulo}</span>
      <table className="hoja-tabla">
        <thead>
          <tr>
            <th className="hoja-tabla-nombre" />
            {columnas.map((i) => <th key={i}>{i + 1}</th>)}
            <th className="hoja-tabla-total">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {tabla.filas.map((fila) => (
            <tr key={fila.nombre}>
              <td className="hoja-tabla-nombre">{fila.nombre}</td>
              {columnas.map((i) => <td key={i}>{fila.posiciones[i] == null ? '' : fmt(fila.posiciones[i])}</td>)}
              <td className="hoja-tabla-total">{fila.posiciones.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function PaginaHoja({ pagina, vistas }: { pagina: PaginaHojaDatos; vistas: Record<VistaHoja, CapturaVista> | null }) {
  const { cabecera } = pagina;
  const conGanchos = pagina.ganchos != null;
  const vista = (v: VistaHoja) => <Vista vista={v} captura={vistas?.[v] ?? null} conGanchos={conGanchos} />;
  return (
    <article className={`hoja-pagina${conGanchos ? ' con-ganchos' : ''}`} data-titulo={pagina.titulo}>
      <header className="hoja-cabecera">
        <div className="hoja-logo"><img src="/logo-tgm-transparent.png" alt="TGM" /></div>
        <div>
          <span className="hoja-rotulo">CLIENTE</span>
          <strong className="hoja-cab-grande">{cabecera.cliente}</strong>
          <div className="hoja-cab-datos">
            <DatoCabecera etiqueta="REALIZADO POR" valor={cabecera.realizadoPor} />
            <DatoCabecera etiqueta="REVISADO POR" valor={cabecera.revisadoPor} />
          </div>
        </div>
        <div>
          <span className="hoja-rotulo">Nº PEDIDO</span>
          <strong className="hoja-cab-grande">{cabecera.numeroPedido}</strong>
          <div className="hoja-cab-datos">
            <DatoCabecera etiqueta="O.F." valor={cabecera.of} />
            <DatoCabecera etiqueta="FECHA" valor={cabecera.fecha} />
          </div>
        </div>
      </header>

      <h1 className="hoja-titulo">{pagina.titulo}</h1>

      <section className="hoja-banda">
        {pagina.banda.map((celda) => (
          <div key={celda.titulo} className="hoja-celda">
            <span className="hoja-rotulo">{celda.titulo}</span>
            {celda.lineas.map((linea, i) => <strong key={i} className="hoja-celda-linea">{linea}</strong>)}
            {celda.notas.map((nota, i) => <span key={i} className="hoja-celda-nota">{nota}</span>)}
          </div>
        ))}
      </section>

      <section className="hoja-cuerpo">
        <div className="hoja-columna">
          {pagina.grupos.map((grupo) => (
            <div key={grupo.titulo} className="hoja-grupo">
              <span className="hoja-rotulo">{grupo.titulo}</span>
              <dl>
                {grupo.datos.map((dato) => (
                  <div key={dato.etiqueta} className="hoja-dato">
                    <dt>{dato.etiqueta}</dt>
                    <dd>{dato.valores.map((valor, i) => <span key={i}>{valor}</span>)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <div className="hoja-grupo">
            <span className="hoja-rotulo">MATERIAL</span>
            <p className="hoja-material">{pagina.material}</p>
          </div>
          <div className="hoja-grupo">
            <span className="hoja-rotulo">OBSERVACIONES</span>
            <p className="hoja-observaciones">{pagina.observaciones}</p>
          </div>
        </div>
        <div className="hoja-dibujo">
          <div className="hoja-fila">{vista('tres-cuartos')}{vista('tres-cuartos-detras')}</div>
          <div className="hoja-fila">{vista('delante')}{vista('detras')}{vista('lateral')}</div>
        </div>
      </section>

      <Tabla tabla={pagina.ollaos} />
      {pagina.ganchos && <Tabla tabla={pagina.ganchos} />}
    </article>
  );
}
