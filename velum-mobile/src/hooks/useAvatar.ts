import { useState, useEffect, useCallback } from 'react';
import { AvatarState } from '../types';
import { avatarApi } from '../api/client';
import { isOnline } from '../db/sync';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAvatar() {
  const [avatar, setAvatar] = useState<AvatarState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvatar = useCallback(async () => {
    try {
      const online = await isOnline();
      if (!online) return;
      const data = await avatarApi.getState();
      setAvatar(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load avatar');
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
