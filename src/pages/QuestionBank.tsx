import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Star, CheckCircle2, Search, ArrowLeft, Code2, Copy, Play, ChevronDown, ChevronRight, ChevronLeft, Sparkles, Loader2 } from 'lucide-react';
import { getInfosysQuestions, TOPICS, type Question } from '@/lib/questionBank';
import { toast } from 'sonner';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { streamChat } from '@/lib/ai';
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);

// CodeMaster palette
const C = {
  bg: '#0d1117',
  bg2: '#161b22',
  bg3: '#21262d',
  bg4: '#30363d',
  border: '#30363d',
  text: '#e6edf3',
  text2: '#8b949e',
  text3: '#6e7681',
  accent: '#f0a500',
  blue: '#58a6ff',
  teal: '#39d353',
  easy: '#3fb950',
  med: '#e3b341',
  hard: '#f85149',
  mono: "'JetBrains Mono','Fira Code','Cascadia Code',ui-monospace,monospace",
};

const diffColor = (d: string) =>
  d === 'Easy' ? C.easy : d === 'Medium' ? C.med : C.hard;
const diffBg = (d: string) =>
  d === 'Easy' ? 'rgba(63,185,80,0.12)' : d === 'Medium' ? 'rgba(227,179,65,0.12)' : 'rgba(248,81,73,0.12)';

interface Progress {
  question_id: number;
  is_solved: boolean;
  starred: boolean;
  notes: string | null;
  attempts: number;
}

const ROW_H = 56;
const OVERSCAN = 6;

