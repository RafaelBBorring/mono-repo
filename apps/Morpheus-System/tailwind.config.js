/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        morpheus: {
          bg: "#06040f",
          surface: "rgba(10, 7, 24, 0.98)",
          text: "#f0ede8",
          muted: "rgba(240, 237, 232, 0.4)",
          lavender: "#c4b5fd",
          sky: "#7dd3fc",
          rose: "#fda4af",
          mint: "#6ee7b7",
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
