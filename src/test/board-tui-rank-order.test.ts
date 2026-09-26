import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ScreenInterface } from "neo-neo-bblessed";
import { Core } from "../core/backlog.ts";
import type { Task } from "../types/index.ts";
import { prepareBoardColumns, renderBoardTui } from "../ui/board.ts";
import { getHelpShortcuts } from "../ui/components/help-popup.ts";
import { createScreen } from "../ui/tui.ts";
import { stripBlessedFgTags } from "../ui/utils/strip-tags.ts";
import { initializeTestProject, waitUntil, withTimeout } from "./test-utils.ts";

type EmittingWidget = {
	emit: (event: string, ch?: string, key?: { name: string; full: string; shift?: boolean }) => boolean;
};
type TreeWidget = {
	type?: string;
	children?: TreeWidget[];
	items?: Array<{ content?: string }>;
	content?: string;
	position?: { bottom?: number };
};

const STATUSES = ["To Do", "In Progress", "Done"];
const RICE = { prioritization: "rice" } as const;

function createTask(id: string, ordinal: number, rice?: Task["rice"]): Task {
	return {
		id,
		title: `Title for ${id}`,
		status: "To Do",
		assignee: [],
		createdDate: "2025-01-01",
		labels: [],
		dependencies: [],
		ordinal,
		...(rice && { rice }),
	};
}

const TASKS = [
	createTask("TASK-1", 1000, { reach: 10, impact: 1, confidence: 100, effort: 1 }),
	createTask("TASK-2", 2000, { reach: 500, impact: 2, confidence: 80, effort: 3 }),
	createTask("TASK-3", 3000),
	createTask("TASK-4", 4000, { reach: 10, impact: 1, confidence: 100, effort: 1 }),
];

function pressKey(widget: EmittingWidget, full: string): void {
	const key = { name: full, full, shift: false };
	widget.emit("keypress", "", key);
	widget.emit(`key ${full}`, "", key);
}

function visit(root: TreeWidget, onNode: (node: TreeWidget) => void): void {
	onNode(root);
	for (const child of root.children ?? []) visit(child, onNode);
}

function renderedTaskIds(root: TreeWidget): string[] {
	const ids: string[] = [];
	visit(root, (node) => {
		if (node.type !== "list") return;
		for (const item of node.items ?? []) {
			const id = stripBlessedFgTags(item.content ?? "").match(/TASK-\d+/)?.[0];
			if (id) ids.push(id);
		}
	});
	return ids;
}

function footerText(root: TreeWidget): string {
	let found = "";
	visit(root, (node) => {
		if (node.type === "box" && node.position?.bottom === 0 && typeof node.content === "string") found = node.content;
	});
	return found;
}

describe("TUI board rank order", () => {
	it("orders a column by score with manual order breaking ties, only when asked", () => {
		const ids = (rankBy?: typeof RICE) => prepareBoardColumns(TASKS, STATUSES, rankBy)[0]?.tasks.map((task) => task.id);
		expect(ids()).toEqual(["TASK-1", "TASK-2", "TASK-3", "TASK-4"]);
		expect(ids(RICE)).toEqual(["TASK-2", "TASK-1", "TASK-4", "TASK-3"]);
	});

	it("lists the order key in the board help", () => {
		expect(getHelpShortcuts("board").map((shortcut) => shortcut.key)).toContain("O");
	});

	describe("on the rendered board", () => {
		let testDir: string;
		let core: Core;

		beforeEach(async () => {
			testDir = await mkdtemp(join(tmpdir(), "board-tui-rank-order-"));
			core = new Core(testDir);
			await initializeTestProject(core, "Board Rank Order");
		});

		afterEach(async () => {
			await rm(testDir, { recursive: true, force: true });
		});

		it("toggles rank order with O and returns to manual order for moves", async () => {
			const descriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
			Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
			const screen = createScreen({ smartCSR: false }) as ScreenInterface & EmittingWidget;
			const tree = screen as unknown as TreeWidget;
			try {
				const boardPromise = renderBoardTui(TASKS, STATUSES, "horizontal", 20, {
					screen,
					core,
					prioritization: "rice",
				});
				await waitUntil(() => renderedTaskIds(tree).length === TASKS.length, "board render");
				expect(renderedTaskIds(tree)).toEqual(["TASK-1", "TASK-2", "TASK-3", "TASK-4"]);
				expect(footerText(tree)).toContain("{cyan-fg}[O]{/} Order");

				pressKey(screen, "o");
				expect(renderedTaskIds(tree)).toEqual(["TASK-2", "TASK-1", "TASK-4", "TASK-3"]);
				expect(footerText(tree)).toContain("{yellow-fg}By RICE score{/}");

				pressKey(screen, "m");
				expect(renderedTaskIds(tree)).toEqual(["TASK-1", "TASK-2", "TASK-3", "TASK-4"]);
				pressKey(screen, "escape");

				pressKey(screen, "q");
				await withTimeout(boardPromise, "board close", 5000);
			} finally {
				screen.destroy();
				if (descriptor) Object.defineProperty(process.stdout, "isTTY", descriptor);
				else Reflect.deleteProperty(process.stdout, "isTTY");
			}
		});
	});
});
