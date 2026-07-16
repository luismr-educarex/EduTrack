import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  superado: { label: 'Superado', className: 'status-superado' },
  parcial: { label: 'Parcial', className: 'status-parcial' },
  no_superado: { label: 'No superado', className: 'status-no-superado' },
  no_evaluado: { label: 'No evaluado', className: 'status-no-evaluado' },
  borrador: { label: 'Borrador', className: 'activity-borrador' },
  publicada: { label: 'Publicada', className: 'activity-publicada' },
  en_correccion: { label: 'En corrección', className: 'activity-en-correccion' },
  pendiente_revision: { label: 'Pend. revisión', className: 'activity-pendiente-revision' },
  revisada_docente: { label: 'Revisada', className: 'activity-revisada-docente' },
  cerrada: { label: 'Cerrada', className: 'activity-cerrada' },
  impartida: { label: 'Impartida', className: 'status-superado' },
  en_curso: { label: 'En curso', className: 'status-parcial' },
  pendiente: { label: 'Pendiente', className: 'status-no-evaluado' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || { label: status, className: 'status-no-evaluado' };
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}