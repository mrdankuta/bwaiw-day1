import { describe, expect, it } from 'vitest';
import { generatePlan } from './plan';
import type { SetupQuestion } from './setup';

function qs(titles: string[]): SetupQuestion[] {
	return titles.map((title, i) => ({ id: `q-${i}`, title, topic: 'General' }));
}

const NAMES = { mathematics: 'Mathematics', english: 'English Language', biology: 'Biology' };

describe('generatePlan', () => {
	it('splits study questions evenly across study days', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2', 'm3']),
				english: qs(['e1', 'e2']),
				biology: qs(['b1', 'b2'])
			},
			subjectIds: ['mathematics', 'english', 'biology'],
			subjectNames: NAMES,
			days: 4,
			hours: 2
		});
		expect(plan.days).toHaveLength(4);
		// Interleaved round-robin [m1,e1,b1,m2,e2,b2,m3] dealt over 3 study days.
		expect(plan.days[0].tasks.map((t) => t.title)).toEqual(['m1', 'm2', 'm3']);
		expect(plan.days[1].tasks.map((t) => t.title)).toEqual(['e1', 'e2']);
		expect(plan.days[2].tasks.map((t) => t.title)).toEqual(['b1', 'b2']);
	});

	it('mixes subjects within a day when there are enough questions', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2', 'm3', 'm4']),
				english: qs(['e1', 'e2', 'e3', 'e4']),
				biology: qs(['b1', 'b2', 'b3', 'b4'])
			},
			subjectIds: ['mathematics', 'english', 'biology'],
			subjectNames: NAMES,
			days: 5,
			hours: 2
		});
		expect(plan.days).toHaveLength(5);
		expect(plan.days[0].tasks.map((t) => t.title)).toEqual(['m1', 'e2', 'b3']);
		for (const day of plan.days.slice(0, 4)) {
			expect(new Set(day.tasks.map((t) => t.subjectId)).size).toBe(3);
		}
	});

	it('reserves the final day for revision with one mock task per subject', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2']),
				english: qs(['e1'])
			},
			subjectIds: ['mathematics', 'english'],
			subjectNames: NAMES,
			days: 4,
			hours: 2
		});
		const final = plan.days[3];
		expect(final.isRevision).toBe(true);
		expect(final.tasks).toHaveLength(2);
		expect(final.tasks.map((t) => t.subjectId).sort()).toEqual(['english', 'mathematics']);
		for (const task of final.tasks) {
			expect(task.isRevision).toBe(true);
			expect(task.done).toBe(false);
		}
		for (const day of plan.days.slice(0, 3)) {
			expect(day.isRevision).toBe(false);
			expect(day.tasks.some((t) => t.isRevision)).toBe(false);
		}
	});

	it('derives daily minutes from hours per day with a 5-minute floor', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2', 'm3', 'm4']),
				english: qs(['e1', 'e2', 'e3', 'e4']),
				biology: qs(['b1', 'b2'])
			},
			subjectIds: ['mathematics', 'english', 'biology'],
			subjectNames: NAMES,
			days: 2,
			hours: 2
		});
		// 10 study questions over 1 study day: floor(120 / 10) = 12.
		for (const task of plan.days[0].tasks) expect(task.minutes).toBe(12);

		const tight = generatePlan({
			questionsBySubject: { mathematics: qs(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10']) },
			subjectIds: ['mathematics'],
			subjectNames: NAMES,
			days: 2,
			hours: 0.5
		});
		// floor(30 / 10) = 3 would be unusable, so it clamps to 5.
		for (const task of tight.days[0].tasks) expect(task.minutes).toBe(5);
	});

	it('puts everything on one day when there is a single day', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2']),
				english: qs(['e1'])
			},
			subjectIds: ['mathematics', 'english'],
			subjectNames: NAMES,
			days: 1,
			hours: 3
		});
		expect(plan.days).toHaveLength(1);
		const titles = plan.days[0].tasks.map((t) => t.title);
		expect(titles).toContain('m1');
		expect(titles).toContain('m2');
		expect(titles).toContain('e1');
		const revision = plan.days[0].tasks.filter((t) => t.isRevision);
		expect(revision).toHaveLength(2);
		expect(plan.days[0].tasks.filter((t) => !t.isRevision)).toHaveLength(3);
	});

	it('still produces a revision day when a study day has no questions', () => {
		const plan = generatePlan({
			questionsBySubject: { mathematics: qs(['m1']) },
			subjectIds: ['mathematics'],
			subjectNames: NAMES,
			days: 5,
			hours: 2
		});
		expect(plan.days).toHaveLength(5);
		expect(plan.days[0].tasks.map((t) => t.title)).toEqual(['m1']);
		expect(plan.days[1].tasks).toEqual([]);
		expect(plan.days[4].tasks.filter((t) => t.isRevision)).toHaveLength(1);
	});
});
