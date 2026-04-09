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
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { streamChat, ChatMessage } from '@/lib/ai';
import { ExternalAnchor } from '@/components/ExternalAnchor';
...
          {item.source_url ? (
            <ExternalAnchor href={item.source_url} className="text-sm text-primary hover:underline font-medium">
              {item.text}
            </ExternalAnchor>
          ) : (
            <span className="text-sm text-foreground">{item.text}</span>
          )}
          {item.source_note && (
            <p className="text-xs text-muted-foreground italic">💬 {item.source_note}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{item.original_date || item.added_date}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs font-mono">{getReviewDay(item.rev_count || 0)}</Badge>
        <span className="text-xs text-muted-foreground ml-1">({item.rev_count || 0}x)</span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{item.next_rev}</TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={() => markRevised(item)} className="text-xs">✓ Mark Revised</Button>
      </TableCell>
    </TableRow>
  );

  const renderTable = (data: any[], tint?: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Concept / Link</TableHead>
          <TableHead>Original Date</TableHead>
          <TableHead>Review</TableHead>
          <TableHead>Next Due</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => renderItem(item, tint))}
        {data.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No items</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Revision Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">Your smart logbook — tasks, coding problems, and concepts with spaced repetition.</p>
      </div>

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
