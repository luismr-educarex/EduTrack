'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Zap,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Bell,
  BookMarked,
  CalendarCheck,
  Upload,
  GitBranch,
  Map,
  ChevronDown,
  Activity,
  BookOpenText,
  CalendarDays,
  Armchair,
  Bot,
  GraduationCap,
  FolderGit2 as Github,
  Scale,
  History,
  PenSquare,
  Laptop,
  KanbanSquare,
  CheckSquare,
  BarChart3,
  RefreshCcw,
} from 'lucide-react';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavItem[];
}

interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

const IN_PERSON_NAV_SECTIONS: NavSection[] = [
  {
    key: 'home',
    label: 'Inicio',
    items: [
      {
        key: 'nav-dashboard',
        label: 'Dashboard',
        href: '/',
        icon: <LayoutDashboard size={18} />,
      },
    ],
  },
  {
    key: 'planning',
    label: 'Planificación docente',
    items: [
      {
        key: 'nav-planning',
        label: 'Planificación',
        href: '/planning-curriculum',
        icon: <BookOpen size={18} />,
        children: [
          {
            key: 'nav-eval-map',
            label: 'Mapa de Evaluación',
            href: '/evaluation-map',
            icon: <Map size={16} />,
          },
          {
            key: 'nav-criterion-grading',
            label: 'Sistema criterial',
            href: '/criterion-grading',
            icon: <Scale size={16} />,
          },
          {
            key: 'nav-cascade-stats',
            label: 'Estadísticas Cascada',
            href: '/cascade-statistics',
            icon: <Activity size={16} />,
          },
        ],
      },
      {
        key: 'nav-relations',
        label: 'Relaciones Curriculares',
        href: '/curriculum-relations',
        icon: <GitBranch size={18} />,
      },
      {
        key: 'nav-contents',
        label: 'Contenidos',
        href: '/contents',
        icon: <BookOpenText size={18} />,
      },
      {
        key: 'nav-calendar',
        label: 'Calendario',
        href: '/module-calendar',
        icon: <CalendarDays size={18} />,
      },
    ],
  },
  {
    key: 'classroom',
    label: 'Aula y seguimiento',
    items: [
      {
        key: 'nav-daily',
        label: 'Herramientas del Día',
        href: '/daily-tools',
        icon: <CalendarCheck size={18} />,
      },
      { key: 'nav-seating', label: 'Aula', href: '/seating', icon: <Armchair size={18} /> },
      {
        key: 'nav-students',
        label: 'Alumnado y Tutoría',
        href: '/students-tutoring',
        icon: <Users size={18} />,
        badge: 5,
      },
      {
        key: 'nav-activities',
        label: 'Actividades',
        href: '/activities',
        icon: <Zap size={18} />,
        badge: 3,
      },
    ],
  },
  {
    key: 'assessment',
    label: 'Evaluación',
    items: [
      {
        key: 'nav-grading',
        label: 'Calificaciones',
        href: '/grading',
        icon: <ClipboardList size={18} />,
      },
      {
        key: 'nav-corrections',
        label: 'Corrección asistida',
        href: '/corrections',
        icon: <Bot size={18} />,
      },
      {
        key: 'nav-grade-import',
        label: 'Importar calificaciones',
        href: '/grade-import',
        icon: <Upload size={18} />,
      },
      { key: 'nav-reports', label: 'Informes', href: '/reports', icon: <FileText size={18} /> },
    ],
  },
  {
    key: 'management',
    label: 'Gestión',
    items: [
      {
        key: 'nav-course-management',
        label: 'Gestión académica',
        href: '/course-management',
        icon: <GraduationCap size={18} />,
      },
      {
        key: 'nav-import',
        label: 'Importar Datos',
        href: '/import-data',
        icon: <Upload size={18} />,
      },
      {
        key: 'nav-repositories',
        label: 'Repositorios',
        href: '/repositories',
        icon: <Github size={18} />,
      },
    ],
  },
];

const ONLINE_NAV_SECTIONS: NavSection[] = [
  {
    key: 'home',
    label: 'Inicio',
    items: [
      {
        key: 'online-dashboard',
        label: 'Dashboard',
        href: '/',
        icon: <LayoutDashboard size={18} />,
      },
    ],
  },
  {
    key: 'teaching',
    label: 'Docencia',
    items: [
      {
        key: 'online-students',
        label: 'Alumnos',
        href: '/students-tutoring',
        icon: <Users size={18} />,
      },
      {
        key: 'online-activities',
        label: 'Actividades',
        href: '/activities',
        icon: <BookOpen size={18} />,
      },
    ],
  },
  {
    key: 'assessment',
    label: 'Evaluación',
    items: [
      {
        key: 'online-ai-evaluation',
        label: 'Evaluación IA',
        href: '/corrections',
        icon: <Bot size={18} />,
      },
      {
        key: 'online-manual-evaluation',
        label: 'Evaluación Manual',
        href: '/grading',
        icon: <PenSquare size={18} />,
      },
      { key: 'online-history', label: 'Historial', href: '/reports', icon: <History size={18} /> },
    ],
  },
  {
    key: 'moodle-sync',
    label: 'MoodleSync',
    items: [
      {
        key: 'online-moodle-sync',
        label: 'Sincronización',
        href: '/moodle-sync',
        icon: <RefreshCcw size={18} />,
      },
    ],
  },
  {
    key: 'management',
    label: 'Gestión',
    items: [
      {
        key: 'online-settings',
        label: 'Configuración',
        href: '/course-management',
        icon: <Settings size={18} />,
      },
    ],
  },
];

