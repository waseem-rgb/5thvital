import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.5thvital.com';

interface SettingsRow {
  key: string;
  value: unknown;
}

interface UseSettingsResult {
  getSetting: (key: string, fallback?: string) => string;
  loading: boolean;
  error: string | null;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings`);
        const json = await res.json();

        if (!res.ok) {
          setError('Failed to load settings');
          setLoading(false);
          return;
        }

        const map: Record<string, unknown> = {};
        if (json.settings) {
          (json.settings as SettingsRow[]).forEach((row) => {
            map[row.key] = row.value;
          });
        }
        setSettings(map);
      } catch (err) {
        console.error('[useSettings] Error:', err);
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
