import React, { useState } from 'react';
import { Save, Undo2 } from 'lucide-react';
import { COMMON_FABRIC_SCOPE } from '../../domain/parameterScopes.js';
import { readCurrentUser } from '../currentUser';
import { ambitosPendientes, descartarAmbitos, guardarAmbitos, type EstadoParametros } from '../parametrosToldos';
import { parameterModelName } from './ParameterSheet';
import { TextField } from './TextField';

/** El nombre de un modelo (o de lo común de los trabajos de tela) en pantalla. */
export const nombreAmbito = (ambito: string) => (ambito === COMMON_FABRIC_SCOPE ? 'Trabajos de tela (comunes)' : parameterModelName(ambito).current);

/**
 * La barra de cada modelo de Parámetros (Iván, 02/10/2026: «versiones por modelo»), como la de las
 * fichas de cliente: si hay cambios sin guardar, el motivo (opcional), «Descartar cambios» y «Guardar».
 * Guarda solo lo de esta ficha (el modelo y, en los trabajos de tela, lo común); quién guarda es el
 * «Soy». El historial del modelo está arriba, junto al título.
 */
export function ModelSaveBar({ ambitos, estado }: { ambitos: string[]; estado: EstadoParametros }) {
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<{ error: boolean; texto: string } | null>(null);
  const usuario = readCurrentUser();
  const todos = ambitosPendientes(estado);
  const pendientes = todos.filter((ambito) => ambitos.includes(ambito));
  const otros = todos.filter((ambito) => !ambitos.includes(ambito));
  const pendiente = pendientes.length > 0;
  const version = estado.shared.modelos[ambitos[0]]?.version ?? 0;

  async function guardar() {
    const nombres = pendientes.map(nombreAmbito).join(' y ');
    const resultado = await guardarAmbitos(pendientes, usuario, motivo.trim());
    if (resultado.status === 'saved') {
      setMotivo('');
      setAviso({ error: false, texto: `Guardado: ${nombres} ya se usa en todos los puestos.` });
    } else if (resultado.status === 'conflict') {
      setAviso({ error: true, texto: 'Otro puesto guardó este modelo antes. Tus cambios siguen aquí: revísalos y vuelve a guardar.' });
    } else {
      setAviso({ error: true, texto: resultado.message || 'No se pudieron guardar los parámetros.' });
    }
  }

  return <div className={`clientes-remolques-barra parametros-modelo-barra panel-3d glass-panel-strong${pendiente ? ' is-pendiente' : ''}`} role="region" aria-label="Guardar el modelo">
    <div className="clientes-remolques-barra-estado">
      <strong>{pendiente ? `Cambios sin guardar en ${pendientes.map(nombreAmbito).join(' y ')}` : 'Modelo guardado'}</strong>
      <span className="parametros-modelo-version">Versión {version}</span>
      {otros.length > 0 && <small>También sin guardar: {otros.map(nombreAmbito).join(', ')}</small>}
      {aviso && <small role="status" className={aviso.error ? 'parametros-modelo-error' : undefined}>{aviso.texto}</small>}
    </div>
    <div className="clientes-remolques-acciones">
      {confirmando ? <>
        <span className="parametros-modelo-confirmar">¿Descartar los cambios de {pendientes.map(nombreAmbito).join(' y ')}?</span>
        <button type="button" className="ghost-button" onClick={() => setConfirmando(false)}>Seguir editando</button>
        <button type="button" className="primary-button" onClick={() => { descartarAmbitos(pendientes); setConfirmando(false); setAviso(null); }}><Undo2 aria-hidden="true" />Descartar</button>
      </> : <>
        <TextField label="Motivo (opcional)" value={motivo} placeholder="Por qué cambia, si hace falta" onChange={setMotivo} />
        <button type="button" className="ghost-button" disabled={!pendiente || estado.saving} onClick={() => setConfirmando(true)}><Undo2 aria-hidden="true" />Descartar cambios</button>
        <button type="button" className="primary-button" disabled={!pendiente || estado.saving || !usuario} title={usuario ? `Se guarda como ${usuario}` : 'Elige «Soy» arriba para guardar.'}
          onClick={() => void guardar()}>
          <Save aria-hidden="true" />{estado.saving ? 'Guardando…' : 'Guardar'}
        </button>
      </>}
    </div>
  </div>;
}
