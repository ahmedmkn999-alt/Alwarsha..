// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFD700', // ذهبي فاقع (لون المعدات)
        primaryHover: '#EAB308', // ذهبي أغمق شوية
        dark: '#000000',    // أسود صريح
        surface: '#18181B', // رمادي فحمي للخلفيات (Zinc-900)
        textMain: '#FFFFFF',
        textMuted: '#A1A1AA', // رمادي فاتح
      },
    },
  },
  plugins: [],
}
