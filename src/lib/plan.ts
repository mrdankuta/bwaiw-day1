import type { SetupQuestion } from './setup';

export interface PlanTask {
	id: string;
	subjectId: string;
	subjectName: string;
	title: string;
	topic: string;
	minutes: number;
	done: boolean;
	isRevision: boolean;
}

export interface PlanDay {
	isRevision: boolean;
	tasks: PlanTask[];
}

export interface StudyPlan {
	subjectIds: string[];
	days: PlanDay[];
	hours: number;
	generatedAt: number;
}

export interface GeneratePlanInput {
	questionsBySubject: Record<string, SetupQuestion[]>;
	subjectIds: string[];
	subjectNames: Record<string, string>;
	days: number;
	hours: number;
}

/** Pure rule-based generator: round-robin questions across study days,
 * final day reserved for one revision/mock task per subject. */
export function generatePlan(input: GeneratePlanInput): StudyPlan {
	const days = Math.max(1, Math.min(90, Math.floor(Number(input.days) || 1)));
	const hours = Math.max(0.5, Math.min(16, Number(input.hours) || 3));
	const subjectIds = [...input.subjectIds];

	const queues = subjectIds.map((id) =>
		(input.questionsBySubject[id] ?? []).map((q) => ({
			subjectId: id,
			subjectName: input.subjectNames[id] ?? id,
			title: q.title,
			topic: q.topic
		}))
	);
	const interleaved: { subjectId: string; subjectName: string; title: string; topic: string }[] = [];
	while (queues.some((queue) => queue.length)) {
		for (const queue of queues) {
			const next = queue.shift();
			if (next) interleaved.push(next);
		}
	}

	const planDays: PlanDay[] = Array.from({ length: days }, (_, i) => ({
		isRevision: i === days - 1,
		tasks: []
	}));
	const studyDays = days === 1 ? 1 : days - 1;
	let counter = 0;
	interleaved.forEach((q, i) => {
		const dayIndex = days === 1 ? 0 : i % studyDays;
		planDays[dayIndex].tasks.push({
			id: `task-${dayIndex}-${counter++}`,
			subjectId: q.subjectId,
			subjectName: q.subjectName,
			title: q.title,
			topic: q.topic,
			minutes: 0,
			done: false,
			isRevision: false
		});
	});
	for (const id of subjectIds) {
		planDays[days - 1].tasks.push({
			id: `task-${days - 1}-${counter++}`,
			subjectId: id,
			subjectName: input.subjectNames[id] ?? id,
			title:
				days === 1 ? `Quick review and mock: ${input.subjectNames[id] ?? id}` : 'Review key topics and attempt a timed mock',
			topic: 'Final revision',
			minutes: 0,
			done: false,
			isRevision: true
		});
	}
	for (const day of planDays) {
		const minutesEach = Math.max(5, Math.floor((hours * 60) / Math.max(day.tasks.length, 1)));
		for (const task of day.tasks) task.minutes = minutesEach;
	}
	return { subjectIds, days: planDays, hours, generatedAt: Date.now() };
}

/** Pure replan: keep done tasks in place, redistribute incomplete
 * non-revision tasks round-robin across the active day through the
 * day before revision; the revision day stays last and intact. */
export function replanRemaining(plan: StudyPlan, activeDayIndex: number): StudyPlan {
	const total = plan.days.length;
	const start = Math.max(0, Math.min(Math.floor(activeDayIndex) || 0, total - 1));
	const finalIndex = total - 1;

	const kept: PlanTask[][] = plan.days.map((day) =>
		day.tasks.filter((task) => task.done || task.isRevision).map((task) => ({ ...task }))
	);
	const pending: PlanTask[] = plan.days.flatMap((day) =>
		day.tasks.filter((task) => !task.done && !task.isRevision).map((task) => ({ ...task }))
	);

	const openStudyDays: number[] = [];
	for (let i = start; i < finalIndex; i++) openStudyDays.push(i);
	if (!openStudyDays.length) openStudyDays.push(finalIndex);
	pending.forEach((task, i) => {
		kept[openStudyDays[i % openStudyDays.length]].push(task);
	});

	const days: PlanDay[] = plan.days.map((day, index) => {
		const tasks = kept[index];
		const minutesEach = Math.max(5, Math.floor((plan.hours * 60) / Math.max(tasks.length, 1)));
		for (const task of tasks) {
			if (!task.done) task.minutes = minutesEach;
		}
		return { isRevision: day.isRevision, tasks };
	});
	return { subjectIds: [...plan.subjectIds], days, hours: plan.hours, generatedAt: plan.generatedAt };
}
