import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SPACED_REP_INTERVALS, TOPIC_COLORS } from '@/lib/constants';
import { streamChat, ChatMessage } from '@/lib/ai';

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

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const markRevised = async (item: any) => {
    const newCount = (item.rev_count || 0) + 1;
    const idx = Math.min(newCount, SPACED_REP_INTERVALS.length - 1);
    const nextDate = new Date(Date.now() + SPACED_REP_INTERVALS[idx] * 86400000).toISOString().split('T')[0];
    await supabase.from('revision_items').update({ rev_count: newCount, next_rev: nextDate, rev_dates: [...(item.rev_dates || []), today] }).eq('id', item.id);
    toast.success('Marked as revised!');
    fetchItems();
  };

  const getAiTips = async () => {
    const dueItems = items.filter(i => i.next_rev <= today);
    if (dueItems.length === 0) { toast.info('No items due today'); return; }
    setAiLoading(true);
    setAiTips('');
    const prompt = `Today's revision topics: ${dueItems.map(i => `${i.text} (${i.topic})`).join(', ')}. Give: 1) 2-sentence explanation of each, 2) Most likely interview question, 3) Memory tip.`;
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    await streamChat({
      messages,
      onDelta: (t) => setAiTips(prev => prev + t),
      onDone: () => setAiLoading(false),
      onError: (e) => { toast.error(e.message); setAiLoading(false); },
    });
  };

  const overdue = items.filter(i => i.next_rev < today);
  const dueToday = items.filter(i => i.next_rev === today);
  const upcoming = items.filter(i => i.next_rev > today);

  const renderTable = (data: any[], tint?: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Topic</TableHead>
          <TableHead>Concept</TableHead>
          <TableHead>Added</TableHead>
          <TableHead>Revised</TableHead>
          <TableHead>Next Due</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => (
          <TableRow key={item.id} className={tint || ''}>
            <TableCell><Badge variant="outline" className="text-xs">{item.topic}</Badge></TableCell>
            <TableCell className="text-sm">{item.text}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{item.added_date}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{item.rev_count}x</TableCell>
            <TableCell className="text-xs text-muted-foreground">{item.next_rev}</TableCell>
            <TableCell>
              <Button size="sm" variant="outline" onClick={() => markRevised(item)} className="text-xs">✓ Mark Revised</Button>
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No items</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-heading font-bold text-foreground">Revision Queue</h1>

      {/* AI Revision Coach */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading">🧠 AI Revision Coach</CardTitle>
          <Button onClick={getAiTips} disabled={aiLoading} size="sm">
            {aiLoading ? 'Thinking...' : "Get today's revision tips"}
          </Button>
        </CardHeader>
        {aiTips && (
          <CardContent>
            <div className="bg-secondary rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">{aiTips}</div>
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
