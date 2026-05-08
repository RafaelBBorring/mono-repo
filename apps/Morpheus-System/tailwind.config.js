/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        morpheus: {
          bg: "var(--bg-primary)",
          surface: "var(--bg-surface)",
          text: "var(--text-primary)",
          muted: "var(--text-muted)",
          lavender: "var(--accent-lavender)",
          sky: "var(--accent-sky)",
          rose: "var(--accent-rose)",
          mint: "var(--accent-mint)",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Nunito", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.65rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease forwards",
        "slide-up": "slideUp 0.3s ease forwards",
        "slide-in-right": "slideInRight 0.3s ease forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
