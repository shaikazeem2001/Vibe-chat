import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import axios from './Axios';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  profile:    ['profile'],
  rooms:      (type) => ['rooms', type],    // type: 'private' | 'public'
};

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's profile.
 * Enabled only when the user is not a guest.
 */
export function useProfile({ enabled = true } = {}) {
  const isGuest = localStorage.getItem('isGuest') === 'true';
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: async () => {
      const res = await axios.get('/api/auth/profile');
      return res.data.user;
    },
    enabled: enabled && !isGuest,
  });
}

/**
 * Optimistically update profile fields.
 * On error, rolls back to the previous cached value.
 */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data) => axios.put('/api/auth/profile', data),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.profile });
      const previous = queryClient.getQueryData(QUERY_KEYS.profile);
      queryClient.setQueryData(QUERY_KEYS.profile, (old) => ({
        ...old,
        ...updates,
      }));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(QUERY_KEYS.profile, ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
    },
  });
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

/**
 * Fetch joined private rooms from localStorage (synchronous — no network call).
 * Wrapped in useQuery so components get reactive updates and can use
 * the same loading/error API as real queries.
 */
export function usePrivateRooms() {
  return useQuery({
    queryKey: QUERY_KEYS.rooms('private'),
    queryFn: () => {
      const saved = JSON.parse(localStorage.getItem('joinedCommunities') || '[]');
      return saved.filter((r) => r.isPrivate);
    },
    // LocalStorage is synchronous — always fresh, no network stale time needed
    staleTime: 0,
  });
}

/**
 * Optimistically add a newly created / joined room to the private rooms cache.
 * No rollback needed — the only failure case is the API call itself,
 * which the component handles via the mutate error callback.
 */
export function useAddPrivateRoom() {
  return useMutation({
    mutationFn: async (room) => room, // caller already has the room object
    onSuccess: (room) => {
      queryClient.setQueryData(QUERY_KEYS.rooms('private'), (old = []) => {
        if (old.find((r) => r._id === room._id)) return old;
        return [room, ...old];
      });
    },
  });
}
