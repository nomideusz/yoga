// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			locale: string;
			// null unless a valid Appwrite session cookie was resolved in hooks
			user: import('node-appwrite').Models.User<import('node-appwrite').Models.Preferences> | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
