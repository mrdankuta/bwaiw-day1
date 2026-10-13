<script lang="ts">
	import type { StudyPlan } from '../plan';
	import type { OverallProgress, SubjectProgress } from '../progress';

	interface Props {
		plan: StudyPlan | null;
		overall: OverallProgress;
		subjectRows: SubjectProgress[];
		openPlan: () => void;
	}

	let { plan, overall, subjectRows, openPlan }: Props = $props();
</script>

<section id="view-progress" role="tabpanel" aria-label="Progress">
	<div class="panel">
		<div class="panel-head">
			<div>
				<h2>Your progress</h2>
				<p class="panel-note">A clear view of what’s complete and what still needs time.</p>
			</div>
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
			<button class="btn btn-secondary" onclick={openPlan}>Open daily plan</button>
		</div>
	</div>
</section>
