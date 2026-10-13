import { describe, expect, it } from 'vitest';
import { SAMPLE_QUESTIONS } from './subjects';

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
