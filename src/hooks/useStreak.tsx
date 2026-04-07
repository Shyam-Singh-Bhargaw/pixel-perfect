import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useStreak() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);

  const checkAndUpdateStreak = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check today
    const { data: todayCheckin } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (todayCheckin) {
      setStreak(todayCheckin.streak ?? 0);
      return;
    }

    // Check yesterday for streak
    const { data: yesterdayCheckin } = await supabase
      .from('daily_checkins')
      .select('streak')
      .eq('user_id', user.id)
      .eq('date', yesterday)
      .maybeSingle();

    const newStreak = yesterdayCheckin ? (yesterdayCheckin.streak ?? 0) + 1 : 1;

    const { error } = await supabase
      .from('daily_checkins')
      .insert({ user_id: user.id, date: today, streak: newStreak });

    if (!error) setStreak(newStreak);
  }, [user]);

  useEffect(() => {
    checkAndUpdateStreak();
  }, [checkAndUpdateStreak]);

  return { streak, refresh: checkAndUpdateStreak };
}
