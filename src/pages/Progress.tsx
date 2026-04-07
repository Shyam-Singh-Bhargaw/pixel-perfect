import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { STUDY_TARGETS } from '@/lib/constants';
import { streamChat, ChatMessage } from '@/lib/ai';

export default function ProgressPage() {
  const { user } = useAuth();
  const [studyHours, setStudyHours] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyReview, setWeeklyReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const [studyRes, jobsRes, checkinsRes] = await Promise.all([
      supabase.from('study_hours').select('*').eq('user_id', user.id).gte('date', sevenDaysAgo),
      supabase.from('job_applications').select('*').eq('user_id', user.id),
      supabase.from('daily_checkins').select('*').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date'),
    ]);
    setStudyHours(studyRes.data || []);
    setJobs(jobsRes.data || []);
    setCheckins(checkinsRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getWeeklyReview = async () => {
    setReviewLoading(true);
    setWeeklyReview('');
    const topicSummary: Record<string, number> = {};
    studyHours.forEach(h => { topicSummary[h.topic] = (topicSummary[h.topic] || 0) + Number(h.hours); });

    const prompt = `Weekly progress review for Shyam:
Study hours this week: ${JSON.stringify(topicSummary)}
Job applications total: ${jobs.length}
Active streak days in last 30: ${checkins.length}

Give a structured review: 1) What was strong, 2) What needs focus, 3) Recommendation for next week. Be specific and actionable.`;

    await streamChat({
      messages: [{ role: 'user', content: prompt }],
      onDelta: t => setWeeklyReview(prev => prev + t),
      onDone: () => setReviewLoading(false),
      onError: e => { toast.error(e.message); setReviewLoading(false); },
    });
  };

  // Weekly heatmap data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const hours = studyHours.filter(h => h.date === dateStr).reduce((s, h) => s + Number(h.hours), 0);
    return { date: dateStr, hours, day: d.toLocaleDateString('en-US', { weekday: 'short' }) };
  });

  // Topic progress
  const allTopicHours: Record<string, number> = {};
  studyHours.forEach(h => { allTopicHours[h.topic] = (allTopicHours[h.topic] || 0) + Number(h.hours); });

  // Job funnel
  const funnel = { Applied: 0, Interview: 0, Offer: 0 };
  jobs.forEach(j => { if (j.status && j.status in funnel) funnel[j.status as keyof typeof funnel]++; });

  // Streak calendar (last 30 days)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    return { date: dateStr, active: checkins.some(c => c.date === dateStr) };
  });

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-heading font-bold text-foreground">Progress</h1>

      {/* Weekly Heatmap */}
      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Weekly Study Heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {last7Days.map(d => {
              const intensity = Math.min(d.hours / 4, 1);
              return (
                <div key={d.date} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-lg border border-border"
                    style={{ backgroundColor: `hsl(249, 90%, ${70 - intensity * 40}%, ${0.2 + intensity * 0.8})` }}
                    title={`${d.hours}h`}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  <span className="text-[10px] text-muted-foreground">{d.hours}h</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Topic Progress */}
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Topic Coverage</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(STUDY_TARGETS).map(([topic, target]) => {
              const done = allTopicHours[topic] || 0;
              const pct = Math.min(100, (done / target) * 100);
              return (
                <div key={topic} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28">{topic}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{done.toFixed(1)}/{target}h</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Application Funnel */}
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Applications Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(funnel).map(([stage, count]) => {
              const maxCount = Math.max(...Object.values(funnel), 1);
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20">{stage}</span>
                  <div className="flex-1 h-6 bg-secondary rounded overflow-hidden">
                    <div className="h-full bg-primary/60 rounded flex items-center px-2" style={{ width: `${(count / maxCount) * 100}%` }}>
                      <span className="text-xs font-mono text-foreground">{count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Streak Calendar */}
      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base font-heading">Streak Calendar (30 days)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {last30.map(d => (
              <div
                key={d.date}
                className={`w-6 h-6 rounded-sm border border-border ${d.active ? 'bg-success' : 'bg-secondary'}`}
                title={d.date}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Weekly Review */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading">AI Weekly Review</CardTitle>
          <Button onClick={getWeeklyReview} disabled={reviewLoading} size="sm">
            {reviewLoading ? 'Analyzing...' : 'Get AI Review'}
          </Button>
        </CardHeader>
        {weeklyReview && (
          <CardContent>
            <div className="bg-secondary rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap">{weeklyReview}</div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
