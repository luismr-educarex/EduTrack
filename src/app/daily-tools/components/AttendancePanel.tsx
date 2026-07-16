'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, Users } from 'lucide-react';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { toast } from 'sonner';

type AttendanceStatus = 'presente' | 'ausente' | 'retraso' | 'justificado';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  note: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  presente: { label: 'Presente', icon: <CheckCircle2 size={14} />, color: 'text-success', bg: 'bg-success/10 border-success/30' },
  ausente: { label: 'Ausente', icon: <XCircle size={14} />, color: 'text-danger', bg: 'bg-danger/10 border-danger/30' },
  retraso: { label: 'Retraso', icon: <Clock size={14} />, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  justificado: { label: 'Justificado', icon: <AlertCircle size={14} />, color: 'text-info', bg: 'bg-info/10 border-info/30' },
};

export default function AttendancePanel() {
  const { students: STUDENTS } = useEduTrack();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    if (STUDENTS.length > 0) {
      const init: Record<string, AttendanceRecord> = {};
      STUDENTS.forEach(s => { init[s.id] = { studentId: s.id, status: 'presente', note: '' }; });
      setRecords(init);
    }
  }, [STUDENTS]);

  const filtered = STUDENTS.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
    setSaved(false);
  };

  const setNote = (studentId: string, note: string) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note } }));
    setSaved(false);
  };

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceRecord> = {};
    STUDENTS.forEach(s => { updated[s.id] = { studentId: s.id, status, note: records[s.id]?.note || '' }; });
    setRecords(updated);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    toast.success('Asistencia guardada correctamente');
  };

  const counts = Object.values(records).reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground">Fecha:</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm font-medium bg-transparent border-none outline-none text-foreground"
          />
        </div>
        <input
          type="text"
          placeholder="Buscar alumno..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Marcar todos:</span>
          {(['presente', 'ausente'] as AttendanceStatus[]).map(s => (
            <button
              key={s}
              onClick={() => markAll(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(s => (
          <div key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}`}>
            {STATUS_CONFIG[s].icon}
            <span>{STATUS_CONFIG[s].label}: {counts[s] || 0}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-muted text-muted-foreground">
          <Users size={14} />
          <span>Total: {STUDENTS.length}</span>
        </div>
      </div>

      {/* Student list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-0 divide-y divide-border">
          <div className="col-span-3 grid grid-cols-[1fr_auto_auto] px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Alumno</span>
            <span className="w-64 text-center">Estado</span>
            <span className="w-40 text-center">Observación</span>
          </div>
          {filtered.map(student => {
            const rec = records[student.id];
            return (
              <React.Fragment key={student.id}>
                <div className="px-4 py-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                    {student.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <span className="text-sm font-medium text-foreground">{student.name}</span>
                </div>
                <div className="px-2 py-2 flex items-center gap-1 w-64">
                  {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(student.id, s)}
                      title={STATUS_CONFIG[s].label}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                        rec?.status === s
                          ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} ring-1 ring-current`
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {STATUS_CONFIG[s].icon}
                      <span className="hidden sm:inline">{STATUS_CONFIG[s].label}</span>
                    </button>
                  ))}
                </div>
                <div className="px-2 py-2 flex items-center w-40">
                  <input
                    type="text"
                    placeholder="Nota..."
                    value={rec?.note || ''}
                    onChange={e => setNote(student.id, e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-muted/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            saved
              ? 'bg-success/10 text-success border border-success/30' :'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {saved ? '✓ Guardado' : 'Guardar asistencia'}
        </button>
      </div>
    </div>
  );
}
