'use client';
import React from 'react';
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-card p-2 text-xs">
      <p className="font-semibold">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">Cobertura: <span className="font-semibold text-foreground">{payload[0].value}%</span></p>
    </div>
  );
};

export default function RARadialChart({ data }: { data: { name: string; coverage: number; fill: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadialBarChart
        innerRadius="30%"
        outerRadius="90%"
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="coverage" background={{ fill: 'var(--muted)' }} cornerRadius={4} />
        <Tooltip content={<CustomTooltip />} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
