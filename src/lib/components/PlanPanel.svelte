<script lang="ts">
	import type { StudyPlan } from '../plan';
	import type { OverallProgress } from '../progress';

	interface Props {
		plan: StudyPlan | null;
		activeDay: number;
		overall: OverallProgress;
		subjectName: (id: string) => string;
		selectDay: (index: number) => void;
		toggleTask: (taskId: string, done: boolean) => void;
		replan: () => void;
		goSetup: () => void;
	}

	let { plan, activeDay, overall, subjectName, selectDay, toggleTask, replan, goSetup }: Props =
		$props();

	const day = $derived(
		plan ? plan.days[Math.max(0, Math.min(activeDay, plan.days.length - 1))] : null
	);
	const dayDone = $derived(day ? day.tasks.filter((t) => t.done).length : 0);
</script>

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
		{#if plan && day}
			<div class="plan-summary">
				<div class="summary-cell">
					<span class="summary-label">Days left</span><span class="summary-value"
						>{plan.days.length}</span
					>
				</div>
				<div class="summary-cell">
					<span class="summary-label">Completed</span><span class="summary-value"
						>{overall.done} / {overall.total}</span
					>
				</div>
				<div class="summary-cell">
					<span class="summary-label">Overall</span><span class="summary-value"
						>{overall.percent}%</span
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
								<span class="task-subject">{subjectName(task.subjectId)}</span>
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
			<button class="btn btn-secondary" onclick={goSetup}>Edit plan settings</button>
		</div>
	</div>
</section>
