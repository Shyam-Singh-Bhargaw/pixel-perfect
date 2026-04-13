import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { streamChat, ChatMessage } from '@/lib/ai';
import { ExternalAnchor } from '@/components/ExternalAnchor';

function getReviewDay(revCount: number): string {
  if (revCount === 0) return 'Day 1';
  const idx = Math.min(revCount, SPACED_REP_INTERVALS.length - 1);
  return `Day ${SPACED_REP_INTERVALS[idx]}`;
}

function sourceIcon(type: string | null) {
  if (type === 'coding') return '💻';
  if (type === 'task') return '✅';
  if (type === 'note') return '📖';
  return '📝';
}

export default function RevisionPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTips, setAiTips] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('revision_items').select('*').eq('user_id', user.id).order('next_rev');
    setItems(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const markRevised = async (item: any) => {
    const newCount = (item.rev_count || 0) + 1;
    const idx = Math.min(newCount, SPACED_REP_INTERVALS.length - 1);
    const nextDate = new Date(Date.now() + SPACED_REP_INTERVALS[idx] * 86400000).toISOString().split('T')[0];
    await supabase.from('revision_items').update({ rev_count: newCount, next_rev: nextDate, rev_dates: [...(item.rev_dates || []), today] }).eq('id', item.id);
    toast.success('Marked as revised!');
    fetchItems();
  };

  const getAiTips = async () => {
    const dueItems = items.filter(item => item.next_rev <= today);
    if (dueItems.length === 0) {
      toast.info('No items due today');
      return;
    }
    setAiLoading(true);
    setAiTips('');
    const prompt = `Today's revision topics: ${dueItems.map(item => `${item.text} (${item.topic})`).join(', ')}. Give: 1) 2-sentence explanation of each, 2) Most likely interview question, 3) Memory tip.`;
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    await streamChat({
      messages,
      onDelta: text => setAiTips(prev => prev + text),
      onDone: () => setAiLoading(false),
      onError: error => {
        toast.error(error.message);
        setAiLoading(false);
      },
    });
  };

  const overdue = items.filter(item => item.next_rev < today);
  const dueToday = items.filter(item => item.next_rev === today);
  const upcoming = items.filter(item => item.next_rev > today);

  const renderItem = (item: any, tint?: string) => (
    <TableRow key={item.id} className={tint || ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <span title={item.source_type || 'manual'}>{sourceIcon(item.source_type)}</span>
          <Badge variant="outline" className="text-xs">{item.topic}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {item.source_url ? (
            <ExternalAnchor href={item.source_url} className="text-sm font-medium text-primary hover:underline">
              {item.text}
            </ExternalAnchor>
          ) : (
            <span className="text-sm text-foreground">{item.text}</span>
          )}
          {item.source_note && (
            <p className="text-xs italic text-muted-foreground">💬 {item.source_note}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{item.original_date || item.added_date}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs font-mono">{getReviewDay(item.rev_count || 0)}</Badge>
        <span className="ml-1 text-xs text-muted-foreground">({item.rev_count || 0}x)</span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{item.next_rev}</TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={() => markRevised(item)} className="text-xs">✓ Mark Revised</Button>
      </TableCell>
    </TableRow>
  );

  const renderTable = (data: any[], tint?: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Concept / Link</TableHead>
          <TableHead>Original Date</TableHead>
          <TableHead>Review</TableHead>
          <TableHead>Next Due</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => renderItem(item, tint))}
        {data.length === 0 && (
          <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No items</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Revision Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your smart logbook — tasks, coding problems, and concepts with spaced repetition.</p>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-heading">🧠 AI Revision Coach</CardTitle>
          <Button onClick={getAiTips} disabled={aiLoading} size="sm">
            {aiLoading ? 'Thinking...' : "Get today's revision tips"}
          </Button>
        </CardHeader>
        {aiTips && (
          <CardContent>
            <div className="rounded-lg bg-secondary p-4 text-sm text-foreground whitespace-pre-wrap">{aiTips}</div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="today">Due Today ({dueToday.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card className="border-border"><CardContent className="p-0">{renderTable(items)}</CardContent></Card></TabsContent>
        <TabsContent value="overdue"><Card className="border-border"><CardContent className="p-0">{renderTable(overdue, 'bg-destructive/5')}</CardContent></Card></TabsContent>
        <TabsContent value="today"><Card className="border-border"><CardContent className="p-0">{renderTable(dueToday, 'bg-warning/5')}</CardContent></Card></TabsContent>
        <TabsContent value="upcoming"><Card className="border-border"><CardContent className="p-0">{renderTable(upcoming)}</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
