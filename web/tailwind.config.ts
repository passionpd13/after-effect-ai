import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ae: {
          dark: "#1a1a2e",
          darker: "#16213e",
          accent: "#0f3460",
          highlight: "#e94560",
          purple: "#9b59b6",
          blue: "#3498db",
          gold: "#f39c12",
        },
      },
    },
  },
  plugins: [],
};
export default config;
