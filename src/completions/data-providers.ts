import { type Core, createRuntimeCore } from "../core/backlog.ts";
import type { BacklogConfig } from "../types/index.ts";
import { getPrioritizationMode, RICE_CONFIDENCE_VALUES, RICE_IMPACT_VALUES } from "../utils/prioritization.ts";
import { getPriorityValues } from "../utils/priority-config.ts";
import { getProjectValues } from "../utils/project-config.ts";
import { getTaskTypeValues } from "../utils/task-type-config.ts";

type CoreCallback<T> = (core: Core) => Promise<T>;

/**
 * Execute a callback with a Core instance, returning a fallback value if anything fails.
 */
async function withCore<T>(callback: CoreCallback<T>, fallback: T): Promise<T> {
	try {
		const core = await createRuntimeCore();
		return await callback(core);
	} catch {
		return fallback;
	}
}

function getDefaultStatuses(): string[] {
	return ["To Do", "In Progress", "Done"];
}

/**
 * Get all task IDs from the backlog
 */
export async function getTaskIds(): Promise<string[]> {
	return await withCore(async (core) => {
		const tasks = await core.filesystem.listTasks();
		return tasks.map((task) => task.id).sort();
	}, []);
}

/**
 * Get configured status values
 */
export async function getStatuses(): Promise<string[]> {
	return await withCore(async (core) => {
		const config: BacklogConfig | null = await core.filesystem.loadConfig();
		const statuses = config?.statuses;
		if (Array.isArray(statuses) && statuses.length > 0) {
			return statuses;
		}
		return getDefaultStatuses();
	}, getDefaultStatuses());
}

/**
 * Get priority values; none in RICE mode, where priority is not used
 */
export async function getPriorities(): Promise<string[]> {
	return await withCore(async (core) => {
		const config: BacklogConfig | null = await core.filesystem.loadConfig();
		return getPrioritizationMode(config) === "rice" ? [] : getPriorityValues(config);
	}, getPriorityValues());
}

/**
 * Get the fixed RICE impact or confidence scale; none outside RICE mode
 */
export async function getRiceScaleValues(key: "impact" | "confidence"): Promise<string[]> {
	return await withCore(async (core) => {
		const config: BacklogConfig | null = await core.filesystem.loadConfig();
		if (getPrioritizationMode(config) !== "rice") return [];
		return (key === "impact" ? RICE_IMPACT_VALUES : RICE_CONFIDENCE_VALUES).map(String);
	}, []);
}

/**
 * Get configured task type values.
 */
export async function getTaskTypes(): Promise<string[]> {
	return await withCore(async (core) => {
		const config: BacklogConfig | null = await core.filesystem.loadConfig();
		return getTaskTypeValues(config);
	}, getTaskTypeValues());
}

/**
 * Get configured project values.
 */
export async function getProjects(): Promise<string[]> {
	return await withCore(async (core) => {
		const config: BacklogConfig | null = await core.filesystem.loadConfig();
		return getProjectValues(config);
	}, []);
}

/**
 * Get unique labels from all tasks
 */
export async function getLabels(): Promise<string[]> {
	return await withCore(async (core) => {
		const tasks = await core.filesystem.listTasks();
		const labels = new Set<string>();
		for (const task of tasks) {
			for (const label of task.labels) {
				labels.add(label);
			}
		}
		return Array.from(labels).sort();
	}, []);
}

/**
 * Get unique assignees from all tasks
 */
export async function getAssignees(): Promise<string[]> {
	return await withCore(async (core) => {
		const tasks = await core.filesystem.listTasks();
		const assignees = new Set<string>();
		for (const task of tasks) {
			for (const assignee of task.assignee) {
				assignees.add(assignee);
			}
		}
		return Array.from(assignees).sort();
	}, []);
}

/**
 * Get all document IDs from the backlog
 */
export async function getDocumentIds(): Promise<string[]> {
	return await withCore(async (core) => {
		const docs = await core.filesystem.listDocuments();
		return docs.map((doc) => doc.id).sort();
	}, []);
}
