import type { Task } from "../../types";
import {
	computeRiceScore,
	formatRiceScore,
	getPrioritizationMode,
	type PrioritizationConfig,
} from "../../utils/prioritization";
import { formatPriorityLabel } from "../../utils/priority-config";

/** Pill colors for a RICE score, shared by every view that shows one. */
export const RICE_PILL_CLASS = "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";

/**
 * What a rank column or pill shows: the RICE score in RICE mode, otherwise the priority label.
 * Nothing when the task has no score or no priority.
 */
export function getTaskRankLabel(task: Task, prioritization?: PrioritizationConfig | null): string | undefined {
	if (getPrioritizationMode(prioritization) === "rice") {
		const score = computeRiceScore(task.rice);
		return score === undefined ? undefined : formatRiceScore(score);
	}
	return task.priority ? formatPriorityLabel(task.priority, prioritization?.priorities) : undefined;
}
