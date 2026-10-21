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
        // 禾绿：灰调豆绿，取自禾苗与田野
        primary: {
          50: "#f4f7ef",
          100: "#e7eedc",
          200: "#ceddb9",
          300: "#adc38e",
          400: "#8ba867",
          500: "#6b8a4e",
          600: "#546f3d",
          700: "#435832",
          800: "#38482c",
          900: "#303d27",
        },
        // 朱砂：只用于印章、强调与必要的警示
        accent: {
          50: "#fbf3f1",
          100: "#f7e2de",
          200: "#efc6bf",
          300: "#e39e94",
          400: "#d2766a",
          500: "#be5145",
          600: "#a63f36",
          700: "#8c352e",
          800: "#752f2a",
          900: "#632a26",
        },
        // 稻穗金：点缀色，用在价格、分割线和活动标签
        wheat: {
          50: "#fbf7e9",
          100: "#f6ecc9",
          200: "#edd998",
          300: "#e1c063",
          400: "#d3a73a",
          500: "#be8f2a",
          600: "#a37722",
          700: "#855e1e",
          800: "#6c4c1d",
          900: "#5b401b",
        },
        // 米白 / 陶白：纸感底色
        rice: {
          50: "#fdfbf6",
          100: "#f9f4e9",
          200: "#f1e9d8",
          300: "#e5d8bf",
          400: "#d4c2a2",
          500: "#bfa888",
        },
      },
      fontFamily: {
        sans: [
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Noto Sans SC",
          "sans-serif",
        ],
        serifcn: [
          "Songti SC",
          "STSong",
          "Noto Serif CJK SC",
          "Source Han Serif SC",
          "Noto Serif SC",
          "serif",
        ],
      },
      letterSpacing: {
        brand: "0.24em",
      },
      boxShadow: {
        paper: "0 1px 2px rgba(56, 72, 44, 0.04), 0 12px 32px -18px rgba(56, 72, 44, 0.25)",
        soft: "0 18px 50px -28px rgba(67, 88, 50, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
