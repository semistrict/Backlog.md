import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { McpServer } from "../mcp/server.ts";
import { registerTaskTools } from "../mcp/tools/tasks/index.ts";
import type { JsonSchema } from "../mcp/validation/validators.ts";
import type { PrioritizationMode } from "../types/index.ts";
import { createUniqueTestDir, initializeFilesystemTestProject, safeCleanup } from "./test-utils.ts";

let testDir: string;
let server: McpServer;

function getText(content: unknown[] | undefined): string {
	return (content ?? [])
		.map((item) => (item as { text?: string }).text ?? "")
		.filter(Boolean)
		.join("\n\n");
}

async function startServer(prioritization: PrioritizationMode): Promise<void> {
	testDir = createUniqueTestDir("mcp-rice-prioritization");
	server = new McpServer(testDir, "Test instructions");
	await server.filesystem.ensureBacklogStructure();
	await initializeFilesystemTestProject(server, "MCP RICE Project");
	const config = await server.filesystem.loadConfig();
	if (!config) throw new Error("Expected test config");
	config.prioritization = prioritization;
	await server.filesystem.saveConfig(config);
	registerTaskTools(server, config);
}

async function callTool(name: string, args: Record<string, unknown>) {
	return await server.testInterface.callTool({ params: { name, arguments: args } });
}

async function toolSchemas(): Promise<Map<string, JsonSchema>> {
	const tools = await server.testInterface.listTools();
	return new Map(tools.tools.map((tool) => [tool.name, tool.inputSchema as JsonSchema]));
}

afterEach(async () => {
	const stopResult = await Promise.allSettled([server.stop()]);
	const cleanupResult = await Promise.allSettled([safeCleanup(testDir)]);
	const errors = [...stopResult, ...cleanupResult]
		.filter((result): result is PromiseRejectedResult => result.status === "rejected")
		.map((result) => result.reason);
	if (errors.length === 1) throw errors[0];
	if (errors.length > 1) throw new AggregateError(errors, "MCP server and fixture cleanup both failed");
});

describe("MCP in RICE mode", () => {
	beforeEach(async () => {
		await startServer("rice");
	});

	it("offers RICE inputs instead of priority", async () => {
		const schemas = await toolSchemas();
		const create = schemas.get("task_create")?.properties ?? {};
		const edit = schemas.get("task_edit")?.properties ?? {};
		expect(create.priority).toBeUndefined();
		expect(edit.priority).toBeUndefined();
		expect(schemas.get("task_search")?.properties?.priority).toBeUndefined();
		expect(create.reach?.type).toBe("number");
		expect(edit.reach?.type).toEqual(["number", "null"]);
		expect(create.impact?.description).toBe(
			"RICE impact, one of 3 (massive), 2 (high), 1 (medium), 0.5 (low), 0.25 (minimal).",
		);
		expect(edit.confidence?.description).toBe(
			"RICE confidence in percent, one of 100 (high), 80 (medium), 50 (low). Pass null to clear it.",
		);
	});

	it("creates, edits, clears, and lists by score", async () => {
		const created = await callTool("task_create", {
			title: "Big win",
			reach: 500,
			impact: 2,
			confidence: 80,
			effort: 3,
		});
		expect(created.isError).not.toBe(true);
		expect(getText(created.content)).toContain("RICE: 266.7 (Reach 500, Impact 2, Confidence 80%, Effort 3)");

		await callTool("task_create", { title: "Small", reach: 10, impact: 1, confidence: 100, effort: 1 });

		const edited = await callTool("task_edit", { id: "TASK-2", reach: null, effort: 2 });
		expect(edited.isError).not.toBe(true);
		expect(getText(edited.content)).toContain("RICE: unscored (Impact 1, Confidence 100%, Effort 2)");

		// Lists keep board order: ordinal first, then score, like priority before.
		await callTool("task_edit", { id: "TASK-1", ordinal: 1000 });
		await callTool("task_edit", { id: "TASK-2", reach: 1000, ordinal: 1000 });
		const listed = getText((await callTool("task_list", {})).content);
		expect(listed).toContain("To Do:\n  [RICE 500] TASK-2 - Small\n  [RICE 266.7] TASK-1 - Big win");
	});

	it("rejects priority and out-of-scale inputs", async () => {
		const withPriority = await callTool("task_create", { title: "Prio", priority: "high" });
		expect(withPriority.isError).toBe(true);

		const badImpact = await callTool("task_create", { title: "Bad", impact: 4 });
		expect(badImpact.isError).toBe(true);
		expect(getText(badImpact.content)).toContain("Invalid impact: 4. Impact must be 3, 2, 1, 0.5, 0.25.");

		const badSearch = await callTool("task_search", { query: "Prio", priority: "high" });
		expect(badSearch.isError).toBe(true);
	});
});

describe("MCP in priority mode", () => {
	beforeEach(async () => {
		await startServer("priority");
	});

	it("offers priority and no RICE inputs", async () => {
		const schemas = await toolSchemas();
		const create = schemas.get("task_create")?.properties ?? {};
		expect(create.priority?.enum).toEqual(["High", "Medium", "Low"]);
		expect(create.reach).toBeUndefined();
		expect(schemas.get("task_edit")?.properties?.effort).toBeUndefined();

		const created = await callTool("task_create", { title: "Early", reach: 5 });
		expect(created.isError).toBe(true);
	});
});
