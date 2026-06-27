// apps/yoga — client-side error tracking via Temps (Sentry wire-compatible DSN).
// DSN is read at runtime from PUBLIC_SENTRY_DSN; an empty/unset DSN makes Sentry a
// no-op, so local dev without the var is safe. Performance tracing is left off —
// errors only, which is all the Temps error-fixer workflow consumes.
// ponytail: no source-map upload / sentrySvelteKit() vite plugin. Add that plugin
// + SENTRY_AUTH_TOKEN in CI when you want un-minified client stack traces.
import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	environment: import.meta.env.MODE,
});

export const handleError = Sentry.handleErrorWithSentry();
