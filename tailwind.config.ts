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
        deepBlue: "#1b4965",
        green: "#2d6a4f",
        greenLight: "#40916c",
        blueLight: "#e8f4f8",
        greenBg: "#e6f2ed",
      },
      keyframes: {
        "logo-bounce": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-4px) rotate(-2deg)" },
          "50%": { transform: "translateY(0) rotate(2deg)" },
          "75%": { transform: "translateY(-2px) rotate(-1deg)" },
        },
        "particle-float": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.6" },
          "33%": { transform: "translate(30px, -20px) scale(1.1)", opacity: "0.8" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)", opacity: "0.5" },
        },
        "wave": {
          "0%, 100%": { transform: "translateX(0) translateZ(0) scaleY(1)" },
          "50%": { transform: "translateX(-25%) translateZ(0) scaleY(1.2)" },
        },
        "meter-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--meter-width, 65%)" },
        },
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(45, 106, 79, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(45, 106, 79, 0.5)" },
        },
      },
      animation: {
        "logo-bounce": "logo-bounce 0.5s ease-in-out",
        "particle-float": "particle-float 15s ease-in-out infinite",
        "wave": "wave 12s ease-in-out infinite",
        "meter-fill": "meter-fill 1.2s ease-out forwards",
        "page-in": "page-in 0.4s ease-out both",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-glow": "linear-gradient(135deg, #1b4965 0%, #2d6a4f 50%, #40916c 100%)",
        "card-glow": "linear-gradient(145deg, rgba(232, 244, 248, 0.9) 0%, rgba(230, 242, 237, 0.9) 100%)",
      },
      boxShadow: {
        "glow-green": "0 0 20px rgba(45, 106, 79, 0.4)",
        "glow-blue": "0 0 20px rgba(27, 73, 101, 0.3)",
        "glow-green-lg": "0 0 40px rgba(45, 106, 79, 0.35)",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
