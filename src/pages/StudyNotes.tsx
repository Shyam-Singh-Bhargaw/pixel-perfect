import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';

const CATEGORIES = ['ML', 'DL', 'Python', 'SQL', 'DSA', 'Statistics', 'Interview Prep', 'Excel', 'Other'];

export default function StudyNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [category, setCategory] = useState('ML');

  const today = new Date().toISOString().split('T')[0];

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('study_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleUrlChange = async (url: string) => {
    setSourceUrl(url);
    if (!url.startsWith('http')) return;
    try {
      const parsed = new URL(url);
      // Auto-fill source title from hostname + path
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const slug = pathParts[pathParts.length - 1] || parsed.hostname;
      const autoTitle = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      setSourceTitle(autoTitle);
    } catch {
      // ignore invalid URLs
    }
  };

  const saveNote = async () => {
    if (!title.trim() || !user) return;
    const { error } = await supabase.from('study_notes').insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim() || null,
      source_url: sourceUrl.trim() || null,
      source_title: sourceTitle.trim() || null,
      category,
    });
    if (error) { toast.error('Failed to save note'); return; }

    // Add to revision queue
    await supabase.from('revision_items').insert({
      user_id: user.id,
      text: title.trim(),
      topic: category,
      next_rev: new Date(Date.now() + SPACED_REP_INTERVALS[0] * 86400000).toISOString().split('T')[0],
      source_url: sourceUrl.trim() || null,
      source_note: content.trim() || null,
      source_type: 'note',
      original_date: today,
    });

    toast.success('Note saved & added to revision queue!');
    setTitle(''); setContent(''); setSourceUrl(''); setSourceTitle('');
    fetchNotes();
  };

  const todayNotes = notes.filter(n => n.date === today);
  const pastNotes = notes.filter(n => n.date !== today);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const renderNoteCard = (note: any) => (
    <div key={note.id} className="flex flex-col gap-1 px-4 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{note.title}</span>
        <Badge variant="outline" className="text-xs">{note.category}</Badge>
        <span className="text-xs text-muted-foreground ml-auto">{note.date}</span>
      </div>
      {note.content && (
        <p className="text-sm text-muted-foreground">{note.content}</p>
      )}
      {note.source_url && (
        <a
          href={note.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline w-fit"
        >
          <ExternalLink className="h-3 w-3" />
          {note.source_title || 'Open source'}
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Study Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">Your personal knowledge logbook — what you learned, with sources and spaced repetition.</p>
      </div>

      {/* Add Note Form */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">📝 What did I learn today?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Concept / Topic title (e.g. 'Batch Normalization explained')"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-secondary border-border"
          />
          <Textarea
            placeholder="Your summary / notes..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="bg-secondary border-border min-h-[80px]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Source URL (article, blog, video link)"
              value={sourceUrl}
              onChange={e => handleUrlChange(e.target.value)}
              className="bg-secondary border-border"
            />
            <Input
              placeholder="Source title (auto-detected)"
              value={sourceTitle}
              onChange={e => setSourceTitle(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={saveNote}>Save Note</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Logbook */}
      <Tabs defaultValue="today">
        <TabsList className="bg-secondary">
          <TabsTrigger value="today">Today ({todayNotes.length})</TabsTrigger>
          <TabsTrigger value="all">All Notes ({notes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <Card className="border-border">
            <CardContent className="p-0">
              {todayNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notes today yet. Start writing!</p>
              ) : todayNotes.map(renderNoteCard)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all">
          <Card className="border-border">
            <CardContent className="p-0 max-h-[600px] overflow-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notes yet.</p>
              ) : notes.map(renderNoteCard)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
