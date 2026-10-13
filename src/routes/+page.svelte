<script lang="ts">
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

	type View = 'setup' | 'plan' | 'progress';
	const VIEWS: View[] = ['setup', 'plan', 'progress'];

	let selected: string[] = $state([...DEFAULT_SELECTED]);
	let days: number = $state(DEFAULT_DAYS);
	let hours: number = $state(DEFAULT_HOURS);
	let drafts: Record<string, string> = $state({});
	let questions: Record<string, SetupQuestion[]> = $state({});
	let error: string = $state('');
	let view: View = $state('setup');
	let toast: string = $state('');
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

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
		// Plan generation lands with T2; for now confirm valid intake and preview it.
		setView('plan');
		showToast('Setup looks good. Plan generation arrives in the next slice.');
	}

	function clearSetup(): void {
		selected = [...DEFAULT_SELECTED];
		days = DEFAULT_DAYS;
		hours = DEFAULT_HOURS;
		drafts = {};
		questions = {};
		error = '';
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
</script>

<header class="topbar">
	<div class="container topbar-inner">
		<a class="brand" href="/" aria-label="Daymark home"><span class="brand-mark" aria-hidden="true">D</span>daymark</a>
		<span class="save-state"><span class="save-dot" aria-hidden="true"></span><span>WAEC revision planner</span></span>
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
						<p class="panel-note">
							{#if totalQuestions() > 0}
								{days} days · {selected.length} subjects · {hours} hours available each day · {totalQuestions()}
								{totalQuestions() === 1 ? 'question' : 'questions'} ready.
							{:else}
								A day-by-day checklist, balanced across your subjects.
							{/if}
						</p>
					</div>
				</div>
				<div class="empty-state">
					Your plan will appear here after you generate it from Setup. Day-by-day checklists land
					with the plan generator slice.
				</div>
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
				</div>
				<div class="empty-state">Generate a plan first to see your progress by subject.</div>
				<div class="button-row">
					<button class="btn btn-secondary" onclick={() => setView('plan')}>Open daily plan</button>
				</div>
			</div>
		</section>
	{/if}

	<p class="footer-note">Your plan stays in this browser. No account needed.</p>
</main>

<div class="toast" class:show={toast !== ''} role="status" aria-live="polite">{toast}</div>
