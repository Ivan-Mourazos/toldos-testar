import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ResultadoPreparacion } from '../../cmt/preparacion/index.ts';
import { medidas, mm } from '../cmt/conversion';
import { VistaPreparacion } from '../cmt/VistaPreparacion';
import '../cmt/cmt.css';

export interface CorteDelPlanoCliente {
  archivo: string;
  vista: ResultadoPreparacion['vista'];
  medidasMm: ResultadoPreparacion['medidasMm'];
  cotas?: ResultadoPreparacion['cotas'];
}

/**
 * La pestaña Corte enseña solo el corte del plano, como «Planos a corte»: lo de dentro del recuadro CORTE.
 * Iván, 25/11/2026: «no quiero que salga la presentación del CAD; para ver el dibujo ya está la pestaña Dibujo».
 */
export function CortesDelPlano({ cortes, atenuado = false }: { cortes: CorteDelPlanoCliente[]; atenuado?: boolean }) {
  const [indice, setIndice] = useState(0);
  if (!cortes.length) {
    return <p className="corte-aviso" role="status">
      Este plano no tiene recuadro CORTE, así que no se puede enseñar solo el corte. Ábrelo en ZWCAD o míralo en la pestaña Dibujo.
    </p>;
  }
  const actual = Math.min(indice, cortes.length - 1);
  const corte = cortes[actual];
  const pie = [corte.medidasMm && medidas(corte.medidasMm.ancho, corte.medidasMm.alto), corte.archivo].filter(Boolean).join(' · ');
  return <div className={`cortes-del-plano${atenuado ? ' cad-paginas-atenuado' : ''}`}>
    {cortes.length > 1 && <div className="cortes-del-plano-paso" role="group" aria-label="Elegir corte">
      <button type="button" className="icon-button" aria-label="Corte anterior" disabled={actual <= 0}
        onClick={() => setIndice(actual - 1)}><ChevronLeft aria-hidden="true" /></button>
      <span role="status">Corte {mm(actual + 1)} de {mm(cortes.length)}</span>
      <button type="button" className="icon-button" aria-label="Corte siguiente" disabled={actual >= cortes.length - 1}
        onClick={() => setIndice(actual + 1)}><ChevronRight aria-hidden="true" /></button>
    </div>}
    <VistaPreparacion key={actual} vista={corte.vista} cotas={corte.cotas} />
    {pie && <p className="corte-ayuda">{pie}</p>}
  </div>;
}