const INTERMODULAR_NAV_SECTIONS: NavSection[] = [
  {
    key: 'project',
    label: 'Proyecto',
    items: [
      {
        key: 'project-overview',
        label: 'Vista general',
        href: '/intermodular-project?view=overview',
        icon: <LayoutDashboard size={18} />,
      },
      {
        key: 'project-deliveries',
        label: 'Entregas',
        href: '/intermodular-project?view=deliveries',
        icon: <KanbanSquare size={18} />,
      },
      {
        key: 'project-checklist',
        label: 'Checklist',
        href: '/intermodular-project?view=checklist',
        icon: <CheckSquare size={18} />,
      },
    ],
  },
  {
    key: 'tracking',
    label: 'Seguimiento',
    items: [
      {
        key: 'project-students',
        label: 'Alumnos',
        href: '/intermodular-project?view=students',
        icon: <Users size={18} />,
      },
      {
        key: 'project-correction',
        label: 'Corregir',
        href: '/intermodular-project?view=correction',
        icon: <PenSquare size={18} />,
      },
      {
        key: 'project-statistics',
        label: 'Estadísticas',
        href: '/intermodular-project?view=statistics',
        icon: <BarChart3 size={18} />,
      },
    ],
  },
  {
    key: 'management',
    label: 'Gestión',
    items: [
      {
        key: 'project-settings',
        label: 'Configuración',
        href: '/intermodular-project?view=settings',
        icon: <Settings size={18} />,
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeModule, modules, setActiveModuleId } = useEduTrack();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);
  const isOnlineModule = activeModule?.deliveryMode === 'online';
  const isIntermodularModule = activeModule?.deliveryMode === 'intermodular';
  const navSections = isIntermodularModule
    ? INTERMODULAR_NAV_SECTIONS
    : isOnlineModule
      ? ONLINE_NAV_SECTIONS
      : IN_PERSON_NAV_SECTIONS;

  // Auto-expand planning section if on a child route
  const planningChildPaths = [
    '/planning-curriculum',
    '/evaluation-map',
    '/criterion-grading',
    '/cascade-statistics',
  ];
  const [planningOpen, setPlanningOpen] = useState(() =>
    planningChildPaths.some((p) => pathname.startsWith(p))
  );

  const isActive = (href: string) => {
    const [path, query] = href.split('?');
    if (path === '/') return pathname === '/';
    if (!pathname.startsWith(path)) return false;
    if (!query) return true;
    const expected = new URLSearchParams(query);
    return Array.from(expected.entries()).every(([key, value]) => searchParams.get(key) === value);
  };
  const isPlanningActive = planningChildPaths.some((p) => isActive(p));

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
        <div
          className={`flex items-center gap-2 px-3 py-4 border-b border-border min-h-[60px] ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AppLogo size={32} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block truncate">
                  EduTrack
                </span>
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
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Módulo activo
            </p>
            <button
              onClick={() => setModuleOpen(!moduleOpen)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left group"
            >
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookMarked size={10} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground block truncate">
                  {activeModule?.code ?? 'Módulo'}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {activeModule
                    ? `${activeModule.cycle} · ${isOnlineModule ? 'Online' : isIntermodularModule ? 'Intermodular' : 'Presencial'}`
                    : 'Cargando…'}
                </span>
              </div>
              <ChevronRight
                size={12}
                className={`text-muted-foreground transition-transform ${moduleOpen ? 'rotate-90' : ''}`}
              />
            </button>
            {moduleOpen && (
              <div className="mt-1 rounded-md border border-border bg-card shadow-card overflow-hidden">
                {modules.map((mod) => (
                  <button
                    key={`mod-${mod.id}`}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors
                      ${mod.id === activeModule?.id ? 'bg-primary/5 text-primary' : 'text-foreground'}`}
                    onClick={() => {
                      setActiveModuleId(mod.id);
                      setModuleOpen(false);
                      router.push(
                        mod.deliveryMode === 'intermodular'
                          ? '/intermodular-project?view=overview'
                          : '/'
                      );
                    }}
                  >
                    <span className="text-xs font-semibold w-8 flex-shrink-0">{mod.code}</span>
                    <span className="text-xs truncate">{mod.name}</span>
                    {mod.deliveryMode === 'online' && (
                      <Laptop
                        size={12}
                        className="ml-auto flex-shrink-0 text-primary"
                        aria-label="Online"
                      />
                    )}
                    {mod.deliveryMode === 'intermodular' && (
                      <KanbanSquare
                        size={12}
                        className="ml-auto flex-shrink-0 text-primary"
                        aria-label="Proyecto intermodular"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {!collapsed && (
            <p className="mb-3 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {isOnlineModule
                ? 'EduCodeCheck · Online'
                : isIntermodularModule
                  ? 'EduProyectosCheck'
                  : 'Espacio presencial'}
            </p>
          )}
          <div className={`px-2 ${collapsed ? 'space-y-2' : 'space-y-3'}`}>
            {navSections.map((section, sectionIndex) => (
              <section
                key={section.key}
                aria-labelledby={collapsed ? undefined : `sidebar-section-${section.key}`}
                className={
                  collapsed && sectionIndex > 0
                    ? 'border-t border-border pt-2'
                    : collapsed
                      ? ''
                      : 'rounded-lg border border-border/70 bg-muted/30 p-1.5'
                }
              >
                {!collapsed && (
                  <div className="mb-1 flex items-center gap-2 px-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden="true" />
                    <h2
                      id={`sidebar-section-${section.key}`}
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                    >
                      {section.label}
                    </h2>
                  </div>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);

                    if (item.children) {
                      return (
                        <li key={item.key}>
                          <div className="flex items-center">
                            <Link
                              href={item.href}
                              className={`
                                group relative flex flex-1 items-center gap-3 rounded-md px-2 py-2 transition-all duration-150
                                ${
                                  isPlanningActive
                                    ? 'bg-primary/10 font-medium text-primary shadow-sm ring-1 ring-primary/10'
                                    : 'text-secondary-foreground hover:bg-card hover:text-foreground'
                                }
                                ${collapsed ? 'justify-center' : ''}
                              `}
                              title={collapsed ? `${section.label}: ${item.label}` : undefined}
                            >
                              <span
                                className={`flex-shrink-0 ${isPlanningActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                              >
                                {item.icon}
                              </span>
                              {!collapsed && <span className="flex-1 text-sm">{item.label}</span>}
                            </Link>
                            {!collapsed && (
                              <button
                                onClick={() => setPlanningOpen((open) => !open)}
                                className={`rounded p-1.5 transition-colors hover:bg-card ${isPlanningActive ? 'text-primary' : 'text-muted-foreground'}`}
                                aria-label={
                                  planningOpen
                                    ? 'Contraer opciones de planificación'
                                    : 'Expandir opciones de planificación'
                                }
                                aria-expanded={planningOpen}
                              >
                                <ChevronDown
                                  size={13}
                                  className={`transition-transform ${planningOpen ? 'rotate-180' : ''}`}
                                />
                              </button>
                            )}
                          </div>

                          {!collapsed && planningOpen && (
                            <ul className="ml-4 mt-1 space-y-0.5 border-l border-primary/20 pl-3">
                              {item.children.map((child) => {
                                const childActive = isActive(child.href);
                                return (
                                  <li key={child.key}>
                                    <Link
                                      href={child.href}
                                      className={`
                                        group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-all duration-150
                                        ${
                                          childActive
                                            ? 'bg-primary/10 font-medium text-primary'
                                            : 'text-secondary-foreground hover:bg-card hover:text-foreground'
                                        }
                                      `}
                                    >
                                      <span
                                        className={`flex-shrink-0 ${childActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                                      >
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
                            group relative flex items-center gap-3 rounded-md px-2 py-2 transition-all duration-150
                            ${
                              active
                                ? 'bg-primary/10 font-medium text-primary shadow-sm ring-1 ring-primary/10'
                                : 'text-secondary-foreground hover:bg-card hover:text-foreground'
                            }
                            ${collapsed ? 'justify-center' : ''}
                          `}
                          title={collapsed ? `${section.label}: ${item.label}` : undefined}
                        >
                          <span
                            className={`flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                          >
                            {item.icon}
                          </span>
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-sm">{item.label}</span>
                              {item.badge && (
                                <span className="flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                          {collapsed && item.badge && (
                            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className={`border-t border-border p-2 space-y-0.5`}>
          {!collapsed && (
            <Link
              href="#"
              className="flex items-center gap-3 px-2 py-2 rounded-md text-secondary-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
            >
              <Bell size={18} className="text-muted-foreground flex-shrink-0" />
              <span>Notificaciones</span>
            </Link>
          )}
          <Link
            href="/course-management"
            className={`flex items-center gap-3 px-2 py-2 rounded-md text-secondary-foreground hover:bg-muted hover:text-foreground transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
          >
            <Settings size={18} className="text-muted-foreground flex-shrink-0" />
            {!collapsed && <span>Configuración</span>}
          </Link>
          <button
            onClick={() => signOut()}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-secondary-foreground hover:bg-red-50 hover:text-danger transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
          >
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
