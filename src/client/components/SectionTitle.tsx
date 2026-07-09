import React from 'react';

export function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="section-title">
      <h3>{title}</h3>
      <span>{detail}</span>
    </div>
  );
}
