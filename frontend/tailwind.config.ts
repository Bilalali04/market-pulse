import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        slate: "var(--slate)",
        signal: "var(--signal)",
        flag: "var(--flag)",
        hairline: "var(--hairline)",
      },
      fontFamily: {
        display: ["var(--font-newsreader)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
