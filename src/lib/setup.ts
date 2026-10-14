export interface SetupQuestion {
	id: string;
	title: string;
	topic: string;
}

export const DEFAULT_TOPIC = 'General';

export function makeId(prefix = 'q'): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Pure: reconcile freshly pasted titles with the previous question rows so
 * edits, deletes, and reorders keep each question's id and topic.
 * Lines match previous rows by exact text first; unmatched lines inherit
 * the same-index row's topic; lines past the end get the default topic. */
export function syncQuestions(previous: SetupQuestion[], titles: string[]): SetupQuestion[] {
	const byTitle = new Map<string, SetupQuestion[]>();
	for (const question of previous) {
		const bucket = byTitle.get(question.title);
		if (bucket) bucket.push(question);
		else byTitle.set(question.title, [question]);
	}
	const used = new Set<string>();
	return titles.map((title, index) => {
		const match = (byTitle.get(title) ?? []).find((candidate) => !used.has(candidate.id));
		if (match) {
			used.add(match.id);
			return { id: match.id, title, topic: match.topic };
		}
		const inherited = previous[index]?.topic ?? DEFAULT_TOPIC;
		return { id: makeId(), title, topic: inherited };
	});
}
