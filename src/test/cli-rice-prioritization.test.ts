import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, readFile } from "node:fs/promises";
import { $ } from "bun";
import { runTaskCreateWizard, runTaskEditWizard, type TaskWizardPromptRunner } from "../commands/task-wizard.ts";
import { Core } from "../core/backlog.ts";
import type { Task } from "../types/index.ts";
import { PRIORITY_UNAVAILABLE_MESSAGE, RICE_UNAVAILABLE_MESSAGE } from "../utils/prioritization.ts";
import { getTestCliPath } from "./test-cli.ts";
import { createUniqueTestDir, initializeFilesystemTestProject, safeCleanup } from "./test-utils.ts";

const CLI_PATH = getTestCliPath();
let TEST_DIR: string;
let core: Core;

async function cli(...args: string[]) {
	const result = await $`bun ${CLI_PATH} ${args}`.cwd(TEST_DIR).quiet().nothrow();
	return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

describe("CLI RICE prioritization", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-rice");
		await mkdir(TEST_DIR, { recursive: true });
		core = new Core(TEST_DIR);
		await initializeFilesystemTestProject(core, "CLI RICE Project");
	});

	afterEach(async () => {
		await safeCleanup(TEST_DIR);
	});

	it("gets, sets, and validates the prioritization mode", async () => {
		expect((await cli("config", "get", "prioritization")).stdout).toBe("priority\n");

		const invalid = await cli("config", "set", "prioritization", "wsjf");
		expect(invalid.exitCode).toBe(1);
		expect(invalid.stderr).toContain("prioritization must be one of: priority, rice");

		expect((await cli("config", "set", "prioritization", "RICE")).exitCode).toBe(0);
		expect((await cli("config", "get", "prioritization")).stdout).toBe("rice\n");
		expect(await readFile(core.filesystem.configFilePath, "utf8")).toContain("\nprioritization: rice\n");
		expect((await cli("config", "list")).stdout).toContain("  prioritization: rice\n");
	});

	it("rejects RICE flags in priority mode", async () => {
		const created = await cli("task", "create", "Early", "--reach", "5");
		expect(created.exitCode).toBe(1);
		expect(created.stderr).toContain(RICE_UNAVAILABLE_MESSAGE);
		expect(await core.filesystem.listTasks()).toEqual([]);
	});

	describe("in RICE mode", () => {
		beforeEach(async () => {
			expect((await cli("config", "set", "prioritization", "rice")).exitCode).toBe(0);
		});

		it("creates with RICE inputs and shows the score in the plain view", async () => {
			const created = await cli(
				"task",
				"create",
				"Big win",
				"--reach",
				"500",
				"--impact",
				"2",
				"--confidence",
				"80",
				"--effort",
				"3",
				"--plain",
			);
			expect(created.exitCode).toBe(0);
			expect(created.stdout).toContain("\nRICE: 266.7 (Reach 500, Impact 2, Confidence 80%, Effort 3)\n");
			expect(created.stdout).not.toContain("Priority:");
			expect((await core.filesystem.loadTask("TASK-1"))?.rice).toEqual({
				reach: 500,
				impact: 2,
				confidence: 80,
				effort: 3,
			});
		});

		it("edits and clears single inputs", async () => {
			await cli("task", "create", "Task", "--reach", "100", "--impact", "3", "--confidence", "50");

			const edited = await cli("task", "edit", "TASK-1", "--effort", "2", "--plain");
			expect(edited.stdout).toContain("\nRICE: 75 (Reach 100, Impact 3, Confidence 50%, Effort 2)\n");

			const cleared = await cli("task", "edit", "TASK-1", "--reach", "", "--plain");
			expect(cleared.stdout).toContain("\nRICE: unscored (Impact 3, Confidence 50%, Effort 2)\n");
			expect((await core.filesystem.loadTask("TASK-1"))?.rice).toEqual({ impact: 3, confidence: 50, effort: 2 });
		});

		it("rejects out-of-scale inputs and priority", async () => {
			const badImpact = await cli("task", "create", "Bad", "--impact", "4");
			expect(badImpact.exitCode).toBe(1);
			expect(badImpact.stderr).toContain("Invalid impact: 4. Impact must be 3, 2, 1, 0.5, 0.25.");

			await cli("task", "create", "Task");
			const badConfidence = await cli("task", "edit", "TASK-1", "--confidence", "90");
			expect(badConfidence.exitCode).toBe(1);
			expect(badConfidence.stderr).toContain("Invalid confidence: 90. Confidence must be 100, 80, 50 (percent).");

			for (const args of [
				["task", "create", "Prio", "--priority", "high"],
				["task", "edit", "TASK-1", "--priority", "high"],
				["task", "list", "--priority", "high", "--plain"],
				["search", "task", "--priority", "high", "--plain"],
			]) {
				const result = await cli(...args);
				expect(result.exitCode).toBe(1);
				expect(result.stderr).toContain(PRIORITY_UNAVAILABLE_MESSAGE);
			}
		});

		it("lists and searches by score, unscored last", async () => {
			await cli("task", "create", "Small", "--reach", "10", "--impact", "1", "--confidence", "100", "--effort", "1");
			await cli("task", "create", "Unscored", "--reach", "100");
			await cli("task", "create", "Big", "--reach", "500", "--impact", "2", "--confidence", "80", "--effort", "3");

			expect((await cli("task", "list", "--plain")).stdout).toBe(
				"To Do:\n  [RICE 266.7] TASK-3 - Big\n  [RICE 10] TASK-1 - Small\n  TASK-2 - Unscored\n\n",
			);
			expect((await cli("task", "list", "--sort", "priority", "--plain")).stdout).toBe(
				"Tasks (sorted by RICE score):\n  [RICE 266.7] TASK-3 - Big (To Do)\n  [RICE 10] TASK-1 - Small (To Do)\n  TASK-2 - Unscored (To Do)\n",
			);
			expect((await cli("search", "Big", "--plain")).stdout).toContain("  TASK-3 - Big (To Do) [RICE 266.7]");
		});

		it("reports RICE in JSON and hides a recorded priority", async () => {
			await cli("config", "set", "prioritization", "priority");
			await cli("task", "create", "Legacy", "--priority", "high");
			await cli("config", "set", "prioritization", "rice");
			await cli("task", "edit", "TASK-1", "--reach", "40", "--impact", "0.5", "--confidence", "50", "--effort", "1");

			const view = JSON.parse((await cli("task", "view", "TASK-1", "--json")).stdout);
			expect(view.task.priority).toBeNull();
			expect(view.task.rice).toEqual({ reach: 40, impact: 0.5, confidence: 50, effort: 1, score: 10 });

			const list = JSON.parse((await cli("task", "list", "--json")).stdout);
			expect(list.tasks[0].rice).toEqual({ reach: 40, impact: 0.5, confidence: 50, effort: 1, score: 10 });
			expect((await core.filesystem.loadTask("TASK-1"))?.priority).toBe("high");
		});

		it("shows RICE help in place of priority values", async () => {
			const help = (await cli("task", "edit", "--help")).stdout;
			expect(help).toContain("  - priority: not used: prioritization is rice - Replacement task priority");
			expect(help).toContain("  - impact: 3, 2, 1, 0.5, 0.25 - Set RICE impact; pass an empty value to clear");
			expect(help).toContain(
				"  - confidence: 100, 80, 50 (percent) - Set RICE confidence in percent; pass an empty value to clear",
			);
		});
	});

	it("reports rice as null in JSON in priority mode", async () => {
		await cli("task", "create", "Task", "--priority", "low");
		const view = JSON.parse((await cli("task", "view", "TASK-1", "--json")).stdout);
		expect(view.task.priority).toBe("low");
		expect(view.task.rice).toBeNull();
	});
});

