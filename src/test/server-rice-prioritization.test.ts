import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { $ } from "bun";
import { FileSystem } from "../file-system/operations.ts";
import { BacklogServer } from "../server/index.ts";
import type { Task } from "../types/index.ts";
import { PRIORITY_UNAVAILABLE_MESSAGE } from "../utils/prioritization.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

type RiceServerHandlers = {
	handleCreateTask(request: Request): Promise<Response>;
	handleUpdateTask(request: Request, taskId: string): Promise<Response>;
	handleListTasks(request: Request): Promise<Response>;
	handleSearch(request: Request): Promise<Response>;
	handleGetStatistics(): Promise<Response>;
};

describe("BacklogServer in RICE mode", () => {
	let testDir: string;
	let server: BacklogServer | null;
	let handlers: RiceServerHandlers;

	beforeEach(async () => {
		testDir = createUniqueTestDir("server-rice");
		await mkdir(testDir, { recursive: true });
		await $`git init -b main`.cwd(testDir).quiet();
		const filesystem = new FileSystem(testDir);
		await filesystem.ensureBacklogStructure();
		await filesystem.saveConfig({
			projectName: "Server RICE",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			dateFormat: "YYYY-MM-DD",
			remoteOperations: false,
			checkActiveBranches: false,
			autoCommit: false,
			prioritization: "rice",
		});
		server = new BacklogServer(testDir);
		handlers = server as unknown as RiceServerHandlers;
	});

	afterEach(async () => {
		await server?.stop();
		server = null;
		await safeCleanup(testDir);
	});

	const jsonRequest = (method: string, body: unknown) =>
		new Request("http://localhost/api/tasks", {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

	it("creates, updates, and clears RICE inputs", async () => {
		const created = await handlers.handleCreateTask(
			jsonRequest("POST", { title: "Scored", rice: { reach: 500, impact: 2, confidence: 80 } }),
		);
		expect(created.status).toBe(201);
		const task = (await created.json()) as Task;
		expect(task.rice).toEqual({ reach: 500, impact: 2, confidence: 80 });

		const updated = await handlers.handleUpdateTask(jsonRequest("PUT", { rice: { effort: 3, reach: null } }), task.id);
		expect(updated.status).toBe(200);
		expect(((await updated.json()) as Task).rice).toEqual({ impact: 2, confidence: 80, effort: 3 });
	});

	it("rejects out-of-scale inputs and priority", async () => {
		const badImpact = await handlers.handleCreateTask(jsonRequest("POST", { title: "Bad", rice: { impact: 4 } }));
		expect(badImpact.status).toBe(400);
		expect(((await badImpact.json()) as { error: string }).error).toContain(
			"Invalid impact: 4. Impact must be 3, 2, 1, 0.5, 0.25.",
		);

		const withPriority = await handlers.handleCreateTask(jsonRequest("POST", { title: "Prio", priority: "high" }));
		expect(withPriority.status).toBe(400);
		expect(((await withPriority.json()) as { error: string }).error).toContain(PRIORITY_UNAVAILABLE_MESSAGE);

		for (const response of [
			await handlers.handleListTasks(new Request("http://localhost/api/tasks?priority=high")),
			await handlers.handleSearch(new Request("http://localhost/api/search?query=x&priority=high")),
		]) {
			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({ error: PRIORITY_UNAVAILABLE_MESSAGE });
		}
	});

	it("reports the RICE breakdown in statistics", async () => {
		await handlers.handleCreateTask(
			jsonRequest("POST", { title: "Scored", rice: { reach: 10, impact: 1, confidence: 100, effort: 1 } }),
		);
		await handlers.handleCreateTask(jsonRequest("POST", { title: "Unscored", rice: { reach: 10 } }));
		const statistics = await (await handlers.handleGetStatistics()).json();
		expect(statistics).toMatchObject({
			prioritization: "rice",
			priorityCounts: {},
			riceCounts: { scored: 1, unscored: 1 },
		});
	});
});
