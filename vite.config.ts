import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
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
});
