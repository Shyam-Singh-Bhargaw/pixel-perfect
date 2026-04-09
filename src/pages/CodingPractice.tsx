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
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { ExternalAnchor } from '@/components/ExternalAnchor';

const PLATFORMS_MAP: Record<string, string> = {
  'leetcode.com': 'LeetCode',
  'hackerrank.com': 'HackerRank',
  'geeksforgeeks.org': 'GeeksforGeeks',
  'codeforces.com': 'Codeforces',
  'codechef.com': 'CodeChef',
  'neetcode.io': 'NeetCode',
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Arrays: ['array', 'two-sum', 'subarray', 'matrix', 'rotate'],
  Strings: ['string', 'palindrome', 'anagram', 'substring'],
  'Dynamic Programming': ['dynamic-programming', 'dp', 'knapsack', 'fibonacci', 'longest-common'],
  Trees: ['tree', 'binary-tree', 'bst', 'trie', 'inorder', 'preorder'],
  Graphs: ['graph', 'dfs', 'bfs', 'dijkstra', 'topological', 'shortest-path'],
  'Linked List': ['linked-list', 'linkedlist'],
  Stack: ['stack', 'monotone-stack'],
  Queue: ['queue', 'deque'],
  'Hash Table': ['hash', 'hashmap', 'hash-table'],
  'Binary Search': ['binary-search'],
  Sorting: ['sort', 'merge-sort', 'quick-sort'],
  'Sliding Window': ['sliding-window'],
  'Two Pointers': ['two-pointer'],
  Backtracking: ['backtracking', 'permutation', 'combination'],
  Greedy: ['greedy'],
  Heap: ['heap', 'priority-queue'],
  Math: ['math', 'number'],
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function detectFromUrl(url: string) {
  let platform = 'Other';
  let title = '';
  let topic = '';
  let difficulty = 'Medium';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    platform = PLATFORMS_MAP[host] || 'Other';

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const slug = pathParts.find(part => part !== 'problems' && part !== 'problem' && part !== 'challenges' && part.length > 2) || '';
    title = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

    const urlLower = url.toLowerCase();
    if (urlLower.includes('easy')) difficulty = 'Easy';
    else if (urlLower.includes('hard')) difficulty = 'Hard';

    const slugLower = slug.toLowerCase();
    for (const [detectedTopic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some(keyword => slugLower.includes(keyword))) {
        topic = detectedTopic;
        break;
      }
    }
  } catch {
    // ignore invalid URL
  }

  return { platform, title, topic, difficulty };
}

export default function CodingPracticePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('LeetCode');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [note, setNote] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('coding_practice')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.startsWith('http')) {
      const detected = detectFromUrl(value);
      setTitle(detected.title);
      setPlatform(detected.platform);
      setTopic(detected.topic);
      setDifficulty(detected.difficulty);
    }
  };

  const addEntry = async () => {
    if (!url.trim() || !title.trim() || !user) return;

    const { error } = await supabase.from('coding_practice').insert({
      user_id: user.id,
      url,
      title,
      platform,
      topic: topic || null,
      difficulty,
      note: note || null,
    });

    if (error) {
      toast.error('Failed to save');
      return;
    }

    await supabase.from('revision_items').insert({
      user_id: user.id,
      text: `🔗 ${title} (${platform})`,
      topic: topic || 'DSA',
      next_rev: new Date(Date.now() + SPACED_REP_INTERVALS[0] * 86400000).toISOString().split('T')[0],
      source_url: url,
      source_note: note || null,
      source_type: 'coding',
      original_date: new Date().toISOString().split('T')[0],
    });

    toast.success('Problem saved & added to revision queue!');
    setUrl('');
    setTitle('');
    setNote('');
    setTopic('');
    fetchEntries();
  };

  const diffColor = (value: string) => {
    if (value === 'Easy') return 'text-success border-success';
    if (value === 'Hard') return 'text-destructive border-destructive';
    return 'text-warning border-warning';
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-heading font-bold text-foreground">Coding Practice</h1>

      <Card className="border-border bg-info/5">
        <CardContent className="p-4 text-sm text-info">
          💡 Paste a LeetCode / HackerRank / Codeforces URL — platform, title, and topic are auto-detected. Problems are added to your revision queue automatically.
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Log a Problem</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Paste URL (e.g. https://leetcode.com/problems/two-sum/)"
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            className="bg-secondary border-border"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="bg-secondary border-border" />
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(PLATFORMS_MAP).map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Topic (e.g. Arrays, DP)" value={topic} onChange={e => setTopic(e.target.value)} className="bg-secondary border-border" />
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Personal note (e.g. 'used sliding window')" value={note} onChange={e => setNote(e.target.value)} className="bg-secondary border-border" />
          <Button onClick={addEntry}>Save Problem</Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Solved Problems ({entries.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <ExternalAnchor href={entry.url} className="text-sm font-medium text-primary hover:underline">
                      {entry.title}
                    </ExternalAnchor>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.platform}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{entry.topic || '—'}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${diffColor(entry.difficulty)}`}>{entry.difficulty}</Badge></TableCell>
                  <TableCell className="max-w-40 truncate text-sm text-muted-foreground">{entry.note || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.date_solved}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No problems logged yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
