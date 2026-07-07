import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const calendarSrc = path.resolve(__dirname, '../../packages/svelte-calendar/src/lib/index.ts');
const packagesRoot = path.resolve(__dirname, '../../packages');

/** Dev: compile calendar from monorepo source (HMR). Set YOGA_CALENDAR_SRC=0 to use dist/. */
const useCalendarSource = process.env.YOGA_CALENDAR_SRC !== '0';

export default defineConfig(({ command }) => ({
	plugins: [sveltekit()],
	resolve:
		command === 'serve' && useCalendarSource
			? { alias: { '@nomideusz/svelte-calendar': calendarSrc } }
			: undefined,
	server:
		command === 'serve' && useCalendarSource
			? { fs: { allow: [packagesRoot] } }
			: undefined,
	ssr:
		command === 'serve' && useCalendarSource
			? { noExternal: ['@nomideusz/svelte-calendar'] }
			: undefined,
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('svelte-calendar')) return 'vendor-calendar';
						if (id.includes('svelte')) return 'vendor-svelte';
						return 'vendor';
					}
				},
			},
		},
	},
}));
