'use client';
import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  priority: 'alta' | 'media' | 'baja';
  category: string;
  dueDate: string;
  done: boolean;
  createdAt: string;
}

const PRIORITY_CONFIG = {
  alta: { label: 'Alta', color: 'text-danger', bg: 'bg-danger/10 border-danger/30' },
  media: { label: 'Media', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  baja: { label: 'Baja', color: 'text-success', bg: 'bg-success/10 border-success/30' },
};

const CATEGORIES = ['Corrección', 'Planificación', 'Tutoría', 'Administración', 'Comunicación', 'Otro'];

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Corregir Práctica 3 – RA2', priority: 'alta', category: 'Corrección', dueDate: '2026-01-20', done: false, createdAt: '2026-01-15' },
  { id: 't2', title: 'Preparar examen 2ª evaluación', priority: 'alta', category: 'Planificación', dueDate: '2026-01-25', done: false, createdAt: '2026-01-14' },
  { id: 't3', title: 'Reunión tutoría con padres de Martínez', priority: 'media', category: 'Tutoría', dueDate: '2026-01-18', done: false, createdAt: '2026-01-13' },
  { id: 't4', title: 'Actualizar actas de evaluación', priority: 'media', category: 'Administración', dueDate: '2026-01-22', done: false, createdAt: '2026-01-12' },
  { id: 't5', title: 'Enviar notas parciales a jefatura', priority: 'baja', category: 'Comunicación', dueDate: '2026-01-30', done: true, createdAt: '2026-01-10' },
];

export default function TaskListPanel() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [showForm, setShowForm] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDone, setFilterDone] = useState<'all' | 'pending' | 'done'>('pending');
  const [newTask, setNewTask] = useState({ title: '', priority: 'media' as Task['priority'], category: 'Planificación', dueDate: '' });

  const filtered = tasks.filter(t => {
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchDone = filterDone === 'all' || (filterDone === 'pending' ? !t.done : t.done);
    return matchPriority && matchCategory && matchDone;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pOrder = { alta: 0, media: 1, baja: 2 };
    return pOrder[a.priority] - pOrder[b.priority];
  });

  const toggleDone = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Tarea eliminada');
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task: Task = {
      id: `t${Date.now()}`,
      ...newTask,
      done: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTasks(prev => [task, ...prev]);
    setNewTask({ title: '', priority: 'media', category: 'Planificación', dueDate: '' });
    setShowForm(false);
    toast.success('Tarea añadida');
  };

  const pendingCount = tasks.filter(t => !t.done).length;
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-3">
          <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold text-foreground font-mono-nums">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pendientes</div>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold text-success font-mono-nums">{doneCount}</div>
            <div className="text-xs text-muted-foreground">Completadas</div>
          </div>
          {(['alta', 'media', 'baja'] as Task['priority'][]).map(p => (
            <div key={p} className={`border rounded-xl px-3 py-2 text-center ${PRIORITY_CONFIG[p].bg}`}>
              <div className={`text-xl font-bold font-mono-nums ${PRIORITY_CONFIG[p].color}`}>
                {tasks.filter(t => t.priority === p && !t.done).length}
              </div>
              <div className={`text-xs ${PRIORITY_CONFIG[p].color}`}>{PRIORITY_CONFIG[p].label}</div>
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          Nueva tarea
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3 fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Título de la tarea..."
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>
            <select
              value={newTask.priority}
              onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Task['priority'] }))}
              className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none"
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label} prioridad</option>
              ))}
            </select>
            <select
              value={newTask.category}
              onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
              className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="date"
              value={newTask.dueDate}
              onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))}
              className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none"
            />
            <div className="flex gap-2">
              <button onClick={addTask} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
                Añadir
              </button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden bg-card">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterDone(f)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterDone === f ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
            </button>
          ))}
        </div>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-1.5 text-xs bg-card border border-border rounded-lg outline-none"
        >
          <option value="all">Todas las prioridades</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 text-xs bg-card border border-border rounded-lg outline-none"
        >
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {sorted.map(task => (
          <div
            key={task.id}
            className={`flex items-center gap-3 px-4 py-3 bg-card border rounded-xl transition-all ${task.done ? 'opacity-60 border-border' : 'border-border hover:border-primary/30'}`}
          >
            <button onClick={() => toggleDone(task.id)} className="flex-shrink-0">
              {task.done
                ? <CheckCircle2 size={18} className="text-success" />
                : <Circle size={18} className="text-muted-foreground hover:text-primary transition-colors" />
              }
            </button>
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].color}`}>
                  {PRIORITY_CONFIG[task.priority].label}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag size={10} />
                  {task.category}
                </span>
                {task.dueDate && (
                  <span className={`text-xs flex items-center gap-1 ${
                    !task.done && task.dueDate < new Date().toISOString().split('T')[0]
                      ? 'text-danger' : 'text-muted-foreground'
                  }`}>
                    <Calendar size={10} />
                    {task.dueDate}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => deleteTask(task.id)}
              className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-muted-foreground transition-colors flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No hay tareas con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
}
