'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, FileCode2, Folder, FolderGit2 as Github, Loader2, Search, X } from 'lucide-react';
import type { GitHubContentItem, GitHubContentsResponse } from '@/lib/github/types';

type Props = {
  repositoryUrl: string;
  studentName: string;
  initialSelection?: string[];
  onClose: () => void;
  onSelect: (paths: string[]) => void | Promise<void>;
};

export default function RepositoryPicker({ repositoryUrl, studentName, initialSelection = [], onClose, onSelect }: Props) {
  const [itemsByPath, setItemsByPath] = useState<Record<string, GitHubContentItem[]>>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(initialSelection);
  const [loadingPaths, setLoadingPaths] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const expandedSet = useMemo(() => new Set(expanded), [expanded]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const loadingSet = useMemo(() => new Set(loadingPaths), [loadingPaths]);

  const loadPath = async (path = '') => {
    if (loadingSet.has(path)) return;
    setLoadingPaths(current => current.includes(path) ? current : [...current, path]);
    setError('');
    try {
      const response = await fetch('/api/github/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryUrl, path }),
      });
      const body = await response.json() as GitHubContentsResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || 'No se pudo consultar el repositorio.');
      setItemsByPath(current => ({ ...current, [path]: body.items }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo consultar el repositorio.');
    } finally {
      setLoadingPaths(current => current.filter(value => value !== path));
    }
  };

  useEffect(() => { void loadPath(''); }, [repositoryUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelected = (path: string) => setSelected(current => current.includes(path) ? current.filter(value => value !== path) : [...current, path]);
  const toggleExpanded = async (item: GitHubContentItem) => {
    if (expandedSet.has(item.path)) return setExpanded(current => current.filter(value => value !== item.path));
    if (!itemsByPath[item.path]) await loadPath(item.path);
    setExpanded(current => current.includes(item.path) ? current : [...current, item.path]);
  };

  const needle = query.trim().toLowerCase();
  const renderTree = (items: GitHubContentItem[], depth = 0): React.ReactNode => items
    .filter(item => !needle || `${item.name} ${item.path}`.toLowerCase().includes(needle) || item.type === 'dir')
    .map(item => {
      const isDirectory = item.type === 'dir';
      const isExpanded = expandedSet.has(item.path);
      const children = itemsByPath[item.path] || [];
      return <div key={item.path}>
        <div className={`flex items-center gap-2 border-b border-border px-3 py-2 hover:bg-muted/40 ${selectedSet.has(item.path) ? 'bg-primary/5' : ''}`} style={{ paddingLeft: `${12 + depth * 20}px` }}>
          <input type="checkbox" checked={selectedSet.has(item.path)} onChange={() => toggleSelected(item.path)} aria-label={`Seleccionar ${item.path}`} />
          {isDirectory ? <button type="button" onClick={() => void toggleExpanded(item)} aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${item.name}`} className="rounded p-1 hover:bg-muted">{loadingSet.has(item.path) ? <Loader2 size={13} className="animate-spin" /> : isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button> : <span className="w-[21px]" />}
          {isDirectory ? <Folder size={16} className="flex-shrink-0 text-amber-500" /> : <FileCode2 size={16} className="flex-shrink-0 text-primary" />}
          <button type="button" onClick={() => isDirectory ? void toggleExpanded(item) : toggleSelected(item.path)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium">{item.name}</p><p className="truncate text-[10px] text-muted-foreground">{item.path}</p>
          </button>
          <span className="text-[10px] text-muted-foreground">{isDirectory ? `${children.length || '—'} elem.` : item.size < 1024 ? `${item.size} B` : `${(item.size / 1024).toFixed(1)} KB`}</span>
        </div>
        {isDirectory && isExpanded && <div>{children.length ? renderTree(children, depth + 1) : !loadingSet.has(item.path) && <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground" style={{ paddingLeft: `${42 + depth * 20}px` }}>Carpeta vacía</p>}</div>}
      </div>;
    });

  const confirm = async () => {
    if (!selected.length) return;
    setConfirming(true);
    try { await onSelect(selected); } finally { setConfirming(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`Repositorio GitHub de ${studentName}`}>
    <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <header className="flex items-start gap-3 border-b border-border p-4"><div className="rounded-lg bg-foreground p-2 text-background"><Github size={19} /></div><div className="min-w-0 flex-1"><h2 className="font-semibold">Repositorio GitHub · {studentName}</h2><p className="truncate text-xs text-muted-foreground">{repositoryUrl}</p></div><button type="button" onClick={onClose} aria-label="Cerrar explorador" className="rounded-lg p-2 hover:bg-muted"><X size={18} /></button></header>
      <div className="flex items-center gap-3 border-b border-border p-3"><label className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar entre los elementos cargados…" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm" /></label><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{selected.length} seleccionados</span></div>
      {error && <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="min-h-64 flex-1 overflow-y-auto">{loadingSet.has('') && !itemsByPath[''] ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" />Cargando repositorio…</div> : itemsByPath['']?.length ? renderTree(itemsByPath['']) : !error && <p className="py-20 text-center text-sm text-muted-foreground">El repositorio no contiene elementos.</p>}</div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4"><p className="text-xs text-muted-foreground">Puedes seleccionar ficheros completos o carpetas; las carpetas se cargarán de forma recursiva.</p><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button><button type="button" disabled={!selected.length || confirming} onClick={() => void confirm()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{confirming ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Usar selección</button></div></footer>
    </div>
  </div>;
}
