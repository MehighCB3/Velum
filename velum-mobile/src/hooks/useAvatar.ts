import { useState, useEffect, useCallback, useRef } from 'react';
import { AvatarState } from '../types';
import { coachApi } from '../api/client';

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

export function useAvatar() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasData = useRef(false);

  const fetchAvatar = useCallback(async () => {
    try {
      // Use /api/coach which returns the full state (metrics, bond, insights)
      // Skip the isOnline() check — just try the fetch and let it fail gracefully
      const data = await coachApi.getState();
      setAvatar(data as unknown as AvatarState);
      setError(null);
      hasData.current = true;
    } catch (err) {
      // Only set error if we have no cached data at all
      if (!hasData.current) {
        setError(err instanceof Error ? err.message : 'Failed to load coach data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatar();
    const interval = setInterval(fetchAvatar, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAvatar]);

  return { avatar, loading, error, refresh: fetchAvatar };
}
