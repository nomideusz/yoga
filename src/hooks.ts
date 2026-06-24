// apps/yoga — universal reroute: map /en/* and /uk/* onto the un-prefixed
// route tree so prefixed locale URLs are served by the existing routes.
import { createReroute } from '@nomideusz/svelte-i18n';
import { i18nRouting } from '$lib/i18n-routing';

export const reroute = createReroute(i18nRouting);
