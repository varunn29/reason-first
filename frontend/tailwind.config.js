/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',      // Indigo
        secondary: '#10B981',    // Mint Green
        accent: '#F59E0B',       // Amber
        darkText: '#1F2937',     // Dark Slate
        bgMain: '#F8F9FA',       // Off-white (Eye comfortable)
        cardBg: '#FFFFFF',       // Pure white for cards only
        danger: '#EF4444',       // Soft Red for alerts
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
      }
    },
  },
  plugins: [],
}
