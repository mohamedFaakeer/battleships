"use client";

import { useEffect, useRef } from "react";

/** Sound effects for the Battleships game using Web Audio API */
export enum SoundType {
  Click = "click",
  Hit = "hit",
  Miss = "miss",
  Sunk = "sunk",
  GameOver = "gameOver",
  Win = "win",
}

/** Oscillator waveform type for tone generation */
type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

/** Generate a simple tone and return an AudioBuffer */
const generateToneBuffer = (
  { context, frequency = 440, type: oscType = "sine", duration = 0.2, volume = 0.3 }: {
    context: AudioContext;
    frequency?: number;
    type?: OscillatorType;
    duration?: number;
    volume?: number;
  }) => {
  return new Promise<AudioBuffer>((resolve) => {
    const sampleRate = context.sampleRate;
    const numSamples = sampleRate * (duration ?? 0.2);
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const now = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Envelope: fade in over the duration
      const envelope = Math.min(1, t / (duration ?? 0.2));
      let value = 0;

      if (oscType === "sine") {
        value = Math.sin(t * (frequency ?? 440) * Math.PI * 2) * envelope;
      } else if (oscType === "square") {
        value = Math.sign(Math.sin(t * (frequency ?? 440) * Math.PI * 2)) * envelope;
      } else if (oscType === "sawtooth") {
        value = (2 / Math.PI) * Math.atan(t * (frequency ?? 440) * Math.PI * 2) * envelope;
      } else if (oscType === "triangle") {
        value = (2 / Math.PI) * Math.abs((2 * t * (frequency ?? 440) * Math.PI) % 2 - 1) * envelope;
      }

      now[i] = value * (volume ?? 0.3);
    }

    resolve(buffer);
  });
}

/** Play a pre-generated AudioBuffer */
const playBuffer = (context: AudioContext, buffer: AudioBuffer) => {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
};

/** Sound manager using Web Audio API */
export class SoundManager {
  private context: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.context = new AudioContext();
    this.initialized = true;

    // Pre-generate common sound buffers
    const clickBuffer = await generateToneBuffer({
      context: this.context!,
      frequency: 330, // E5
      type: "square",
      duration: 0.1,
      volume: 0.2,
    });

    const hitBuffer = await generateToneBuffer({
      context: this.context!,
      frequency: 523, // C6
      type: "sine",
      duration: 0.15,
      volume: 0.3,
    });

    const missBuffer = await generateToneBuffer({
      context: this.context!,
      frequency: 294, // D5
      type: "sawtooth",
      duration: 0.2,
      volume: 0.25,
    });

    const sunkBuffer = await generateToneBuffer({
      context: this.context!,
      frequency: 196, // G4
      type: "square",
      duration: 0.3,
      volume: 0.35,
    });

    const gameOverBuffer = await generateToneBuffer({
      context: this.context!,
      frequency: 147, // G#4
      type: "sine",
      duration: 0.5,
      volume: 0.2,
    });

    const winBuffer = await generateToneBuffer({
      context: this.context!,
      frequency: 659, // E6
      type: "sine",
      duration: 0.4,
      volume: 0.3,
    });

    this.sounds.set(SoundType.Click, clickBuffer);
    this.sounds.set(SoundType.Hit, hitBuffer);
    this.sounds.set(SoundType.Miss, missBuffer);
    this.sounds.set(SoundType.Sunk, sunkBuffer);
    this.sounds.set(SoundType.GameOver, gameOverBuffer);
    this.sounds.set(SoundType.Win, winBuffer);
  }

  play(type: SoundType) {
    if (!this.context || !this.sounds.has(type)) return;

    // Resume context if suspended (user gesture required / autoplay policy)
    if (this.context.state === "suspended") {
      this.context.resume();
    }

    const buffer = this.sounds.get(type)!;
    playBuffer(this.context, buffer);
  }
}

/** Singleton instance exported as a hook-friendly value */
const soundManager = new SoundManager();

export const useSound = () => {
  const ref = useRef<SoundManager>(soundManager);

  useEffect(() => {
    ref.current.init().catch((err) =>
      console.warn("Sound initialization failed", err)
    );
    return () => {};
  }, []);

  const play = (type: SoundType) => {
    ref.current.play(type);
  };

  return { play };
};

/** Export the singleton for direct import if needed */
export { soundManager };

/** Hook to play click sound */
export const useClickSound = () => {
  const { play } = useSound();

  const handleClick = () => {
    play(SoundType.Click);
  };

  return { handleClick };
};

/** Hook to play hit/miss/sunk sounds in BattleGrid */
export const useBattleSounds = () => {
  const { play } = useSound();

  const handleHit = () => {
    play(SoundType.Hit);
  };

  const handleMiss = () => {
    play(SoundType.Miss);
  };

  const handleSunk = () => {
    play(SoundType.Sunk);
  };

  return { handleHit, handleMiss, handleSunk };
};