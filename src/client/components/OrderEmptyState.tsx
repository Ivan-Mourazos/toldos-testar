import React from 'react';
import { ClipboardList } from 'lucide-react';

export function OrderEmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="panel-vidrio order-empty"><ClipboardList aria-hidden="true" /><div><h2>{title}</h2><p>{children}</p></div></section>;
}
