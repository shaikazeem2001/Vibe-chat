import React from 'react';

// ─── Primitive ────────────────────────────────────────────────────────────────
/**
 * Raw skeleton block. Use className for sizing (Tailwind) or style prop.
 */
export const Bone = ({ className = '', style = {}, rounded = false }) => (
  <div
    className={`skeleton ${rounded ? 'rounded-full' : ''} ${className}`}
    style={style}
    aria-hidden="true"
  />
);

// ─── Message Bubble Skeleton ──────────────────────────────────────────────────
/**
 * Mimics the exact layout of a Stream Chat message row.
 * Use 5-8 of these while the channel is connecting.
 */
export const MessageSkeleton = ({ reverse = false }) => (
  <div
    className={`flex gap-3 px-4 py-3 ${reverse ? 'flex-row-reverse' : ''}`}
    aria-hidden="true"
  >
    {/* Avatar */}
    <Bone className="w-9 h-9 shrink-0" rounded />

    <div className={`flex flex-col gap-2 ${reverse ? 'items-end' : 'items-start'}`} style={{ flex: 1 }}>
      {/* Sender name */}
      <Bone style={{ height: 11, width: '28%' }} />
      {/* Message lines */}
      <Bone style={{ height: 14, width: reverse ? '70%' : '82%', borderRadius: 10 }} />
      <Bone style={{ height: 14, width: reverse ? '50%' : '60%', borderRadius: 10 }} />
    </div>
  </div>
);

/**
 * Stack of 6 alternating message skeletons (left/right) to suggest a real convo.
 */
export const MessageListSkeleton = ({ count = 6 }) => (
  <div className="flex flex-col py-4" aria-label="Loading messages…" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => (
      <MessageSkeleton key={i} reverse={i % 3 === 2} />
    ))}
  </div>
);

// ─── Conversation / Room Row Skeleton ─────────────────────────────────────────
/**
 * Mimics the room-list row (avatar + name + preview text).
 */
export const ConvSkeleton = () => (
  <div className="flex items-center gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900" aria-hidden="true">
    <Bone className="w-12 h-12 shrink-0" rounded />
    <div className="flex-1 flex flex-col gap-2">
      <Bone style={{ height: 13, width: '40%' }} />
      <Bone style={{ height: 11, width: '70%' }} />
    </div>
  </div>
);

export const ConvListSkeleton = ({ count = 4 }) => (
  <div className="space-y-4" aria-label="Loading rooms…" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => <ConvSkeleton key={i} />)}
  </div>
);

// ─── Topic / Community Card Skeleton ─────────────────────────────────────────
/**
 * Mimics the Exploretopics and JoinRoom card layout.
 */
export const TopicCardSkeleton = () => (
  <div className="flex flex-col p-8 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-3xl" aria-hidden="true">
    {/* Icon box */}
    <Bone className="w-14 h-14 mb-6 rounded-2xl" />
    {/* Title */}
    <Bone style={{ height: 20, width: '55%', marginBottom: 10 }} />
    {/* Description lines */}
    <Bone style={{ height: 12, width: '90%', marginBottom: 6 }} />
    <Bone style={{ height: 12, width: '70%', marginBottom: 24 }} />
    {/* CTA */}
    <Bone style={{ height: 12, width: '40%', marginTop: 'auto' }} />
  </div>
);

export const TopicGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading topics…" aria-busy="true">
    {Array.from({ length: count }).map((_, i) => <TopicCardSkeleton key={i} />)}
  </div>
);

// ─── Profile / Settings Skeleton ─────────────────────────────────────────────
/**
 * Used in Profilepage / Settings while the profile is being fetched.
 */
export const ProfileSkeleton = () => (
  <div className="space-y-6 animate-pulse" aria-label="Loading profile…" aria-busy="true">
    {/* Avatar */}
    <div className="flex items-center gap-6">
      <Bone className="w-24 h-24" rounded />
      <div className="flex flex-col gap-3 flex-1">
        <Bone style={{ height: 18, width: '40%' }} />
        <Bone style={{ height: 13, width: '60%' }} />
      </div>
    </div>
    {/* Fields */}
    {[80, 60, 70].map((w, i) => (
      <div key={i} className="space-y-2">
        <Bone style={{ height: 11, width: '25%' }} />
        <Bone style={{ height: 44, width: '100%', borderRadius: 12 }} />
      </div>
    ))}
    {/* Button */}
    <div className="flex justify-end">
      <Bone style={{ height: 46, width: 140, borderRadius: 12 }} />
    </div>
  </div>
);
