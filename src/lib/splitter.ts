/** Split pasted plain text into one question per non-empty line.
 * Leading numbering/bullets (e.g. "1.", "2)", "Q3:", "Question 4.", "-", "*", "•")
 * are stripped; surrounding whitespace is trimmed. */
export function splitQuestions(text: string): string[] {
	return String(text ?? '')
		.split(/\r?\n/)
		.map((line) =>
			line
				.trim()
				.replace(/^\s*(?:(?:q(?:uestion)?\s*)?\d{1,3}[.)\]:-]?\s*|[-*•]\s+)/i, '')
				.trim()
		)
		.filter(Boolean);
}
