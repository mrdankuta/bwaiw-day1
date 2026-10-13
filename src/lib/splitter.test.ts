import { describe, expect, it } from 'vitest';
import { splitQuestions } from './splitter';

describe('splitQuestions', () => {
	it('splits multi-line input into one question per non-empty line', () => {
		const input = 'Simplify 3(2x - 4) + 5x.\nSolve 2x + y = 11.\nFind the area of a circle.';
		expect(splitQuestions(input)).toEqual([
			'Simplify 3(2x - 4) + 5x.',
			'Solve 2x + y = 11.',
			'Find the area of a circle.'
		]);
	});

	it('strips leading numbering and bullets', () => {
		const input = [
			'1. Simplify the expression',
			'2) Solve the equation',
			'Q3: Find the area',
			'Question 4. Describe photosynthesis',
			'- Compare plant and animal cells',
			'* Explain osmosis',
			'• Define an ecosystem'
		].join('\n');
		expect(splitQuestions(input)).toEqual([
			'Simplify the expression',
			'Solve the equation',
			'Find the area',
			'Describe photosynthesis',
			'Compare plant and animal cells',
			'Explain osmosis',
			'Define an ecosystem'
		]);
	});

	it('skips empty and whitespace-only lines', () => {
		const input = 'First question\n\n   \nSecond question\n\r\nThird question\n';
		expect(splitQuestions(input)).toEqual(['First question', 'Second question', 'Third question']);
	});

	it('handles single-line input (single-day edge case)', () => {
		expect(splitQuestions('Q1. Only one question')).toEqual(['Only one question']);
		expect(splitQuestions('')).toEqual([]);
		expect(splitQuestions('   ')).toEqual([]);
	});

	it('trims surrounding whitespace and handles CRLF line endings', () => {
		expect(splitQuestions('  padded question  \r\n\t1) numbered with CRLF  ')).toEqual([
			'padded question',
			'numbered with CRLF'
		]);
	});
});
