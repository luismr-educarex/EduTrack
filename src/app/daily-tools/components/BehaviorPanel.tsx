'use client';
import React, { useState, useEffect } from 'react';
import { Star, Minus, Plus } from 'lucide-react';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { toast } from 'sonner';

interface BehaviorEntry {
  studentId: string;
  participation: number; // 0-5
  behavior: 'excelente' | 'bueno' | 'regular' | 'disruptivo';
  note: string;
}

const BEHAVIOR_CONFIG = {
  excelente: { label: 'Excelente', color: 'text-success', bg: 'bg-success/10 border-success/30' },
  bueno: { label: 'Bueno', color: 'text-info', bg: 'bg-info/10 border-info/30' },
  regular: { label: 'Regular', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  disruptivo: { label: 'Disruptivo', color: 'text-danger', bg: 'bg-danger/10 border-danger/30' },
};

export default function BehaviorPanel() {
  const { students: STUDENTS } = useEduTrack();
  const [entries, setEntries] = useState<Record<string, BehaviorEntry>>({});
  const [search, setSearch] = useState('');
  const [filterBehavior, setFilterBehavior] = useState<string>('all');

  React.useEffect(() => {
    if (STUDENTS.length > 0) {
      const init: Record<string, BehaviorEntry> = {};
      STUDENTS.forEach(s => { init[s.id] = { studentId: s.id, participation: 3, behavior: 'bueno', note: '' }; });
      setEntries(init);
    }
  }, [STUDENTS]);

  const filtered = STUDENTS.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchBehavior = filterBehavior === 'all' || entries[s.id]?.behavior === filterBehavior;
    return matchSearch && matchBehavior;
  });

  const updateEntry = (studentId: string, field: keyof BehaviorEntry, value: string | number) => {
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleSave = () => {
    toast.success('Registro de comportamiento guardado');
  };

  const stats = Object.values(entries).reduce((acc, e) => {
    acc[e.behavior] = (acc[e.behavior] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgParticipation = (Object.values(entries).reduce((sum, e) => sum + e.participation, 0) / STUDENTS.length).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-primary font-mono-nums">{avgParticipation}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Participación media</div>
        </div>
        {(Object.keys(BEHAVIOR_CONFIG) as Array<keyof typeof BEHAVIOR_CONFIG>).map(b => (
          <div key={b} className={`border rounded-xl p-3 text-center ${BEHAVIOR_CONFIG[b].bg}`}>
            <div className={`text-xl font-bold font-mono-nums ${BEHAVIOR_CONFIG[b].color}`}>{stats[b] || 0}</div>
            <div className={`text-xs mt-0.5 ${BEHAVIOR_CONFIG[b].color}`}>{BEHAVIOR_CONFIG[b].label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar alumno..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={filterBehavior}
          onChange={e => setFilterBehavior(e.target.value)}
          className="px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">Todos los comportamientos</option>
          {Object.entries(BEHAVIOR_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[1fr_auto_auto_1fr] px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide gap-4">
            <span>Alumno</span>
            <span className="w-36 text-center">Participación</span>
            <span className="w-64 text-center">Comportamiento</span>
            <span>Observación</span>
          </div>
          {filtered.map(student => {
            const entry = entries[student.id];
            return (
              <div key={student.id} className="grid grid-cols-[1fr_auto_auto_1fr] px-4 py-2.5 gap-4 items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {student.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <span className="text-sm font-medium text-foreground">{student.name}</span>
                </div>

                {/* Participation stars */}
                <div className="flex items-center gap-1 w-36 justify-center">
                  <button
                    onClick={() => updateEntry(student.id, 'participation', Math.max(0, entry.participation - 1))}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    <Minus size={12} />
                  </button>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => updateEntry(student.id, 'participation', n)}
                        className={`transition-colors ${n <= entry.participation ? 'text-warning' : 'text-muted-foreground/30'}`}
                      >
                        <Star size={14} fill={n <= entry.participation ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => updateEntry(student.id, 'participation', Math.min(5, entry.participation + 1))}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Behavior selector */}
                <div className="flex gap-1 w-64 justify-center">
                  {(Object.keys(BEHAVIOR_CONFIG) as Array<keyof typeof BEHAVIOR_CONFIG>).map(b => (
                    <button
                      key={b}
                      onClick={() => updateEntry(student.id, 'behavior', b)}
                      className={`px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                        entry.behavior === b
                          ? `${BEHAVIOR_CONFIG[b].bg} ${BEHAVIOR_CONFIG[b].color} ring-1 ring-current`
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {BEHAVIOR_CONFIG[b].label}
                    </button>
                  ))}
                </div>

                {/* Note */}
                <input
                  type="text"
                  placeholder="Observación..."
                  value={entry.note}
                  onChange={e => updateEntry(student.id, 'note', e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-muted/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Guardar registro
        </button>
      </div>
    </div>
  );
}
