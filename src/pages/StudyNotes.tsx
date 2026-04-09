import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { ExternalLink } from 'lucide-react';
import { ExternalAnchor } from '@/components/ExternalAnchor';
...
      {note.source_url && (
        <ExternalAnchor href={note.source_url} className="inline-flex items-center gap-1 text-xs text-primary hover:underline w-fit">
          <ExternalLink className="h-3 w-3" />
          {note.source_title || 'Open source'}
        </ExternalAnchor>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Study Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">Your personal knowledge logbook — what you learned, with sources and spaced repetition.</p>
      </div>

      {/* Add Note Form */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">📝 What did I learn today?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Concept / Topic title (e.g. 'Batch Normalization explained')"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-secondary border-border"
          />
          <Textarea
            placeholder="Your summary / notes..."
            value={content}
            onChange={e => setContent(e.target.value)}
            className="bg-secondary border-border min-h-[80px]"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Source URL (article, blog, video link)"
              value={sourceUrl}
              onChange={e => handleUrlChange(e.target.value)}
              className="bg-secondary border-border"
            />
            <Input
              placeholder="Source title (auto-detected)"
              value={sourceTitle}
              onChange={e => setSourceTitle(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={saveNote}>Save Note</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Logbook */}
      <Tabs defaultValue="today">
        <TabsList className="bg-secondary">
          <TabsTrigger value="today">Today ({todayNotes.length})</TabsTrigger>
          <TabsTrigger value="all">All Notes ({notes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <Card className="border-border">
            <CardContent className="p-0">
              {todayNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notes today yet. Start writing!</p>
              ) : todayNotes.map(renderNoteCard)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all">
          <Card className="border-border">
            <CardContent className="p-0 max-h-[600px] overflow-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notes yet.</p>
              ) : notes.map(renderNoteCard)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
