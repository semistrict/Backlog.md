import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { getTaskStatistics } from "../core/statistics.ts";
import { parseTask } from "../markdown/parser.ts";
import { serializeTask } from "../markdown/serializer.ts";
import type { Task } from "../types/index.ts";
import {
	applyRiceUpdate,
	computeRiceScore,
	formatRiceScore,
	formatTaskRankBadge,
	PRIORITY_UNAVAILABLE_MESSAGE,
	parseRiceFrontmatter,
	RICE_UNAVAILABLE_MESSAGE,
	requireRiceInput,
	resolveActivePriorityValue,
} from "../utils/prioritization.ts";
import { sortByOrdinalAndPriority, sortByPriority } from "../utils/task-sorting.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

const RICE = { prioritization: "rice" } as const;

function task(overrides: Partial<Task>): Task {
	return {
		id: "BACK-1",
		title: "Task",
		status: "To Do",
		assignee: [],
		createdDate: "2026-01-01",
		labels: [],
		dependencies: [],
		...overrides,
	};
}

describe("RICE scoring", () => {
	it("computes reach x impact x confidence% / effort", () => {
		expect(computeRiceScore({ reach: 500, impact: 2, confidence: 80, effort: 3 })).toBeCloseTo(266.6667, 4);
	});

	it("has no score until every input is known", () => {
		expect(computeRiceScore({ reach: 500, impact: 2, confidence: 80 })).toBeUndefined();
		expect(computeRiceScore(undefined)).toBeUndefined();
	});

	it("formats scores to at most one decimal", () => {
		expect(formatRiceScore(266.6667)).toBe("266.7");
		expect(formatRiceScore(40)).toBe("40");
		expect(formatRiceScore(0.04)).toBe("0");
	});

	it("accepts only the fixed impact and confidence scales", () => {
		expect(requireRiceInput("impact", "0.5")).toBe(0.5);
		expect(requireRiceInput("confidence", 80)).toBe(80);
		expect(() => requireRiceInput("impact", "4")).toThrow("Invalid impact: 4. Impact must be 3, 2, 1, 0.5, 0.25.");
		expect(() => requireRiceInput("confidence", "90")).toThrow(
			"Invalid confidence: 90. Confidence must be 100, 80, 50 (percent).",
		);
	});

	it("requires reach >= 0 and effort > 0", () => {
		expect(requireRiceInput("reach", "0")).toBe(0);
		expect(() => requireRiceInput("reach", "-1")).toThrow("Invalid reach: -1. Reach must be a number of 0 or more.");
		expect(() => requireRiceInput("effort", "0")).toThrow("Invalid effort: 0. Effort must be a number greater than 0.");
		expect(() => requireRiceInput("effort", "abc")).toThrow("Invalid effort: abc.");
	});

	it("sets, clears, and keeps inputs in a fixed key order", () => {
		const updated = applyRiceUpdate({ effort: 2, reach: 10 }, { impact: 1, reach: null });
		expect(updated).toEqual({ impact: 1, effort: 2 });
		expect(Object.keys(updated ?? {})).toEqual(["impact", "effort"]);
		expect(applyRiceUpdate({ reach: 10 }, { reach: null })).toBeUndefined();
	});

	it("refuses priority values, including filters, in RICE mode", () => {
		expect(resolveActivePriorityValue("HIGH", {})).toBe("high");
		expect(resolveActivePriorityValue("urgent", {})).toBeUndefined();
		expect(() => resolveActivePriorityValue("high", RICE)).toThrow(PRIORITY_UNAVAILABLE_MESSAGE);
	});

	it("shows a RICE badge only for scored tasks in RICE mode", () => {
		const scored = { priority: "high", rice: { reach: 100, impact: 1, confidence: 50, effort: 1 } };
		expect(formatTaskRankBadge(scored, RICE)).toBe("RICE 50");
		expect(formatTaskRankBadge({ rice: { reach: 100 } }, RICE)).toBeUndefined();
		expect(formatTaskRankBadge(scored, {})).toBe("HIGH");
	});
});

