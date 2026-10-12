import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fef7ee",
          100: "#fdedd3",
          200: "#f9d7a5",
          300: "#f5b96d",
          400: "#f09032",
          500: "#ed7312",
          600: "#de5a08",
          700: "#b84309",
          800: "#93350f",
          900: "#772d10",
        },
        accent: {
          50: "#fdf6f6",
          100: "#fbeaea",
          200: "#f7d5d6",
          300: "#f1b1b3",
          400: "#e78386",
          500: "#d9565a",
          600: "#c43a40",
          700: "#a42d34",
          800: "#882930",
          900: "#73282f",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
