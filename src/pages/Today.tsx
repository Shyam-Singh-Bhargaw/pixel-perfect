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
...
                  {item.source_url ? (
                    <ExternalAnchor href={item.source_url} className="text-sm text-primary hover:underline font-medium truncate block">{item.text}</ExternalAnchor>
                  ) : (
                    <span className="text-sm text-foreground truncate block">{item.text}</span>
                  )}
                  {item.source_note && <p className="text-xs text-muted-foreground italic truncate">💬 {item.source_note}</p>}
                </div>
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