describe("RICE ordering", () => {
	const tasks = [
		task({ id: "BACK-1", priority: "high" }),
		task({ id: "BACK-2", rice: { reach: 10, impact: 1, confidence: 100, effort: 1 } }),
		task({ id: "BACK-3", rice: { reach: 100, impact: 3, confidence: 50, effort: 2 } }),
		task({ id: "BACK-4", rice: { reach: 0, impact: 1, confidence: 100, effort: 1 } }),
	];

	it("orders by score descending with unscored tasks last in RICE mode", () => {
		expect(sortByPriority(tasks, RICE).map((t) => t.id)).toEqual(["BACK-3", "BACK-2", "BACK-4", "BACK-1"]);
	});

	it("keeps ordinal ahead of score on the board order", () => {
		const withOrdinal = [...tasks, task({ id: "BACK-5", ordinal: 1000 })];
		expect(sortByOrdinalAndPriority(withOrdinal, RICE).map((t) => t.id)).toEqual([
			"BACK-5",
			"BACK-3",
			"BACK-2",
			"BACK-4",
			"BACK-1",
		]);
	});

	it("ignores RICE inputs in priority mode", () => {
		expect(sortByPriority(tasks, {}).map((t) => t.id)).toEqual(["BACK-1", "BACK-2", "BACK-3", "BACK-4"]);
	});

	it("leaves priority counts empty in RICE mode statistics", () => {
		const stats = getTaskStatistics(tasks, [], ["To Do"], RICE);
		expect(Object.fromEntries(stats.priorityCounts)).toEqual({});
		expect(stats.noPriorityCount).toBe(0);
	});
});

describe("RICE frontmatter", () => {
	it("round-trips a rice map after priority", () => {
		const serialized = serializeTask(
			task({ priority: "high", rice: { reach: 500, impact: 2, confidence: 80, effort: 3 } }),
		);
		expect(serialized).toContain("priority: high\nrice:\n  reach: 500\n  impact: 2\n  confidence: 80\n  effort: 3\n");
		expect(parseTask(serialized).rice).toEqual({ reach: 500, impact: 2, confidence: 80, effort: 3 });
	});

	it("keeps finite numbers and drops everything else", () => {
		expect(parseRiceFrontmatter({ reach: "20", impact: "high", effort: 1, extra: 3 })).toEqual({
			reach: 20,
			effort: 1,
		});
		expect(parseRiceFrontmatter("reach: 3")).toBeUndefined();
		expect(parseRiceFrontmatter({})).toBeUndefined();
	});
});

