"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UsePlaybackClockOptions = {
  /** Start of the timeline (epoch ms). */
  start: number;
  /** End of the timeline (epoch ms). */
  end: number;
  /** Playback rate as a multiple of real time (default: 100). */
  initialSpeed?: number;
  /** Restart from the beginning when the end is reached (default: true). */
  loop?: boolean;
};

export type PlaybackClock = {
  /** Current cursor position (epoch ms). */
  time: number;
  isPlaying: boolean;
  /** Playback rate as a multiple of real time. */
  speed: number;
  /** Progress through the timeline, 0–1. */
  progress: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Jump the cursor to an absolute time (clamped to the bounds). */
  seek: (time: number) => void;
  /** Jump to the start and play. */
  restart: () => void;
  setSpeed: (speed: number) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * A requestAnimationFrame-driven clock that advances a cursor across a time
 * range at a configurable multiple of real time — the React equivalent of
 * LeafletPlayback's Clock. The cursor is decoupled from frame rate by scaling
 * each frame's elapsed wall-clock time by `speed`.
 */
export function usePlaybackClock({
  start,
  end,
  initialSpeed = 100,
  loop = true,
}: UsePlaybackClockOptions): PlaybackClock {
  const [time, setTime] = useState(start);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);

  const timeRef = useRef(start);
  const speedRef = useRef(speed);
  const startRef = useRef(start);
  const endRef = useRef(end);
  const loopRef = useRef(loop);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  // Keep the animation-frame loop reading the latest props without restarting.
  useEffect(() => {
    speedRef.current = speed;
    startRef.current = start;
    endRef.current = end;
    loopRef.current = loop;
  });

  const commit = useCallback((next: number) => {
    timeRef.current = next;
    setTime(next);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const frame = (now: number) => {
      if (lastRef.current === null) lastRef.current = now;
      const dt = now - lastRef.current;
      lastRef.current = now;

      let next = timeRef.current + dt * speedRef.current;
      if (next >= endRef.current) {
        if (loopRef.current) {
          next = startRef.current;
        } else {
          commit(endRef.current);
          setIsPlaying(false);
          return;
        }
      }
      commit(next);
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [isPlaying, commit]);

  const seek = useCallback(
    (next: number) => {
      commit(clamp(next, startRef.current, endRef.current));
    },
    [commit],
  );

  const play = useCallback(() => {
    // Pressing play at the very end rewinds first, so it never no-ops.
    if (timeRef.current >= endRef.current - 1) commit(startRef.current);
    setIsPlaying(true);
  }, [commit]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      play();
    }
  }, [isPlaying, play]);

  const restart = useCallback(() => {
    commit(startRef.current);
    setIsPlaying(true);
  }, [commit]);

  const span = end - start;
  const progress = span > 0 ? clamp((time - start) / span, 0, 1) : 0;

  return {
    time,
    isPlaying,
    speed,
    progress,
    play,
    pause,
    toggle,
    seek,
    restart,
    setSpeed,
  };
}
