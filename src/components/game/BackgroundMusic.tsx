"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Background music component — fun, energetic looping synth music.
 * Uses Web Audio API to synthesize music in real-time.
 * Starts after first user interaction to respect browser autoplay policies.
 * Can be muted/unmuted via the UI.
 */
export function BackgroundMusic() {
  const [isMuted, setIsMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const startMusic = useCallback(() => {
    let intervalId: ReturnType<typeof setTimeout> | undefined;
    try {
      const ctx = new window.AudioContext();
      audioContextRef.current = ctx;

      // Create a complex energetic sound using multiple oscillators
      // Oscillator 1: Fast pulse lead
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 220;
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Oscillator 2: Higher lead
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.value = 330;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      // Oscillator 3: Even higher
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "triangle";
      osc3.frequency.value = 440;
      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      // Gain node for overall volume control
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.1;
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      osc1.start();
      osc2.start();
      osc3.start();

      // Modulate frequencies over time for evolving, energetic sound
      const startTime = ctx.currentTime;
      const duration = 5; // 5 seconds per cycle

      osc1.frequency.exponentialRampToValueAtTime(440, startTime + duration);
      osc2.frequency.exponentialRampToValueAtTime(660, startTime + duration);
      osc3.frequency.exponentialRampToValueAtTime(880, startTime + duration);

      // Re-loop after duration
      intervalId = setTimeout(() => {
        osc1.stop(ctx.currentTime + 0.1);
        osc2.stop(ctx.currentTime + 0.1);
        osc3.stop(ctx.currentTime + 0.1);
        // Restart with new frequencies for evolving sound
        osc1.frequency.value = 220;
        osc2.frequency.value = 330;
        osc3.frequency.value = 440;
        osc1.start();
        osc2.start();
        osc3.start();
        startMusic();
      }, duration * 1000);

      setStarted(true);
    } catch (e) {
      console.error("Background music could not start:", e);
    }

    // Cleanup on unmount
    return () => clearTimeout(intervalId!);
  }, []);

  // Set up user interaction listeners once on mount
  useEffect(() => {
    const handleUserInteraction = () => {
      if (started) return;
      startMusic();
      // Remove listeners after starting so they don't stack
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [started]);

  useEffect(() => {
    // No-op: keep component responsive to state changes
  }, [started, isMuted]);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = next ? 0 : 0.1;
      }
      return next;
    });
  };

  return (
    <div
      className="fixed bottom-4 left-4 flex gap-2 z-50"
      aria-label="Background music controls"
    >
      <button
        onClick={toggleMute}
        className="p-2 rounded-lg transition-colors"
        title={isMuted ? "Unmute background music" : "Mute background music"}
        style={{
          background: isMuted ? "var(--ocean-800)" : "var(--ocean-500)",
          color: "white",
        }}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}