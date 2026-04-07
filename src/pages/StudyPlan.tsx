import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { STUDY_PLAN_TOPICS, WEEKLY_FOCUS } from '@/lib/constants';

export default function StudyPlanPage() {
  const { user } = useAuth();
  const [studied, setStudied] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const dayOfWeek = new Date().getDay();
  const todayFocus = WEEKLY_FOCUS[dayOfWeek] || [];

  const fetchProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle();
    if (data?.studied_subtopics) {
      setStudied(data.studied_subtopics as Record<string, string[]>);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const toggleSubtopic = async (topic: string, subtopic: string) => {
    if (!user) return;
    const current = studied[topic] || [];
    const isChecked = current.includes(subtopic);
    const updated = isChecked ? current.filter(s => s !== subtopic) : [...current, subtopic];
    const newStudied = { ...studied, [topic]: updated };
    setStudied(newStudied);

    // Upsert progress
    const { data: existing } = await supabase.from('user_progress').select('id').eq('user_id', user.id).maybeSingle();
    if (existing) {
      await supabase.from('user_progress').update({ studied_subtopics: newStudied }).eq('id', existing.id);
    } else {
      await supabase.from('user_progress').insert({ user_id: user.id, studied_subtopics: newStudied });
    }

    // Add to revision if newly checked
    if (!isChecked) {
      await supabase.from('revision_items').insert({
        user_id: user.id, text: subtopic, topic,
        next_rev: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
      toast.success(`"${subtopic}" added to revision queue`);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48" />)}</div></div>;

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-heading font-bold text-foreground">Study Plan</h1>

      <Card className="border-border bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">📅 Today's recommended focus: <span className="font-semibold text-primary">{todayFocus.join(' + ')}</span></p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(STUDY_PLAN_TOPICS).map(([topic, subtopics]) => (
          <Card key={topic} className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center justify-between">
                {topic}
                <Badge variant="outline" className="text-xs">
                  {(studied[topic] || []).length}/{subtopics.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subtopics.map(sub => (
                <div key={sub} className="flex items-center gap-2">
                  <Checkbox
                    checked={(studied[topic] || []).includes(sub)}
                    onCheckedChange={() => toggleSubtopic(topic, sub)}
                  />
                  <span className="text-sm text-foreground">{sub}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