export default function QuestionBank() {
  const { user } = useAuth();
  const questions = useMemo(() => getInfosysQuestions(), []);
  const [company, setCompany] = useState<'infosys' | 'tcs' | 'tiger'>('infosys');
  const [progress, setProgress] = useState<Map<number, Progress>>(new Map());
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState<string>('All');
  const [diff, setDiff] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [status, setStatus] = useState<'All' | 'Solved' | 'Unsolved' | 'Starred'>('All');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [detailTab, setDetailTab] = useState<'desc' | 'sol' | 'elite'>('desc');
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'ok'>('idle');
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('qbank_sidebar_collapsed') === '1'; } catch { return false; }
  });
  const [aiCache, setAiCache] = useState<Map<number, string>>(new Map());
  const [aiLoading, setAiLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

  useEffect(() => {
    try { localStorage.setItem('qbank_sidebar_collapsed', collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  // Load progress
  useEffect(() => {
    if (!user) return;
    supabase
      .from('company_prep_progress')
      .select('question_id,is_solved,starred,notes,attempts')
      .eq('company', company)
      .eq('user_id', user.id)
      .then(({ data }) => {
        const m = new Map<number, Progress>();
        (data || []).forEach((r: any) => m.set(r.question_id, r));
        setProgress(m);
      });
  }, [user, company]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return questions.filter((qn) => {
      if (topic !== 'All' && qn.topic !== topic) return false;
      if (diff !== 'All' && qn.difficulty !== diff) return false;
      const p = progress.get(qn.id);
      if (status === 'Solved' && !p?.is_solved) return false;
      if (status === 'Unsolved' && p?.is_solved) return false;
      if (status === 'Starred' && !p?.starred) return false;
      if (q && !qn.title.toLowerCase().includes(q) && !qn.topic.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [questions, search, topic, diff, status, progress]);

  const solvedCount = useMemo(
    () => Array.from(progress.values()).filter((p) => p.is_solved).length,
    [progress]
  );

  const selected = useMemo(
    () => (selectedId != null ? questions.find((q) => q.id === selectedId) || null : null),
    [selectedId, questions]
  );

  useEffect(() => {
    if (!selected || !user) return;
    const p = progress.get(selected.id);
    setNotesDraft(p?.notes || '');
    upsert(selected.id, { attempts: (p?.attempts || 0) + 1 });
    setDetailTab('desc');
    setRunStatus('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    const cur = progress.get(selected.id);
    if ((cur?.notes || '') === notesDraft) { setSavingNotes(false); return; }
    setSavingNotes(true);
    const t = setTimeout(() => {
      upsert(selected.id, { notes: notesDraft });
      setSavingNotes(false);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft]);

  async function upsert(qid: number, patch: Partial<Progress> & { attempts?: number }) {
    if (!user) return;
    const cur = progress.get(qid) || { question_id: qid, is_solved: false, starred: false, notes: null, attempts: 0 };
    const next: Progress = { ...cur, ...patch } as Progress;
    setProgress((prev) => new Map(prev).set(qid, next));
    const row: any = {
      user_id: user.id, question_id: qid, company,
      is_solved: next.is_solved, starred: next.starred,
      notes: next.notes, attempts: next.attempts,
      updated_at: new Date().toISOString(),
    };
    if (next.is_solved && !cur.is_solved) row.solved_at = new Date().toISOString();
    await supabase.from('company_prep_progress').upsert(row, { onConflict: 'user_id,question_id,company' });
  }

  const toggleSolved = useCallback((id: number) => {
    const p = progress.get(id);
    upsert(id, { is_solved: !p?.is_solved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const toggleStar = useCallback((id: number) => {
    const p = progress.get(id);
    upsert(id, { starred: !p?.starred });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Keyboard shortcuts (preserved)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'Escape') { setSelectedId(null); return; }
      if (!selected) return;
      const idx = filtered.findIndex((q) => q.id === selected.id);
      if (e.key === 'n' || e.key === 'N') { const nx = filtered[idx + 1]; if (nx) setSelectedId(nx.id); }
      else if (e.key === 'p' || e.key === 'P') { const pv = filtered[idx - 1]; if (pv) setSelectedId(pv.id); }
      else if (e.key === 's' || e.key === 'S') toggleSolved(selected.id);
      else if (e.key === 'b' || e.key === 'B') toggleStar(selected.id);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, filtered, toggleSolved, toggleStar]);

  // Virtual scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    el.addEventListener('scroll', onScroll);
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, []);

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const endIdx = Math.min(filtered.length, Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN);
  const visible = filtered.slice(startIdx, endIdx);

  function exportSolved() {
    const data = questions
      .filter((q) => progress.get(q.id)?.is_solved)
      .map((q) => ({ id: q.id, title: q.title, topic: q.topic, notes: progress.get(q.id)?.notes || '' }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${company}-solved-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported solved questions');
  }

  function runCode() {
    setRunStatus('running');
    setTimeout(() => setRunStatus('ok'), 800);
  }

  return (
    <div
      className="flex flex-col qb-root"
      style={{
        background: C.bg, color: C.text,
        height: 'calc(100vh - 3.5rem)',
        fontFamily: "Inter, system-ui, 'DM Sans', sans-serif",
      }}
    >
      <style>{`
        .qb-root ::-webkit-scrollbar{width:5px;height:5px;}
        .qb-root ::-webkit-scrollbar-track{background:transparent;}
        .qb-root ::-webkit-scrollbar-thumb{background:${C.bg4};border-radius:4px;}
        .qb-root ::-webkit-scrollbar-thumb:hover{background:${C.text3};}
        .qb-mono{font-family:${C.mono};}
        .qb-code .hljs{background:${C.bg};color:${C.text};padding:0;}
        .qb-code .hljs-keyword,.qb-code .hljs-built_in{color:#ff7b72;}
        .qb-code .hljs-title.function_,.qb-code .hljs-title{color:#d2a8ff;}
        .qb-code .hljs-string{color:#a5d6ff;}
        .qb-code .hljs-comment{color:${C.text2};font-style:italic;}
        .qb-code .hljs-number{color:#79c0ff;}
        .qb-code .hljs-params,.qb-code .hljs-variable{color:${C.text};}
        .qb-row:hover{background:${C.bg3};}
      `}</style>

      {/* Top nav */}
      <div
        className="flex items-center px-4 gap-3 shrink-0"
        style={{ height: 50, background: C.bg2, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-2 font-bold" style={{ color: C.accent, fontSize: 16 }}>
          <Code2 className="h-5 w-5" /> Question Bank
        </div>
        <div style={{ width: 1, height: 22, background: C.border }} />
        <div className="flex gap-1">
          {[
            { k: 'infosys', l: 'Infosys', active: true },
            { k: 'tcs', l: 'TCS', soon: true },
            { k: 'tiger', l: 'Tiger Analytics', soon: true },
          ].map((t) => (
            <button
              key={t.k}
              disabled={!!t.soon}
              onClick={() => !t.soon && setCompany(t.k as any)}
              style={{
                background: company === t.k ? C.bg3 : 'transparent',
                color: t.soon ? C.text3 : company === t.k ? C.accent : C.text2,
                padding: '6px 14px', borderRadius: 6, fontSize: 13,
                cursor: t.soon ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {t.l}{t.soon && <span style={{ marginLeft: 6, fontSize: 10, color: C.text3 }}>· soon</span>}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span
            className="qb-mono"
            style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, color: C.text2 }}
          >
            Solved: <b style={{ color: C.accent }}>{solvedCount}</b> / {questions.length}
          </span>
          <button
            onClick={exportSolved}
            style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 12px', color: C.text, fontSize: 12, cursor: 'pointer' }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* 3-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside
          className="shrink-0 flex flex-col overflow-y-auto"
          style={{ width: 280, background: C.bg2, borderRight: `1px solid ${C.border}`, padding: 14, gap: 16 }}
        >
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search className="h-4 w-4" style={{ position: 'absolute', left: 10, top: 9, color: C.text2 }} />
            <input
              ref={searchRef}
              placeholder="Search… ( / )"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', background: C.bg3, border: `1px solid ${C.border}`,
                color: C.text, borderRadius: 6, padding: '7px 10px 7px 32px', fontSize: 13, outline: 'none',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
            />
          </div>

          <SectionLabel>Difficulty</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map((d) => {
              const active = diff === d;
              const col = d === 'All' ? C.accent : diffColor(d);
              return (
                <button
                  key={d}
                  onClick={() => setDiff(d)}
                  style={{
                    background: active ? (d === 'All' ? 'rgba(240,165,0,0.12)' : diffBg(d)) : C.bg3,
                    border: `1px solid ${active ? col : C.border}`,
                    color: active ? col : C.text2,
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <SectionLabel>Status</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {(['All', 'Solved', 'Unsolved', 'Starred'] as const).map((s) => {
              const active = status === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    background: active ? 'rgba(240,165,0,0.12)' : C.bg3,
                    border: `1px solid ${active ? C.accent : C.border}`,
                    color: active ? C.accent : C.text2,
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <SectionLabel>Topics</SectionLabel>
          <div className="flex flex-col gap-1">
            <TopicBtn name="All" count={questions.length} active={topic === 'All'} onClick={() => setTopic('All')} />
            {TOPICS.map((t) => (
              <TopicBtn key={t.name} name={t.name} count={t.count} active={topic === t.name} onClick={() => setTopic(t.name)} />
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <SectionLabel>Progress</SectionLabel>
            <div style={{ height: 4, background: C.bg3, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(solvedCount / questions.length) * 100}%`, background: C.accent }} />
            </div>
            <div className="qb-mono" style={{ fontSize: 11, color: C.text2, marginTop: 4 }}>
              {solvedCount} / {questions.length}
            </div>
          </div>
        </aside>

        {/* CENTER: list */}
        <div
          className="shrink-0 flex flex-col"
          style={{ width: 320, background: C.bg2, borderRight: `1px solid ${C.border}` }}
        >
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.text2, textTransform: 'uppercase', letterSpacing: 1 }}>
            {filtered.length} questions
          </div>
          <div ref={listRef} className="flex-1 overflow-auto">
            <div style={{ height: filtered.length * ROW_H, position: 'relative' }}>
              <div style={{ position: 'absolute', top: startIdx * ROW_H, left: 0, right: 0 }}>
                {visible.map((q) => {
                  const p = progress.get(q.id);
                  const isSel = selectedId === q.id;
                  return (
                    <div
                      key={q.id}
                      className="qb-row"
                      style={{
                        height: ROW_H, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
                        cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
                        background: isSel ? 'rgba(88,166,255,0.07)' : 'transparent',
                        borderLeft: isSel ? `3px solid ${C.blue}` : '3px solid transparent',
                      }}
                      onClick={() => setSelectedId(q.id)}
                    >
                      <div
                        className="qb-mono"
                        style={{
                          width: 28, textAlign: 'center', fontSize: 12,
                          color: p?.is_solved ? C.easy : C.text3,
                        }}
                      >
                        {p?.is_solved ? '✓' : `#${q.id}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13, fontWeight: 500, color: isSel ? C.blue : C.text,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}
                        >
                          {q.title}
                        </div>
                        <div className="flex items-center gap-1.5" style={{ marginTop: 3 }}>
                          <Pill text={q.difficulty} color={diffColor(q.difficulty)} bg={diffBg(q.difficulty)} />
                          <Pill text={q.topic} color={C.text2} bg={C.bg3} />
                          {p?.attempts ? <span style={{ fontSize: 10, color: C.text3 }}>· {p.attempts}×</span> : null}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(q.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                        aria-label="star"
                      >
                        <Star
                          className="h-4 w-4"
                          style={{ color: p?.starred ? C.accent : C.text3, fill: p?.starred ? C.accent : 'transparent' }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: C.text2 }}>
                No questions match your filters.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: detail */}
        <main className="flex-1 overflow-hidden flex flex-col" style={{ background: C.bg }}>
          {selected ? (
            <Detail
              q={selected}
              progress={progress.get(selected.id)}
              tab={detailTab}
              setTab={setDetailTab}
              notesDraft={notesDraft}
              setNotesDraft={setNotesDraft}
              savingNotes={savingNotes}
              onToggleSolved={() => toggleSolved(selected.id)}
              onToggleStar={() => toggleStar(selected.id)}
              onClose={() => setSelectedId(null)}
              runStatus={runStatus}
              runCode={runCode}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: C.text2 }}>
              <div style={{ textAlign: 'center' }}>
                <Code2 className="mx-auto" style={{ width: 48, height: 48, color: C.bg4 }} />
                <p style={{ marginTop: 12, fontSize: 14 }}>Select a question from the list</p>
                <p style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
                  Press <kbd style={kbd}>/</kbd> to search · <kbd style={kbd}>N</kbd>/<kbd style={kbd}>P</kbd> to navigate
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom status bar */}
      <div
        className="flex items-center px-4 shrink-0 qb-mono"
        style={{
          height: 32, background: C.bg2, borderTop: `1px solid ${C.border}`,
          fontSize: 11.5, color: C.text2, gap: 16,
        }}
      >
        <span className="flex items-center gap-2">
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: runStatus === 'running' ? C.med : C.easy,
          }} />
          {runStatus === 'running' ? 'Running…' : 'Ready'}
        </span>
        <span style={{ flex: 1, textAlign: 'center', color: C.text }}>
          {selected ? `#${selected.id} · ${selected.title}` : 'Question Bank · Infosys'}
        </span>
        {selected && (
          <span style={{ color: C.text2 }}>
            T: <span style={{ color: C.accent }}>{selected.time}</span> &nbsp;|&nbsp;
            S: <span style={{ color: C.accent }}>{selected.space}</span>
          </span>
        )}
      </div>
    </div>
  );
}

const kbd: React.CSSProperties = {
  padding: '1px 5px', border: `1px solid ${C.border}`, borderRadius: 3,
  fontSize: 10, fontFamily: C.mono, color: C.text2, background: C.bg2,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: C.text3, fontWeight: 600 }}>
      {children}
    </div>
  );
}

function TopicBtn({ name, count, active, onClick }: { name: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', padding: '6px 10px', borderRadius: 6,
        background: active ? 'rgba(240,165,0,0.10)' : 'transparent',
        border: `1px solid ${active ? 'rgba(240,165,0,0.3)' : 'transparent'}`,
        color: active ? C.accent : C.text2, fontSize: 12, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <span
        style={{
          background: C.bg3, color: C.text2, fontSize: 10,
          padding: '1px 7px', borderRadius: 10, marginLeft: 6,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, fontSize: 10, padding: '1px 7px', borderRadius: 4, fontWeight: 500 }}>
      {text}
    </span>
  );
}

function Detail({
  q, progress, tab, setTab, notesDraft, setNotesDraft, savingNotes,
  onToggleSolved, onToggleStar, onClose, runStatus, runCode,
}: {
  q: Question; progress?: Progress;
  tab: 'desc' | 'sol'; setTab: (t: 'desc' | 'sol') => void;
  notesDraft: string; setNotesDraft: (s: string) => void;
  savingNotes: boolean;
  onToggleSolved: () => void; onToggleStar: () => void; onClose: () => void;
  runStatus: 'idle' | 'running' | 'ok'; runCode: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Detail header */}
      <div
        className="flex items-center gap-3 shrink-0"
        style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.bg2 }}
      >
        <button
          onClick={onClose}
          className="md:hidden"
          style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer' }}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <span className="qb-mono" style={{ fontSize: 11, color: C.text3 }}>#{q.id}</span>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {q.title}
            </h2>
            <Pill text={q.difficulty} color={diffColor(q.difficulty)} bg={diffBg(q.difficulty)} />
            <Pill text={q.topic} color={C.text2} bg={C.bg3} />
          </div>
        </div>
        <button
          onClick={onToggleStar}
          style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 9px', cursor: 'pointer' }}
        >
          <Star className="h-4 w-4" style={{ color: progress?.starred ? C.accent : C.text2, fill: progress?.starred ? C.accent : 'transparent' }} />
        </button>
        <button
          onClick={onToggleSolved}
          style={{
            background: progress?.is_solved ? 'rgba(63,185,80,0.15)' : C.bg3,
            border: `1px solid ${progress?.is_solved ? C.easy : C.border}`,
            color: progress?.is_solved ? C.easy : C.text, borderRadius: 6,
            padding: '5px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {progress?.is_solved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Solved</> : 'Mark Solved'}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex shrink-0" style={{ borderBottom: `1px solid ${C.border}`, background: C.bg2 }}>
        {(['desc', 'sol'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', fontSize: 12.5,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: tab === t ? C.accent : C.text2,
              borderBottom: tab === t ? `2px solid ${C.accent}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'desc' ? 'Description' : 'Solution + Dry Run'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {tab === 'desc' ? (
          <DescriptionView q={q} notesDraft={notesDraft} setNotesDraft={setNotesDraft} savingNotes={savingNotes} />
        ) : (
          <SolutionView q={q} runStatus={runStatus} runCode={runCode} notesDraft={notesDraft} setNotesDraft={setNotesDraft} savingNotes={savingNotes} />
        )}
      </div>
    </div>
  );
}

function DescriptionView({ q, notesDraft, setNotesDraft, savingNotes }: { q: Question; notesDraft: string; setNotesDraft: (s: string) => void; savingNotes: boolean }) {
  return (
    <div className="h-full overflow-auto" style={{ padding: 24 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <Pill text="Infosys" color={C.blue} bg="rgba(88,166,255,0.12)" />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 14, fontFamily: "'Space Grotesk',sans-serif" }}>
        {q.title}
      </h1>
      <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{q.problem}</p>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.text3, marginBottom: 8 }}>Example</div>
        <div
          className="qb-mono"
          style={{
            background: C.bg2, borderLeft: `3px solid ${C.accent}`,
            padding: '12px 14px', fontSize: 13, color: C.text, whiteSpace: 'pre-wrap', borderRadius: 4,
          }}
        >
          {q.example}
        </div>
      </div>

      <div
        style={{
          marginTop: 22, padding: 16,
          background: 'rgba(88,166,255,0.04)', border: '1px solid rgba(88,166,255,0.2)', borderRadius: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: C.blue, marginBottom: 6 }}>Logic & Approach</div>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
          See the Solution tab for the full implementation with line-by-line dry run.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3" style={{ marginTop: 22 }}>
        <ComplexityCard label="Time" value={q.time} />
        <ComplexityCard label="Space" value={q.space} />
      </div>

      <NotesPanel notesDraft={notesDraft} setNotesDraft={setNotesDraft} savingNotes={savingNotes} />
    </div>
  );
}

function ComplexityCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.text2 }}>{label}</div>
      <div className="qb-mono" style={{ fontSize: 18, color: C.accent, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function SolutionView({
  q, runStatus, runCode, notesDraft, setNotesDraft, savingNotes,
}: {
  q: Question; runStatus: 'idle' | 'running' | 'ok'; runCode: () => void;
  notesDraft: string; setNotesDraft: (s: string) => void; savingNotes: boolean;
}) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      try { hljs.highlightElement(codeRef.current); } catch {}
    }
  }, [q.id]);

  const lines = q.code.split('\n');

  function copyCode() {
    navigator.clipboard.writeText(q.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="h-full overflow-auto" style={{ padding: 0 }}>
      <div className="flex" style={{ minHeight: '100%' }}>
        {/* Code panel */}
        <div style={{ width: '52%', borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
          <div
            className="flex items-center gap-2 shrink-0"
            style={{ padding: '8px 12px', background: C.bg2, borderBottom: `1px solid ${C.border}` }}
          >
            <span
              style={{ background: 'rgba(63,185,80,0.12)', color: C.easy, fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}
            >
              Python 3
            </span>
            <span style={{ fontSize: 12, color: C.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {q.title}
            </span>
            <button
              onClick={copyCode}
              style={{ background: C.bg3, border: `1px solid ${C.border}`, color: C.text2, borderRadius: 4, padding: '3px 9px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Copy className="h-3 w-3" /> {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={runCode}
              style={{ background: 'rgba(63,185,80,0.18)', border: `1px solid ${C.easy}`, color: C.easy, borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Play className="h-3 w-3" /> {runStatus === 'running' ? 'Running…' : 'Run'}
            </button>
          </div>

          <div className="qb-code" style={{ background: C.bg, padding: '12px 0', overflow: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', fontFamily: C.mono, fontSize: 13, lineHeight: 1.9 }}>
              <div style={{ width: 40, textAlign: 'right', paddingRight: 10, color: C.text3, userSelect: 'none' }}>
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <pre style={{ margin: 0, flex: 1, paddingRight: 16 }}>
                <code ref={codeRef} className="language-python">{q.code}</code>
              </pre>
            </div>
          </div>

          {runStatus === 'ok' && (
            <div
              style={{
                background: C.bg2, borderTop: `1px solid ${C.border}`, padding: 12,
                fontSize: 12, color: C.text,
              }}
            >
              <div style={{ color: C.easy, fontWeight: 600, marginBottom: 4 }}>Accepted ✓</div>
              <div className="qb-mono" style={{ color: C.text2, fontSize: 11 }}>
                Sample passed. Time: {q.time} · Space: {q.space}
              </div>
            </div>
          )}
        </div>

        {/* Dry Run */}
        <div style={{ width: '48%', display: 'flex', flexDirection: 'column' }}>
          <div
            className="shrink-0"
            style={{ padding: '8px 14px', background: C.bg2, borderBottom: `1px solid ${C.border}` }}
          >
            <div style={{ color: '#4ec9b0', fontSize: 12, fontWeight: 600 }}>Step-by-Step Dry Run</div>
            <div className="qb-mono" style={{ color: C.text3, fontSize: 11, marginTop: 2 }}>
              Input: {q.example.split('->')[0].trim() || '—'}
            </div>
          </div>
          <div style={{ padding: 12, overflow: 'auto', flex: 1 }}>
            {q.dryRun.map((s) => (
              <DryRunCard key={s.step} step={s} isLast={s === q.dryRun[q.dryRun.length - 1]} />
            ))}
          </div>
        </div>
      </div>

      <NotesPanel notesDraft={notesDraft} setNotesDraft={setNotesDraft} savingNotes={savingNotes} />
    </div>
  );
}

function DryRunCard({ step, isLast }: { step: any; isLast: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 6,
        marginBottom: 8, overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span
          style={{
            width: 22, height: 22, borderRadius: '50%', background: C.accent, color: C.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}
        >
          {step.step}
        </span>
        <span className="qb-mono" style={{ flex: 1, fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {step.line}
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5" style={{ color: C.text3 }} /> : <ChevronRight className="h-3.5 w-3.5" style={{ color: C.text3 }} />}
      </button>
      {open && (
        <div style={{ padding: '0 12px 10px', borderTop: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', fontSize: 11.5, marginTop: 8, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: C.text3, textAlign: 'left' }}>
                <th style={{ padding: '4px 6px', fontWeight: 500 }}>Variable</th>
                <th style={{ padding: '4px 6px', fontWeight: 500 }}>Value</th>
                <th style={{ padding: '4px 6px', fontWeight: 500 }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {step.variables.map((v: any, i: number) => {
                const changed = v.change && v.change !== '';
                const isNew = v.change?.toLowerCase().includes('init') || v.change?.toLowerCase().includes('add');
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td className="qb-mono" style={{ padding: '4px 6px', color: isNew ? '#4ec9b0' : C.text }}>{v.name}</td>
                    <td className="qb-mono" style={{ padding: '4px 6px', color: changed ? C.accent : C.text2 }}>{v.value}</td>
                    <td style={{ padding: '4px 6px', color: C.text3 }}>{v.change}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isLast && (
            <div
              style={{
                marginTop: 8, padding: '6px 10px', background: 'rgba(63,185,80,0.10)',
                border: `1px solid ${C.easy}`, borderRadius: 4, color: C.easy, fontSize: 11.5,
              }}
            >
              ✓ Output produced
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotesPanel({ notesDraft, setNotesDraft, savingNotes }: { notesDraft: string; setNotesDraft: (s: string) => void; savingNotes: boolean }) {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, background: C.bg2, padding: 14 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.text3 }}>Notes</div>
        <span style={{ fontSize: 10, color: C.text3, opacity: savingNotes ? 1 : 0, transition: 'opacity 200ms' }}>
          Auto-saving…
        </span>
      </div>
      <textarea
        value={notesDraft}
        onChange={(e) => setNotesDraft(e.target.value)}
        placeholder="Add your notes, observations, edge cases..."
        style={{
          width: '100%', minHeight: 80, background: C.bg, border: `1px solid ${C.border}`,
          color: C.text, borderRadius: 6, padding: 10, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
        onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
      />
    </div>
  );
}
