import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Markdown } from '@/components/Markdown';
import { ExternalAnchor } from '@/components/ExternalAnchor';
import { toast } from 'sonner';
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { streamChat, ChatMessage } from '@/lib/ai';
import { ArrowLeft, CheckCircle, ExternalLink, Brain, RefreshCw, Lightbulb, Loader2 } from 'lucide-react';

function getDaysAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function getDomain(url: string) {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', ''); }
  catch { return url; }
}

function parseScore(md: string): number | null {
  const m = md.match(/##\s*Score:\s*(\d+)\s*\/\s*10/i);
  return m ? parseInt(m[1], 10) : null;
}

export default function NoteViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [revisionItem, setRevisionItem] = useState<any>(null);
  const [sourceData, setSourceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [recallQuestion, setRecallQuestion] = useState('');
  const [recallLoading, setRecallLoading] = useState(false);

  // Concept card resize
  const [conceptHeight, setConceptHeight] = useState(260);

  // Answer & evaluation
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      const { data: revItem } = await supabase.from('revision_items').select('*').eq('id', id).eq('user_id', user.id).single();
      setRevisionItem(revItem);
      if (revItem?.source_type === 'note') {
        const { data } = await supabase.from('study_notes').select('*').eq('user_id', user.id)
          .or(`title.eq.${revItem.text},source_url.eq.${revItem.source_url || '___none___'}`)
          .limit(1).maybeSingle();
        setSourceData(data);
      } else if (revItem?.source_type === 'coding') {
        const { data } = await supabase.from('coding_practice').select('*').eq('user_id', user.id)
          .or(`title.eq.${revItem.text},url.eq.${revItem.source_url || '___none___'}`)
          .limit(1).maybeSingle();
        setSourceData(data);
      }
      setLoading(false);
    })();
  }, [user, id]);

  const markReviewed = async () => {
    if (!revisionItem) return;
    const today = new Date().toISOString().split('T')[0];
    const newCount = (revisionItem.rev_count || 0) + 1;
    const idx = Math.min(newCount, SPACED_REP_INTERVALS.length - 1);
    const nextDate = new Date(Date.now() + SPACED_REP_INTERVALS[idx] * 86400000).toISOString().split('T')[0];
    await supabase.from('revision_items').update({
      rev_count: newCount,
      next_rev: nextDate,
      rev_dates: [...(revisionItem.rev_dates || []), today],
    }).eq('id', revisionItem.id);
    toast.success('Marked as reviewed! Next review: ' + nextDate);
    setRevisionItem({ ...revisionItem, rev_count: newCount, next_rev: nextDate, rev_dates: [...(revisionItem.rev_dates || []), today] });
  };

  const generateRecallQuestion = async () => {
    if (recallLoading) return;
    setRecallLoading(true);
    setRecallQuestion('');
    setUserAnswer('');
    setEvaluation('');

    const noteContent = sourceData?.content || revisionItem?.text || '';
    const topic = revisionItem?.topic || '';
    const prompt = `Based on this study note, generate one short active recall question that tests understanding, not memorization. Topic: ${topic}. Note content: ${noteContent}. Return only the question, nothing else.`;

    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    await streamChat({
      messages,
      onDelta: (text) => setRecallQuestion((prev) => prev + text),
      onDone: () => setRecallLoading(false),
      onError: (err) => {
        toast.error(err.message || 'Could not generate question');
        setRecallLoading(false);
      },
    });
  };

  const evaluateAnswer = async () => {
    if (!userAnswer.trim() || !recallQuestion.trim() || isEvaluating) return;
    setIsEvaluating(true);
    setEvaluation('');
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-answer', {
        body: {
          topic: revisionItem?.topic || '',
          noteContent: sourceData?.content || revisionItem?.source_note || revisionItem?.text || '',
          question: recallQuestion,
          userAnswer,
        },
      });
      if (error) throw error;
      setEvaluation(data?.evaluation || '');
    } catch (e: any) {
      toast.error(e.message || 'Evaluation failed');
    } finally {
      setIsEvaluating(false);
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = conceptHeight;
    const onMove = (ev: MouseEvent) => setConceptHeight(Math.max(60, startH + ev.clientY - startY));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!revisionItem) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <p className="text-muted-foreground">Item not found.</p>
        <Button variant="outline" onClick={() => navigate('/revision')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Revision
        </Button>
      </div>
    );
  }

  const title = sourceData?.title || revisionItem.text;
  const content = sourceData?.content || revisionItem.source_note || revisionItem.text;
  const category = sourceData?.category || revisionItem.topic || 'General';
  const sourceUrl = sourceData?.source_url || sourceData?.url || revisionItem.source_url;
  const createdAt = sourceData?.created_at || revisionItem.created_at;
  const interval = revisionItem.rev_count || 0;
  const totalIntervals = SPACED_REP_INTERVALS.length;
  const nextRev = revisionItem.next_rev;
  const daysUntilNext = nextRev ? Math.max(0, Math.floor((new Date(nextRev).getTime() - Date.now()) / 86400000)) : 0;

  const score = evaluation ? parseScore(evaluation) : null;
  const scoreTone =
    score === null ? '' :
    score >= 8 ? 'bg-success/15 text-success border-success/30' :
    score >= 5 ? 'bg-warning/15 text-warning border-warning/30' :
    'bg-destructive/15 text-destructive border-destructive/30';
  const scoreSym = score === null ? '' : score >= 8 ? '✓' : score >= 5 ? '~' : '✗';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <button onClick={() => navigate('/revision')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Revision Queue
      </button>

      <div className="space-y-3">
        <h1 className="text-2xl font-heading font-bold text-foreground leading-tight">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{category}</Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {revisionItem.source_type === 'coding' ? '💻 Coding' : revisionItem.source_type === 'note' ? '📖 Note' : revisionItem.source_type === 'task' ? '✅ Task' : '📝 Manual'}
          </Badge>
          {createdAt && <span className="text-xs text-muted-foreground">Saved {getDaysAgo(createdAt)}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span>
            Interval {Math.min(interval + 1, totalIntervals)} of {totalIntervals}
            {daysUntilNext > 0 ? ` — next review in ${daysUntilNext} day${daysUntilNext !== 1 ? 's' : ''}` : ' — due now'}
          </span>
        </div>
      </div>

      {/* Concept card — resizable */}
      <Card className="border-border">
        <CardContent
          className="p-6"
          style={{ height: conceptHeight, minHeight: 60, overflow: 'auto' }}
        >
          <Markdown content={content} />
        </CardContent>
      </Card>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="h-2 -my-3 cursor-row-resize flex items-center justify-center group"
        title="Drag to resize"
      >
        <div className="h-1 w-16 rounded-full bg-border group-hover:bg-primary transition-colors" />
      </div>

      {sourceUrl && (
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {sourceData?.source_title || getDomain(sourceUrl)}
              </p>
              <p className="text-xs text-muted-foreground truncate">{getDomain(sourceUrl)}</p>
            </div>
            <ExternalAnchor href={sourceUrl} className="shrink-0 ml-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
              Open source <ExternalLink className="h-3.5 w-3.5" />
            </ExternalAnchor>
          </CardContent>
        </Card>
      )}

      {/* Test yourself panel */}
      <Card className="border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> Test yourself
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!recallQuestion && !recallLoading && (
            <Button size="sm" onClick={generateRecallQuestion}>Generate a recall question</Button>
          )}
          {recallLoading && !recallQuestion && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Generating question…
            </div>
          )}
          {recallQuestion && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary p-4 text-sm text-foreground whitespace-pre-wrap">{recallQuestion}</div>

              <Textarea
                placeholder="Write your answer here..."
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                style={{ resize: 'vertical', width: '100%', minHeight: 120 }}
                className="bg-secondary border-border"
                disabled={isEvaluating}
              />

              <Button
                onClick={evaluateAnswer}
                disabled={isEvaluating || !userAnswer.trim()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isEvaluating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Evaluating…</>
                ) : 'Submit Answer'}
              </Button>

              {evaluation && (
                <Card className="border-border bg-secondary/40">
                  <CardContent className="p-5 space-y-4">
                    {score !== null && (
                      <Badge variant="outline" className={`${scoreTone} text-sm px-3 py-1`}>
                        {score}/10 {scoreSym}
                      </Badge>
                    )}
                    <Markdown content={evaluation} />
                    <Button size="sm" variant="outline" onClick={generateRecallQuestion}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try another question
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!evaluation && (
                <Button size="sm" variant="ghost" onClick={generateRecallQuestion} disabled={recallLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${recallLoading ? 'animate-spin' : ''}`} /> Try another
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/revision')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to revision
          </button>
          <Button onClick={markReviewed} size="sm" className="gap-1.5">
            <CheckCircle className="h-4 w-4" /> Mark reviewed
          </Button>
        </div>
      </div>
    </div>
  );
}
