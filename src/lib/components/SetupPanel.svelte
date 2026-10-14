<script lang="ts">
	import {
		MAX_DAYS,
		MAX_HOURS,
		MIN_DAYS,
		MIN_HOURS,
		SAMPLE_QUESTIONS,
		SUBJECTS
	} from '../subjects';
	import type { SetupQuestion } from '../setup';

	interface Props {
		selected: string[];
		days: number;
		hours: number;
		drafts: Record<string, string>;
		questions: Record<string, SetupQuestion[]>;
		error: string;
		subjectName: (id: string) => string;
		questionCount: (id: string) => number;
		toggleSubject: (id: string, checked: boolean) => void;
		syncPaste: (subjectId: string, text: string) => void;
		loadSample: (subjectId: string) => void;
		updateQuestion: (
			subjectId: string,
			questionId: string,
			field: 'title' | 'topic',
			value: string
		) => void;
		generate: () => void;
		clearSetup: () => void;
	}

	let {
		selected,
		days = $bindable(),
		hours = $bindable(),
		drafts,
		questions,
		error,
		subjectName,
		questionCount,
		toggleSubject,
		syncPaste,
		loadSample,
		updateQuestion,
		generate,
		clearSetup
	}: Props = $props();
</script>

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
