import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#050816", deep: "#0A1030", cyan: { DEFAULT: "#00F0FF", dim: "#00F0FF33" }, violet: { DEFAULT: "#B026FF", dim: "#B026FF33" }, mist: "#A7B0D8" },
      fontFamily: { fa: ["Vazirmatn", "sans-serif"], en: ["Space Grotesk", "sans-serif"] },
      boxShadow: { neon: "0 0 32px rgba(0,240,255,.25)", violet: "0 0 32px rgba(176,38,255,.3)" },
      keyframes: { pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".25" } }, ticker: { from: { transform: "translateX(0)" }, to: { transform: "translateX(50%)" } } },
      animation: { pulseDot: "pulseDot 1.6s ease-in-out infinite", ticker: "ticker 40s linear infinite" },
    },
  },
} satisfies Config;
