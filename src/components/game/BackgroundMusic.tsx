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

      // Create a soft, atmospheric synth pad using multiple oscillators
      // Add low-pass filter for warm, muffled tone
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 800; // Cutoff at 800Hz for softness

      // Oscillator 1: Low root note (sine)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 110;
      osc1.connect(gain1);
      gain1.connect(lowpass);

      // Oscillator 2: Fifth interval (sine)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 165;
      osc2.connect(gain2);
      gain2.connect(lowpass);

      // Oscillator 3: Octave fifth (sine)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.value = 220;
      osc3.connect(gain3);
      gain3.connect(lowpass);

      lowpass.connect(ctx.destination);

      // Gain node for overall volume control (softer volume, atmospheric pad)
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.02;
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      osc1.start();
      osc2.start();
      osc3.start();

      // Gentle, subtle frequency sweep for evolving, soft atmospheric sound
      const startTime = ctx.currentTime;
      const duration = 15; // 15 seconds per cycle (slower, more gradual evolution)

      // Small pitch drift for warmth, not a full octave sweep
      osc1.frequency.exponentialRampToValueAtTime(130, startTime + duration);
      osc2.frequency.exponentialRampToValueAtTime(195, startTime + duration);
      osc3.frequency.exponentialRampToValueAtTime(260, startTime + duration);

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