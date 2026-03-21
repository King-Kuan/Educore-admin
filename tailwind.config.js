/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e6f0e8",
          100: "#c0d8c6",
          600: "#1a3a2a",
          700: "#163224",
          800: "#11291d",
        },
        rw: {
          green:  "#20603D",
          yellow: "#FAD201",
          blue:   "#00A1DE",
        },
      },
    },
  },
  plugins: [],
};
