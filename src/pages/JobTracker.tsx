import { useState, useEffect, useCallback, useMemo, Fragment as FragmentRow } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ExternalAnchor } from '@/components/ExternalAnchor';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronRight, ExternalLink, MapPin, Briefcase, DollarSign, Clock, Sparkles } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

const STAGES = [
  'Bookmarked',
  'Applied',
  'Follow-up Sent',
  'Screening',
  'Technical Round',
  'HR Round',
  'Final Round',
  'Offer',
  'Rejected',
] as const;
type Stage = typeof STAGES[number];

const STAGE_TONE: Record<Stage, string> = {
  'Bookmarked': 'bg-muted/40 text-muted-foreground border-border',
  'Applied': 'bg-info/15 text-info border-info/30',
  'Follow-up Sent': 'bg-info/10 text-info border-info/20',
  'Screening': 'bg-warning/15 text-warning border-warning/30',
  'Technical Round': 'bg-primary/15 text-primary border-primary/30',
  'HR Round': 'bg-primary/15 text-primary border-primary/30',
  'Final Round': 'bg-primary/20 text-primary border-primary/40',
  'Offer': 'bg-success/15 text-success border-success/30',
  'Rejected': 'bg-destructive/15 text-destructive border-destructive/30',
};

const FOLLOWUP_DAYS: Partial<Record<Stage, number>> = {
  Applied: 3,
  'Follow-up Sent': 5,
  Screening: 4,
  'Technical Round': 2,
  'HR Round': 3,
  'Final Round': 3,
  Offer: 2,
};

const REJECTION_REASONS = ['Ghosted', 'Not a fit', 'Withdrew', 'Position closed', 'Other'] as const;

