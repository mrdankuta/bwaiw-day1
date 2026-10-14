<script lang="ts">
	import { onMount } from 'svelte';
	import { splitQuestions } from '../lib/splitter';
	import {
		DEFAULT_DAYS,
		DEFAULT_HOURS,
		DEFAULT_SELECTED,
		MAX_DAYS,
		MAX_HOURS,
		MIN_DAYS,
		MIN_HOURS,
		SAMPLE_QUESTIONS,
		SUBJECTS
	} from '../lib/subjects';
	import { syncQuestions, type SetupQuestion } from '../lib/setup';
	import { generatePlan, replanRemaining, type StudyPlan } from '../lib/plan';
	import { overallProgress, perSubjectProgress } from '../lib/progress';
	import { createLocalStorageAdapter, type PlannerSnapshot } from '../lib/storage';
	import SetupPanel from '../lib/components/SetupPanel.svelte';
	import PlanPanel from '../lib/components/PlanPanel.svelte';
	import ProgressPanel from '../lib/components/ProgressPanel.svelte';
	import Toast from '../lib/components/Toast.svelte';

	type View = 'setup' | 'plan' | 'progress';
	const VIEWS: View[] = ['setup', 'plan', 'progress'];

	let selected: string[] = $state([...DEFAULT_SELECTED]);
	let days: number = $state(DEFAULT_DAYS);
	let hours: number = $state(DEFAULT_HOURS);
	let drafts: Record<string, string> = $state({});
	let questions: Record<string, SetupQuestion[]> = $state({});
	let error: string = $state('');
	let view: View = $state('setup');
	let plan: StudyPlan | null = $state(null);
	let activeDay: number = $state(0);
	let toast: string = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | undefined;
	let hydrated: boolean = $state(false);
	const storage = createLocalStorageAdapter();

	const subjectNames = $derived(Object.fromEntries(SUBJECTS.map((s) => [s.id, s.name])));
	const overall = $derived(overallProgress(plan));
	const subjectRows = $derived(perSubjectProgress(plan, subjectNames));

	function subjectName(id: string): string {
		return SUBJECTS.find((s) => s.id === id)?.name ?? id;
	}

	function questionCount(id: string): number {
		return (questions[id] ?? []).filter((q) => q.title.trim()).length;
	}

	function syncPaste(subjectId: string, text: string): void {
		drafts[subjectId] = text;
		questions[subjectId] = syncQuestions(questions[subjectId] ?? [], splitQuestions(text));
	}

	function loadSample(subjectId: string): void {
		const samples = SAMPLE_QUESTIONS[subjectId];
		if (!samples) return;
		syncPaste(subjectId, samples.join('\n'));
		showToast(`${subjectName(subjectId)} sample loaded.`);
	}

	function toggleSubject(id: string, checked: boolean): void {
		selected = checked ? [...new Set([...selected, id])] : selected.filter((s) => s !== id);
	}

	function updateQuestion(subjectId: string, questionId: string, field: 'title' | 'topic', value: string): void {
		const question = (questions[subjectId] ?? []).find((q) => q.id === questionId);
		if (question) question[field] = value;
	}

	function clampSetup(): void {
		days = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Number(days) || DEFAULT_DAYS));
		hours = Math.max(MIN_HOURS, Math.min(MAX_HOURS, Number(hours) || DEFAULT_HOURS));
	}

	function generate(): void {
		const valid = selected.filter((id) => SUBJECTS.some((s) => s.id === id));
		if (!valid.length) {
			error = 'Choose at least one subject to continue.';
			return;
		}
		const total = valid.reduce((n, id) => n + questionCount(id), 0);
		if (!total) {
			error = 'Add or load at least one past question for your selected subjects.';
			return;
		}
		clampSetup();
		error = '';
		const questionsBySubject: Record<string, SetupQuestion[]> = {};
		for (const id of valid)
			questionsBySubject[id] = (questions[id] ?? []).filter((q) => q.title.trim());
		plan = generatePlan({ questionsBySubject, subjectIds: valid, subjectNames, totalDays: days, hours });
		activeDay = 0;
		setView('plan');
		showToast('Your study plan is ready.');
	}

	function selectDay(index: number): void {
		if (!plan) return;
		activeDay = Math.max(0, Math.min(index, plan.days.length - 1));
	}

	function toggleTask(taskId: string, done: boolean): void {
		if (!plan) return;
		for (const day of plan.days) {
			const task = day.tasks.find((t) => t.id === taskId);
			if (task) {
				task.done = done;
				break;
			}
		}
	}

	function replan(): void {
		if (!plan) return;
		plan = replanRemaining(plan, activeDay);
		showToast('Remaining tasks redistributed across your days.');
	}

	function clearSetup(): void {
		selected = [...DEFAULT_SELECTED];
		days = DEFAULT_DAYS;
		hours = DEFAULT_HOURS;
		drafts = {};
		questions = {};
		error = '';
		plan = null;
		activeDay = 0;
		storage.clear();
		showToast('Setup cleared.');
	}

	function setView(next: View): void {
		view = next;
	}

	function showToast(message: string): void {
		toast = message;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			toast = '';
		}, 2400);
	}

	function onTabKeydown(event: KeyboardEvent, current: View): void {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		const index = VIEWS.indexOf(current);
		const next = VIEWS[Math.max(0, Math.min(VIEWS.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))];
		setView(next);
		document.querySelector<HTMLElement>(`[data-view="${next}"]`)?.focus();
	}

	function takeSnapshot(): PlannerSnapshot {
		return {
			version: 1,
			selected,
			days,
			hours,
			drafts,
			questions,
			plan,
			activeDay,
			view
		};
	}

	function restoreSnapshot(saved: PlannerSnapshot): void {
		selected = [...saved.selected];
		days = saved.days;
		hours = saved.hours;
		drafts = { ...saved.drafts };
		questions = { ...saved.questions };
		plan = saved.plan;
		view = saved.view;
		activeDay = plan ? Math.max(0, Math.min(saved.activeDay, plan.days.length - 1)) : 0;
	}

	onMount(() => {
		const saved = storage.load();
		if (saved) restoreSnapshot(saved);
		hydrated = true;
	});

	$effect(() => {
		if (!hydrated) return;
		storage.save(takeSnapshot());
	});
