import { useEffect, useMemo, useState } from 'react';
import type { ActiveTab, Awning, Calculation, CalculationState, RuleParameters } from '../types';

export function useCalculation({
  activeTab,
  orderCode,
  customer,
  orderDate,
  technician,
  reviewer,
  fabric,
  remate,
  curvaBamba,
  bambaDistinta,
  telaBamba,
  structureColor,
  rotTela,
  rotBamba,
  notes,
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
  remate: string;
  curvaBamba: string;
  bambaDistinta: boolean;
  telaBamba: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
  notes: string;
  awnings: Awning[];
  parameters: RuleParameters;
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
          body: JSON.stringify({
            orderCode,
            customer,
            orderDate,
            technician,
            reviewer,
            fabric,
            remate,
            curvaBamba,
            bambaDistinta,
            telaBamba,
            structureColor,
            rotTela,
            rotBamba,
            notes,
            awnings,
            parameters
          }),
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
  }, [activeTab, orderCode, customer, orderDate, technician, reviewer, fabric, remate, curvaBamba, bambaDistinta, telaBamba, structureColor, rotTela, rotBamba, notes, awnings, parameters]);

  const reservation = useMemo(() => ({
    orderCode,
    ofs: calculation?.ofs.filter((ofBlock) => ofBlock.materials.length > 0) || []
  }), [calculation, orderCode]);

  return { calculation, calculationState, reservation };
}
