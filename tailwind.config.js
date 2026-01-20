module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F59E0B', // لون المفك والعدد (Amber)
        dark: '#0F172A',    // لون الخلفيات الغامقة (Slate)
      },
    },
  },
  plugins: [],
}