describe("RICE prioritization mode", () => {
	let testDir: string;
	let core: Core;

	beforeEach(async () => {
		testDir = createUniqueTestDir("test-rice-prioritization");
		core = new Core(testDir);
		await core.filesystem.ensureBacklogStructure();
		await $`git init -b main`.cwd(testDir).quiet();
		await initializeTestProject(core, "RICE Test Project");
	});

	afterEach(async () => {
		await safeCleanup(testDir);
	});

	async function useRice(): Promise<void> {
		const config = await core.filesystem.loadConfig();
		if (!config) throw new Error("Config not found");
		await core.filesystem.saveConfig({ ...config, prioritization: "rice" });
	}

	it("defaults to priority mode and rejects RICE inputs there", async () => {
		expect((await core.filesystem.loadConfig())?.prioritization).toBeUndefined();
		await expect(core.createTaskFromInput({ title: "Task", rice: { reach: 5 } }, false)).rejects.toThrow(
			RICE_UNAVAILABLE_MESSAGE,
		);
		const { task: created } = await core.createTaskFromInput({ title: "Task" }, false);
		await expect(core.updateTaskFromInput(created.id, { rice: { reach: null } }, false)).rejects.toThrow(
			RICE_UNAVAILABLE_MESSAGE,
		);
	});

	it("saves and reloads the prioritization mode", async () => {
		await useRice();
		const content = await readFile(core.filesystem.configFilePath, "utf8");
		expect(content).toContain("\nprioritization: rice\n");
		expect(core.filesystem.parseConfig(content).prioritization).toBe("rice");
	});

	it("rejects an unknown prioritization mode in the config file", async () => {
		const content = await readFile(core.filesystem.configFilePath, "utf8");
		expect(() => core.filesystem.parseConfig(`${content}prioritization: wsjf\n`)).toThrow(
			'has an invalid value for "prioritization": expected priority or rice, got "wsjf". Set it to priority or rice, then run the command again.',
		);
	});

	it("persists validated RICE inputs on create and edit", async () => {
		await useRice();
		const { task: created } = await core.createTaskFromInput(
			{ title: "Scored", rice: { reach: 500, impact: 2, confidence: 80 } },
			false,
		);
		expect(created.rice).toEqual({ reach: 500, impact: 2, confidence: 80 });
		expect(created.updatedDate).toBeUndefined();

		await core.updateTaskFromInput(created.id, { rice: { effort: 3, reach: null } }, false);
		const loaded = await core.filesystem.loadTask(created.id);
		expect(loaded?.rice).toEqual({ impact: 2, confidence: 80, effort: 3 });
		expect(loaded?.updatedDate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
	});

	it("rejects out-of-scale inputs without writing", async () => {
		await useRice();
		const { task: created } = await core.createTaskFromInput({ title: "Task", rice: { impact: 1 } }, false);
		await expect(core.updateTaskFromInput(created.id, { rice: { impact: 5 } }, false)).rejects.toThrow(
			"Invalid impact: 5. Impact must be 3, 2, 1, 0.5, 0.25.",
		);
		expect((await core.filesystem.loadTask(created.id))?.rice).toEqual({ impact: 1 });
	});

	it("rejects priority in RICE mode, including clearing it", async () => {
		await useRice();
		await expect(core.createTaskFromInput({ title: "Task", priority: "high" }, false)).rejects.toThrow(
			PRIORITY_UNAVAILABLE_MESSAGE,
		);
		const { task: created } = await core.createTaskFromInput({ title: "Task" }, false);
		await expect(core.updateTaskFromInput(created.id, { priority: "" }, false)).rejects.toThrow(
			PRIORITY_UNAVAILABLE_MESSAGE,
		);
	});

	it("preserves a priority already in the file when editing in RICE mode", async () => {
		const { task: created } = await core.createTaskFromInput({ title: "Legacy", priority: "high" }, false);
		await useRice();
		await core.updateTaskFromInput(created.id, { rice: { reach: 10 } }, false);

		const loaded = await core.filesystem.loadTask(created.id);
		expect(loaded?.priority).toBe("high");
		expect(loaded?.rice).toEqual({ reach: 10 });
	});

	it("preserves RICE inputs already in the file when editing in priority mode", async () => {
		await useRice();
		const { task: created } = await core.createTaskFromInput({ title: "Scored", rice: { reach: 10 } }, false);
		const config = await core.filesystem.loadConfig();
		if (!config) throw new Error("Config not found");
		await core.filesystem.saveConfig({ ...config, prioritization: "priority" });
		await core.updateTaskFromInput(created.id, { priority: "low" }, false);

		const loaded = await core.filesystem.loadTask(created.id);
		expect(loaded?.rice).toEqual({ reach: 10 });
		expect(loaded?.priority).toBe("low");
	});

	it("reads hand-written rice frontmatter", async () => {
		await useRice();
		const { task: created } = await core.createTaskFromInput({ title: "Hand edited" }, false);
		const path = (await core.filesystem.loadTask(created.id))?.filePath;
		if (!path) throw new Error("Task file not found");
		const content = await readFile(path, "utf8");
		await writeFile(
			path,
			content.replace("\n---\n", "\nrice:\n  reach: 40\n  impact: 0.5\n  confidence: 50\n  effort: 1\n---\n"),
		);

		const loaded = await core.filesystem.loadTask(created.id);
		expect(computeRiceScore(loaded?.rice)).toBe(10);
	});
});
