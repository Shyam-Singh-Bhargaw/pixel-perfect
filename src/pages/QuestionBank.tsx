import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, CheckCircle2, Circle, Search, ArrowLeft, Clock, HardDrive } from 'lucide-react';
import { getInfosysQuestions, TOPICS, type Question } from '@/lib/questionBank';
import { toast } from 'sonner';
import 'highlight.js/styles/github-dark.css';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
hljs.registerLanguage('python', python);

interface Progress {
  question_id: number;
  is_solved: boolean;
  starred: boolean;
  notes: string | null;
  attempts: number;
}

const ROW_H = 96;
const OVERSCAN = 5;

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
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);

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

  // Filtered list
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

  // Sync notes draft when selection changes & bump attempts
  useEffect(() => {
    if (!selected || !user) return;
    const p = progress.get(selected.id);
    setNotesDraft(p?.notes || '');
    // bump attempts
    upsert(selected.id, { attempts: (p?.attempts || 0) + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Notes debounced autosave
  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => {
      const cur = progress.get(selected.id);
      if ((cur?.notes || '') === notesDraft) return;
      upsert(selected.id, { notes: notesDraft });
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
      user_id: user.id,
      question_id: qid,
      company,
      is_solved: next.is_solved,
      starred: next.starred,
      notes: next.notes,
      attempts: next.attempts,
      updated_at: new Date().toISOString(),
    };
    if (next.is_solved && !cur.is_solved) row.solved_at = new Date().toISOString();
    await supabase.from('company_prep_progress').upsert(row, { onConflict: 'user_id,question_id,company' });
  }

  const toggleSolved = useCallback(
    (id: number) => {
      const p = progress.get(id);
      upsert(id, { is_solved: !p?.is_solved });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress]
  );

  const toggleStar = useCallback(
    (id: number) => {
      const p = progress.get(id);
      upsert(id, { starred: !p?.starred });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if (!selected) return;
      const idx = filtered.findIndex((q) => q.id === selected.id);
      if (e.key === 'n' || e.key === 'N') {
        const nx = filtered[idx + 1];
        if (nx) setSelectedId(nx.id);
      } else if (e.key === 'p' || e.key === 'P') {
        const pv = filtered[idx - 1];
        if (pv) setSelectedId(pv.id);
      } else if (e.key === 's' || e.key === 'S') {
        toggleSolved(selected.id);
      } else if (e.key === 'b' || e.key === 'B') {
        toggleStar(selected.id);
      }
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
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
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
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company}-solved-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported solved questions');
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/40 px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Question Bank</h1>
          <p className="text-xs text-muted-foreground">Company-wise interview prep · {solvedCount}/{questions.length} solved</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportSolved}>Export JSON</Button>
      </div>

      {/* Company tabs */}
      <Tabs value={company} onValueChange={(v) => setCompany(v as any)} className="px-6 pt-4">
        <TabsList>
          <TabsTrigger value="infosys">Infosys</TabsTrigger>
          <TabsTrigger value="tcs" disabled className="gap-2">
            TCS <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
          </TabsTrigger>
          <TabsTrigger value="tiger" disabled className="gap-2">
            Tiger Analytics <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Filter panel */}
        <aside className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search… ( / )"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Card className="p-3">
            <div className="text-xs text-muted-foreground mb-2">Progress</div>
            <Progress value={(solvedCount / questions.length) * 100} className="h-2" />
            <div className="text-xs mt-1 font-mono text-foreground">{solvedCount}/{questions.length}</div>
          </Card>

          <div>
            <div className="text-xs uppercase text-muted-foreground mb-2 font-semibold">Difficulty</div>
            <div className="flex flex-wrap gap-1">
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
                <Button key={d} size="sm" variant={diff === d ? 'default' : 'outline'} onClick={() => setDiff(d)} className="h-7 text-xs">
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground mb-2 font-semibold">Status</div>
            <div className="flex flex-wrap gap-1">
              {(['All', 'Solved', 'Unsolved', 'Starred'] as const).map((s) => (
                <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)} className="h-7 text-xs">
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground mb-2 font-semibold">Topics</div>
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                variant={topic === 'All' ? 'default' : 'ghost'}
                onClick={() => setTopic('All')}
                className="h-8 justify-between text-xs"
              >
                <span>All</span>
                <Badge variant="secondary" className="text-[10px]">{questions.length}</Badge>
              </Button>
              {TOPICS.map((t) => (
                <Button
                  key={t.name}
                  size="sm"
                  variant={topic === t.name ? 'default' : 'ghost'}
                  onClick={() => setTopic(t.name)}
                  className="h-8 justify-between text-xs"
                >
                  <span className="truncate">{t.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{t.count}</Badge>
                </Button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden">
          {selected ? (
            <DetailView
              q={selected}
              progress={progress.get(selected.id)}
              notesDraft={notesDraft}
              setNotesDraft={setNotesDraft}
              onBack={() => setSelectedId(null)}
              onToggleSolved={() => toggleSolved(selected.id)}
              onToggleStar={() => toggleStar(selected.id)}
            />
          ) : (
            <div ref={listRef} className="h-full overflow-auto rounded-lg border border-border bg-card/40">
              <div style={{ height: filtered.length * ROW_H, position: 'relative' }}>
                <div style={{ position: 'absolute', top: startIdx * ROW_H, left: 0, right: 0 }}>
                  {visible.map((q) => {
                    const p = progress.get(q.id);
                    return (
                      <div
                        key={q.id}
                        style={{ height: ROW_H }}
                        className="px-4 py-3 border-b border-border hover:bg-secondary/40 cursor-pointer flex items-center gap-3"
                        onClick={() => setSelectedId(q.id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSolved(q.id); }}
                          className="text-muted-foreground hover:text-primary"
                          aria-label="solved"
                        >
                          {p?.is_solved ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">#{q.id}</span>
                            <span className="font-medium text-sm truncate">{q.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                q.difficulty === 'Easy' ? 'text-green-500 border-green-500/40' :
                                q.difficulty === 'Medium' ? 'text-yellow-500 border-yellow-500/40' :
                                'text-red-500 border-red-500/40'
                              }`}
                            >
                              {q.difficulty}
                            </Badge>
                            {p?.attempts ? <span className="text-[10px] text-muted-foreground">{p.attempts} attempts</span> : null}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(q.id); }}
                          aria-label="star"
                        >
                          <Star className={`h-5 w-5 ${p?.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No questions match your filters.</div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function DetailView({
  q, progress, notesDraft, setNotesDraft, onBack, onToggleSolved, onToggleStar,
}: {
  q: Question;
  progress?: Progress;
  notesDraft: string;
  setNotesDraft: (s: string) => void;
  onBack: () => void;
  onToggleSolved: () => void;
  onToggleStar: () => void;
}) {
  const codeRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      try { hljs.highlightElement(codeRef.current); } catch {}
    }
  }, [q.id]);

  return (
    <div className="h-full overflow-auto rounded-lg border border-border bg-card/40">
      <div className="sticky top-0 z-10 border-b border-border bg-card px-5 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{q.id}</span>
            <h2 className="font-heading text-lg font-semibold truncate">{q.title}</h2>
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>
            <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onToggleStar}>
          <Star className={`h-4 w-4 ${progress?.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </Button>
        <Button variant={progress?.is_solved ? 'default' : 'outline'} size="sm" onClick={onToggleSolved}>
          {progress?.is_solved ? <><CheckCircle2 className="h-4 w-4" /> Solved</> : 'Mark Solved'}
        </Button>
      </div>

      <div className="p-5 space-y-5">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Problem</h3>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{q.problem}</p>
          <pre className="mt-3 text-xs bg-secondary/50 rounded p-3 whitespace-pre-wrap font-mono">{q.example}</pre>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-border text-sm font-semibold">Python Solution</div>
          <pre className="text-xs overflow-auto m-0"><code ref={codeRef} className="language-python">{q.code}</code></pre>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Dry Run</h3>
          <div className="space-y-2">
            {q.dryRun.map((s) => (
              <details key={s.step} className="border border-border rounded" open>
                <summary className="cursor-pointer px-3 py-2 text-xs font-mono bg-secondary/40">
                  Step {s.step}: {s.line}
                </summary>
                <table className="w-full text-xs">
                  <thead className="bg-secondary/30">
                    <tr><th className="px-3 py-1 text-left">Variable</th><th className="px-3 py-1 text-left">Value</th><th className="px-3 py-1 text-left">Change</th></tr>
                  </thead>
                  <tbody>
                    {s.variables.map((v, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-1 font-mono">{v.name}</td>
                        <td className="px-3 py-1 font-mono">{v.value}</td>
                        <td className="px-3 py-1 text-muted-foreground">{v.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3 w-3" /> Time Complexity</div>
            <div className="font-mono text-lg font-semibold text-primary">{q.time}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><HardDrive className="h-3 w-3" /> Space Complexity</div>
            <div className="font-mono text-lg font-semibold text-primary">{q.space}</div>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Notes</h3>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add your notes, observations, edge cases..."
            className="min-h-[120px] text-sm"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Auto-saves after 1 second.</p>
        </Card>

        <div className="text-[10px] text-muted-foreground">
          Shortcuts: <kbd className="px-1 border border-border rounded">N</kbd> next ·{' '}
          <kbd className="px-1 border border-border rounded">P</kbd> prev ·{' '}
          <kbd className="px-1 border border-border rounded">S</kbd> solved ·{' '}
          <kbd className="px-1 border border-border rounded">B</kbd> star ·{' '}
          <kbd className="px-1 border border-border rounded">Esc</kbd> back ·{' '}
          <kbd className="px-1 border border-border rounded">/</kbd> search
        </div>
      </div>
    </div>
  );
}
