import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Pencil, Save, Trash2, X } from 'lucide-react';

const PLATFORMS = ['LinkedIn', 'Twitter/X', 'Instagram', 'Offline/In-person', 'Email', 'Other'];

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

export default function NetworkLogPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [note, setNote] = useState('');
  const [nextAction, setNextAction] = useState('');

  // Detail sheet
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detail = detailId ? contacts.find(c => c.id === detailId) || null : null;

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('network_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setContacts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // sync draft when opening
  useEffect(() => {
    if (detail) setDraft({ ...detail });
    if (!detailId) { setEditing(false); setDraft(null); }
  }, [detailId, detail?.id]);

  const addContact = async () => {
    if (!name.trim() || !user) return;
    const { error } = await supabase.from('network_log').insert({
      user_id: user.id,
      name: name.trim(),
      platform,
      note: note.trim() || null,
      next_action: nextAction.trim() || null,
    });
    if (error) { toast.error('Failed to add contact'); console.error(error); return; }
    toast.success('Contact added!');
    setName(''); setNote(''); setNextAction('');
    fetchContacts();
  };

  const toggleContacted = async (contact: any) => {
    const { error } = await supabase
      .from('network_log')
      .update({ contacted: !contact.contacted })
      .eq('id', contact.id);
    if (error) { toast.error('Failed to update'); return; }
    fetchContacts();
  };

  const saveEdits = async () => {
    if (!draft) return;
    const { error } = await supabase
      .from('network_log')
      .update({
        name: draft.name?.trim() || detail.name,
        platform: draft.platform,
        note: draft.note?.trim() || null,
        next_action: draft.next_action?.trim() || null,
      })
      .eq('id', draft.id);
    if (error) { toast.error('Save failed'); return; }
    toast.success('Contact updated');
    setEditing(false);
    await fetchContacts();
  };

  const deleteContact = async () => {
    if (!detail) return;
    const { error } = await supabase.from('network_log').delete().eq('id', detail.id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Contact deleted');
    setConfirmDelete(false);
    setDetailId(null);
    fetchContacts();
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

      {/* Add Contact Form */}
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
            <Input placeholder="Next Action (e.g. 'Send follow-up in 3 days')" value={nextAction} onChange={e => setNextAction(e.target.value)} className="bg-secondary border-border" />
          </div>
          <Button onClick={addContact} className="mt-3">Add Contact</Button>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Contacts ({contacts.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">✓</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Next Action</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map(c => (
                <TableRow
                  key={c.id}
                  className={`cursor-pointer hover:bg-secondary/50 transition-colors ${c.contacted ? 'opacity-60' : ''}`}
                  onClick={() => setDetailId(c.id)}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={c.contacted || false} onCheckedChange={() => toggleContacted(c)} />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.platform}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{c.note || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.next_action || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.date || '—'}</TableCell>
                </TableRow>
              ))}
              {contacts.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No contacts yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!detailId} onOpenChange={o => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {detail && draft && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-heading font-bold text-white shrink-0"
                    style={{ backgroundColor: '#7c6ff7' }}
                  >
                    {(detail.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <Input
                        value={draft.name || ''}
                        onChange={e => setDraft({ ...draft, name: e.target.value })}
                        className="bg-secondary border-border"
                      />
                    ) : (
                      <SheetTitle className="text-xl font-heading text-foreground truncate text-left">
                        {detail.name}
                      </SheetTitle>
                    )}
                    <div className="mt-1">
                      {editing ? (
                        <Select value={draft.platform || 'LinkedIn'} onValueChange={v => setDraft({ ...draft, platform: v })}>
                          <SelectTrigger className="bg-secondary border-border h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">{detail.platform || 'Other'}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Contacted toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm text-foreground">Contacted / Done</span>
                  <Checkbox
                    checked={detail.contacted || false}
                    onCheckedChange={() => toggleContacted(detail)}
                  />
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Note / Context</p>
                  {editing ? (
                    <Textarea
                      value={draft.note || ''}
                      onChange={e => setDraft({ ...draft, note: e.target.value })}
                      placeholder="Note / context"
                      className="bg-secondary border-border"
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{detail.note || '—'}</p>
                  )}
                </div>

                {/* Next Action */}
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Next Action</p>
                  {editing ? (
                    <Input
                      value={draft.next_action || ''}
                      onChange={e => setDraft({ ...draft, next_action: e.target.value })}
                      placeholder="Next action"
                      className="bg-secondary border-border"
                    />
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{detail.next_action || '—'}</p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Date Added</p>
                  <p className="text-sm text-foreground">{formatDate(detail.date || detail.created_at)}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  {editing ? (
                    <>
                      <Button onClick={saveEdits} className="flex-1">
                        <Save className="h-4 w-4 mr-1.5" /> Save
                      </Button>
                      <Button variant="outline" onClick={() => { setEditing(false); setDraft({ ...detail }); }}>
                        <X className="h-4 w-4 mr-1.5" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setEditing(true)} className="flex-1">
                        <Pencil className="h-4 w-4 mr-1.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmDelete(true)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{detail?.name}" from your network log. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteContact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