function daysBetween(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyOf(job: any): 'green' | 'amber' | 'red' | null {
  if (!['Applied', 'Follow-up Sent'].includes(job.stage)) return null;
  const days = daysBetween(job.applied_date || job.created_at);
  if (days < 3) return 'green';
  if (days <= 7) return 'amber';
  return 'red';
}

const URGENCY_DOT: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-destructive',
};

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function domainOf(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function JobTrackerPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Add form
  const [url, setUrl] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [salary, setSalary] = useState('');
  const [stage, setStage] = useState<Stage>('Applied');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState<{ id: string; reason: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setJobs(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const extractFromUrl = async (jobUrl: string) => {
    if (!jobUrl.trim()) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-job', { body: { url: jobUrl } });
      if (error) throw error;
      if (data) {
        if (data.company && !company) setCompany(data.company);
        if (data.role && !role) setRole(data.role);
        if (data.location && !location) setLocation(data.location);
        if (data.job_type && !jobType) setJobType(data.job_type);
        if (data.salary && !salary) setSalary(data.salary);
        if (data.role || data.company) {
          toast.success('Auto-filled from job posting ✨');
        } else {
          toast.info('Could not extract details — please fill manually');
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Could not auto-extract — fill manually');
    } finally {
      setExtracting(false);
    }
  };

  const onUrlChange = (val: string) => {
    setUrl(val);
    // Try fallback company from domain immediately
    if (val && !company) {
      const d = domainOf(val);
      if (d) {
        const guess = d.split('.').slice(-2, -1)[0];
        if (guess && !['linkedin', 'indeed', 'glassdoor', 'greenhouse', 'lever', 'ashbyhq', 'myworkdayjobs', 'workday'].includes(guess)) {
          // Light hint only
        }
      }
    }
  };

  const addJob = async () => {
    if (!user) return;
    if (!company.trim() && !url.trim()) {
      toast.error('Add a URL or company name');
      return;
    }
    const finalCompany = company.trim() || domainOf(url) || 'Unknown';
    const finalRole = role.trim() || 'Role TBD';
    const today = new Date().toISOString().slice(0, 10);
    const computedFollowUp = followUp || (FOLLOWUP_DAYS[stage] ? addDaysISO(FOLLOWUP_DAYS[stage]!) : null);

    const { error } = await supabase.from('job_applications').insert({
      user_id: user.id,
      company: finalCompany,
      role: finalRole,
      url: url || null,
      location: location || null,
      job_type: jobType || null,
      salary: salary || null,
      stage,
      status: stage,
      notes: notes || null,
      follow_up_date: computedFollowUp,
      applied_date: today,
      status_history: [{ stage, at: new Date().toISOString() }],
    });
    if (error) {
      toast.error('Could not save: ' + error.message);
      return;
    }
    toast.success('Application added!');
    setUrl(''); setCompany(''); setRole(''); setLocation(''); setJobType('');
    setSalary(''); setNotes(''); setFollowUp(''); setStage('Applied');
    fetchJobs();
  };

  const updateStage = async (id: string, newStage: Stage, rejectionReason?: string) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    const history = Array.isArray(job.status_history) ? job.status_history : [];
    const newHistory = [...history, { stage: newStage, at: new Date().toISOString() }];
    const newFollowUp = FOLLOWUP_DAYS[newStage] ? addDaysISO(FOLLOWUP_DAYS[newStage]!) : job.follow_up_date;
    const patch: any = {
      stage: newStage,
      status: newStage,
      status_history: newHistory,
      follow_up_date: newFollowUp,
    };
    if (rejectionReason !== undefined) patch.rejection_reason = rejectionReason;

    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
    const { error } = await supabase.from('job_applications').update(patch).eq('id', id);
    if (error) {
      toast.error('Update failed');
      fetchJobs();
    } else {
      toast.success(`Moved to ${newStage}`);
    }
  };

  const onDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;
    const newStage = String(over.id) as Stage;
    const id = String(active.id);
    const job = jobs.find(j => j.id === id);
    if (!job || job.stage === newStage) return;
    if (newStage === 'Rejected') {
      setPendingReject({ id, reason: 'Ghosted' });
    } else {
      updateStage(id, newStage);
    }
  };

  const confirmReject = () => {
    if (!pendingReject) return;
    updateStage(pendingReject.id, 'Rejected', pendingReject.reason);
    setPendingReject(null);
  };

  // Stats
  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(j => j.stage !== 'Rejected' && j.stage !== 'Offer').length;
    const responded = jobs.filter(j =>
      !['Bookmarked', 'Applied', 'Follow-up Sent', 'Rejected'].includes(j.stage) || j.stage === 'Offer'
    ).length;
    const applied = jobs.filter(j => j.stage !== 'Bookmarked').length;
    const responseRate = applied > 0 ? Math.round((responded / applied) * 100) : 0;
    // Avg days to response — first non-applied stage in history
    const responseDays: number[] = [];
    jobs.forEach(j => {
      const hist = Array.isArray(j.status_history) ? j.status_history : [];
      const appliedEntry = hist.find((h: any) => h.stage === 'Applied');
      const respEntry = hist.find((h: any) =>
        !['Bookmarked', 'Applied', 'Follow-up Sent'].includes(h.stage)
      );
      if (appliedEntry && respEntry) {
        const d = (new Date(respEntry.at).getTime() - new Date(appliedEntry.at).getTime()) / 86400000;
        if (d >= 0) responseDays.push(d);
      }
    });
    const avgResponse = responseDays.length
      ? Math.round(responseDays.reduce((a, b) => a + b, 0) / responseDays.length)
      : 0;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const interviewsThisWeek = jobs.filter(j => {
      const hist = Array.isArray(j.status_history) ? j.status_history : [];
      return hist.some((h: any) =>
        ['Technical Round', 'HR Round', 'Final Round', 'Screening'].includes(h.stage) &&
        new Date(h.at) >= weekAgo
      );
    }).length;
    return { total, active, responseRate, avgResponse, interviewsThisWeek };
  }, [jobs]);

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const draggingJob = draggingId ? jobs.find(j => j.id === draggingId) : null;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground">Job Tracker</h1>
        <div className="flex gap-2">
          <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setView('table')}>Table</Button>
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>Kanban</Button>
        </div>
      </div>

      {/* Smart Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Applied" value={stats.total} />
        <StatCard label="Active Pipeline" value={stats.active} accent="text-primary" />
        <StatCard label="Response Rate" value={`${stats.responseRate}%`} accent="text-info" />
        <StatCard label="Avg Days to Reply" value={stats.avgResponse || '—'} accent="text-warning" />
        <StatCard label="Interviews / week" value={stats.interviewsThisWeek} accent="text-success" />
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg">No applications yet. Paste a job URL below to get started 🚀</p>
        </div>
      )}

      {/* View */}
      {view === 'table' ? (
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(j => {
                  const urgency = urgencyOf(j);
                  const days = daysBetween(j.applied_date || j.created_at);
                  const isOpen = expanded.has(j.id);
                  return (
                    <FragmentRow key={j.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggleExpanded(j.id)}>
                        <TableCell className="py-2">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {j.url ? (
                            <ExternalAnchor href={j.url} className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors">
                              {j.company}
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </ExternalAnchor>
                          ) : (
                            <span>{j.company}</span>
                          )}
                          {j.url && <div className="text-[10px] text-muted-foreground mt-0.5">{domainOf(j.url)}</div>}
                        </TableCell>
                        <TableCell className="text-sm">{j.role}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Select value={(j.stage || j.status || 'Applied') as Stage} onValueChange={v => {
                            if (v === 'Rejected') setPendingReject({ id: j.id, reason: 'Ghosted' });
                            else updateStage(j.id, v as Stage);
                          }}>
                            <SelectTrigger className={`w-36 h-7 text-xs border ${STAGE_TONE[(j.stage || 'Applied') as Stage]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {urgency && <span className={`h-2 w-2 rounded-full ${URGENCY_DOT[urgency]}`} />}
                            <span className="text-xs text-muted-foreground font-mono">{days}d</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{j.follow_up_date || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{j.location || '—'}</TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={6} className="py-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div className="space-y-2">
                                {j.job_type && <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-3 w-3" />{j.job_type}</div>}
                                {j.salary && <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-3 w-3" />{j.salary}</div>}
                                {j.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3 w-3" />{j.location}</div>}
                                <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-3 w-3" />Applied {j.applied_date}</div>
                                {j.rejection_reason && <div className="text-destructive">Reason: {j.rejection_reason}</div>}
                              </div>
                              <div className="md:col-span-2">
                                <div className="text-foreground font-medium mb-1">Notes</div>
                                <p className="text-muted-foreground whitespace-pre-wrap">{j.notes || 'No notes yet.'}</p>
                                {Array.isArray(j.status_history) && j.status_history.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-foreground font-medium mb-1">Timeline</div>
                                    <ol className="space-y-1">
                                      {j.status_history.map((h: any, i: number) => (
                                        <li key={i} className="flex items-center gap-2">
                                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                          <span className="text-foreground">{h.stage}</span>
                                          <span className="text-muted-foreground">· {new Date(h.at).toLocaleDateString()}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </FragmentRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 min-w-max">
              {STAGES.map(col => (
                <KanbanColumn key={col} stage={col} jobs={jobs.filter(j => (j.stage || 'Applied') === col)} />
              ))}
            </div>
          </div>
          <DragOverlay>
            {draggingJob && <JobCard job={draggingJob} dragging />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add form */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Add Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Paste job posting URL here…"
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              className="bg-secondary border-border"
            />
            <Button onClick={() => extractFromUrl(url)} disabled={!url.trim() || extracting} variant="secondary">
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-2">Auto-fill</span>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Role" value={role} onChange={e => setRole(e.target.value)} className="bg-secondary border-border" />
            <Select value={stage} onValueChange={v => setStage(v as Stage)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Location (Remote / city)" value={location} onChange={e => setLocation(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Job type" value={jobType} onChange={e => setJobType(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Salary" value={salary} onChange={e => setSalary(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="md:col-span-2 bg-secondary border-border" />
            <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="flex justify-end">
            <Button onClick={addJob}>Add Application</Button>
          </div>
        </CardContent>
      </Card>

      {/* Reject reason dialog */}
      <Dialog open={!!pendingReject} onOpenChange={o => !o && setPendingReject(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Why is this rejected?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={pendingReject?.reason || 'Ghosted'} onValueChange={v => setPendingReject(p => p ? { ...p, reason: v } : null)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{REJECTION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingReject(null)}>Cancel</Button>
            <Button onClick={confirmReject}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, accent = 'text-foreground' }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-mono font-bold ${accent}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ stage, jobs }: { stage: Stage; jobs: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`rounded-lg border ${isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/40'} transition-colors`}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-heading font-semibold text-foreground">{stage}</span>
        <Badge variant="outline" className="text-[10px] h-5">{jobs.length}</Badge>
      </div>
      <div className="p-2 space-y-2 min-h-32">
        {jobs.map(j => <JobCard key={j.id} job={j} />)}
      </div>
    </div>
  );
}

function JobCard({ job, dragging = false }: { job: any; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const urgency = urgencyOf(job);
  const days = daysBetween(job.applied_date || job.created_at);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`bg-secondary rounded-lg p-3 text-sm cursor-grab active:cursor-grabbing border border-border/50 hover:border-primary/40 transition-colors ${(isDragging || dragging) ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{job.company}</p>
          <p className="text-xs text-muted-foreground truncate">{job.role}</p>
        </div>
        {urgency && <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${URGENCY_DOT[urgency]}`} title={`${days}d since applied`} />}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
        <span className="font-mono">{days}d</span>
        {job.location && <><span>·</span><span className="truncate">{job.location}</span></>}
        {job.url && (
          <ExternalAnchor href={job.url} className="ml-auto text-primary hover:text-primary/80" onClick={e => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />
          </ExternalAnchor>
        )}
      </div>
    </div>
  );
}
