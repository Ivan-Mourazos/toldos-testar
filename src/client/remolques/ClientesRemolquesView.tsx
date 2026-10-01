import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PERFILES, type Recogida, type TipoPerfil } from '../../remolques/calc/params.ts';
import { CAMPOS_EXTRAS, idFicha } from '../../remolques/clientes/reglas.ts';
import type { ExtrasBaqueton, FichaCliente, MedidaHabitual, PerfilFicha } from '../../remolques/clientes/tipos.ts';
import { ParameterBand, ParameterSheet } from '../components/ParameterSheet';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { InputDecimal } from './InputDecimal';
import { escribirPosiciones, leerCodigos, leerPosiciones } from './posicionesTexto';

// Parámetros › Remolques › Clientes (fase 3): una ficha por cliente real, con sus códigos de RPS y lo
// habitual. Todo es opcional: «—» es «no lo dice la ficha» y al obtener el pedido no se toca.

const NADA = '—';
const SI_NO = [NADA, 'Sí', 'No'];
const deSiNo = (v: boolean | undefined) => (v === undefined ? NADA : v ? 'Sí' : 'No');
const aSiNo = (t: string) => (t === 'Sí' ? true : t === 'No' ? false : undefined);
const numero = (v: number | null) => (v == null || !Number.isFinite(v) ? undefined : v);
const LADOS = [['delante', 'Delante'], ['atras', 'Atrás'], ['laterales', 'Laterales']] as const;
const CAMPOS_POR_PERFIL: Record<TipoPerfil, Array<[Exclude<keyof PerfilFicha, 'tipoPerfil'>, string]>> = {
  'TIPO 01': [],
  'TIPO 02': [['aguas', 'Aguas (cm)']],
  'TIPO 03': [['aguas', 'Aguas (cm)'], ['radioCumbrera', 'Radio cumbrera (cm)'], ['radioHombro', 'Radio hombro (cm)']],
  'TIPO 04': [['chaflan', 'Chaflán · vértices (cm)'], ['radioChaflanAbajo', 'Radio abajo (cm)'], ['radioChaflanArriba', 'Radio arriba (cm)']],
  'TIPO 05': [['radioEsquina', 'Radio esquina (cm)']],
};
const ETIQUETAS_EXTRAS: Record<(typeof CAMPOS_EXTRAS)[number], string> = {
  extraLargoCostura: 'Extra de largo a costura (cm)', extraAnchoCostura: 'Extra de ancho a costura (cm)',
  extraBaquetonLargoDelante: 'Extra de baquetón delante (cm)', extraBaquetonLargoDetras: 'Extra de baquetón detrás (cm)',
  extraLargoFinal: 'Extra de largo final (cm)', extraAnchoFinal: 'Extra de ancho final (cm)', extraBaquetonTrasero: 'Extra de baquetón trasero (cm)',
};
const EXTRAS_VACIOS: ExtrasBaqueton = {
  extraLargoCostura: 0, extraAnchoCostura: 0, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
  extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0, observaciones: [],
};
const recogidaVacia = (nombre: string): Recogida => ({ nombre, delante: 0, atras: 0, lateralSoloAtras: 0, lateralSoloDelante: 0, panoTraseroConAnchoDelante: false });
const medidaVacia = (): MedidaHabitual => ({ tipo: 'lona', largo: 0, ancho: 0, ollaos: { delante: [], atras: [], laterales: [] } });

/** En la ficha, lo que no se rellena no existe: fuera las claves sin valor. */
const sinVacios = (ficha: FichaCliente): FichaCliente =>
  Object.fromEntries(Object.entries(ficha).filter(([, v]) => v !== undefined && v !== '')) as unknown as FichaCliente;

