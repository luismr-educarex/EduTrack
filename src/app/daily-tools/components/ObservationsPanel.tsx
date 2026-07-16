'use client';
import React, { useState } from 'react';
import { Plus, Search, Calendar, Trash2, MessageSquare, AlertTriangle, Star } from 'lucide-react';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { toast } from 'sonner';

interface Observation {
  id: string;
  studentId: string;
  type: 'academica' | 'conductual' | 'positiva' | 'alerta';
  text: string;
  date: string;
  private: boolean;
}

const OBS_TYPES = {
  academica: { label: 'Académica', icon: <MessageSquare size={13} />, color: 'text-info', bg: 'bg-info/10 border-info/30' },
  conductual: { label: 'Conductual', icon: <AlertTriangle size={13} />, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  positiva: { label: 'Positiva', icon: <Star size={13} />, color: 'text-success', bg: 'bg-success/10 border-success/30' },
  alerta: { label: 'Alerta', icon: <AlertTriangle size={13} />, color: 'text-danger', bg: 'bg-danger/10 border-danger/30' },
};

const INITIAL_OBS: Observation[] = [
  { id: 'o1', studentId: 'stu-1', type: 'positiva', text: 'Excelente participación en el ejercicio de sockets. Resolvió el problema antes que el resto.', date: '2026-01-14', private: false },
  { id: 'o2', studentId: 'stu-3', type: 'alerta', text: 'Lleva 3 sesiones sin entregar las prácticas. Hablar con él en tutoría.', date: '2026-01-13', private: true },
  { id: 'o3', studentId: 'stu-5', type: 'academica', text: 'Dificultades con la sincronización de hilos. Recomendar ejercicios adicionales.', date: '2026-01-12', private: false },
  { id: 'o4', studentId: 'stu-2', type: 'conductual', text: 'Interrumpió la clase en dos ocasiones. Hablar en privado.', date: '2026-01-11', private: true },
];

export default function ObservationsPanel() {
  const { students: STUDENTS } = useEduTrack();
  const [observations, setObservations] = useState<Observation[]>(INITIAL_OBS);
  const [search, setSearch] = useState('');
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [expandedObs, setExpandedObs] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [newObs, setNewObs] = useState({
    studentId: STUDENTS[0]?.id || '',
    type: 'academica' as Observation['type'],
    text: '',
    date: today,
    private: false,
  });

  const filtered = observations.filter(o => {
    const student = STUDENTS.find(s => s.id === o.studentId);
    const matchSearch = !search || student?.name.toLowerCase().includes(search.toLowerCase()) || o.text.toLowerCase().includes(search.toLowerCase());
    const matchStudent = filterStudent === 'all' || o.studentId === filterStudent;
    const matchType = filterType === 'all' || o.type === filterType;
    return matchSearch && matchStudent && matchType;
  });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  const addObservation = () => {
    if (!newObs.text.trim()) return;
    const obs: Observation = { id: `o${Date.now()}`, ...newObs };
    setObservations(prev => [obs, ...prev]);
    setNewObs({ studentId: STUDENTS[0]?.id || '', type: 'academica', text: '', date: today, private: false });
    setShowForm(false);
    toast.success('Observación registrada');
  };

  const deleteObs = (id: string) => {
    setObservations(prev => prev.filter(o => o.id !== id));
    toast.success('Observación eliminada');
  };

  const countByStudent = STUDENTS.map(s => ({
    student: s,
    count: observations.filter(o => o.studentId === s.id).length,
    alerts: observations.filter(o => o.studentId === s.id && o.type === 'alerta').length,
  })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      {/* Quick stats by student */}
      {countByStudent.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {countByStudent.slice(0, 8).map(({ student, count, alerts }) => (
            <button
              key={student.id}
              onClick={() => setFilterStudent(filterStudent === student.id ? 'all' : student.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                filterStudent === student.id
                  ? 'bg-primary text-white border-primary' :'bg-card border-border text-foreground hover:bg-muted'
              }`}
            >
              <span>{student.name.split(' ')[0]}</span>
              <span className={`px-1 rounded-full text-[10px] font-bold ${alerts > 0 ? 'bg-danger text-white' : 'bg-muted text-muted-foreground'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar observación..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={filterStudent}
          onChange={e => setFilterStudent(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none"
        >
          <option value="all">Todos los alumnos</option>
          {STUDENTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none"
        >
          <option value="all">Todos los tipos</option>
          {Object.entries(OBS_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          Nueva observación
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3 fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={newObs.studentId}
              onChange={e => setNewObs(p => ({ ...p, studentId: e.target.value }))}
              className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none"
            >
              {STUDENTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={newObs.type}
              onChange={e => setNewObs(p => ({ ...p, type: e.target.value as Observation['type'] }))}
              className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none"
            >
              {Object.entries(OBS_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input
              type="date"
              value={newObs.date}
              onChange={e => setNewObs(p => ({ ...p, date: e.target.value }))}
              className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none"
            />
          </div>
          <textarea
            value={newObs.text}
            onChange={e => setNewObs(p => ({ ...p, text: e.target.value }))}
            rows={3}
            placeholder="Escribe la observación..."
            className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none resize-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={newObs.private}
                onChange={e => setNewObs(p => ({ ...p, private: e.target.checked }))}
                className="rounded"
              />
              Observación privada (solo docente)
            </label>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                Cancelar
              </button>
              <button onClick={addObservation} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Observations list */}
      <div className="space-y-2">
        {sorted.map(obs => {
          const student = STUDENTS.find(s => s.id === obs.studentId);
          const typeConf = OBS_TYPES[obs.type];
          return (
            <div key={obs.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-3 px-4 py-3">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium flex-shrink-0 mt-0.5 ${typeConf.bg} ${typeConf.color}`}>
                  {typeConf.icon}
                  <span>{typeConf.label}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{student?.name}</span>
                    {obs.private && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">Privada</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Calendar size={11} />
                      {obs.date}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-foreground leading-relaxed">{obs.text}</p>
                </div>
                <button
                  onClick={() => deleteObs(obs.id)}
                  className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-muted-foreground transition-colors flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            No hay observaciones con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
}