</script>

<header class="topbar">
	<div class="container topbar-inner">
		<a class="brand" href="/" aria-label="Daymark home"><span class="brand-mark" aria-hidden="true">D</span>daymark</a>
		<span class="save-state"><span class="save-dot" aria-hidden="true"></span><span>Saved on this device</span></span>
	</div>
</header>

<main class="app-wrap">
	<div class="app-heading">
		<p class="eyebrow">WAEC revision planner</p>
		<h1>Make your days<br />count.</h1>
		<p class="intro">Turn past questions into a study plan that fits the time you have left.</p>
	</div>

	<nav class="view-tabs" role="tablist" aria-label="Planner views">
		<button
			class="tab"
			role="tab"
			aria-selected={view === 'setup'}
			aria-controls="view-setup"
			data-view="setup"
			onclick={() => setView('setup')}
			onkeydown={(e) => onTabKeydown(e, 'setup')}>Setup</button
		>
		<button
			class="tab"
			role="tab"
			aria-selected={view === 'plan'}
			aria-controls="view-plan"
			data-view="plan"
			onclick={() => setView('plan')}
			onkeydown={(e) => onTabKeydown(e, 'plan')}>My plan</button
		>
		<button
			class="tab"
			role="tab"
			aria-selected={view === 'progress'}
			aria-controls="view-progress"
			data-view="progress"
			onclick={() => setView('progress')}
			onkeydown={(e) => onTabKeydown(e, 'progress')}>Progress</button
		>
	</nav>

	{#if view === 'setup'}
		<SetupPanel
			{selected}
			bind:days
			bind:hours
			{drafts}
			{questions}
			{error}
			{subjectName}
			{questionCount}
			{toggleSubject}
			{syncPaste}
			{loadSample}
			{updateQuestion}
			{generate}
			{clearSetup}
		/>
	{:else if view === 'plan'}
		<PlanPanel
			{plan}
			{activeDay}
			{overall}
			{subjectName}
			{selectDay}
			{toggleTask}
			{replan}
			goSetup={() => setView('setup')}
		/>
	{:else}
		<ProgressPanel {plan} {overall} {subjectRows} openPlan={() => setView('plan')} />
	{/if}

	<p class="footer-note">Your plan stays in this browser. No account needed.</p>
</main>

<Toast {toast} />
