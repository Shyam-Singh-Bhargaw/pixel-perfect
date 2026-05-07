import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import { Markdown } from '@/components/Markdown';
import { toast } from 'sonner';
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';
import { ExternalAnchor } from '@/components/ExternalAnchor';

const CATEGORIES = ['ML', 'DL', 'Python', 'SQL', 'DSA', 'Statistics', 'Interview Prep', 'Excel', 'Other'];

function getAutoSourceTitle(url: string) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 1] || parsed.hostname.replace('www.', '');
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return '';
  }
}

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

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleUrlChange = (url: string) => {
    setSourceUrl(url);
    if (!url.trim()) {
      setSourceTitle('');
      return;
    }

    const autoTitle = getAutoSourceTitle(url);
    if (autoTitle) {
      setSourceTitle(autoTitle);
    }
  };

  const saveNote = async () => {
    if (!title.trim() || !user) return;

    const cleanSourceUrl = sourceUrl.trim() || null;
    const cleanContent = content.trim() || null;
    const cleanSourceTitle = sourceTitle.trim() || null;

    const { error } = await supabase.from('study_notes').insert({
      user_id: user.id,
      title: title.trim(),
      content: cleanContent,
      source_url: cleanSourceUrl,
      source_title: cleanSourceTitle,
      category,
    });

    if (error) {
      toast.error('Failed to save note');
      return;
    }

    await supabase.from('revision_items').insert({
      user_id: user.id,
      text: title.trim(),
      topic: category,
      next_rev: new Date(Date.now() + SPACED_REP_INTERVALS[0] * 86400000).toISOString().split('T')[0],
      source_url: cleanSourceUrl,
      source_note: cleanContent,
      source_type: 'note',
      original_date: today,
    });

    toast.success('Note saved & added to revision queue!');
    setTitle('');
    setContent('');
    setSourceUrl('');
    setSourceTitle('');
    fetchNotes();
  };

  const todayNotes = notes.filter(note => note.date === today);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const renderNoteCard = (note: any) => (
    <div key={note.id} className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{note.title}</span>
        <Badge variant="outline" className="text-xs">{note.category}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{note.date}</span>
      </div>

      {note.content && <p className="text-sm text-muted-foreground">{note.content}</p>}

      {note.source_url && (
        <ExternalAnchor href={note.source_url} className="inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="h-3 w-3" />
          {note.source_title || 'Open source'}
        </ExternalAnchor>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Study Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your personal knowledge logbook — what you learned, with sources and spaced repetition.</p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">📝 What did I learn today?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Concept / Topic title (e.g. 'Batch Normalization explained')"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border-border bg-secondary"
          />

          <Textarea
            placeholder="Your summary / notes..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-[80px] border-border bg-secondary"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              placeholder="Source URL (article, blog, video link)"
              value={sourceUrl}
              onChange={e => handleUrlChange(e.target.value)}
              className="border-border bg-secondary"
            />
            <Input
              placeholder="Source title (auto-detected)"
              value={sourceTitle}
              onChange={e => setSourceTitle(e.target.value)}
              className="border-border bg-secondary"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 border-border bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={saveNote}>Save Note</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="today">
        <TabsList className="bg-secondary">
          <TabsTrigger value="today">Today ({todayNotes.length})</TabsTrigger>
          <TabsTrigger value="all">All Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card className="border-border">
            <CardContent className="p-0">
              {todayNotes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No notes today yet. Start writing!</p>
              ) : (
                todayNotes.map(renderNoteCard)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card className="border-border">
            <CardContent className="max-h-[600px] overflow-auto p-0">
              {notes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                notes.map(renderNoteCard)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