/** Número con coma decimal (244,5), como los campos del formulario; vacío es «sin valor» (null). */
function CampoNumFicha({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return <label><span>{label}</span><InputDecimal value={value} onValor={onChange} /></label>;
}

/** Texto que se escribe libre y se lee al salir del campo; si no se entiende, se queda el texto y se avisa. */
function CampoAlSalir<T>({ label, valor, leer, onChange, ayuda, errorLectura }: {
  label: string; valor: string; leer: (texto: string) => T | null; onChange: (v: T) => void; ayuda: string; errorLectura: string;
}) {
  const [texto, setTexto] = useState(valor);
  const [ilegible, setIlegible] = useState(false);
  return <label>
    <span>{label}</span>
    <input value={texto} aria-invalid={ilegible || undefined} onChange={(e) => { setTexto(e.target.value); setIlegible(false); }} onBlur={() => {
      const leido = leer(texto);
      if (leido === null) setIlegible(true);
      else { setIlegible(false); onChange(leido); }
    }} />
    {ilegible ? <small className="field-hint-warn" role="alert">{errorLectura}</small> : <small className="clientes-remolques-ayuda">{ayuda}</small>}
  </label>;
}
const ERROR_POSICIONES = 'No se entiende: usa números mayores que 0 separados por «·» o espacios';
const ERROR_CODIGOS = 'No se entiende: códigos de RPS separados por comas';

export function ClientesRemolquesView({ fichas, recogidasGenerales, onUpdate, disabled = false }: {
  fichas: FichaCliente[]; recogidasGenerales: string[]; onUpdate: (fichas: FichaCliente[]) => void; disabled?: boolean;
}) {
  const [elegida, setElegida] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const ficha = fichas.find((f) => f.id === elegida) ?? fichas[0] ?? null;
  const consulta = busca.trim().toLocaleUpperCase('es-ES');
  const visibles = fichas.filter((f) => !consulta || `${f.nombre} ${f.codigosRps.join(' ')}`.toLocaleUpperCase('es-ES').includes(consulta));
  const cambiar = (id: string, patch: Partial<FichaCliente>) => onUpdate(fichas.map((f) => (f.id === id ? sinVacios({ ...f, ...patch }) : f)));
  const anadir = () => {
    const id = idFicha(`ficha nueva ${fichas.length + 1}`, new Set(fichas.map((f) => f.id)));
    onUpdate([...fichas, { id, nombre: '', codigosRps: [] }]);
    setElegida(id);
  };
  return <fieldset className="remolques-parameters clientes-remolques-hoja" disabled={disabled}>
    <ParameterSheet model="Clientes de remolques" kind="remolques" description="Lo habitual de cada cliente. Al obtener un pedido de RPS de uno de sus códigos, los campos vacíos se rellenan con su ficha y llevan la marca «del cliente». Lo que no se rellena no se toca.">
      <div className="clientes-remolques">
        <nav className="clientes-remolques-lista bloque-3d-hundido" aria-label="Fichas de cliente">
          <TextField label="Buscar cliente o código" value={busca} onChange={setBusca} />
          {visibles.map((f) => (
            <button key={f.id} type="button" className={f.id === ficha?.id ? 'tecla-3d is-active bloque-3d-hundido' : 'tecla-3d'} aria-current={f.id === ficha?.id ? 'true' : undefined} onClick={() => setElegida(f.id)}>
              <strong>{f.nombre || 'Sin nombre'}</strong>
              <small>{f.codigosRps.length ? f.codigosRps.join(' · ') : 'Sin código de RPS'}</small>
            </button>
          ))}
          <button type="button" className="ghost-button" onClick={anadir}><Plus aria-hidden="true" />Añadir ficha</button>
        </nav>
        {ficha
          ? <FichaEditor key={ficha.id} ficha={ficha} recogidasGenerales={recogidasGenerales} onChange={(patch) => cambiar(ficha.id, patch)} onQuitar={() => { onUpdate(fichas.filter((f) => f.id !== ficha.id)); setElegida(null); }} />
          : <p className="clientes-remolques-vacio">Todavía no hay fichas. Se crean aquí o con «Guardar en la ficha del cliente» desde un pedido de Remolques.</p>}
      </div>
    </ParameterSheet>
  </fieldset>;
}

function FichaEditor({ ficha, recogidasGenerales, onChange, onQuitar }: {
  ficha: FichaCliente; recogidasGenerales: string[]; onChange: (patch: Partial<FichaCliente>) => void; onQuitar: () => void;
}) {
  const perfil = ficha.perfil;
  const propia = ficha.recogidaPropia;
  const recogidas = [NADA, ...recogidasGenerales, ...(propia?.nombre ? [propia.nombre] : [])];
  const medidas = ficha.medidas ?? [];
  const extras = ficha.extrasBaqueton;
  const cambiarPropia = (patch: Partial<Recogida>) => onChange({ recogidaPropia: { ...(propia ?? recogidaVacia('')), ...patch } });
  const cambiarMedida = (i: number, patch: Partial<MedidaHabitual>) => onChange({ medidas: medidas.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return <section className="clientes-remolques-ficha" aria-label={`Ficha de ${ficha.nombre || 'cliente nuevo'}`}>
    <ParameterBand number="01" title="Cliente" description="El nombre que se ve y sus códigos de cliente de RPS. Un código solo puede estar en una ficha.">
      <div className="parameter-grid remolques-parameter-grid">
        <TextField label="Nombre" value={ficha.nombre} onChange={(nombre) => onChange({ nombre })} />
        <CampoAlSalir key={ficha.codigosRps.join(',')} label="Códigos de RPS" ayuda="Separados por comas" errorLectura={ERROR_CODIGOS} valor={ficha.codigosRps.join(', ')} leer={leerCodigos} onChange={(codigosRps) => onChange({ codigosRps })} />
        <SelectField label="Trabajo habitual" value={ficha.trabajo === 'lona' ? 'Lona' : ficha.trabajo === 'baqueton' ? 'Baquetón' : NADA} options={[NADA, 'Lona', 'Baquetón']}
          onChange={(v) => onChange({ trabajo: v === 'Lona' ? 'lona' : v === 'Baquetón' ? 'baqueton' : undefined })} />
      </div>
      <button type="button" className="ghost-button" aria-label={`Quitar la ficha ${ficha.nombre}`} onClick={onQuitar}><Trash2 aria-hidden="true" />Quitar ficha</button>
    </ParameterBand>
    <ParameterBand number="02" title="Perfil" description="El perfil habitual de sus lonas y sus medidas.">
      <div className="parameter-grid remolques-parameter-grid">
        <SelectField label="Perfil" value={perfil ? PERFILES.find((p) => p.value === perfil.tipoPerfil)?.label ?? NADA : NADA} options={[NADA, ...PERFILES.map((p) => p.label)]}
          onChange={(label) => { const tipo = PERFILES.find((p) => p.label === label)?.value; onChange({ perfil: tipo ? { tipoPerfil: tipo } : undefined }); }} />
        {perfil && CAMPOS_POR_PERFIL[perfil.tipoPerfil].map(([campo, label]) => (
          <CampoNumFicha key={campo} label={label} value={perfil[campo] ?? null} onChange={(v) => onChange({ perfil: { ...perfil, [campo]: numero(v) } })} />
        ))}
      </div>
    </ParameterBand>
    <ParameterBand number="03" title="Recogidas" description="Las de Parámetros o la propia del cliente.">
      <div className="parameter-grid remolques-parameter-grid">
        <SelectField label="Recogida delante" value={ficha.recogeDelante ?? NADA} options={recogidas} onChange={(v) => onChange({ recogeDelante: v === NADA ? undefined : v })} />
        <SelectField label="Recogida detrás" value={ficha.recogeAtras ?? NADA} options={recogidas} onChange={(v) => onChange({ recogeAtras: v === NADA ? undefined : v })} />
        <SelectField label="Bastilla de enfundar" value={deSiNo(ficha.bastillaEnfundar)} options={SI_NO} onChange={(v) => onChange({ bastillaEnfundar: aSiNo(v) })} />
      </div>
      <label className="remolques-parameter-check"><input type="checkbox" checked={Boolean(propia)} onChange={(e) => onChange({ recogidaPropia: e.target.checked ? recogidaVacia(`PUENTES ${ficha.nombre}`.trim()) : undefined })} /><span>Recogida propia del cliente</span></label>
      {propia && <section className="remolques-parameter-row bloque-3d-hundido" aria-label="Recogida propia">
        <div className="parameter-grid remolques-parameter-grid">
          <TextField label="Nombre de la recogida" value={propia.nombre} onChange={(nombre) => cambiarPropia({ nombre })} />
          {([['delante', 'Delante (cm)'], ['atras', 'Detrás (cm)'], ['lateralSoloAtras', 'Extra lateral solo detrás (cm)'], ['lateralSoloDelante', 'Extra lateral solo delante (cm)']] as const).map(([campo, label]) => (
            <CampoNumFicha key={campo} label={label} value={propia[campo]} onChange={(v) => cambiarPropia({ [campo]: v ?? 0 })} />
          ))}
        </div>
        <label className="remolques-parameter-check"><input type="checkbox" checked={propia.panoTraseroConAnchoDelante ?? false} onChange={(e) => cambiarPropia({ panoTraseroConAnchoDelante: e.target.checked })} /><span>Paño trasero con el ancho de delante</span></label>
      </section>}
    </ParameterBand>
    <ParameterBand number="04" title="Ventana, rotulación y material" description="El material es el texto del campo «Material» del formulario; lo cómodo es guardarlo desde un pedido.">
      <div className="parameter-grid remolques-parameter-grid">
        <SelectField label="Ventana" value={deSiNo(ficha.ventana?.lleva)} options={SI_NO}
          onChange={(v) => { const lleva = aSiNo(v); onChange({ ventana: lleva === undefined ? undefined : lleva ? { ...ficha.ventana, lleva } : { lleva } }); }} />
        {ficha.ventana?.lleva && <>
          <CampoNumFicha label="Ancho ventana (cm)" value={ficha.ventana.ancho ?? null} onChange={(v) => onChange({ ventana: { ...ficha.ventana!, ancho: numero(v) } })} />
          <CampoNumFicha label="Alto ventana (cm)" value={ficha.ventana.alto ?? null} onChange={(v) => onChange({ ventana: { ...ficha.ventana!, alto: numero(v) } })} />
        </>}
        <SelectField label="Rotulación" value={deSiNo(ficha.rotulacion)} options={SI_NO} onChange={(v) => onChange({ rotulacion: aSiNo(v) })} />
        <TextField label="Material" value={ficha.material ?? ''} onChange={(material) => onChange({ material })} />
        <CampoNumFicha label="Sesgo detrás (cm más ancho atrás)" value={ficha.sesgoDetras ?? null} onChange={(v) => onChange({ sesgoDetras: numero(v) })} />
        <SelectField label="Cremallera del 9" value={deSiNo(ficha.cremallera)} options={SI_NO} onChange={(v) => onChange({ cremallera: aSiNo(v) })} />
      </div>
    </ParameterBand>
    <ParameterBand number="05" title="Extras de baquetón" description="Se suman a las demasías generales del baquetón cuando el baquetón es de este cliente.">
      <label className="remolques-parameter-check"><input type="checkbox" checked={Boolean(extras)} onChange={(e) => onChange({ extrasBaqueton: e.target.checked ? structuredClone(EXTRAS_VACIOS) : undefined })} /><span>Lleva extras de baquetón</span></label>
      {extras && <>
        <div className="parameter-grid remolques-parameter-grid">
          {CAMPOS_EXTRAS.map((campo) => <CampoNumFicha key={campo} label={ETIQUETAS_EXTRAS[campo]} value={extras[campo]} onChange={(v) => onChange({ extrasBaqueton: { ...extras, [campo]: v ?? 0 } })} />)}
        </div>
        <label><span>Observaciones del baquetón · una por línea</span><textarea rows={Math.max(2, extras.observaciones.length)} value={extras.observaciones.join('\n')} onChange={(e) => onChange({ extrasBaqueton: { ...extras, observaciones: e.target.value.split('\n') } })} /></label>
      </>}
    </ParameterBand>
    <ParameterBand number="06" title="Observaciones fijas" description="Salen siempre en sus planteamientos, una por línea.">
      <label><span>Observaciones · una por línea</span><textarea rows={Math.max(2, ficha.observaciones?.length ?? 0)} value={(ficha.observaciones ?? []).join('\n')} onChange={(e) => onChange({ observaciones: e.target.value ? e.target.value.split('\n') : undefined })} /></label>
    </ParameterBand>
    <ParameterBand number="07" title="Medidas habituales" description="Largo × ancho del remolque (lo que se teclea) y las posiciones de los ollaos de cada lado sobre la lona hecha, de izquierda a derecha, como en el CAD. Se imprimen tal cual.">
      <div className="remolques-parameter-rows">
        {medidas.map((m, i) => <section key={i} className="remolques-parameter-row bloque-3d-hundido" aria-label={`Medida ${i + 1}`}>
          <div className="parameter-grid remolques-parameter-grid">
            <SelectField label="Elemento" value={m.tipo === 'lona' ? 'Lona' : 'Baquetón'} options={['Lona', 'Baquetón']} onChange={(v) => cambiarMedida(i, { tipo: v === 'Lona' ? 'lona' : 'baqueton' })} />
            <CampoNumFicha label="Largo (cm)" value={m.largo || null} onChange={(v) => cambiarMedida(i, { largo: v ?? 0 })} />
            <CampoNumFicha label="Ancho (cm)" value={m.ancho || null} onChange={(v) => cambiarMedida(i, { ancho: v ?? 0 })} />
          </div>
          <div className="clientes-remolques-ollaos">
            {LADOS.map(([lado, nombre]) => (
              <CampoAlSalir key={`${lado}-${m.ollaos[lado].join(',')}`} label={`${nombre} · posiciones`} ayuda="Separadas por «·» o espacios" errorLectura={ERROR_POSICIONES}
                valor={escribirPosiciones(m.ollaos[lado])} leer={leerPosiciones} onChange={(p) => cambiarMedida(i, { ollaos: { ...m.ollaos, [lado]: p } })} />
            ))}
          </div>
          <button type="button" className="ghost-button" aria-label={`Quitar la medida ${i + 1}`} onClick={() => onChange({ medidas: medidas.filter((_, j) => j !== i) })}><Trash2 aria-hidden="true" />Quitar medida</button>
        </section>)}
        <button type="button" className="ghost-button" onClick={() => onChange({ medidas: [...medidas, medidaVacia()] })}><Plus aria-hidden="true" />Añadir medida</button>
      </div>
    </ParameterBand>
  </section>;
}
