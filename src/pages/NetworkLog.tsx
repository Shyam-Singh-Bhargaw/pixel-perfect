import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const PLATFORMS = ['LinkedIn', 'Twitter', 'Event', 'Cold Email', 'Other'];

export default function NetworkLogPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('network_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addContact = async () => {
    if (!name.trim() || !user) return;
    await supabase.from('network_log').insert({ user_id: user.id, name, platform, note: note || null, next_action: nextAction || null });
    toast.success('Contact added!');
    setName(''); setNote(''); setNextAction('');
    fetch();
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-heading font-bold text-foreground">Network Log</h1>

      <Card className="border-border bg-info/5">
        <CardContent className="p-4 text-sm text-info">
          💡 Network = Net Worth. Message 3 people daily. Comment on 5 posts. Post 1 insight weekly.
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Platform</TableHead><TableHead>Note</TableHead>
                <TableHead>Next Action</TableHead><TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.platform}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{c.note || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.next_action || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.date}</TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No contacts yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Add Contact</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border" />
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Note/Context" value={note} onChange={e => setNote(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Next Action" value={nextAction} onChange={e => setNextAction(e.target.value)} className="bg-secondary border-border" />
          </div>
          <Button onClick={addContact} className="mt-3">Add Contact</Button>
        </CardContent>
      </Card>
    </div>
  );
}
