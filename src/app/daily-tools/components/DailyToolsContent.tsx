'use client';
import React, { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import AttendancePanel from './AttendancePanel';
import BehaviorPanel from './BehaviorPanel';
import SessionPlannerPanel from './SessionPlannerPanel';
import TaskListPanel from './TaskListPanel';
import TimerPanel from './TimerPanel';
import ObservationsPanel from './ObservationsPanel';
import {
  Users, Star, BookOpen, CheckSquare, Timer, MessageSquare
} from 'lucide-react';

type TabKey = 'asistencia' | 'comportamiento' | 'planificador' | 'tareas' | 'temporizador' | 'observaciones';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
}

const TABS: Tab[] = [
  {
    key: 'asistencia',
    label: 'Asistencia',
    icon: <Users size={16} />,
    description: 'Registro rápido de asistencia diaria',
  },
  {
    key: 'comportamiento',
    label: 'Comportamiento',
    icon: <Star size={16} />,
    description: 'Control de participación y conducta',
  },
  {
    key: 'planificador',
    label: 'Planificador',
    icon: <BookOpen size={16} />,
    description: 'Diseño de sesiones por bloques',
  },
  {
    key: 'tareas',
    label: 'Mis tareas',
    icon: <CheckSquare size={16} />,
    description: 'Lista de pendientes del docente',
    badge: '3',
  },
  {
    key: 'temporizador',
    label: 'Temporizador',
    icon: <Timer size={16} />,
    description: 'Cronómetro para actividades en clase',
  },
  {
    key: 'observaciones',
    label: 'Observaciones',
    icon: <MessageSquare size={16} />,
    description: 'Notas rápidas por alumno',
  },
];

export default function DailyToolsContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('asistencia');

  const currentTab = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="p-6 space-y-6 fade-in">
      <PageHeader
        title="Herramientas del Día"
        subtitle="Gestión diaria del aula: asistencia, comportamiento, planificación y más"
        icon={<CheckSquare size={20} className="text-primary" />}
      />

      {/* Tab navigation */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-thin border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all relative flex-shrink-0 ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary bg-primary/5' :'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className={activeTab === tab.key ? 'text-primary' : 'text-muted-foreground'}>
                {tab.icon}
              </span>
              {tab.label}
              {tab.badge && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab description bar */}
        <div className="px-5 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
          <span className="text-primary">{currentTab.icon}</span>
          <span className="text-xs text-muted-foreground">{currentTab.description}</span>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'asistencia' && <AttendancePanel />}
          {activeTab === 'comportamiento' && <BehaviorPanel />}
          {activeTab === 'planificador' && <SessionPlannerPanel />}
          {activeTab === 'tareas' && <TaskListPanel />}
          {activeTab === 'temporizador' && <TimerPanel />}
          {activeTab === 'observaciones' && <ObservationsPanel />}
        </div>
      </div>
    </div>
  );
}
