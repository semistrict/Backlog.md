import type { BacklogConfig, PrioritizationMode, RiceInputKey, RiceInputs, RiceInputsUpdate } from "../types/index.ts";
import { getPriorityRank, resolvePriorityValue } from "./priority-config.ts";

export type PrioritizationConfig = Pick<BacklogConfig, "priorities" | "prioritization">;

export type RankedTask = { priority?: string; rice?: RiceInputs };

export const PRIORITIZATION_MODES: readonly PrioritizationMode[] = ["priority", "rice"];

export const RICE_INPUT_KEYS: readonly RiceInputKey[] = ["reach", "impact", "confidence", "effort"];

export const RICE_IMPACT_VALUES: readonly number[] = [3, 2, 1, 0.5, 0.25];

export const RICE_CONFIDENCE_VALUES: readonly number[] = [100, 80, 50];

const RICE_INPUT_RULES: Record<RiceInputKey, { label: string; accepts: (value: number) => boolean; allowed: string }> =
	{
		reach: { label: "Reach", accepts: (value) => value >= 0, allowed: "a number of 0 or more" },
		impact: {
			label: "Impact",
			accepts: (value) => RICE_IMPACT_VALUES.includes(value),
			allowed: RICE_IMPACT_VALUES.join(", "),
		},
		confidence: {
			label: "Confidence",
			accepts: (value) => RICE_CONFIDENCE_VALUES.includes(value),
			allowed: `${RICE_CONFIDENCE_VALUES.join(", ")} (percent)`,
		},
		effort: { label: "Effort", accepts: (value) => value > 0, allowed: "a number greater than 0" },
	};

export const PRIORITY_UNAVAILABLE_MESSAGE =
	"Priority is not used in this project because prioritization is set to rice. Use reach, impact, confidence and effort instead.";

export const RICE_UNAVAILABLE_MESSAGE =
	"RICE inputs are not used in this project because prioritization is set to priority. Run 'backlog config set prioritization rice' to rank tasks by RICE.";

export function getPrioritizationMode(config?: Pick<BacklogConfig, "prioritization"> | null): PrioritizationMode {
	return config?.prioritization ?? "priority";
}

export function parsePrioritizationMode(value: string): PrioritizationMode | undefined {
	const normalized = value.trim().toLowerCase();
	return PRIORITIZATION_MODES.find((mode) => mode === normalized);
}

/** Throws the message a person needs when a field of the inactive model is used. */
export function assertPrioritizationMode(
	config: Pick<BacklogConfig, "prioritization"> | null | undefined,
	expected: PrioritizationMode,
): void {
	if (getPrioritizationMode(config) !== expected) {
		throw new Error(expected === "priority" ? PRIORITY_UNAVAILABLE_MESSAGE : RICE_UNAVAILABLE_MESSAGE);
	}
}

/**
 * Resolves a priority value a caller wants to set or filter by. Throws in RICE mode; returns nothing
 * for a value outside the configured priorities.
 */
export function resolveActivePriorityValue(
	value: string,
	config: PrioritizationConfig | null | undefined,
): string | undefined {
	assertPrioritizationMode(config, "priority");
	return resolvePriorityValue(value, config);
}

export function getRiceInputLabel(key: RiceInputKey): string {
	return RICE_INPUT_RULES[key].label;
}

export function formatAllowedRiceInput(key: RiceInputKey): string {
	return RICE_INPUT_RULES[key].allowed;
}

function toNumber(value: unknown): number {
	if (typeof value === "number") return value;
	if (typeof value === "string" && value.trim() !== "") return Number(value);
	return Number.NaN;
}

/** Returns the input as a number when it fits its scale; throws naming the allowed values otherwise. */
export function requireRiceInput(key: RiceInputKey, value: unknown): number {
	const number = toNumber(value);
	const rule = RICE_INPUT_RULES[key];
	if (!Number.isFinite(number) || !rule.accepts(number)) {
		throw new Error(`Invalid ${key}: ${String(value)}. ${rule.label} must be ${rule.allowed}.`);
	}
	return number;
}

export function hasRiceInputs(rice: RiceInputs | RiceInputsUpdate | null | undefined): boolean {
	return Boolean(rice) && RICE_INPUT_KEYS.some((key) => rice?.[key] !== undefined);
}

function orderedRiceInputs(rice: RiceInputs): RiceInputs | undefined {
	const ordered: RiceInputs = {};
	for (const key of RICE_INPUT_KEYS) {
		const value = rice[key];
		if (value !== undefined) ordered[key] = value;
	}
	return hasRiceInputs(ordered) ? ordered : undefined;
}

/** Reads the `rice:` frontmatter map, keeping every finite number; validation happens on write. */
export function parseRiceFrontmatter(value: unknown): RiceInputs | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
	const record = value as Record<string, unknown>;
	const inputs: RiceInputs = {};
	for (const key of RICE_INPUT_KEYS) {
		const number = toNumber(record[key]);
		if (Number.isFinite(number)) inputs[key] = number;
	}
	return orderedRiceInputs(inputs);
}

/** Sets each given input after validating it, clears each `null`, and keeps the rest. */
export function applyRiceUpdate(current: RiceInputs | undefined, update: RiceInputsUpdate): RiceInputs | undefined {
	const next: RiceInputs = { ...current };
	for (const key of RICE_INPUT_KEYS) {
		const value = update[key];
		if (value === null) {
			delete next[key];
		} else if (value !== undefined) {
			next[key] = requireRiceInput(key, value);
		}
	}
	return orderedRiceInputs(next);
}

export function riceInputsEqual(a: RiceInputs | undefined, b: RiceInputs | undefined): boolean {
	return RICE_INPUT_KEYS.every((key) => a?.[key] === b?.[key]);
}

/** Reach x Impact x Confidence / Effort, or nothing until all four inputs are known. */
export function computeRiceScore(rice: RiceInputs | undefined): number | undefined {
	const reach = rice?.reach;
	const impact = rice?.impact;
	const confidence = rice?.confidence;
	const effort = rice?.effort;
	if (reach === undefined || impact === undefined || confidence === undefined || effort === undefined || effort <= 0) {
		return undefined;
	}
	return (reach * impact * (confidence / 100)) / effort;
}

export function formatRiceScore(score: number): string {
	const rounded = Math.round(score * 10) / 10;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatRiceInput(key: RiceInputKey, value: number): string {
	return key === "confidence" ? `${value}%` : String(value);
}

/** The short marker list views print in front of a task: its priority, or its RICE score. */
export function formatTaskRankBadge(task: RankedTask, config?: PrioritizationConfig | null): string | undefined {
	if (getPrioritizationMode(config) === "rice") {
		const score = computeRiceScore(task.rice);
		return score === undefined ? undefined : `RICE ${formatRiceScore(score)}`;
	}
	return task.priority ? task.priority.toUpperCase() : undefined;
}

/** Higher ranks first. Unranked tasks rank below every ranked task in either mode. */
export function getTaskRank(task: RankedTask, config?: PrioritizationConfig | null): number {
	if (getPrioritizationMode(config) === "rice") {
		return computeRiceScore(task.rice) ?? Number.NEGATIVE_INFINITY;
	}
	return getPriorityRank(task.priority, config);
}

/** Orders higher-ranked tasks first; 0 when both rank the same. */
export function compareTaskRank(a: RankedTask, b: RankedTask, config?: PrioritizationConfig | null): number {
	const aRank = getTaskRank(a, config);
	const bRank = getTaskRank(b, config);
	if (aRank === bRank) return 0;
	return aRank > bRank ? -1 : 1;
}
