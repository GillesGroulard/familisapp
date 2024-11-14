import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Reminder } from '../types';

interface CreateReminderParams {
  description: string;
  date: string;
  time: string | null;
  family_id: string;
  target_audience: 'ELDER' | 'FAMILY';
  recurrence_type: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrence_day: number | null;
}

export function useReminders(familyId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReminder = async (params: CreateReminderParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: reminderError } = await supabase
        .from('reminders')
        .insert([
          {
            ...params,
            user_id: user.id,
            is_acknowledged: false
          }
        ]);

      if (reminderError) throw reminderError;
    } catch (err) {
      console.error('Error creating reminder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create reminder');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getActiveReminders = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_acknowledged', false)
        .gte('date', today)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as Reminder[];
    } catch (err) {
      console.error('Error fetching reminders:', err);
      throw err;
    }
  };

  const acknowledgeReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_acknowledged: true })
        .eq('id', reminderId);

      if (error) throw error;
    } catch (err) {
      console.error('Error acknowledging reminder:', err);
      throw err;
    }
  };

  return {
    loading,
    error,
    createReminder,
    getActiveReminders,
    acknowledgeReminder
  };
}