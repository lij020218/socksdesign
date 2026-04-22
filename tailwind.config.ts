import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#efeae0",
        shell: "#f7f3eb",
        ink: "#0e0e0e",
        graphite: "#1a1a1a",
        mute: {
          100: "#e3ddd2",
          200: "#c9c2b5",
          300: "#a29b8c",
          400: "#6f6a60",
          500: "#3d3a34",
        },
        crimson: {
          50: "#fbeaec",
          100: "#f6c8ce",
          200: "#ec9098",
          300: "#de5a66",
          400: "#cc2f3f",
          500: "#a80d22",
          600: "#8a0a1c",
          700: "#6b0815",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
        serif: ["Instrument Serif", "Fraunces", "serif"],
        fraunces: ["Fraunces", "Instrument Serif", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.045em",
        tighter: "-0.028em",
        wider: "0.1em",
        widest: "0.32em",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
