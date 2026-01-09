/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // "Suno" inspired dark theme
        bg: {
          main: "#09090b", // zinc-950
          secondary: "#18181b", // zinc-900
          card: "#27272a", // zinc-800
        },
        accent: {
          primary: "#ffffff", // High contrast
          secondary: "#a1a1aa", // zinc-400
          highlight: "#8b5cf6", // violet-500 (Deep, trendy)
          highlightHover: "#7c3aed",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
