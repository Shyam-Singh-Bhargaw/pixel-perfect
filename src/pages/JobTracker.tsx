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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ExternalAnchor } from '@/components/ExternalAnchor';
import { toast } from 'sonner';
import {
  Loader2, ChevronDown, ChevronRight, ExternalLink, MapPin, Briefcase, DollarSign,
  Clock, Sparkles, Phone, BookOpen, Copy, Trash2, Save,
} from 'lucide-react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useDraggable, useDroppable, useSensor, useSensors,
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

function asArray(v: any): string[] {
  if (Array.isArray(v)) return v.filter(x => typeof x === 'string' && x.trim().length > 0);
  return [];
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
  const [adding, setAdding] = useState(false);
  // Captured by extraction, persisted on add
  const [extractedExtras, setExtractedExtras] = useState<{
    raw_description?: string; experience?: string;
    skills?: string[]; nice_to_have?: string[];
    responsibilities?: string[]; interview_focus?: string[];
  }>({});

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingReject, setPendingReject] = useState<{ id: string; reason: string } | null>(null);

  // Detail view
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  // Prep modal
  const [prepJob, setPrepJob] = useState<any | null>(null);
  // Got-a-call modal
  const [callJob, setCallJob] = useState<any | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'company' | 'stage'>('recent');

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

  const detailJob = useMemo(
    () => (detailJobId ? jobs.find(j => j.id === detailJobId) || null : null),
    [detailJobId, jobs],
  );

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
        setExtractedExtras({
          raw_description: data.raw_description || '',
          experience: data.experience || '',
          skills: asArray(data.skills),
          nice_to_have: asArray(data.nice_to_have),
          responsibilities: asArray(data.responsibilities),
          interview_focus: asArray(data.interview_focus),
        });
        if (data.raw_description) {
          toast.success('Job posting captured ✨');
        } else if (data.role || data.company) {
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

  const onUrlChange = (val: string) => setUrl(val);

  const addJob = async () => {
    if (!user) return;
    if (adding) return; // prevent double-submit
    if (!company.trim() && !url.trim()) {
      toast.error('Add a URL or company name');
      return;
    }
    setAdding(true);
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
      raw_description: extractedExtras.raw_description || null,
      experience: extractedExtras.experience || null,
      skills: extractedExtras.skills || [],
      nice_to_have: extractedExtras.nice_to_have || [],
      responsibilities: extractedExtras.responsibilities || [],
      interview_focus: extractedExtras.interview_focus || [],
    });
    if (error) {
      toast.error('Could not save: ' + error.message);
      setAdding(false);
      return;
    }
    toast.success('Application added!');
    setUrl(''); setCompany(''); setRole(''); setLocation(''); setJobType('');
    setSalary(''); setNotes(''); setFollowUp(''); setStage('Applied');
    setExtractedExtras({});
    await fetchJobs();
    setAdding(false);
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

  const updateJob = async (id: string, patch: Record<string, any>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
    const { error } = await (supabase.from('job_applications') as any).update(patch).eq('id', id);
    if (error) {
      toast.error('Update failed');
      fetchJobs();
    }
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Delete this application? This cannot be undone.')) return;
    const { error } = await supabase.from('job_applications').delete().eq('id', id);
    if (error) {
      toast.error('Delete failed');
      return;
    }
    setJobs(prev => prev.filter(j => j.id !== id));
    setDetailJobId(null);
    toast.success('Application deleted');
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

  // Filtered/sorted jobs for display
  const visibleJobs = useMemo(() => {
    let v = jobs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      v = v.filter(j =>
        (j.company || '').toLowerCase().includes(q) ||
        (j.role || '').toLowerCase().includes(q),
      );
    }
    if (filterStage !== 'all') v = v.filter(j => (j.stage || j.status) === filterStage);
    v = [...v];
    if (sortBy === 'company') v.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
    else if (sortBy === 'stage') v.sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage));
    else v.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return v;
  }, [jobs, searchQuery, filterStage, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(j => j.stage !== 'Rejected' && j.stage !== 'Offer').length;
    const responded = jobs.filter(j =>
      !['Bookmarked', 'Applied', 'Follow-up Sent', 'Rejected'].includes(j.stage) || j.stage === 'Offer'
    ).length;
    const applied = jobs.filter(j => j.stage !== 'Bookmarked').length;
    const responseRate = applied > 0 ? Math.round((responded / applied) * 100) : 0;
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

      {/* Add form (moved to top) */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Add Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Paste job posting URL — we'll extract the full JD…"
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              className="bg-secondary border-border"
            />
            <Button onClick={() => extractFromUrl(url)} disabled={!url.trim() || extracting} variant="secondary">
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-2">Track This Job</span>
            </Button>
          </div>
          {extractedExtras.raw_description && (
            <div className="text-xs text-success flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              Captured full JD ({extractedExtras.skills?.length || 0} skills,{' '}
              {extractedExtras.responsibilities?.length || 0} responsibilities,{' '}
              {extractedExtras.interview_focus?.length || 0} focus areas)
            </div>
          )}
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
            <Button onClick={addJob} disabled={adding}>
              {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {adding ? 'Adding…' : 'Add Application'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Applied" value={stats.total} />
        <StatCard label="Active Pipeline" value={stats.active} accent="text-primary" />
        <StatCard label="Response Rate" value={`${stats.responseRate}%`} accent="text-info" />
        <StatCard label="Avg Days to Reply" value={stats.avgResponse || '—'} accent="text-warning" />
        <StatCard label="Interviews / week" value={stats.interviewsThisWeek} accent="text-success" />
      </div>

      {/* Search & filter */}
      {jobs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search company or role…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-secondary border-border max-w-xs"
          />
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-44 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="company">Company A→Z</SelectItem>
              <SelectItem value="stage">Stage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleJobs.map(j => {
                  const urgency = urgencyOf(j);
                  const days = daysBetween(j.applied_date || j.created_at);
                  const isOpen = expanded.has(j.id);
                  return (
                    <FragmentRow key={j.id}>
                      <TableRow className="cursor-pointer" onClick={() => setDetailJobId(j.id)}>
                        <TableCell className="py-2" onClick={e => { e.stopPropagation(); toggleExpanded(j.id); }}>
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <span className="text-foreground hover:text-primary transition-colors">{j.company}</span>
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
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPrepJob(j)} title="Prep for interview">
                              <BookOpen className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setCallJob(j)} title="I got a call!">
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteJob(j.id)}
                              title="Delete application"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={7} className="py-3">
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
                                {asArray(j.skills).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {asArray(j.skills).slice(0, 6).map((s, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                                    ))}
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
                <KanbanColumn
                  key={col}
                  stage={col}
                  jobs={visibleJobs.filter(j => (j.stage || 'Applied') === col)}
                  onOpenDetail={setDetailJobId}
                  onPrep={setPrepJob}
                  onGotCall={setCallJob}
                  onDelete={deleteJob}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {draggingJob && <JobCard job={draggingJob} dragging />}
          </DragOverlay>
        </DndContext>
      )}

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

      {/* Job detail panel */}
      <JobDetailPanel
        job={detailJob}
        open={!!detailJob}
        onClose={() => setDetailJobId(null)}
        onUpdate={updateJob}
        onUpdateStage={updateStage}
        onDelete={deleteJob}
        onPrep={setPrepJob}
        onGotCall={setCallJob}
      />

      {/* Prep modal */}
      <PrepModal job={prepJob} onClose={() => setPrepJob(null)} />

      {/* Got-a-call modal */}
      <GotCallModal
        job={callJob}
        onClose={() => setCallJob(null)}
        onOpenDetail={(id) => { setCallJob(null); setDetailJobId(id); }}
      />
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

function KanbanColumn({
  stage, jobs, onOpenDetail, onPrep, onGotCall, onDelete,
}: {
  stage: Stage;
  jobs: any[];
  onOpenDetail: (id: string) => void;
  onPrep: (j: any) => void;
  onGotCall: (j: any) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`rounded-lg border ${isOver ? 'border-primary bg-primary/5' : 'border-border bg-card/40'} transition-colors`}>
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-heading font-semibold text-foreground">{stage}</span>
        <Badge variant="outline" className="text-[10px] h-5">{jobs.length}</Badge>
      </div>
      <div className="p-2 space-y-2 min-h-32">
        {jobs.map(j => (
          <JobCard
            key={j.id}
            job={j}
            onOpenDetail={() => onOpenDetail(j.id)}
            onPrep={() => onPrep(j)}
            onGotCall={() => onGotCall(j)}
            onDelete={() => onDelete(j.id)}
          />
        ))}
      </div>
    </div>
  );
}

function JobCard({
  job, dragging = false, onOpenDetail, onPrep, onGotCall, onDelete,
}: {
  job: any;
  dragging?: boolean;
  onOpenDetail?: () => void;
  onPrep?: () => void;
  onGotCall?: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id });
  const urgency = urgencyOf(job);
  const days = daysBetween(job.applied_date || job.created_at);
  const skills = asArray(job.skills).slice(0, 3);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`bg-secondary rounded-lg p-3 text-sm cursor-grab active:cursor-grabbing border border-border/50 hover:border-primary/40 transition-colors ${(isDragging || dragging) ? 'opacity-60' : ''}`}
      onClick={(e) => {
        // Open detail only on simple clicks (not drag)
        if (!isDragging && onOpenDetail) onOpenDetail();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{job.company}</p>
          <p className="text-xs text-muted-foreground truncate">{job.role}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {urgency && <span className={`h-2 w-2 rounded-full mt-1.5 ${URGENCY_DOT[urgency]}`} title={`${days}d since applied`} />}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete application"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {skills.map((s, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{s}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
        <span className="font-mono">{days}d</span>
        {job.location && <><span>·</span><span className="truncate">{job.location}</span></>}
        {job.url && (
          <ExternalAnchor href={job.url} className="ml-auto text-primary hover:text-primary/80" onClick={e => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />
          </ExternalAnchor>
        )}
      </div>
      {(onPrep || onGotCall) && (
        <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
          {onPrep && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] flex-1" onClick={onPrep}>
              <BookOpen className="h-3 w-3 mr-1" />Prep
            </Button>
          )}
          {onGotCall && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] flex-1" onClick={onGotCall}>
              <Phone className="h-3 w-3 mr-1" />Got call
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============= Job Detail Panel ============= */

function JobDetailPanel({
  job, open, onClose, onUpdate, onUpdateStage, onDelete, onPrep, onGotCall,
}: {
  job: any | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Record<string, any>) => void;
  onUpdateStage: (id: string, s: Stage) => void;
  onDelete: (id: string) => void;
  onPrep: (j: any) => void;
  onGotCall: (j: any) => void;
}) {
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotesDraft(job?.notes || '');
  }, [job?.id]);

  if (!job) return null;

  const skills = asArray(job.skills);
  const niceToHave = asArray(job.nice_to_have);
  const responsibilities = asArray(job.responsibilities);
  const interviewFocus = asArray(job.interview_focus);
  const history = Array.isArray(job.status_history) ? job.status_history : [];

  const saveNotes = async () => {
    setSavingNotes(true);
    await onUpdate(job.id, { notes: notesDraft });
    setSavingNotes(false);
    toast.success('Notes saved');
  };

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl font-heading">
                  {job.company}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{job.role}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Select value={(job.stage || 'Applied') as Stage} onValueChange={v => onUpdateStage(job.id, v as Stage)}>
                    <SelectTrigger className={`w-40 h-7 text-xs border ${STAGE_TONE[(job.stage || 'Applied') as Stage]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  {job.url && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        Open Original Job Posting <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => onPrep(job)}>
              <BookOpen className="h-4 w-4 mr-1" /> Prep for Interview
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onGotCall(job)}>
              <Phone className="h-4 w-4 mr-1" /> I Got a Call!
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => onDelete(job.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Quick facts */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {job.location && <Fact icon={<MapPin className="h-3 w-3" />} label="Location" value={job.location} />}
            {job.job_type && <Fact icon={<Briefcase className="h-3 w-3" />} label="Type" value={job.job_type} />}
            {job.salary && <Fact icon={<DollarSign className="h-3 w-3" />} label="Salary" value={job.salary} />}
            {job.experience && <Fact icon={<Sparkles className="h-3 w-3" />} label="Experience" value={job.experience} />}
            {job.applied_date && <Fact icon={<Clock className="h-3 w-3" />} label="Applied" value={job.applied_date} />}
            {job.follow_up_date && <Fact icon={<Clock className="h-3 w-3" />} label="Follow-up" value={job.follow_up_date} />}
          </div>

          {/* Interview focus */}
          {interviewFocus.length > 0 && (
            <Section title="Interview Focus Areas">
              <div className="flex flex-wrap gap-1.5">
                {interviewFocus.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary border border-primary/30">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <Section title="Required Skills">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Responsibilities */}
          {responsibilities.length > 0 && (
            <Section title="Key Responsibilities">
              <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1">
                {responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Section>
          )}

          {/* Nice to have */}
          {niceToHave.length > 0 && (
            <Section title="Nice to Have">
              <div className="flex flex-wrap gap-1.5">
                {niceToHave.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-muted-foreground">{s}</Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Your notes */}
          <Section title="Your Notes">
            <Textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder="Add your private notes about this application…"
              className="min-h-24 bg-secondary border-border"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={saveNotes} disabled={savingNotes || notesDraft === (job.notes || '')}>
                {savingNotes ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save Notes
              </Button>
            </div>
          </Section>

          {/* Timeline */}
          {history.length > 0 && (
            <Section title="Timeline">
              <ol className="space-y-1.5">
                {history.map((h: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-foreground font-medium">{h.stage}</span>
                    <span className="text-muted-foreground">· {new Date(h.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Raw JD */}
          {job.raw_description ? (
            <Section title="Full Job Description">
              <div className="rounded-md border border-border bg-secondary/30 p-4 max-h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">{job.raw_description}</pre>
              </div>
            </Section>
          ) : (
            <Section title="Full Job Description">
              <p className="text-sm text-muted-foreground italic">
                No JD captured for this application. Add a URL when creating an application to extract the full posting.
              </p>
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-secondary/40 border border-border">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}




/* ============= Prep Modal ============= */

function PrepModal({ job, onClose }: { job: any | null; onClose: () => void }) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuestions([]);
  }, [job?.id]);

  if (!job) return null;

  const skills = asArray(job.skills);
  const focus = asArray(job.interview_focus);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('interview-prep', {
        body: {
          mode: 'questions',
          company: job.company,
          role: job.role,
          raw_description: job.raw_description,
          skills,
          interview_focus: focus,
        },
      });
      if (error) throw error;
      if (data?.questions) setQuestions(data.questions);
      else if (data?.error) toast.error(data.error);
    } catch (e: any) {
      console.error(e);
      toast.error('Could not generate questions');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={!!job} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Prep for {job.role} @ {job.company}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {skills.length > 0 && (
            <Section title="Key Skills to Brush Up On">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => <Badge key={i} variant="outline">{s}</Badge>)}
              </div>
            </Section>
          )}

          {focus.length > 0 && (
            <Section title="Likely Interview Topics">
              <div className="flex flex-wrap gap-1.5">
                {focus.map((s, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary border border-primary/30">{s}</span>
                ))}
              </div>
            </Section>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-heading font-semibold uppercase tracking-wide text-muted-foreground">
                Tailored Interview Questions
              </h3>
              {questions.length > 0 && (
                <Button size="sm" variant="ghost" onClick={copyAll}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy all
                </Button>
              )}
            </div>
            {questions.length === 0 ? (
              <Button onClick={generate} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Interview Questions
              </Button>
            ) : (
              <ol className="space-y-2 list-decimal list-inside text-sm text-foreground/90">
                {questions.map((q, i) => <li key={i} className="leading-relaxed">{q}</li>)}
              </ol>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============= Got-a-Call Modal ============= */

function GotCallModal({
  job, onClose, onOpenDetail,
}: {
  job: any | null;
  onClose: () => void;
  onOpenDetail: (id: string) => void;
}) {
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job) { setTips([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('interview-prep', {
          body: {
            mode: 'tips',
            company: job.company,
            role: job.role,
            raw_description: job.raw_description,
            skills: asArray(job.skills),
            interview_focus: asArray(job.interview_focus),
          },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.tips) setTips(data.tips);
        else if (data?.error) toast.error(data.error);
      } catch (e) {
        if (!cancelled) toast.error('Could not generate tips');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [job?.id]);

  if (!job) return null;
  const skills = asArray(job.skills).slice(0, 3);

  return (
    <Dialog open={!!job} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-success" />
            You Got a Call! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-success/10 border border-success/30">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{job.role}</span> @ <span className="font-semibold">{job.company}</span>
            </p>
          </div>

          {skills.length > 0 && (
            <Section title="Top 3 Skills They'll Likely Test">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <span key={i} className="text-sm px-2.5 py-1 rounded-md bg-primary/15 text-primary border border-primary/30 font-medium">{s}</span>
                ))}
              </div>
            </Section>
          )}

          <Section title="5 Quick Prep Tips">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating tailored tips…
              </div>
            ) : tips.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1.5 text-foreground/90">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">No tips available — try again.</p>
            )}
          </Section>

          {job.notes && (
            <Section title="Your Saved Notes">
              <p className="text-sm whitespace-pre-wrap text-foreground/90">{job.notes}</p>
            </Section>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenDetail(job.id)}>
              Open Job Details →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
