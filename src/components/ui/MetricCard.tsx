import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  default: 'bg-card border-border',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-red-50 border-red-200',
  info: 'bg-cyan-50 border-cyan-200',
};

const VARIANT_ICON: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-100 text-success',
  warning: 'bg-amber-100 text-warning',
  danger: 'bg-red-100 text-danger',
  info: 'bg-cyan-100 text-info',
};

export default function MetricCard({
  label, value, sub, icon, trend, trendValue, variant = 'default', className = ''
}: MetricCardProps) {
  return (
    <div className={`rounded-xl border p-4 shadow-card flex flex-col gap-3 ${VARIANT_STYLES[variant]} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">{label}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${VARIANT_ICON[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="metric-value text-foreground">{value}</span>
        {trendValue && (
          <span className={`text-xs font-medium pb-1 ${
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-muted-foreground'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-muted-foreground -mt-1">{sub}</p>}
    </div>
  );
}