const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'custom-blue': '#31638a',
        'teal': {
          DEFAULT: '#23A49B', // Changed to match the chatbot color
          dark: '#1b8c84',
        }
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '0.4' },
        },
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
      },
      animation: {
        pulse: 'pulse 2s infinite ease-in-out',
        blob: 'blob 7s infinite',
        float: 'float 6s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({
      nocompatible: true, 
      scrollbar: {
        width: '8px', 
        height: '8px', 
        track: {
          background: '#2D3748', 
          borderRadius: '4px',
        },
        thumb: {
          background: '#23A49B',
          borderRadius: '4px',
          hoverBackground: '#1b8c84', 
        }
      }
    }),
  ],
});