/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#DC2626",      // Red (main brand color)
        primaryHover: "#B91C1C", // Darker red for hover states
        darkGray: "#1F2937",     // gray-800
        lightGray: "#F3F4F6",    // optional: background sections
        white: "#FFFFFF",
      },
    },
  },
  plugins: [],
};
