import { describe, expect, it } from 'vitest';
import { syncQuestions, type SetupQuestion } from './setup';

function row(id: string, title: string, topic: string): SetupQuestion {
	return { id, title, topic };
}

describe('syncQuestions', () => {
	it('keeps ids and topics when lines are unchanged', () => {
		const previous = [row('a', 'm1', 'Algebra'), row('b', 'm2', 'Geometry')];
		expect(syncQuestions(previous, ['m1', 'm2'])).toEqual(previous);
	});

	it('preserves topics by exact text when a line is deleted', () => {
		const previous = [row('a', 'm1', 'Algebra'), row('b', 'm2', 'Geometry'), row('c', 'm3', 'Trig')];
		const next = syncQuestions(previous, ['m1', 'm3']);
		expect(next).toEqual([row('a', 'm1', 'Algebra'), row('c', 'm3', 'Trig')]);
	});

	it('preserves topics by exact text when lines are reordered', () => {
		const previous = [row('a', 'm1', 'Algebra'), row('b', 'm2', 'Geometry')];
		const next = syncQuestions(previous, ['m2', 'm1']);
		expect(next).toEqual([row('b', 'm2', 'Geometry'), row('a', 'm1', 'Algebra')]);
	});

	it('inherits the same-index topic for a genuinely new line', () => {
		const previous = [row('a', 'm1', 'Algebra')];
		const next = syncQuestions(previous, ['m1-edited']);
		expect(next[0].topic).toBe('Algebra');
		expect(next[0].id).not.toBe('a');
	});

	it('uses the default topic for lines past the end of the previous rows', () => {
		const next = syncQuestions([], ['brand new']);
		expect(next[0].topic).toBe('General');
	});
});
