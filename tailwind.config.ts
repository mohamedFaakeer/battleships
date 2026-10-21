import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean-themed design tokens
        ocean: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Grid cell states
        cell: {
          water: "#0ea5e9",
          fog: "#1e3a5f",
          hit: "#ef4444",
          miss: "#94a3b8",
          ship: "#64748b",
          obstacle: "#78350f",
          sunk: "#7f1d1d",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      gridTemplateColumns: {
        // Dynamic grid sizes for the game board (up to 20x20)
        "10": "repeat(10, minmax(0, 1fr))",
        "12": "repeat(12, minmax(0, 1fr))",
        "15": "repeat(15, minmax(0, 1fr))",
        "20": "repeat(20, minmax(0, 1fr))",
      },
      animation: {
        "ping-once": "ping 0.6s cubic-bezier(0, 0, 0.2, 1) 1",
        "wave": "wave 2s ease-in-out infinite",
        "explosion": "explosion 0.4s ease-out forwards",
      },
      keyframes: {
        wave: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
        explosion: {
          "0%": { transform: "scale(0.5)", opacity: "1" },
          "50%": { transform: "scale(1.4)", opacity: "0.8" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
