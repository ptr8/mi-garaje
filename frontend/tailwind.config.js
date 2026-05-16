/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17201c',
        mist: '#f6f7f3',
        line: '#dfe5dc',
        moss: '#4e6b58',
        coral: '#d96f57',
        petrol: '#23576a',
      },
      boxShadow: {
        soft: '0 10px 28px rgba(23, 32, 28, 0.08)',
      },
    },
  },
  plugins: [],
};
