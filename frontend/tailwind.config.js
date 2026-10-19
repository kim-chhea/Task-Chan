import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.tsx',
    ],

    theme: {
        extend: {
            colors: {
                ink: { DEFAULT: '#15161D', 2: '#3B3E4E', 3: '#4A4D5E', 4: '#7D8094' },
                paper: { DEFAULT: '#FAFAFC', 2: '#F0F1F6', 3: '#E1E2EA' },
                accent: { DEFAULT: '#4F63F0', ink: '#3F52DB', soft: '#E6EBFF' },
                sun: { DEFAULT: '#FFD23F', soft: '#FFF4C7' },
                pink: { DEFAULT: '#FF4D8D', soft: '#FFE6EE' },
                mint: { DEFAULT: '#7EE0B5', soft: '#D9F5E8', ink: '#1F7A4D' },
            },
            fontFamily: {
                display: ['"Dela Gothic One"', '"Arial Black"', 'sans-serif'],
                sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
            },
            boxShadow: {
                hard: '5px 5px 0 #15161D',
                'hard-sm': '3px 3px 0 #15161D',
                'hard-md': '4px 4px 0 #15161D',
                'hard-lg': '8px 8px 0 #15161D',
                'hard-accent': '5px 5px 0 #4F63F0',
            },
            borderWidth: { 2.5: '2.5px' },
        },
    },

    plugins: [forms],
};
