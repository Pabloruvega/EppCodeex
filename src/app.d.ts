// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Db } from '#lib/server/db/index.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			admin: boolean;
			db: Db;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
