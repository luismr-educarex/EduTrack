'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard, BookOpen, ClipboardList, Zap, Users, FileText,
  ChevronLeft, ChevronRight, Settings, LogOut, Bell, BookMarked, CalendarCheck,
  Upload, GitBranch, Map, Share2, ChevronDown, Activity, BookOpenText,
  CalendarDays, GanttChartSquare, Armchair, Bot, GraduationCap
} from 'lucide-react';
import { useEduTrack } from '@/contexts/EduTrackContext';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { key: 'nav-dashboard', label: 'Dashboard', href: '/', icon: <LayoutDashboard size={18} /> },
  {
    key: 'nav-planning',
    label: 'Planificación',
    href: '/planning-curriculum',
    icon: <BookOpen size={18} />,
    children: [
      { key: 'nav-eval-map', label: 'Mapa de Evaluación', href: '/evaluation-map', icon: <Map size={16} /> },
      { key: 'nav-ra-relations', label: 'Relaciones entre RAs', href: '/ra-relations', icon: <Share2 size={16} /> },
      { key: 'nav-cascade-stats', label: 'Estadísticas Cascada', href: '/cascade-statistics', icon: <Activity size={16} /> },
    ],
  },
  { key: 'nav-relations', label: 'Relaciones Curriculares', href: '/curriculum-relations', icon: <GitBranch size={18} /> },
  { key: 'nav-grading', label: 'Calificaciones', href: '/grading', icon: <ClipboardList size={18} /> },
  { key: 'nav-activities', label: 'Actividades', href: '/activities', icon: <Zap size={18} />, badge: 3 },
  { key: 'nav-students', label: 'Alumnado y Tutoría', href: '/students-tutoring', icon: <Users size={18} />, badge: 5 },
  { key: 'nav-reports', label: 'Informes', href: '/reports', icon: <FileText size={18} /> },
  { key: 'nav-daily', label: 'Herramientas del Día', href: '/daily-tools', icon: <CalendarCheck size={18} /> },
  { key: 'nav-import', label: 'Importar Datos', href: '/import-data', icon: <Upload size={18} /> },
  { key: 'nav-contents', label: 'Contenidos', href: '/contents', icon: <BookOpenText size={18} /> },
  { key: 'nav-calendar', label: 'Calendario', href: '/module-calendar', icon: <CalendarDays size={18} /> },
  { key: 'nav-gantt', label: 'Vista Gantt', href: '/gantt-view', icon: <GanttChartSquare size={18} /> },
  { key: 'nav-seating', label: 'Distribución de puestos', href: '/seating', icon: <Armchair size={18} /> },
  { key: 'nav-corrections', label: 'Corrección asistida', href: '/corrections', icon: <Bot size={18} /> },
  { key: 'nav-grade-import', label: 'Importar calificaciones', href: '/grade-import', icon: <Upload size={18} /> },
  { key: 'nav-course-management', label: 'Gestión académica', href: '/course-management', icon: <GraduationCap size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { activeModule, modules, setActiveModuleId } = useEduTrack();
  const [collapsed, setCollapsed] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);

  // Auto-expand planning section if on a child route
  const planningChildPaths = ['/planning-curriculum', '/evaluation-map', '/ra-relations', '/cascade-statistics'];
  const [planningOpen, setPlanningOpen] = useState(() =>
    planningChildPaths.some(p => pathname.startsWith(p))
  );

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const isPlanningActive = planningChildPaths.some(p => isActive(p));

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full z-40 flex flex-col bg-card border-r border-border
          sidebar-transition overflow-hidden
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* Logo + module selector */}
        <div className={`flex items-center gap-2 px-3 py-4 border-b border-border min-h-[60px] ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AppLogo size={32} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block truncate">EduTrack</span>
                <span className="text-xs text-muted-foreground block truncate">2025–2026</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="Colapsar sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Module selector */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Módulo activo</p>
            <button
              onClick={() => setModuleOpen(!moduleOpen)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left group"
            >
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookMarked size={10} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground block truncate">{activeModule?.code ?? 'Módulo'}</span>
                <span className="text-[10px] text-muted-foreground block truncate">{activeModule?.cycle ?? 'Cargando…'}</span>
              </div>
              <ChevronRight size={12} className={`text-muted-foreground transition-transform ${moduleOpen ? 'rotate-90' : ''}`} />
            </button>
            {moduleOpen && (
              <div className="mt-1 rounded-md border border-border bg-card shadow-card overflow-hidden">
                {modules.map((mod) => (
                  <button
                    key={`mod-${mod.id}`}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors
                      ${mod.id === activeModule?.id ? 'bg-primary/5 text-primary' : 'text-foreground'}`}
                    onClick={() => { setActiveModuleId(mod.id); setModuleOpen(false); }}
                  >
                    <span className="text-xs font-semibold w-8 flex-shrink-0">{mod.code}</span>
                    <span className="text-xs truncate">{mod.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {!collapsed && (
            <p className="px-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Navegación</p>
          )}
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);

              // Render planning item with collapsible children
              if (item.children) {
                return (
                  <li key={item.key}>
                    {/* Parent row — clicking toggles children; also navigates */}
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        className={`
                          flex-1 flex items-center gap-3 px-2 py-2 rounded-md transition-all duration-150 group relative
                          ${isPlanningActive
                            ? 'bg-primary/10 text-primary font-medium' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                          }
                          ${collapsed ? 'justify-center' : ''}
                        `}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className={`flex-shrink-0 ${isPlanningActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className="flex-1 text-sm">{item.label}</span>
                        )}
                      </Link>
                      {!collapsed && (
                        <button
                          onClick={() => setPlanningOpen(o => !o)}
                          className={`p-1.5 rounded hover:bg-muted transition-colors ${isPlanningActive ? 'text-primary' : 'text-muted-foreground'}`}
                          aria-label="Expandir planificación"
                        >
                          <ChevronDown size={13} className={`transition-transform ${planningOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Children */}
                    {!collapsed && planningOpen && (
                      <ul className="mt-0.5 ml-4 pl-3 border-l border-border space-y-0.5">
                        {item.children.map(child => {
                          const childActive = isActive(child.href);
                          return (
                            <li key={child.key}>
                              <Link
                                href={child.href}
                                className={`
                                  flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all duration-150 group text-sm
                                  ${childActive
                                    ? 'bg-primary/10 text-primary font-medium' :'text-secondary-foreground hover:bg-muted hover:text-foreground'
                                  }
                                `}
                              >
                                <span className={`flex-shrink-0 ${childActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                  {child.icon}
                                </span>
                                <span className="flex-1 text-xs">{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-2 py-2 rounded-md transition-all duration-150 group relative
                      ${active
                        ? 'bg-primary/10 text-primary font-medium' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
                      }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className={`flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-sm">{item.label}</span>
                        {item.badge && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div className={`border-t border-border p-2 space-y-0.5`}>
          {!collapsed && (
            <Link href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-secondary-foreground hover:bg-muted hover:text-foreground transition-colors text-sm">
              <Bell size={18} className="text-muted-foreground flex-shrink-0" />
              <span>Notificaciones</span>
            </Link>
          )}
          <Link href="/course-management" className={`flex items-center gap-3 px-2 py-2 rounded-md text-secondary-foreground hover:bg-muted hover:text-foreground transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}>
            <Settings size={18} className="text-muted-foreground flex-shrink-0" />
            {!collapsed && <span>Configuración</span>}
          </Link>
          <button className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-secondary-foreground hover:bg-red-50 hover:text-danger transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Salir</span>}
          </button>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Expandir sidebar"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Spacer */}
      <div className={`flex-shrink-0 sidebar-transition ${collapsed ? 'w-16' : 'w-60'}`} />
    </>
  );
}
