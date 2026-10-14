import { describe, expect, it } from 'vitest';
import { overallProgress, perSubjectProgress } from './progress';
import { generatePlan } from './plan';
import type { SetupQuestion } from './setup';

function qs(titles: string[]): SetupQuestion[] {
	return titles.map((title, i) => ({ id: `q-${i}`, title, topic: 'General' }));
}

const NAMES = { mathematics: 'Mathematics', english: 'English Language' };

describe('overallProgress', () => {
	it('returns zero progress when there is no plan', () => {
		expect(overallProgress(null)).toEqual({ done: 0, total: 0, percent: 0 });
	});

	it('computes done/total and rounded percent from task flags', () => {
		const plan = generatePlan({
			questionsBySubject: { mathematics: qs(['m1', 'm2', 'm3']), english: qs(['e1']) },
			subjectIds: ['mathematics', 'english'],
			subjectNames: NAMES,
			totalDays: 2,
			hours: 2
		});
		// 4 study tasks + 2 revision tasks = 6 total.
		expect(overallProgress(plan)).toEqual({ done: 0, total: 6, percent: 0 });
		plan.days[0].tasks[0].done = true;
		plan.days[1].tasks[0].done = true;
		expect(overallProgress(plan)).toEqual({ done: 2, total: 6, percent: 33 });
	});
});

describe('perSubjectProgress', () => {
	it('returns one row per subject with done/total and rounded percent', () => {
		const plan = generatePlan({
			questionsBySubject: { mathematics: qs(['m1', 'm2']), english: qs(['e1']) },
			subjectIds: ['mathematics', 'english'],
			subjectNames: NAMES,
			totalDays: 2,
			hours: 2
		});
		// mathematics: 2 study + 1 revision = 3; english: 1 study + 1 revision = 2.
		expect(perSubjectProgress(plan, NAMES)).toEqual([
			{ subjectId: 'mathematics', subjectName: 'Mathematics', done: 0, total: 3, percent: 0 },
			{ subjectId: 'english', subjectName: 'English Language', done: 0, total: 2, percent: 0 }
		]);
		plan.days[0].tasks.find((t) => t.subjectId === 'mathematics')!.done = true;
		expect(perSubjectProgress(plan, NAMES)[0]).toMatchObject({ done: 1, total: 3, percent: 33 });
	});

	it('falls back to the subject id when no name is provided', () => {
		const plan = generatePlan({
			questionsBySubject: { mathematics: qs(['m1']) },
			subjectIds: ['mathematics'],
			subjectNames: {},
			totalDays: 2,
			hours: 2
		});
		expect(perSubjectProgress(plan)[0]).toMatchObject({
			subjectId: 'mathematics',
			subjectName: 'mathematics'
		});
	});

	it('returns no rows when there is no plan', () => {
		expect(perSubjectProgress(null)).toEqual([]);
	});
});
