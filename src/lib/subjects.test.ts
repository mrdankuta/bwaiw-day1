import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTIONS, SUBJECTS } from './subjects';

describe('subject catalog', () => {
	it('tags every subject with its exam board so other exams can extend the catalog', () => {
		expect(SUBJECTS.length).toBeGreaterThan(0);
		for (const subject of SUBJECTS) {
			expect(subject.exam).toBe('WAEC');
		}
	});
});

describe('seeded samples', () => {
	for (const subjectId of ['mathematics', 'english', 'biology']) {
		it(`provides at least 15 sample questions for ${subjectId}`, () => {
			const samples = SAMPLE_QUESTIONS[subjectId] ?? [];
			expect(samples.length).toBeGreaterThanOrEqual(15);
			for (const sample of samples) {
				expect(sample.trim().length).toBeGreaterThan(0);
			}
		});
	}
});
