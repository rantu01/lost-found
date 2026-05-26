/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./componets/**/*.{js,ts,jsx,tsx,mdx}", // Tomar folder-er spelling onujayi
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Ekhane tumi chaile nijer icchemoto color ba font add korte paro
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Eita thakle (site) folder-o cover hobe
    "./components/**/*.{js,ts,jsx,tsx,mdx}", 
    "./componets/**/*.{js,ts,jsx,tsx,mdx}", // Tomar spelling error thakle eitao rakho
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}