/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        "border-light": "var(--color-border-light)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        subtle: "var(--color-subtle)",

        accent: "#00C2FF",
        "accent-dim": "#0099CC",
        gold: "#FFB800",
        success: "#00E676",
        danger: "#FF4D6A",
        warn: "#FF9800",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "sans-serif"],
        body: ['"Plus Jakarta Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
