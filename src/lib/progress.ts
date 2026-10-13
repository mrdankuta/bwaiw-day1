import type { StudyPlan } from './plan';

export interface OverallProgress {
	done: number;
	total: number;
	percent: number;
}

export interface SubjectProgress extends OverallProgress {
	subjectId: string;
	subjectName: string;
}

function percentOf(done: number, total: number): number {
	return total ? Math.round((done / total) * 100) : 0;
}

/** Shared done-count used by both overall and per-subject progress. */
function countDone(tasks: { done: boolean }[]): number {
	return tasks.filter((task) => task.done).length;
}

/** Overall done/total/% across every task in the plan. */
export function overallProgress(plan: StudyPlan | null): OverallProgress {
	if (!plan) return { done: 0, total: 0, percent: 0 };
	const tasks = plan.days.flatMap((day) => day.tasks);
	const done = countDone(tasks);
	return { done, total: tasks.length, percent: percentOf(done, tasks.length) };
}

/** One done/total/% row per plan subject, in plan order.
 * Tasks carry only subjectId, so names resolve through the given map. */
export function perSubjectProgress(
	plan: StudyPlan | null,
	subjectNames: Record<string, string> = {}
): SubjectProgress[] {
	if (!plan) return [];
	return plan.subjectIds.map((subjectId) => {
		const tasks = plan.days.flatMap((day) => day.tasks.filter((t) => t.subjectId === subjectId));
		const done = countDone(tasks);
		return {
			subjectId,
			subjectName: subjectNames[subjectId] ?? subjectId,
			done,
			total: tasks.length,
			percent: percentOf(done, tasks.length)
		};
	});
}
