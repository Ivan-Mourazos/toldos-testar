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
  sameFabric,
  remate,
  remateColor,
  curvaBamba,
  bambaDistinta,
  telaBamba,
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
  curvaBamba: string;
  bambaDistinta: boolean;
  telaBamba: string;
  structureColor: string;
  rotTela: string;
  rotBamba: string;
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
            sameFabric,
            remate,
            remateColor,
            curvaBamba,
            bambaDistinta,
            telaBamba,
            structureColor,
            rotTela,
            rotBamba,
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
  }, [activeTab, orderCode, customer, orderDate, technician, reviewer, fabric, sameFabric, remate, remateColor, curvaBamba, bambaDistinta, telaBamba, structureColor, rotTela, rotBamba, awnings, parameters]);

  const reservation = useMemo(() => ({
    orderCode,
    ofs: consolidateOfs(calculation?.ofs || [])
  }), [calculation, orderCode]);

  return { calculation, calculationState, reservation };
}

function consolidateOfs(ofs: Calculation['ofs']) {
  const grouped = new Map<string, { of: string; description: string; materials: Map<string, { code: string; description?: string; quantity: number }> }>();
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
      current.quantity = Math.round((current.quantity + material.quantity) * 1000) / 1000;
      target.materials.set(code, current);
    }
    grouped.set(ofKey, target);
  }
  return Array.from(grouped.values()).map((ofBlock) => ({
    of: ofBlock.of,
    description: ofBlock.description,
    materials: Array.from(ofBlock.materials.values())
  }));
}
