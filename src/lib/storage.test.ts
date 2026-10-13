import { describe, expect, it } from 'vitest';
import {
	STORAGE_KEY,
	createMemoryAdapter,
	deserializeSnapshot,
	serializeSnapshot,
	type PlannerSnapshot
} from './storage';
import { generatePlan } from './plan';

function snapshot(): PlannerSnapshot {
	return {
		version: 1,
		selected: ['mathematics', 'english'],
		days: 7,
		hours: 2.5,
		drafts: { mathematics: 'm1\nm2' },
		questions: { mathematics: [{ id: 'q-1', title: 'm1', topic: 'General' }] },
		plan: generatePlan({
			questionsBySubject: { mathematics: [{ id: 'q-1', title: 'm1', topic: 'General' }] },
			subjectIds: ['mathematics'],
			subjectNames: { mathematics: 'Mathematics' },
			totalDays: 2,
			hours: 2
		}),
		activeDay: 1,
		view: 'plan'
	};
}

describe('storage adapter', () => {
	it('uses a single versioned key', () => {
		expect(STORAGE_KEY).toBe('daymark.waec-planner.v1');
	});

	it('round-trips a snapshot through serialize/deserialize', () => {
		const original = snapshot();
		original.plan!.days[0].tasks[0].done = true;
		const restored = deserializeSnapshot(serializeSnapshot(original));
		expect(restored).toEqual(original);
	});

	it('returns null for corrupt, wrong-version, or misshapen JSON', () => {
		expect(deserializeSnapshot('not json{')).toBeNull();
		expect(deserializeSnapshot(JSON.stringify({ ...snapshot(), version: 99 }))).toBeNull();
		expect(deserializeSnapshot(JSON.stringify({ version: 1 }))).toBeNull();
		expect(deserializeSnapshot(JSON.stringify(null))).toBeNull();
	});

	it('loads what it saves and wipes on clear', () => {
		const adapter = createMemoryAdapter();
		expect(adapter.load()).toBeNull();
		const original = snapshot();
		adapter.save(original);
		expect(adapter.load()).toEqual(original);
		adapter.clear();
		expect(adapter.load()).toBeNull();
	});
});
