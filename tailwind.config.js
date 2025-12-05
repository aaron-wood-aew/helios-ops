/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'space-slate': '#0f172a',
                'space-blue': '#0ea5e9',
                'space-amber': '#f59e0b',
                'space-red': '#ef4444',
            },
            fontFamily: {
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            animation: {
                marquee: 'marquee 25s linear infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(-100%)' },
                }
            }
        },
    },
    plugins: [],
}
