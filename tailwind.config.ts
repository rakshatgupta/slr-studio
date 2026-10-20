import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'], theme: { extend: { fontFamily: { sans: ['Arial','Helvetica','sans-serif'], mono: ['ui-monospace','SFMono-Regular','monospace'] } } }, plugins: [] } satisfies Config;
