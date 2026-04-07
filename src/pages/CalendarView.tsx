import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [studyHours, setStudyHours] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
    const [t, s, c] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('study_hours').select('*').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('daily_checkins').select('*').eq('user_id', user.id).gte('date', start).lte('date', end),
    ]);
    setTasks(t.data || []);
    setStudyHours(s.data || []);
    setCheckins(c.data || []);
    setLoading(false);
  }, [user, year, month, daysInMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectDay = async (dateStr: string) => {
    setSelectedDate(dateStr);
    if (!user) return;
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', dateStr);
    setSelectedTasks(data || []);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const doneCount = dayTasks.filter(t => t.done).length;
    const dayHours = studyHours.filter(h => h.date === dateStr).reduce((s, h) => s + Number(h.hours), 0);
    const hasCheckin = checkins.some(c => c.date === dateStr);
    return { d, dateStr, total: dayTasks.length, done: doneCount, hours: dayHours, hasCheckin };
  });

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground">Calendar</h1>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="text-muted-foreground hover:text-foreground">◀</button>
          <span className="font-heading text-foreground">{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="text-muted-foreground hover:text-foreground">▶</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground py-2">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(day => (
          <button
            key={day.d}
            onClick={() => selectDay(day.dateStr)}
            className={`p-2 rounded-lg border border-border text-left min-h-[72px] transition-colors hover:bg-secondary ${selectedDate === day.dateStr ? 'ring-1 ring-primary bg-secondary' : 'bg-card'}`}
          >
            <span className="text-xs font-mono text-muted-foreground">{day.d}</span>
            <div className="mt-1 space-y-0.5">
              {day.total > 0 && <p className="text-[10px] text-success">{day.done}/{day.total} tasks</p>}
              {day.hours > 0 && <p className="text-[10px] text-primary">{day.hours}h</p>}
              {day.hasCheckin && <div className="w-2 h-2 rounded-full bg-success" />}
            </div>
          </button>
        ))}
      </div>

      {selectedDate && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">{selectedDate}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks for this day</p>}
            {selectedTasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span className={t.done ? 'line-through text-muted-foreground' : 'text-foreground'}>{t.text}</span>
                <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
