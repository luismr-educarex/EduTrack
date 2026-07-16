'use client';
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-card p-3 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload[0]?.value != null && <p className="text-muted-foreground">Media: <span className="font-semibold text-foreground">{payload[0].value.toFixed(2)}</span></p>}
    </div>
  );
};

export default function GradeTrendChart({ data }: { data: { label: string; avg: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={2} fill="url(#gradeGrad)" connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
