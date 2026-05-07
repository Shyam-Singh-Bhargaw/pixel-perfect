import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORMS = ['LinkedIn', 'Twitter/X', 'Instagram', 'Offline/In-person', 'Email', 'Other'];

const PLATFORM_TONE: Record<string, string> = {
  LinkedIn: 'bg-info/15 text-info border-info/30',
  Email: 'bg-muted text-muted-foreground border-border',
  'Twitter/X': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Instagram: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'Offline/In-person': 'bg-success/15 text-success border-success/30',
  Other: 'bg-primary/15 text-primary border-primary/30',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
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
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('network_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); }
    setContacts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Keep selectedContact synced with refreshed list
  useEffect(() => {
    if (selectedContact) {
      const fresh = contacts.find(c => c.id === selectedContact.id);
      if (fresh) setSelectedContact(fresh);
    }
  }, [contacts]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openContact = (c: any) => {
    setSelectedContact(c);
    setEditMode(false);
    setEditDraft(null);
  };

  const startEdit = () => {
    if (!selectedContact) return;
    setEditDraft({ ...selectedContact });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    const patch = {
      name: editDraft.name?.trim() || selectedContact.name,
      platform: editDraft.platform,
      note: editDraft.note?.trim() || null,
      next_action: editDraft.next_action?.trim() || null,
    };
    const { error } = await supabase.from('network_log').update(patch).eq('id', editDraft.id);
    if (error) { toast.error('Save failed'); return; }
    toast.success('Saved');
    setEditMode(false);
    setEditDraft(null);
    fetchContacts();
  };

  const deleteContact = async () => {
    if (!selectedContact) return;
    const { error } = await supabase.from('network_log').delete().eq('id', selectedContact.id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Deleted');
    setConfirmDelete(false);
    setSelectedContact(null);
    fetchContacts();
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const c = selectedContact;
  const draft = editDraft;
  const initial = (c?.name || '?').trim().charAt(0).toUpperCase();
  const tone = c ? (PLATFORM_TONE[c.platform] || PLATFORM_TONE.Other) : '';

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
              {contacts.map(row => (
                <TableRow
                  key={row.id}
                  onClick={() => openContact(row)}
                  className={`cursor-pointer hover:bg-muted/40 ${row.contacted ? 'opacity-60' : ''}`}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={row.contacted || false} onCheckedChange={() => toggleContacted(row)} />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{row.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.platform}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{row.note || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.next_action || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(row.date)}</TableCell>
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
      <Sheet open={!!selectedContact} onOpenChange={o => { if (!o) { setSelectedContact(null); setEditMode(false); setEditDraft(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {c && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-white text-lg font-semibold"
                      style={{ background: '#7c6ff7' }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-xl font-semibold truncate">{c.name}</SheetTitle>
                      <Badge variant="outline" className={`mt-1 ${tone}`}>{c.platform || 'Other'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!editMode ? (
                      <Button size="sm" variant="outline" onClick={startEdit}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setEditDraft(null); }}>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancel edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {editMode && draft && (
                  <>
                    <Field label="Name">
                      <Input value={draft.name || ''} onChange={e => setEditDraft({ ...draft, name: e.target.value })} className="bg-secondary border-border" />
                    </Field>
                    <Field label="Platform">
                      <Select value={draft.platform || 'Other'} onValueChange={v => setEditDraft({ ...draft, platform: v })}>
                        <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  </>
                )}

                <Field label="Note / Context">
                  {editMode && draft ? (
                    <Textarea value={draft.note || ''} onChange={e => setEditDraft({ ...draft, note: e.target.value })} className="bg-secondary border-border min-h-[80px]" />
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.note || <span className="text-muted-foreground">—</span>}</p>
                  )}
                </Field>

                <Field label="Next Action">
                  {editMode && draft ? (
                    <Textarea value={draft.next_action || ''} onChange={e => setEditDraft({ ...draft, next_action: e.target.value })} className="bg-secondary border-border min-h-[60px]" />
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{c.next_action || <span className="text-muted-foreground">—</span>}</p>
                  )}
                </Field>

                <Field label="Date added">
                  <p className="text-sm text-foreground">{c.date ? formatDate(c.date) : <span className="text-muted-foreground">—</span>}</p>
                </Field>

                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="contacted-detail"
                    checked={!!c.contacted}
                    onCheckedChange={() => toggleContacted(c)}
                  />
                  <label htmlFor="contacted-detail" className="text-sm text-foreground cursor-pointer">
                    Contacted / Done
                  </label>
                </div>

                <div className="pt-6 border-t border-border">
                  <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete contact
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
