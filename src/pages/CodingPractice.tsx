import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SPACED_REP_INTERVALS } from '@/lib/constants';
import { ExternalAnchor } from '@/components/ExternalAnchor';
...
                  <TableCell>
                    <ExternalAnchor href={e.url} className="text-sm text-primary hover:underline font-medium">
                      {e.title}
                    </ExternalAnchor>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.platform}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{e.topic || '—'}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${diffColor(e.difficulty)}`}>{e.difficulty}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{e.note || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.date_solved}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No problems logged yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
