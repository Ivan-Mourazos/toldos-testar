import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveTab, Awning, Calculation, CalculationState, RuleParameters } from '../types';

export function useCalculation({
  activeTab,
  orderCode,
  customer,
  orderDate,
  technician,
  reviewer,
  fabric,
  sameFabric,
  remate,
  remateColor,
  structureColor,
  rotTela,
  rotBamba,
  awnings,
  parameters
}: {
  activeTab: ActiveTab;
  orderCode: string;
  customer: string;
  orderDate: string;
  technician: string;
  reviewer: string;
  fabric: string;
  sameFabric: boolean;
  remate: string;
  remateColor: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
  awnings: Awning[];
  parameters: RuleParameters;
}) {
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [calculationState, setCalculationState] = useState<CalculationState>('idle');
  const [calculationError, setCalculationError] = useState('');
  // Un fallo pasajero (el servidor reiniciándose, la red) dejaba el formulario sin cálculo hasta que se tocaba
  // algún dato: ahora se reintenta solo unas veces y se puede pedir de nuevo (AR2605535, 16/11/2026).
  const [intento, setIntento] = useState(0);
  const reintentos = useRef(0);
  const recalcular = useCallback(() => { reintentos.current = 0; setIntento((n) => n + 1); }, []);

  useEffect(() => {
    if (awnings.length === 0) {
      return undefined;
    }

    const controller = new AbortController();
    let reintento: number | undefined;

    const timer = window.setTimeout(async () => {
      setCalculationState('validating');

      try {
        const response = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderCode,
            customer,
            orderDate,
            technician,
            reviewer,
            fabric,
            sameFabric,
            remate,
            remateColor,
            structureColor,
            rotTela,
            rotBamba,
            awnings,
            parameters
          }),
          signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw Object.assign(new Error(data.error || ''), { delServidor: response.status < 500 });
        setCalculation(data);
        setCalculationState('ready');
        setCalculationError('');
        reintentos.current = 0;
      } catch (error) {
        if (controller.signal.aborted) return;
        setCalculation(null);
        setCalculationState('error');
        setCalculationError(error instanceof Error && 'delServidor' in error ? error.message : 'no hay conexión con el servidor');
        // Lo que el servidor rechaza por los datos no cambia por repetirlo.
        if (!(error instanceof Error && 'delServidor' in error && error.delServidor) && reintentos.current < 3) {
          reintentos.current += 1;
          reintento = window.setTimeout(() => setIntento((n) => n + 1), 1500 * reintentos.current);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(reintento);
    };
  }, [activeTab, orderCode, customer, orderDate, technician, reviewer, fabric, sameFabric, remate, remateColor, structureColor, rotTela, rotBamba, awnings, parameters, intento]);

  const effectiveCalculation = awnings.length === 0 ? null : calculation;
  const effectiveState = awnings.length === 0 ? 'idle' : calculationState;
  const reservation = useMemo(() => ({
    orderCode,
    ofs: consolidateOfs(effectiveCalculation?.ofs || [])
  }), [effectiveCalculation, orderCode]);

  return { calculation: effectiveCalculation, calculationState: effectiveState, calculationError, recalcular, reservation };
}

function consolidateOfs(ofs: Calculation['ofs']) {
  const grouped = new Map<string, {
    of: string;
    description: string;
    materials: Map<string, {
      code: string;
      description?: string;
      quantity: number;
      aggregation?: 'sum' | 'max';
    }>;
  }>();
  for (const ofBlock of ofs) {
    if (ofBlock.materials.length === 0) continue;
    const ofKey = ofBlock.of.trim().toUpperCase();
    const target = grouped.get(ofKey) || {
      of: ofBlock.of,
      description: ofBlock.description,
      materials: new Map()
    };
    for (const material of ofBlock.materials) {
      const code = material.code.trim().toUpperCase();
      const current = target.materials.get(code) || { ...material, code, quantity: 0 };
      current.quantity = material.aggregation === 'max'
        ? Math.round(Math.max(current.quantity, material.quantity) * 1000) / 1000
        : Math.round((current.quantity + material.quantity) * 1000) / 1000;
      target.materials.set(code, current);
    }
    grouped.set(ofKey, target);
  }
  return Array.from(grouped.values()).map((ofBlock) => ({
    of: ofBlock.of,
    description: ofBlock.description,
    materials: Array.from(ofBlock.materials.values()).map(({ aggregation: _aggregation, ...material }) => material)
  }));
}
