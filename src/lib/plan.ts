import type { SetupQuestion } from './setup';

export interface PlanTask {
	id: string;
	subjectId: string;
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

/** Everything the generator needs to know about the chosen subjects. */
export interface SubjectsContext {
	questionsBySubject: Record<string, SetupQuestion[]>;
	subjectIds: string[];
	subjectNames: Record<string, string>;
}

export interface GeneratePlanInput extends SubjectsContext {
	totalDays: number;
	hours: number;
}

/** Shared rule: split the daily budget evenly across a day's tasks, never below 5 minutes each. */
export function minutesPerTask(hours: number, taskCount: number): number {
	return Math.max(5, Math.floor((hours * 60) / Math.max(taskCount, 1)));
}

interface QueuedQuestion {
	subjectId: string;
	title: string;
	topic: string;
}

function revisionTitle(totalDays: number, subjectName: string): string {
	return totalDays === 1
		? `Quick review and mock: ${subjectName}`
		: 'Review key topics and attempt a timed mock';
}

/** Pure rule-based generator: deal each subject's questions round-robin
 * across the study days so every day mixes subjects, then reserve the
 * final day for one revision/mock task per subject. A single-day plan
 * keeps one revision day with study tasks first and revision tasks last. */
export function generatePlan(input: GeneratePlanInput): StudyPlan {
	const totalDays = Math.max(1, Math.min(90, Math.floor(Number(input.totalDays) || 1)));
	const hours = Math.max(0.5, Math.min(16, Number(input.hours) || 3));
	const subjectIds = [...input.subjectIds];

	const queues: QueuedQuestion[][] = subjectIds.map((id) =>
		(input.questionsBySubject[id] ?? []).map((q) => ({
			subjectId: id,
			title: q.title,
			topic: q.topic
		}))
	);

	const planDays: PlanDay[] = Array.from({ length: totalDays }, (_, i) => ({
		isRevision: i === totalDays - 1,
		tasks: []
	}));
	const studyDayCount = totalDays === 1 ? 1 : totalDays - 1;
	let counter = 0;
	const pushStudy = (dayIndex: number, q: QueuedQuestion): void => {
		planDays[dayIndex].tasks.push({
			id: `task-${dayIndex}-${counter++}`,
			subjectId: q.subjectId,
			title: q.title,
			topic: q.topic,
			minutes: 0,
			done: false,
			isRevision: false
		});
	};
	// Deal one pass over every subject per day visit so small banks still mix.
	let dayIndex = 0;
	while (queues.some((queue) => queue.length)) {
		const dayIndexIntoPlan = dayIndex % studyDayCount;
		for (const queue of queues) {
			const next = queue.shift();
			if (next) pushStudy(dayIndexIntoPlan, next);
		}
		dayIndex++;
	}
	for (const id of subjectIds) {
		const subjectName = input.subjectNames[id] ?? id;
		planDays[totalDays - 1].tasks.push({
			id: `task-${totalDays - 1}-${counter++}`,
			subjectId: id,
			title: revisionTitle(totalDays, subjectName),
			topic: 'Final revision',
			minutes: 0,
			done: false,
			isRevision: true
		});
	}
	for (const day of planDays) {
		const minutesEach = minutesPerTask(hours, day.tasks.length);
		for (const task of day.tasks) task.minutes = minutesEach;
	}
	return { subjectIds, days: planDays, hours, generatedAt: Date.now() };
}

/** Pure replan: keep done tasks in place, redistribute incomplete
 * non-revision tasks round-robin across the active day through the
 * day before revision. When the active day IS the final revision day,
 * insert fresh study day(s) before it for the pending tasks so the
 * revision day stays revision-only and last. */
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

	if (start >= finalIndex && pending.length) {
		const studyLoad = plan.days.slice(0, finalIndex).reduce((n, day) => n + day.tasks.length, 0);
		const averageLoad = finalIndex > 0 ? studyLoad / finalIndex : pending.length;
		const newDayCount = Math.max(1, Math.ceil(pending.length / Math.max(averageLoad, 1)));
		const fresh: PlanTask[][] = Array.from({ length: newDayCount }, () => []);
		pending.forEach((task, i) => {
			fresh[i % newDayCount].push(task);
		});
		const days: PlanDay[] = [];
		for (let i = 0; i < finalIndex; i++) {
			days.push({ isRevision: plan.days[i].isRevision, tasks: kept[i] });
		}
		for (const tasks of fresh) days.push({ isRevision: false, tasks });
		// Revision tasks stay intact and last on the final day; done history stays ahead of them.
		const finalDone = kept[finalIndex].filter((task) => !task.isRevision);
		const finalRevision = kept[finalIndex].filter((task) => task.isRevision);
		days.push({ isRevision: true, tasks: [...finalDone, ...finalRevision] });
		for (const day of days) {
			const minutesEach = minutesPerTask(plan.hours, day.tasks.length);
			for (const task of day.tasks) {
				if (!task.done) task.minutes = minutesEach;
			}
		}
		return { subjectIds: [...plan.subjectIds], days, hours: plan.hours, generatedAt: plan.generatedAt };
	}

	const openStudyDays: number[] = [];
	for (let i = start; i < finalIndex; i++) openStudyDays.push(i);
	if (!openStudyDays.length) openStudyDays.push(finalIndex);
	pending.forEach((task, i) => {
		kept[openStudyDays[i % openStudyDays.length]].push(task);
	});

	const days: PlanDay[] = plan.days.map((day, index) => {
		const tasks = kept[index];
		const minutesEach = minutesPerTask(plan.hours, tasks.length);
		for (const task of tasks) {
			if (!task.done) task.minutes = minutesEach;
		}
		return { isRevision: day.isRevision, tasks };
	});
	return { subjectIds: [...plan.subjectIds], days, hours: plan.hours, generatedAt: plan.generatedAt };
}
