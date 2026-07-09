import { useEffect, useMemo, useState } from 'react';
import type { ActiveTab, Awning, Calculation, CalculationState } from '../types';

export function useCalculation({
  activeTab,
  orderCode,
  customer,
  technician,
  fabric,
  structureColor,
  notes,
  awnings
}: {
  activeTab: ActiveTab;
  orderCode: string;
  customer: string;
  technician: string;
  fabric: string;
  structureColor: string;
  notes: string;
  awnings: Awning[];
}) {
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [calculationState, setCalculationState] = useState<CalculationState>('idle');

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setCalculationState('validating');

      try {
        const response = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderCode, customer, technician, fabric, structureColor, notes, awnings }),
          signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el planteamiento.');
        setCalculation(data);
        setCalculationState('ready');
      } catch {
        if (controller.signal.aborted) return;
        setCalculation(null);
        setCalculationState('error');
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeTab, orderCode, customer, technician, fabric, structureColor, notes, awnings]);

  const reservation = useMemo(() => ({
    orderCode,
    ofs: calculation?.ofs.filter((ofBlock) => ofBlock.materials.length > 0) || []
  }), [calculation, orderCode]);

  return { calculation, calculationState, reservation };
}
