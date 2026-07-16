'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CE_PERFORMANCE } from '@/lib/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-card p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={`tt-${i}`} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function CEPerformanceChart() {
  const data = CE_PERFORMANCE.slice(0, 13).map(d => ({
    ce: d.ce,
    Superado: d.superado,
    Parcial: d.parcial,
    'No superado': d.noSuperado,
    'No evaluado': d.noEvaluado,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="ce" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Superado" stackId="a" fill="var(--success)" radius={[0,0,0,0]} />
        <Bar dataKey="Parcial" stackId="a" fill="var(--warning)" />
        <Bar dataKey="No superado" stackId="a" fill="var(--danger)" />
        <Bar dataKey="No evaluado" stackId="a" fill="var(--border)" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}