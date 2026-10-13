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
	import { DEFAULT_TOPIC, makeId, type SetupQuestion } from '../lib/setup';
	import { generatePlan, replanRemaining, type StudyPlan } from '../lib/plan';
	import { overallProgress, perSubjectProgress } from '../lib/progress';
	import { createLocalStorageAdapter, type PlannerSnapshot } from '../lib/storage';

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

	const overall = $derived(overallProgress(plan));
	const subjectRows = $derived(perSubjectProgress(plan));

	function subjectName(id: string): string {
		return SUBJECTS.find((s) => s.id === id)?.name ?? id;
	}

	function questionCount(id: string): number {
		return (questions[id] ?? []).filter((q) => q.title.trim()).length;
	}

	function totalQuestions(): number {
		return selected.reduce((n, id) => n + questionCount(id), 0);
	}

	function syncPaste(subjectId: string, text: string): void {
		drafts[subjectId] = text;
		const previous = questions[subjectId] ?? [];
		questions[subjectId] = splitQuestions(text).map((title, i) => ({
			id: previous[i]?.id ?? makeId(),
			title,
			topic: previous[i]?.topic ?? DEFAULT_TOPIC
		}));
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
		const subjectNames: Record<string, string> = {};
		for (const subject of SUBJECTS) subjectNames[subject.id] = subject.name;
		const questionsBySubject: Record<string, SetupQuestion[]> = {};
		for (const id of valid)
			questionsBySubject[id] = (questions[id] ?? []).filter((q) => q.title.trim());
		plan = generatePlan({ questionsBySubject, subjectIds: valid, subjectNames, days, hours });
		activeDay = 0;
		setView('plan');
		showToast('Your study plan is ready.');
	}

	function planTasks() {
		return plan ? plan.days.flatMap((day) => day.tasks) : [];
	}

	function planDone(): number {
		return planTasks().filter((task) => task.done).length;
	}

	function planTotal(): number {
		return planTasks().length;
	}

	function planPercent(): number {
		const total = planTotal();
		return total ? Math.round((planDone() / total) * 100) : 0;
	}

	function selectDay(index: number): void {
		if (!plan) return;
		activeDay = Math.max(0, Math.min(index, plan.days.length - 1));
	}

	function currentDay() {
		if (!plan) return null;
		return plan.days[Math.max(0, Math.min(activeDay, plan.days.length - 1))];
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
		<section id="view-setup" role="tabpanel" aria-label="Setup">
			<div class="panel">
				<div class="panel-head">
					<div>
						<h2>Build your plan</h2>
						<p class="panel-note">Choose your subjects and tell us what time you can give them.</p>
					</div>
					<button class="btn btn-secondary" type="button" onclick={replan}>Replan remaining</button>
				</div>
				<div class="setup-grid">
					<div>
						<p class="subheading">Your subjects</p>
						<div class="subject-grid">
							{#each SUBJECTS as subject (subject.id)}
								<label class="subject-choice">
									<input
										type="checkbox"
										value={subject.id}
										checked={selected.includes(subject.id)}
										onchange={(e) => toggleSubject(subject.id, e.currentTarget.checked)}
									/>
									<span>{subject.name}</span>
								</label>
							{/each}
						</div>
						<div class="field-grid">
							<div class="field">
								<label for="days-input">Days until exam</label>
								<input
									class="input"
									id="days-input"
									type="number"
									min={MIN_DAYS}
									max={MAX_DAYS}
									bind:value={days}
								/>
								<div class="field-help">1–90 days, including your final revision day.</div>
							</div>
							<div class="field">
								<label for="hours-input">Hours per day</label>
								<input
									class="input"
									id="hours-input"
									type="number"
									min={MIN_HOURS}
									max={MAX_HOURS}
									step="0.5"
									bind:value={hours}
								/>
								<div class="field-help">Your study time each day.</div>
							</div>
						</div>
					</div>
					<div>
						<p class="subheading">Past questions</p>
						<p class="panel-note">
							Paste one question per line, or load a sample to try it out. You can edit each title
							and topic before planning.
						</p>
						{#if selected.length === 0}
							<div class="question-list">
								<div class="empty-state">Select at least one subject to add past questions.</div>
							</div>
						{/if}
						{#each selected as subjectId (subjectId)}
							<div class="subject-import">
								<div class="import-top">
									<strong>{subjectName(subjectId)}</strong>
									{#if SAMPLE_QUESTIONS[subjectId]}
										<button type="button" class="text-link" onclick={() => loadSample(subjectId)}>
											Load sample questions
										</button>
									{/if}
								</div>
								<textarea
									class="textarea"
									aria-label="Paste {subjectName(subjectId)} questions"
									placeholder="Paste one question per line"
									value={drafts[subjectId] ?? (questions[subjectId] ?? []).map((q) => q.title).join('\n')}
									oninput={(e) => syncPaste(subjectId, e.currentTarget.value)}
								></textarea>
								<div class="field-help">
									{questionCount(subjectId)}
									{questionCount(subjectId) === 1 ? 'question' : 'questions'} · numbering is removed automatically
								</div>
								<div class="question-list">
									{#each (questions[subjectId] ?? []) as q, index (q.id)}
										<div class="question-edit">
											<input
												class="input"
												aria-label="Question {index + 1} title"
												value={q.title}
												oninput={(e) => updateQuestion(subjectId, q.id, 'title', e.currentTarget.value)}
											/>
											<input
												class="input"
												aria-label="Topic for question {index + 1}"
												placeholder="Topic"
												value={q.topic}
												oninput={(e) => updateQuestion(subjectId, q.id, 'topic', e.currentTarget.value)}
											/>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
				<div class="button-row">
					<button class="btn btn-primary" onclick={generate}>Generate my plan</button>
					<button class="btn btn-secondary" type="button" onclick={clearSetup}>Clear setup</button>
				</div>
				<p class="inline-status" role="status" aria-live="polite">{error}</p>
			</div>
		</section>
	{:else if view === 'plan'}
		<section id="view-plan" role="tabpanel" aria-label="My plan">
			<div class="panel">
				<div class="panel-head">
					<div>
						<h2>Your study plan</h2>
						<p class="panel-note" id="plan-subtitle">
							{#if plan}
								{plan.days.length} days · {plan.subjectIds.length} subjects · {plan.hours} hours available each day
							{:else}
								A day-by-day checklist, balanced across your subjects.
							{/if}
						</p>
					</div>
					<button class="btn btn-secondary" type="button" onclick={replan}>Replan remaining</button>
				</div>
				{#if plan && currentDay()}
					{@const done = planDone()}
					{@const total = planTotal()}
					{@const day = currentDay()!}
					{@const dayDone = day.tasks.filter((t) => t.done).length}
					<div class="plan-summary">
						<div class="summary-cell">
							<span class="summary-label">Days left</span><span class="summary-value"
								>{plan.days.length}</span
							>
						</div>
						<div class="summary-cell">
							<span class="summary-label">Completed</span><span class="summary-value"
								>{done} / {total}</span
							>
						</div>
						<div class="summary-cell">
							<span class="summary-label">Overall</span><span class="summary-value"
								>{planPercent()}%</span
							>
						</div>
					</div>
					<div class="day-strip" role="tablist" aria-label="Choose a study day">
						{#each plan.days as planDay, index (index)}
							{@const count = planDay.tasks.filter((t) => t.done).length}
							<button
								class="day-button"
								type="button"
								role="tab"
								aria-pressed={index === activeDay}
								aria-label="{planDay.isRevision
									? 'Revision'
									: `Day ${index + 1}`}, {count} of {planDay.tasks.length} tasks complete"
								onclick={() => selectDay(index)}
								><span class="day-n">{planDay.isRevision ? 'Review' : `Day ${index + 1}`}</span
								><span class="day-count">{count}/{planDay.tasks.length} done</span></button
							>
						{/each}
					</div>
					<div class="day-title-row">
						<h3>{day.isRevision ? 'Final review' : `Day ${activeDay + 1}`}</h3>
						<span class="day-meta">{dayDone} of {day.tasks.length} complete</span>
					</div>
					<div class="task-list">
						{#each day.tasks as task (task.id)}
							<label class="task" class:done={task.done}>
								<input
									type="checkbox"
									checked={task.done}
									aria-label="Mark {task.title} {task.done ? 'not done' : 'done'}"
									onchange={(e) => toggleTask(task.id, e.currentTarget.checked)}
								/>
								<span>
									<span class="task-title">{task.title}</span>
									<span class="task-sub">
										<span class="task-subject">{task.subjectName}</span>
										<span>{task.topic}</span>
										{#if task.isRevision}<span>Revision / mock</span>{/if}
									</span>
								</span>
								<span class="task-duration">{task.minutes} min</span>
							</label>
						{:else}
							<p class="empty-day">
								Nothing scheduled for this day. Catch up on other days to stay on track.
							</p>
						{/each}
					</div>
				{:else}
					<div class="empty-state">
						Your plan will appear here after you generate it from Setup.
					</div>
				{/if}
				<div class="button-row">
					<button class="btn btn-secondary" onclick={() => setView('setup')}>Edit plan settings</button>
				</div>
			</div>
		</section>
	{:else}
		<section id="view-progress" role="tabpanel" aria-label="Progress">
			<div class="panel">
				<div class="panel-head">
					<div>
						<h2>Your progress</h2>
						<p class="panel-note">A clear view of what’s complete and what still needs time.</p>
					</div>
					<button class="btn btn-secondary" type="button" onclick={replan}>Replan remaining</button>
				</div>
				{#if plan}
					<div class="progress-overview">
						<div>
							<div class="progress-number">{overall.percent}%</div>
							<div class="progress-caption">{overall.done} of {overall.total} tasks complete</div>
						</div>
						<div>
							<div
								class="progress-track"
								role="progressbar"
								aria-label="Overall progress"
								aria-valuemin="0"
								aria-valuemax="100"
								aria-valuenow={overall.percent}
							>
								<div class="progress-fill" style="width: {overall.percent}%"></div>
							</div>
							<p class="progress-caption">
								Keep moving through the checklist. Your completed work is saved automatically.
							</p>
						</div>
					</div>
					<div class="subject-progress-list">
						{#each subjectRows as row (row.subjectId)}
							<div>
								<div class="subject-progress-top">
									<span>{row.subjectName}</span><span>{row.done}/{row.total} · {row.percent}%</span>
								</div>
								<div
									class="progress-track"
									role="progressbar"
									aria-label="{row.subjectName} progress"
									aria-valuemin="0"
									aria-valuemax="100"
									aria-valuenow={row.percent}
								>
									<div class="progress-fill subject-fill" style="width: {row.percent}%"></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state">Generate a plan first to see your progress by subject.</div>
				{/if}
				<div class="button-row">
					<button class="btn btn-secondary" onclick={() => setView('plan')}>Open daily plan</button>
				</div>
			</div>
		</section>
	{/if}

	<p class="footer-note">Your plan stays in this browser. No account needed.</p>
</main>

<div class="toast" class:show={toast !== ''} role="status" aria-live="polite">{toast}</div>
