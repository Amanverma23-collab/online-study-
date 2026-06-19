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
        "deep-black": "#0D0F12",
        "olive-dark": "#1C2415",
        "olive-mid": "#2E3B1E",
        khaki: "#8B9E6A",
        gold: {
          DEFAULT: "#C9A84C",
          light: "#F0D080",
        },
        "off-white": "#EEF0E8",
        cream: "#F5F3EC",
        "red-alert": "#D94F3D",
        "green-confirm": "#4A7C59",
        "blue-info": "#2C6E8A",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
