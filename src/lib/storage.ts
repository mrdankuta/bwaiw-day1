import type { StudyPlan } from './plan';
import type { SetupQuestion } from './setup';

export const STORAGE_KEY = 'daymark.waec-planner.v1';
const SNAPSHOT_VERSION = 1;

export type PlannerView = 'setup' | 'plan' | 'progress';

export interface PlannerSnapshot {
	version: number;
	selected: string[];
	days: number;
	hours: number;
	drafts: Record<string, string>;
	questions: Record<string, SetupQuestion[]>;
	plan: StudyPlan | null;
	activeDay: number;
	view: PlannerView;
}

/** Small load/save seam: v1 is localStorage; a future backend swaps this implementation. */
export interface StorageAdapter {
	load(): PlannerSnapshot | null;
	save(snapshot: PlannerSnapshot): void;
	clear(): void;
}

/** Pure: snapshot → JSON string. */
export function serializeSnapshot(snapshot: PlannerSnapshot): string {
	return JSON.stringify(snapshot);
}

/** Pure: JSON string → snapshot, or null when missing/corrupt/wrong version/misshapen. */
export function deserializeSnapshot(json: string | null): PlannerSnapshot | null {
	if (!json) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return null;
	}
	if (typeof parsed !== 'object' || parsed === null) return null;
	const value = parsed as Record<string, unknown>;
	if (value.version !== SNAPSHOT_VERSION) return null;
	if (!Array.isArray(value.selected)) return null;
	if (typeof value.days !== 'number' || typeof value.hours !== 'number') return null;
	if (typeof value.drafts !== 'object' || typeof value.questions !== 'object') return null;
	if (value.plan !== null && typeof value.plan !== 'object') return null;
	if (typeof value.activeDay !== 'number') return null;
	if (value.view !== 'setup' && value.view !== 'plan' && value.view !== 'progress') return null;
	return value as unknown as PlannerSnapshot;
}

/** Browser adapter: localStorage under ONE versioned key. SSR-safe (no-op without localStorage). */
export function createLocalStorageAdapter(): StorageAdapter {
	return {
		load(): PlannerSnapshot | null {
			try {
				if (typeof localStorage === 'undefined') return null;
				return deserializeSnapshot(localStorage.getItem(STORAGE_KEY));
			} catch {
				return null;
			}
		},
		save(snapshot: PlannerSnapshot): void {
			try {
				if (typeof localStorage === 'undefined') return;
				localStorage.setItem(STORAGE_KEY, serializeSnapshot(snapshot));
			} catch {
				// Storage full or unavailable — the app keeps working in memory.
			}
		},
		clear(): void {
			try {
				if (typeof localStorage === 'undefined') return;
				localStorage.removeItem(STORAGE_KEY);
			} catch {
				// Ignore: nothing persisted to wipe.
			}
		}
	};
}

/** In-memory adapter for tests and non-browser runtimes. */
export function createMemoryAdapter(): StorageAdapter {
	const backing = new Map<string, string>();
	return {
		load(): PlannerSnapshot | null {
			return deserializeSnapshot(backing.get(STORAGE_KEY) ?? null);
		},
		save(snapshot: PlannerSnapshot): void {
			backing.set(STORAGE_KEY, serializeSnapshot(snapshot));
		},
		clear(): void {
			backing.delete(STORAGE_KEY);
		}
	};
}
