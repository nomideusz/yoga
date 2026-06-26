import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';

// Container/server deploys (Temps, Docker) set ADAPTER=node to emit a standalone Node server
// (build/index.js). Everything else keeps adapter-auto, so existing Vercel/Netlify builds are unaffected.
const adapter = process.env.ADAPTER === 'node' ? adapterNode : adapterAuto;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// experimental: enables remote functions (*.remote.ts) — POC: autocomplete as a query
		experimental: {
			remoteFunctions: true
		}
	}
};

export default config;
