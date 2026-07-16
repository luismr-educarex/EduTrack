'use client';
import React from 'react';
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer } from 'recharts';

const raData = [
  { name: 'RA1', coverage: 100, fill: '#16A34A' },
  { name: 'RA2', coverage: 100, fill: '#16A34A' },
  { name: 'RA3', coverage: 60, fill: '#D97706' },
  { name: 'RA4', coverage: 25, fill: '#DC2626' },
  { name: 'RA5', coverage: 0, fill: '#94A3B8' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-card p-2 text-xs">
      <p className="font-semibold">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">Cobertura: <span className="font-semibold text-foreground">{payload[0].value}%</span></p>
    </div>
  );
};

export default function RARadialChart() {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadialBarChart
        innerRadius="30%"
        outerRadius="90%"
        data={raData}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="coverage" background={{ fill: 'var(--muted)' }} cornerRadius={4} />
        <Tooltip content={<CustomTooltip />} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}