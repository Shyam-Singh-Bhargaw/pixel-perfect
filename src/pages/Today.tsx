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
import { NORMAL_SCHEDULE, INTERVIEW_SCHEDULE, STUDY_TOPICS, STUDY_TARGETS, TOPIC_COLORS, SPACED_REP_INTERVALS, SCHEDULE_SLOT_COLORS } from '@/lib/constants';
import { ExternalAnchor } from '@/components/ExternalAnchor';
import { Trash2, Pencil, Check, X } from 'lucide-react';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <span className="font-mono text-sm text-muted-foreground">{now.toLocaleTimeString()} • {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>;
}

function getCurrentSlotIndex(schedule: typeof NORMAL_SCHEDULE) {
  const hour = new Date().getHours();
  for (let index = schedule.length - 1; index >= 0; index--) {
    if (schedule[index].hours.includes(hour)) return index;
  }
  return 0;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
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

  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('med');
  const [studyTopic, setStudyTopic] = useState('ML');
  const [studyHoursInput, setStudyHoursInput] = useState('1');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState('med');

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTask = async () => {
    if (!newTask.trim() || !user) return;
    const { error } = await supabase.from('tasks').insert({ user_id: user.id, text: newTask, priority: newPriority, date: today });
    if (error) {
      toast.error('Failed to add task');
      return;
    }
    toast.success('Task added!');
    setNewTask('');
    fetchData();
  };

  const toggleTask = async (task: any) => {
    const newDone = !task.done;
    await supabase.from('tasks').update({ done: newDone }).eq('id', task.id);
    if (newDone) {
      await supabase.from('revision_items').insert({
        user_id: user!.id,
        text: task.text,
        topic: 'General',
        next_rev: new Date(Date.now() + SPACED_REP_INTERVALS[0] * 86400000).toISOString().split('T')[0],
        source_type: 'task',
        original_date: today,
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
    const hours = parseFloat(studyHoursInput);
    if (isNaN(hours) || hours <= 0) return;
    await supabase.from('study_hours').insert({ user_id: user.id, topic: studyTopic, hours, date: today });
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

  const doneCount = tasks.filter(task => task.done).length;
  const totalHours = studyHours.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const highUndone = tasks.filter(task => !task.done && task.priority === 'high').length;
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const priorityOrder = { high: 0, med: 1, low: 2 };
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
  });

  const schedule = interviewMode ? INTERVIEW_SCHEDULE : NORMAL_SCHEDULE;
  const currentSlot = getCurrentSlotIndex(schedule);

  const topicHours: Record<string, number> = {};
  studyHours.forEach(entry => {
    topicHours[entry.topic] = (topicHours[entry.topic] || 0) + Number(entry.hours);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(index => <Skeleton key={index} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">{getGreeting()}, Shyam 👋</h1>
        <LiveClock />
      </div>

      {interviewMode && (
        <div className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm font-medium text-info">
          📞 Interview Mode Active — Schedule adjusted for interview day
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
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
            {schedule.map((item, index) => {
              const isActive = index === currentSlot;
              const slotColor = SCHEDULE_SLOT_COLORS[item.label] || '';
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-all ${slotColor} ${
                    isActive ? 'ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]' : 'border-transparent'
                  }`}
                >
                  {isActive && (
                    <Badge className="shrink-0 bg-primary text-[10px] text-primary-foreground animate-pulse">NOW</Badge>
                  )}
                  <span className="w-32 shrink-0 font-mono text-xs text-muted-foreground">{item.time}</span>
                  <span className="text-foreground">{item.label}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-heading">Priority Tasks</CardTitle>
            {highUndone > 0 && <Badge className="bg-warning text-warning-foreground">{highUndone} high</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add task..."
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                className="flex-1 bg-secondary border-border"
                onKeyDown={e => e.key === 'Enter' && addTask()}
              />
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
            <div className="max-h-64 space-y-1 overflow-auto">
              {sortedTasks.map(task => (
                <div key={task.id} className={`flex items-center gap-3 rounded-md px-3 py-2 ${task.done ? 'opacity-50' : ''}`}>
                  <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task)} />
                  <span className={`flex-1 text-sm ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.text}</span>
                  <Badge variant="outline" className={`text-[10px] ${task.priority === 'high' ? 'border-destructive text-destructive' : task.priority === 'low' ? 'border-muted-foreground text-muted-foreground' : 'border-warning text-warning'}`}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
              {tasks.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No tasks yet. Add one above!</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Revision Due Today</CardTitle>
            <p className="text-xs text-muted-foreground">Intervals: Day 1 → 4 → 7 → 14 → 30 → 60</p>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-auto">
            {revItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-md bg-secondary/50 px-3 py-2">
                <div className={`h-2 w-2 rounded-full ${TOPIC_COLORS[item.topic] || 'bg-muted-foreground'}`} />
                <div className="min-w-0 flex-1">
                  {item.source_url ? (
                    <ExternalAnchor href={item.source_url} className="block truncate text-sm font-medium text-primary hover:underline">
                      {item.text}
                    </ExternalAnchor>
                  ) : (
                    <span className="block truncate text-sm text-foreground">{item.text}</span>
                  )}
                  {item.source_note && <p className="truncate text-xs italic text-muted-foreground">💬 {item.source_note}</p>}
                </div>
                <Badge variant="outline" className="text-[10px]">{item.topic}</Badge>
                <Button size="sm" variant="outline" onClick={() => markRevisionDone(item)} className="text-xs">✓ Done</Button>
              </div>
            ))}
            {revItems.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No revisions due today! 🎉</p>}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Daily Check-In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">How are you feeling?</p>
              <div className="flex gap-2">
                {['😴', '😐', '🙂', '💪', '🔥'].map(mood => (
                  <button key={mood} onClick={() => saveMood(mood)} className={`rounded-lg p-2 text-2xl transition-colors ${checkin?.mood === mood ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-secondary'}`}>
                    {mood}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="End-of-day notes..."
              defaultValue={checkin?.notes || ''}
              onBlur={e => saveNotes(e.target.value)}
              className="h-20 w-full resize-none rounded-lg border border-border bg-secondary p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Study Logger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select value={studyTopic} onValueChange={setStudyTopic}>
                <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STUDY_TOPICS.map(topic => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}
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
                    <span className="w-28 text-xs text-muted-foreground">{topic}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs text-muted-foreground">{done}/{target}h</span>
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
