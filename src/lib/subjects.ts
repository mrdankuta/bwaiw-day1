export type ExamBoard = 'WAEC' | 'JAMB' | 'NECO' | 'GCSE';

export interface Subject {
	id: string;
	name: string;
	exam: ExamBoard;
}

export const SUBJECTS: Subject[] = [
	{ id: 'mathematics', name: 'Mathematics', exam: 'WAEC' },
	{ id: 'english', name: 'English Language', exam: 'WAEC' },
	{ id: 'biology', name: 'Biology', exam: 'WAEC' },
	{ id: 'chemistry', name: 'Chemistry', exam: 'WAEC' },
	{ id: 'physics', name: 'Physics', exam: 'WAEC' },
	{ id: 'economics', name: 'Economics', exam: 'WAEC' },
	{ id: 'government', name: 'Government', exam: 'WAEC' },
	{ id: 'geography', name: 'Geography', exam: 'WAEC' },
	{ id: 'commerce', name: 'Commerce', exam: 'WAEC' }
];

export const DEFAULT_SELECTED = ['mathematics', 'english', 'biology'];
export const DEFAULT_DAYS = 14;
export const DEFAULT_HOURS = 3;
export const MIN_DAYS = 1;
export const MAX_DAYS = 90;
export const MIN_HOURS = 0.5;
export const MAX_HOURS = 16;

/** Seeded WAEC-style sample questions (Maths, English, Biology only). */
export const SAMPLE_QUESTIONS: Record<string, string[]> = {
	mathematics: [
		'Simplify the expression 3(2x − 4) + 5x.',
		'Solve the simultaneous equations 2x + y = 11 and x − y = 1.',
		'Find the area of a circle with radius 7 cm, taking π = 22/7.',
		'A trader buys an item for ₦8,000 and sells it for ₦9,600. Find the percentage profit.',
		'Factorise completely: 6x² − 11x + 4.',
		'If log₁₀2 = 0.3010, find the value of log₁₀80.',
		'A bag contains 4 red and 6 blue balls. A ball is picked at random. Find the probability that it is red.',
		'Solve the quadratic equation x² − 5x + 6 = 0.',
		'The angles of a triangle are in the ratio 2:3:4. Find the largest angle.',
		'Simplify (27)⅓ + (16)½.',
		'A car travels 240 km in 3 hours. Find its average speed in m/s.',
		'Find the median of the numbers 4, 7, 2, 9, 5.',
		'If y varies directly as x and y = 12 when x = 4, find y when x = 7.',
		'A sum of ₦50,000 is invested at 8% simple interest per annum. Find the interest after 3 years.',
		'Find the value of x if 3ˣ = 81.',
		'The length of a rectangle is 5 cm more than its width. If the perimeter is 38 cm, find the width.'
	],
	english: [
		'Identify the noun clause in the sentence: I know that she is honest.',
		'Write a formal letter to your principal requesting a new science laboratory.',
		'Choose the word nearest in meaning to “diligent”.',
		'Read the passage and identify its main idea and supporting details.',
		'Fill in the blank: Neither the teacher nor the students ___ present. (was / were)',
		'Rewrite the sentence in reported speech: “I will come tomorrow,” she said.',
		'Identify the figure of speech: The wind whispered through the trees.',
		'Write an essay of not less than 250 words on the topic: The value of hard work.',
		'Choose the correctly spelt word: (a) occassion (b) occasion (c) ocassion (d) occation.',
		'Change the following sentence to passive voice: The students cleaned the classroom.',
		'Provide a synonym for “abundant” as used in the passage.',
		'Identify the grammatical name and function of the underlined phrase in the sentence.',
		'Write a summary of the passage in one paragraph, stating its key points.',
		'Complete the sentence with the correct preposition: She has been living here ___ 2019.',
		'Distinguish between the meanings of “advice” and “advise”, giving one example of each.',
		'Punctuate the following sentence correctly: what a beautiful morning it is.'
	],
	biology: [
		'Describe the process of photosynthesis and state two factors that affect its rate.',
		'Compare the structure of a plant cell with that of an animal cell.',
		'Explain how water moves through a plant from the roots to the leaves.',
		'Describe the role of decomposers in an ecosystem.',
		'State three differences between sexual and asexual reproduction.',
		'Explain the process of osmosis and give one example in living organisms.',
		'Describe the structure and function of the mammalian heart.',
		'State two reasons for conserving natural resources.',
		'Explain how the small intestine is adapted for the absorption of digested food.',
		'Describe an experiment to show that carbon dioxide is necessary for photosynthesis.',
		'State the functions of three parts of a flower involved in reproduction.',
		'Explain the causes and effects of water pollution in a named habitat.',
		'Describe the nitrogen cycle and state the role of bacteria in it.',
		'Distinguish between complete and incomplete metamorphosis, giving one example of each.',
		'Explain how the eye focuses on near and distant objects.',
		'State three adaptations of desert plants to water shortage.'
	]
};
