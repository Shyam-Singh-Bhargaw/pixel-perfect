import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { NORMAL_SCHEDULE, INTERVIEW_SCHEDULE, STUDY_TOPICS, STUDY_TARGETS, TOPIC_COLORS, SPACED_REP_INTERVALS } from '@/lib/constants';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <span className="font-mono text-sm text-muted-foreground">{now.toLocaleTimeString()} • {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>;
}

function getCurrentTimeBlock(schedule: typeof NORMAL_SCHEDULE) {
  const now = new Date();
  const h = now.getHours();
  if (h < 7) return 0;
  if (h < 9) return 1;
  if (h < 10) return 2;
  if (h < 14) return 3;
  if (h < 15) return 4;
  if (h < 18) return 5;
  if (h < 21) return 6;
  if (h < 22) return 7;
  return 8;
}

export default function TodayPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [revItems, setRevItems] = useState<any[]>([]);
  const [studyHours, setStudyHours] = useState<any[]>([]);
  const [jobCount, setJobCount] = useState(0);
  const [checkin, setCheckin] = useState<any>(null);
  const [interviewMode, setInterviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('med');
  const [studyTopic, setStudyTopic] = useState('ML');
  const [studyHoursInput, setStudyHoursInput] = useState('1');

  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [tasksRes, revRes, studyRes, jobRes, checkinRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
      supabase.from('revision_items').select('*').eq('user_id', user.id).lte('next_rev', today).order('created_at'),
      supabase.from('study_hours').select('*').eq('user_id', user.id).eq('date', today),
      supabase.from('job_applications').select('id', { count: 'exact' }).eq('user_id', user.id).gte('applied_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
      supabase.from('daily_checkins').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    ]);
    setTasks(tasksRes.data || []);
    setRevItems(revRes.data || []);
    setStudyHours(studyRes.data || []);
    setJobCount(jobRes.count || 0);
    setCheckin(checkinRes.data);
    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addTask = async () => {
    if (!newTask.trim() || !user) return;
    const { error } = await supabase.from('tasks').insert({ user_id: user.id, text: newTask, priority: newPriority, date: today });
    if (error) { toast.error('Failed to add task'); return; }
    toast.success('Task added!');
    setNewTask('');
    fetchData();
  };

  const toggleTask = async (task: any) => {
    const newDone = !task.done;
    await supabase.from('tasks').update({ done: newDone }).eq('id', task.id);
    if (newDone) {
      await supabase.from('revision_items').insert({
        user_id: user!.id, text: task.text, topic: 'General', next_rev: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      });
    }
    fetchData();
  };

  const markRevisionDone = async (item: any) => {
    const newCount = (item.rev_count || 0) + 1;
    const intervalIdx = Math.min(newCount, SPACED_REP_INTERVALS.length - 1);
    const nextDate = new Date(Date.now() + SPACED_REP_INTERVALS[intervalIdx] * 86400000).toISOString().split('T')[0];
    const newDates = [...(item.rev_dates || []), today];
    await supabase.from('revision_items').update({ rev_count: newCount, next_rev: nextDate, rev_dates: newDates }).eq('id', item.id);
    toast.success('Revision marked done!');
    fetchData();
  };

  const logStudy = async () => {
    if (!user) return;
    const h = parseFloat(studyHoursInput);
    if (isNaN(h) || h <= 0) return;
    await supabase.from('study_hours').insert({ user_id: user.id, topic: studyTopic, hours: h, date: today });
    toast.success('Study hours logged!');
    setStudyHoursInput('1');
    fetchData();
  };

  const saveMood = async (mood: string) => {
    if (!user) return;
    if (checkin) {
      await supabase.from('daily_checkins').update({ mood }).eq('id', checkin.id);
    } else {
      await supabase.from('daily_checkins').insert({ user_id: user.id, date: today, mood });
    }
    fetchData();
  };

  const saveNotes = async (notes: string) => {
    if (!user) return;
    if (checkin) {
      await supabase.from('daily_checkins').update({ notes }).eq('id', checkin.id);
    } else {
      await supabase.from('daily_checkins').insert({ user_id: user.id, date: today, notes });
    }
  };

  const doneCount = tasks.filter(t => t.done).length;
  const totalHours = studyHours.reduce((s, h) => s + Number(h.hours), 0);
  const highUndone = tasks.filter(t => !t.done && t.priority === 'high').length;
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const p = { high: 0, med: 1, low: 2 };
    return (p[a.priority as keyof typeof p] || 1) - (p[b.priority as keyof typeof p] || 1);
  });

  const schedule = interviewMode ? INTERVIEW_SCHEDULE : NORMAL_SCHEDULE;
  const currentBlock = getCurrentTimeBlock(NORMAL_SCHEDULE);

  // Study progress per topic
  const topicHours: Record<string, number> = {};
  studyHours.forEach(h => { topicHours[h.topic] = (topicHours[h.topic] || 0) + Number(h.hours); });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Good morning, Shyam 👋</h1>
        <LiveClock />
      </div>

      {/* Interview mode banner */}
      {interviewMode && (
        <div className="bg-info/10 border border-info/30 rounded-lg p-3 text-info text-sm font-medium">
          📞 Interview Mode Active — Schedule adjusted for interview day
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tasks Done</p>
            <p className="text-2xl font-mono font-bold text-success">{doneCount}/{tasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Revision Due</p>
            <p className="text-2xl font-mono font-bold text-warning">{revItems.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Jobs This Week</p>
            <p className="text-2xl font-mono font-bold text-info">{jobCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Study Hours</p>
            <p className="text-2xl font-mono font-bold text-primary">{totalHours}h</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Panel */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-heading">Smart Schedule</CardTitle>
            <Button
              variant={interviewMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInterviewMode(!interviewMode)}
            >
              📞 Interview Mode
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {schedule.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${!interviewMode && i === currentBlock ? 'bg-primary/10 border border-primary/30' : ''}`}>
                {!interviewMode && i === currentBlock && <Badge className="bg-primary text-primary-foreground text-[10px]">▶ NOW</Badge>}
                <span className="text-muted-foreground w-32 shrink-0 font-mono text-xs">{item.time}</span>
                <span className="text-foreground">{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasks Panel */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-heading">Priority Tasks</CardTitle>
            {highUndone > 0 && <Badge className="bg-warning text-warning-foreground">{highUndone} high</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Add task..." value={newTask} onChange={e => setNewTask(e.target.value)} className="bg-secondary border-border flex-1" onKeyDown={e => e.key === 'Enter' && addTask()} />
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger className="w-24 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="med">Med</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addTask} size="sm">Add</Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-auto">
              {sortedTasks.map(task => (
                <div key={task.id} className={`flex items-center gap-3 px-3 py-2 rounded-md ${task.done ? 'opacity-50' : ''}`}>
                  <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task)} />
                  <span className={`flex-1 text-sm ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.text}</span>
                  <Badge variant="outline" className={`text-[10px] ${task.priority === 'high' ? 'border-destructive text-destructive' : task.priority === 'low' ? 'border-muted-foreground text-muted-foreground' : 'border-warning text-warning'}`}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No tasks yet. Add one above!</p>}
            </div>
          </CardContent>
        </Card>

        {/* Revision Queue */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Revision Due Today</CardTitle>
            <p className="text-xs text-muted-foreground">Intervals: Day 1 → 4 → 7 → 14 → 30 → 60</p>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-auto">
            {revItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/50">
                <div className={`w-2 h-2 rounded-full ${TOPIC_COLORS[item.topic] || 'bg-muted-foreground'}`} />
                <span className="flex-1 text-sm text-foreground">{item.text}</span>
                <Badge variant="outline" className="text-[10px]">{item.topic}</Badge>
                <Button size="sm" variant="outline" onClick={() => markRevisionDone(item)} className="text-xs">✓ Done</Button>
              </div>
            ))}
            {revItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No revisions due today! 🎉</p>}
          </CardContent>
        </Card>

        {/* Daily Check-in */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Daily Check-In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2">How are you feeling?</p>
              <div className="flex gap-2">
                {['😴', '😐', '🙂', '💪', '🔥'].map(m => (
                  <button key={m} onClick={() => saveMood(m)} className={`text-2xl p-2 rounded-lg transition-colors ${checkin?.mood === m ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-secondary'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="End-of-day notes..."
              defaultValue={checkin?.notes || ''}
              onBlur={e => saveNotes(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </CardContent>
        </Card>

        {/* Study Logger */}
        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Study Logger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Select value={studyTopic} onValueChange={setStudyTopic}>
                <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STUDY_TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" step="0.5" min="0.5" value={studyHoursInput} onChange={e => setStudyHoursInput(e.target.value)} className="w-24 bg-secondary border-border" />
              <Button onClick={logStudy} size="sm">Log</Button>
            </div>
            <div className="space-y-2">
              {Object.entries(STUDY_TARGETS).map(([topic, target]) => {
                const done = topicHours[topic] || 0;
                const pct = Math.min(100, (done / target) * 100);
                return (
                  <div key={topic} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28">{topic}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{done}/{target}h</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
