/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          50: "#f3f5fb",
          100: "#e5e9f5",
          200: "#c8d0e8",
          300: "#9ba9d4",
          400: "#6b7cba",
          500: "#4a5aa1",
          600: "#384687",
          700: "#2d386d",
          800: "#1f2750",
          900: "#141a37",
          950: "#0a0e22",
        },
        ember: {
          50: "#fffaeb",
          100: "#fff1c6",
          200: "#ffe188",
          300: "#ffcb4a",
          400: "#ffb420",
          500: "#f99008",
          600: "#dd6c03",
          700: "#b74b07",
          800: "#943a0d",
          900: "#7a310f",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "InterDisplay",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "forge-radial":
          "radial-gradient(circle at 20% 0%, rgba(255,180,32,0.10), transparent 40%), radial-gradient(circle at 90% 100%, rgba(56,70,135,0.20), transparent 50%), linear-gradient(180deg, #0a0e22 0%, #141a37 100%)",
        "facet":
          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 50%, rgba(255,180,32,0.08) 100%)",
      },
      boxShadow: {
        glow: "0 10px 40px -10px rgba(56,70,135,0.45)",
        ember: "0 8px 30px -10px rgba(249,144,8,0.4)",
      },
    },
  },
  plugins: [],
};