describe("task wizard in RICE mode", () => {
	function promptRunner(responses: Record<string, string>): {
		prompt: TaskWizardPromptRunner;
		asked: string[];
	} {
		const asked: string[] = [];
		return {
			asked,
			prompt: async (question) => {
				asked.push(question.name);
				const value = responses[question.name] ?? question.initial ?? "";
				const error = question.validate?.(value);
				if (error) throw new Error(error);
				return { [question.name]: value };
			},
		};
	}

	it("asks for RICE inputs instead of priority on create", async () => {
		const { prompt, asked } = promptRunner({ title: "Wizard", reach: "500", impact: "2", confidence: "80" });
		const input = await runTaskCreateWizard({
			statuses: ["To Do", "Done"],
			prioritization: "rice",
			promptImpl: prompt,
		});
		expect(asked).not.toContain("priority");
		expect(asked).toEqual(expect.arrayContaining(["reach", "impact", "confidence", "effort"]));
		expect(input?.rice).toEqual({ reach: 500, impact: 2, confidence: 80 });
		expect(input?.priority).toBeUndefined();
	});

	it("rejects an out-of-scale reach", async () => {
		const { prompt } = promptRunner({ title: "Wizard", reach: "-1" });
		await expect(
			runTaskCreateWizard({ statuses: ["To Do"], prioritization: "rice", promptImpl: prompt }),
		).rejects.toThrow("Invalid reach: -1. Reach must be a number of 0 or more.");
	});

	it("sends only changed inputs on edit, clearing blanked ones", async () => {
		const task: Task = {
			id: "TASK-1",
			title: "Scored",
			status: "To Do",
			assignee: [],
			createdDate: "2026-01-01",
			labels: [],
			dependencies: [],
			rice: { reach: 500, impact: 2, confidence: 80, effort: 3 },
		};
		const { prompt } = promptRunner({ reach: "", effort: "1" });
		const update = await runTaskEditWizard({
			task,
			statuses: ["To Do", "Done"],
			prioritization: "rice",
			promptImpl: prompt,
		});
		expect(update?.rice).toEqual({ reach: null, effort: 1 });
		expect(update?.priority).toBeUndefined();
	});
});
