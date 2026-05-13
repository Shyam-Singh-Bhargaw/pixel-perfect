import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Pencil, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [studyHours, setStudyHours] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addDate, setAddDate] = useState<string>('');
  const [addText, setAddText] = useState('');
  const [addPriority, setAddPriority] = useState('med');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState('med');

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

  const refreshSelected = async (dateStr: string) => {
    if (!user) return;
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).eq('date', dateStr);
    setSelectedTasks(data || []);
  };

  const selectDay = async (dateStr: string) => {
    setSelectedDate(dateStr);
    await refreshSelected(dateStr);
  };

  const openAdd = (dateStr: string) => {
    setAddDate(dateStr);
    setAddText('');
    setAddPriority('med');
    setAddOpen(true);
  };

  const submitAdd = async () => {
    if (!addText.trim() || !user) return;
    const { error } = await supabase.from('tasks').insert({
      user_id: user.id, text: addText.trim(), date: addDate, priority: addPriority, done: false,
    });
    if (error) { console.error(error); toast.error('Failed to add task: ' + error.message); return; }
    toast.success(`Task added for ${addDate}`);
    setAddOpen(false);
    fetchData();
    if (selectedDate === addDate) refreshSelected(addDate);
  };

  const deleteTask = async (task: any) => {
    setSelectedTasks(prev => prev.filter(t => t.id !== task.id));
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { console.error(error); toast.error('Failed to delete'); return; }
    toast.success('Task deleted');
    fetchData();
  };

  const startEdit = (task: any) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditPriority(task.priority || 'med');
  };

  const saveEdit = async (task: any) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from('tasks').update({ text: editText.trim(), priority: editPriority }).eq('id', task.id);
    if (error) { console.error(error); toast.error('Update failed'); return; }
    toast.success('Updated');
    setEditingId(null);
    if (selectedDate) refreshSelected(selectedDate);
    fetchData();
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const doneCount = dayTasks.filter(t => t.done).length;
    const dayHours = studyHours.filter(h => h.date === dateStr).reduce((s, h) => s + Number(h.hours), 0);
    const hasCheckin = checkins.some(c => c.date === dateStr);
    const allDone = dayTasks.length > 0 && doneCount === dayTasks.length;
    return { d, dateStr, total: dayTasks.length, done: doneCount, hours: dayHours, hasCheckin, allDone };
  });

  if (loading) return <Skeleton className="h-96 w-full" />;

  const formatDate = (s: string) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-foreground">Calendar</h1>
        <div className="flex items-center gap-2">
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
            onDoubleClick={() => openAdd(day.dateStr)}
            className={`relative p-2 rounded-lg border border-border text-left min-h-[72px] transition-colors cursor-pointer hover:bg-primary/5 ${selectedDate === day.dateStr ? 'ring-1 ring-primary bg-secondary' : 'bg-card'}`}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-mono text-muted-foreground">{day.d}</span>
              {day.total > 0 && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${day.allDone ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                  {day.done}/{day.total}
                </span>
              )}
            </div>
            <div className="mt-1 space-y-0.5">
              {day.hours > 0 && <p className="text-[10px] text-primary">{day.hours}h</p>}
              {day.hasCheckin && <div className="w-2 h-2 rounded-full bg-success" />}
            </div>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); openAdd(day.dateStr); }}
              className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
              aria-label="Add task"
            >
              <Plus className="h-3 w-3 text-primary" />
            </span>
          </button>
        ))}
      </div>

      {selectedDate && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-heading">{formatDate(selectedDate)}</CardTitle>
            <Button size="sm" onClick={() => openAdd(selectedDate)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Task</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedTasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks for this day</p>}
            {selectedTasks.map(t => editingId === t.id ? (
              <div key={t.id} className="flex items-center gap-2">
                <Input value={editText} autoFocus onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(t); else if (e.key === 'Escape') setEditingId(null); }}
                  className="flex-1 h-8" />
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="med">Med</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-7 w-7 p-0 bg-success" onClick={() => saveEdit(t)}><Check className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <div key={t.id} className="flex items-center gap-2 text-sm">
                <span className={`flex-1 ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.text}</span>
                <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteTask(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task for {addDate && formatDate(addDate)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              autoFocus
              placeholder="What needs to be done?"
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAdd(); }}
            />
            <Select value={addPriority} onValueChange={setAddPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
