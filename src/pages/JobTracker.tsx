import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'] as const;
const STATUS_COLORS: Record<string, string> = {
  Applied: 'bg-info/10 text-info', Interview: 'bg-warning/10 text-warning',
  Offer: 'bg-success/10 text-success', Rejected: 'bg-destructive/10 text-destructive',
};

export default function JobTrackerPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kanban, setKanban] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<string>('Applied');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('job_applications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setJobs(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const addJob = async () => {
    if (!company.trim() || !role.trim() || !user) return;
    await supabase.from('job_applications').insert({
      user_id: user.id, company, role, status, notes: notes || null, follow_up_date: followUp || null,
    });
    toast.success('Application added!');
    setCompany(''); setRole(''); setNotes(''); setFollowUp('');
    fetchJobs();
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from('job_applications').update({ status: newStatus }).eq('id', id);
    fetchJobs();
  };

  const counts = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 };
  jobs.forEach(j => { if (j.status && j.status in counts) counts[j.status as keyof typeof counts]++; });

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground">Job Tracker</h1>
        <Button variant="outline" size="sm" onClick={() => setKanban(!kanban)}>{kanban ? 'Table View' : 'Kanban View'}</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUSES.map(s => (
          <Card key={s} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s}</p>
              <p className={`text-2xl font-mono font-bold ${STATUS_COLORS[s]?.split(' ')[1] || 'text-foreground'}`}>{counts[s]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg">No applications yet. Start applying! Every 'no' is closer to your 'yes'. 🚀</p>
        </div>
      )}

      {/* Kanban or Table */}
      {kanban ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['Applied', 'Interview', 'Offer'] as const).map(col => (
            <Card key={col} className="border-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-heading">{col}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {jobs.filter(j => j.status === col).map(j => (
                  <div key={j.id} className="bg-secondary rounded-lg p-3 text-sm">
                    <p className="font-medium text-foreground">{j.company}</p>
                    <p className="text-xs text-muted-foreground">{j.role}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead><TableHead>Follow-up</TableHead><TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(j => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium text-sm">{j.company}</TableCell>
                    <TableCell className="text-sm">{j.role}</TableCell>
                    <TableCell>
                      <Select value={j.status || 'Applied'} onValueChange={v => updateStatus(j.id, v)}>
                        <SelectTrigger className="w-28 h-7 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{j.applied_date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{j.follow_up_date || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{j.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add form */}
      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Add Application</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Role" value={role} onChange={e => setRole(e.target.value)} className="bg-secondary border-border" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary border-border" />
            <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className="bg-secondary border-border" />
            <Button onClick={addJob}>Add Application</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
