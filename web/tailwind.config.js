/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bid:   '#00C896',   // teal - buy side
        ask:   '#E8505A',   // coral - sell side
        acc:   '#4A8FD4',   // steel blue - neutral / mid price
        ink:   '#060B16',   // deepest background
        base:  '#0B1220',   // card / surface
        shell: '#111E30',   // elevated surface
        rim:   '#1A2D44',   // border / divider
        muted: '#3D5570',   // secondary labels
        body:  '#8FA8C0',   // body text
        hi:    '#C8DCF0',   // high emphasis text
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
