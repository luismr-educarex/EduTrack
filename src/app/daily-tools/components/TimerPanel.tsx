'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Volume2, VolumeX } from 'lucide-react';

const PRESETS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '20 min', seconds: 1200 },
  { label: '25 min', seconds: 1500 },
  { label: '30 min', seconds: 1800 },
  { label: '45 min', seconds: 2700 },
];

const ACTIVITY_PRESETS = [
  { label: 'Examen corto', seconds: 900, color: 'bg-danger/10 text-danger border-danger/30' },
  { label: 'Práctica guiada', seconds: 1200, color: 'bg-primary/10 text-primary border-primary/30' },
  { label: 'Debate / exposición', seconds: 600, color: 'bg-info/10 text-info border-info/30' },
  { label: 'Trabajo en grupo', seconds: 1800, color: 'bg-success/10 text-success border-success/30' },
  { label: 'Descanso', seconds: 300, color: 'bg-warning/10 text-warning border-warning/30' },
];

export default function TimerPanel() {
  const [totalSeconds, setTotalSeconds] = useState(600);
  const [remaining, setRemaining] = useState(600);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [label, setLabel] = useState('Actividad en clase');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            stop();
            setFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, stop]);

  const start = () => {
    if (remaining === 0) return;
    setFinished(false);
    setRunning(true);
  };

  const pause = () => stop();

  const reset = (seconds?: number) => {
    stop();
    const s = seconds ?? totalSeconds;
    setTotalSeconds(s);
    setRemaining(s);
    setFinished(false);
  };

  const setPreset = (seconds: number) => {
    reset(seconds);
  };

  const adjustTime = (delta: number) => {
    if (running) return;
    const newVal = Math.max(60, Math.min(7200, totalSeconds + delta));
    setTotalSeconds(newVal);
    setRemaining(newVal);
    setFinished(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 88;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const timerColor = finished
    ? '#DC2626'
    : remaining < totalSeconds * 0.2
    ? '#D97706' :'#2563EB';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer display */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-5">
          {/* Label */}
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="text-center text-sm font-medium text-muted-foreground bg-transparent border-none outline-none w-full"
            placeholder="Nombre de la actividad..."
          />

          {/* Circular timer */}
          <div className="relative w-52 h-52">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="88"
                fill="none"
                stroke={timerColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-5xl font-bold font-mono-nums transition-colors ${finished ? 'text-danger' : remaining < totalSeconds * 0.2 ? 'text-warning' : 'text-foreground'}`}
              >
                {formatTime(remaining)}
              </span>
              {finished && (
                <span className="text-xs font-semibold text-danger mt-1 animate-pulse">¡Tiempo!</span>
              )}
              {!finished && running && (
                <span className="text-xs text-muted-foreground mt-1">en curso</span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => adjustTime(-60)}
              disabled={running}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={running ? pause : start}
              disabled={remaining === 0 && !finished}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                running
                  ? 'bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20' :'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? 'Pausar' : 'Iniciar'}
            </button>
            <button
              onClick={() => reset()}
              className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => adjustTime(60)}
              disabled={running}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              soundEnabled ? 'border-primary/30 text-primary bg-primary/5' : 'border-border text-muted-foreground'
            }`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            {soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
          </button>
        </div>

        {/* Presets */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tiempos rápidos</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.seconds}
                  onClick={() => setPreset(p.seconds)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    totalSeconds === p.seconds && !running
                      ? 'bg-primary text-white border-primary' :'bg-card border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Actividades predefinidas</p>
            <div className="space-y-2">
              {ACTIVITY_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setPreset(p.seconds); setLabel(p.label); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all hover:opacity-90 ${p.color}`}
                >
                  <span>{p.label}</span>
                  <span className="font-mono-nums text-xs opacity-70">{Math.floor(p.seconds / 60)} min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom time */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tiempo personalizado</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={120}
                value={Math.floor(totalSeconds / 60)}
                onChange={e => {
                  const m = parseInt(e.target.value) || 0;
                  setPreset(m * 60);
                }}
                disabled={running}
                className="w-20 px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <span className="text-sm text-muted-foreground">minutos</span>
              <button
                onClick={() => { reset(totalSeconds); }}
                disabled={running}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
