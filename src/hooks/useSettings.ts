import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

interface SettingsRow {
  key: string;
  value: unknown;
}

interface UseSettingsResult {
  /** Get a setting value as string. Returns fallback if not found. */
  getSetting: (key: string, fallback?: string) => string;
  /** Whether settings are still loading from DB */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * Fetches all rows from the public.settings table on mount.
 * Cached in component state — stale time managed by caller or React Query externally.
 *
 * The settings table uses: key TEXT PRIMARY KEY, value JSONB
 * The value is stored as JSONB, so we extract the string representation.
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('settings')
          .select('key, value');

        if (fetchError) {
          console.error('[useSettings] Fetch error:', fetchError);
          setError('Failed to load settings');
          setLoading(false);
          return;
        }

        const map: Record<string, unknown> = {};
        if (data) {
          (data as SettingsRow[]).forEach((row) => {
            map[row.key] = row.value;
          });
        }
        setSettings(map);
      } catch (err) {
        console.error('[useSettings] Unexpected error:', err);
        setError('Unexpected error loading settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const getSetting = useCallback(
    (key: string, fallback: string = ''): string => {
      const val = settings[key];
      if (val === undefined || val === null) return fallback;
      // JSONB values may be stored as plain strings or as { "value": "..." }
      if (typeof val === 'string') return val;
      if (typeof val === 'object' && val !== null && 'value' in (val as Record<string, unknown>)) {
        return String((val as Record<string, unknown>).value);
      }
      return String(val);
    },
    [settings]
  );

  return { getSetting, loading, error };
}
