import { describe, expect, it } from 'vitest';
import { generatePlan, minutesPerTask, replanRemaining } from './plan';
import type { SetupQuestion } from './setup';

function qs(titles: string[]): SetupQuestion[] {
	return titles.map((title, i) => ({ id: `q-${i}`, title, topic: 'General' }));
}

const NAMES = { mathematics: 'Mathematics', english: 'English Language', biology: 'Biology' };

describe('generatePlan', () => {
	it('deals study questions round-robin so every study day mixes subjects', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2', 'm3']),
				english: qs(['e1', 'e2']),
				biology: qs(['b1', 'b2'])
			},
			subjectIds: ['mathematics', 'english', 'biology'],
			subjectNames: NAMES,
			totalDays: 4,
			hours: 2
		});
		expect(plan.days).toHaveLength(4);
		// One pass over every subject per day visit: day 0 [m1,e1,b1], day 1 [m2,e2,b2], day 2 [m3].
		expect(plan.days[0].tasks.map((t) => t.title)).toEqual(['m1', 'e1', 'b1']);
		expect(plan.days[1].tasks.map((t) => t.title)).toEqual(['m2', 'e2', 'b2']);
		expect(plan.days[2].tasks.map((t) => t.title)).toEqual(['m3']);
	});

	it('mixes a small bank across days instead of clumping one subject per day', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2', 'm3']),
				english: qs(['e1', 'e2'])
			},
			subjectIds: ['mathematics', 'english'],
			subjectNames: NAMES,
			totalDays: 3,
			hours: 2
		});
		expect(plan.days).toHaveLength(3);
		expect(plan.days[0].tasks.map((t) => t.title)).toEqual(['m1', 'e1', 'm3']);
		expect(plan.days[1].tasks.map((t) => t.title)).toEqual(['m2', 'e2']);
		for (const day of plan.days.slice(0, 2)) {
			expect(new Set(day.tasks.map((t) => t.subjectId)).size).toBe(2);
		}
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
			totalDays: 5,
			hours: 2
		});
		expect(plan.days).toHaveLength(5);
		expect(plan.days[0].tasks.map((t) => t.title)).toEqual(['m1', 'e1', 'b1']);
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
			totalDays: 4,
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
			totalDays: 2,
			hours: 2
		});
		// 10 study questions over 1 study day: floor(120 / 10) = 12.
		for (const task of plan.days[0].tasks) expect(task.minutes).toBe(12);

		const tight = generatePlan({
			questionsBySubject: { mathematics: qs(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10']) },
			subjectIds: ['mathematics'],
			subjectNames: NAMES,
			totalDays: 2,
			hours: 0.5
		});
		// floor(30 / 10) = 3 would be unusable, so it clamps to 5.
		for (const task of tight.days[0].tasks) expect(task.minutes).toBe(5);
	});

	it('keeps one revision day for a single-day plan with study tasks first and revision last', () => {
		const plan = generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2']),
				english: qs(['e1'])
			},
			subjectIds: ['mathematics', 'english'],
			subjectNames: NAMES,
			totalDays: 1,
			hours: 3
		});
		expect(plan.days).toHaveLength(1);
		expect(plan.days[0].isRevision).toBe(true);
		const tasks = plan.days[0].tasks;
		expect(tasks.filter((t) => !t.isRevision)).toHaveLength(3);
		expect(tasks.filter((t) => t.isRevision)).toHaveLength(2);
		const firstRevision = tasks.findIndex((t) => t.isRevision);
		expect(firstRevision).toBe(3);
		expect(tasks.slice(0, firstRevision).every((t) => !t.isRevision)).toBe(true);
		expect(tasks.slice(firstRevision).every((t) => t.isRevision)).toBe(true);
	});

	it('still produces a revision day when a study day has no questions', () => {
		const plan = generatePlan({
			questionsBySubject: { mathematics: qs(['m1']) },
			subjectIds: ['mathematics'],
			subjectNames: NAMES,
			totalDays: 5,
			hours: 2
		});
		expect(plan.days).toHaveLength(5);
		expect(plan.days[0].tasks.map((t) => t.title)).toEqual(['m1']);
		expect(plan.days[1].tasks).toEqual([]);
		expect(plan.days[4].tasks.filter((t) => t.isRevision)).toHaveLength(1);
	});

	it('stores subjectId only; names resolve through the subjects context', () => {
		const plan = generatePlan({
			questionsBySubject: { mathematics: qs(['m1']) },
			subjectIds: ['mathematics'],
			subjectNames: NAMES,
			totalDays: 2,
			hours: 2
		});
		for (const day of plan.days) {
			for (const task of day.tasks) {
				expect(task.subjectId).toBe('mathematics');
				expect(task).not.toHaveProperty('subjectName');
			}
		}
	});
});

describe('minutesPerTask', () => {
	it('splits the daily budget evenly with a 5-minute floor', () => {
		expect(minutesPerTask(2, 10)).toBe(12);
		expect(minutesPerTask(0.5, 10)).toBe(5);
		expect(minutesPerTask(3, 0)).toBe(180);
	});
});

