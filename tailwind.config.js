/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        "border-width": "border-width",
        "height": "height",
        "width": "width"
      }
    },
  },
  plugins: [],
}