describe('replanRemaining', () => {
	function fourDayPlan() {
		return generatePlan({
			questionsBySubject: {
				mathematics: qs(['m1', 'm2', 'm3', 'm4']),
				english: qs(['e1', 'e2', 'e3', 'e4'])
			},
			subjectIds: ['mathematics', 'english'],
			subjectNames: NAMES,
			totalDays: 4,
			hours: 2
		});
		// Study layout: day 0 [m1,e1,m4,e4], day 1 [m2,e2], day 2 [m3,e3].
	}

	it('rolls a missed middle day forward onto the remaining study days', () => {
		const plan = fourDayPlan();
		for (const task of plan.days[0].tasks) task.done = true;
		const dayZeroIds = plan.days[0].tasks.map((t) => t.id);
		const revisionIds = plan.days[3].tasks.map((t) => t.id);

		const replanned = replanRemaining(plan, 2);

		// Completed day 0 is unaffected: same tasks, still done.
		expect(replanned.days[0].tasks.map((t) => t.id)).toEqual(dayZeroIds);
		expect(replanned.days[0].tasks.every((t) => t.done)).toBe(true);
		// Missed day 1 rolls forward, so it is left empty.
		expect(replanned.days[1].tasks).toEqual([]);
		// Pending study tasks re-chunk in plan order onto the remaining study day.
		expect(replanned.days[2].tasks.map((t) => t.title)).toEqual(['m2', 'e2', 'm3', 'e3']);
		expect(replanned.days[2].tasks.every((t) => !t.done && !t.isRevision)).toBe(true);
		// Revision day stays last with its revision tasks intact.
		expect(replanned.days[3].isRevision).toBe(true);
		expect(replanned.days[3].tasks.map((t) => t.id)).toEqual(revisionIds);
		expect(replanned.days[3].tasks.every((t) => t.isRevision && !t.done)).toBe(true);
		// Minutes follow the same floor-5 rule: floor(120 / 4) = 30.
		for (const task of replanned.days[2].tasks) expect(task.minutes).toBe(30);
		// Done tasks keep their original estimate: floor(120 / 4) = 30.
		for (const task of replanned.days[0].tasks) expect(task.minutes).toBe(30);
		// The input plan is not mutated.
		expect(plan.days[1].tasks).toHaveLength(2);
		expect(plan.days[2].tasks).toHaveLength(2);
	});

	it('leaves a fully-completed plan untouched', () => {
		const plan = fourDayPlan();
		for (const day of plan.days) for (const task of day.tasks) task.done = true;
		const before = plan.days.map((day) => day.tasks.map((t) => ({ ...t })));

		const replanned = replanRemaining(plan, 1);

		expect(replanned.days).toHaveLength(4);
		for (const [index, day] of replanned.days.entries()) {
			expect(day.tasks).toEqual(before[index]);
			expect(day.isRevision).toBe(plan.days[index].isRevision);
		}
		expect(replanned.days[3].tasks.every((t) => t.isRevision)).toBe(true);
	});

	it('inserts study days before the final day when replanning from the revision day', () => {
		const plan = fourDayPlan();
		for (const task of plan.days[0].tasks) task.done = true;
		const revisionIds = plan.days[3].tasks.map((t) => t.id);

		const replanned = replanRemaining(plan, 3);

		// 4 pending tasks at an average study-day load of 8/3 → 2 fresh study days.
		expect(replanned.days).toHaveLength(6);
		expect(replanned.days[0].tasks.every((t) => t.done)).toBe(true);
		expect(replanned.days[1].tasks).toEqual([]);
		expect(replanned.days[2].tasks).toEqual([]);
		expect(replanned.days[3].tasks.map((t) => t.title)).toEqual(['m2', 'm3']);
		expect(replanned.days[4].tasks.map((t) => t.title)).toEqual(['e2', 'e3']);
		for (const day of replanned.days.slice(3, 5)) {
			expect(day.isRevision).toBe(false);
			expect(day.tasks.every((t) => !t.done && !t.isRevision)).toBe(true);
		}
		// The final day stays revision-only and last with revision tasks intact.
		const final = replanned.days[5];
		expect(final.isRevision).toBe(true);
		expect(final.tasks.map((t) => t.id)).toEqual(revisionIds);
		expect(final.tasks.every((t) => t.isRevision && !t.done)).toBe(true);
		// Fresh days follow the same floor-5 rule: floor(120 / 2) = 60.
		for (const task of replanned.days[3].tasks) expect(task.minutes).toBe(60);
	});

	it('inserts a study day before the final day when replanning a single-day plan', () => {
		const plan = generatePlan({
			questionsBySubject: { mathematics: qs(['m1', 'm2']) },
			subjectIds: ['mathematics'],
			subjectNames: NAMES,
			totalDays: 1,
			hours: 2
		});

		const replanned = replanRemaining(plan, 0);

		expect(replanned.days).toHaveLength(2);
		expect(replanned.days[0].isRevision).toBe(false);
		expect(replanned.days[0].tasks.map((t) => t.title)).toEqual(['m1', 'm2']);
		const final = replanned.days[1];
		expect(final.isRevision).toBe(true);
		expect(final.tasks.every((t) => t.isRevision)).toBe(true);
		expect(final.tasks).toHaveLength(1);
	});
});
