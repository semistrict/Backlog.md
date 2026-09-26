import { describe, expect, it } from "bun:test";
import { getTaskStatistics } from "../core/statistics.ts";
import type { Task } from "../types/index.ts";
import { getHelpShortcuts } from "../ui/components/help-popup.ts";
import { getBoardFooterContent, getTaskListFooterContent } from "../ui/footer-content.ts";
import { formatTaskViewerListItem, generateDetailContent } from "../ui/task-viewer-with-search.ts";
import { stripBlessedFgTags } from "../ui/utils/strip-tags.ts";

const RICE = { prioritization: "rice" } as const;

function createTask(overrides: Partial<Task> = {}): Task {
	return {
		id: "TASK-1",
		title: "Scored",
		status: "To Do",
		assignee: [],
		createdDate: "2026-09-01",
		labels: [],
		dependencies: [],
		priority: "high",
		rice: { reach: 500, impact: 2, confidence: 80, effort: 3 },
		...overrides,
	};
}

describe("TUI in RICE mode", () => {
	it("shows the RICE score instead of the priority dot in list rows", () => {
		const row = formatTaskViewerListItem(createTask(), undefined, undefined, undefined, RICE);
		expect(stripBlessedFgTags(row)).toBe("○ To Do {bold}TASK-1{/bold} - Scored RICE 266.7");
		expect(row).not.toContain("{red-fg}●{/}");

		const unscored = formatTaskViewerListItem(
			createTask({ rice: { reach: 5 } }),
			undefined,
			undefined,
			undefined,
			RICE,
		);
		expect(stripBlessedFgTags(unscored)).not.toContain("RICE");
	});

	it("keeps the priority dot in priority mode", () => {
		expect(formatTaskViewerListItem(createTask(), undefined, undefined, undefined, {})).toContain("{red-fg}●{/}");
	});

	it("shows RICE inputs and score in place of priority in task details", () => {
		const body = generateDetailContent(createTask(), { prioritization: RICE }).bodyContent.join("\n");
		expect(body).toContain("{bold}RICE:{/bold} 266.7 (Reach 500, Impact 2, Confidence 80%, Effort 3)");
		expect(body).not.toContain("Priority:");

		const priorityBody = generateDetailContent(createTask(), { prioritization: {} }).bodyContent.join("\n");
		expect(priorityBody).toContain("{bold}Priority:{/bold} High {red-fg}●{/}");
		expect(priorityBody).not.toContain("RICE:");
	});

	it("drops the priority filter shortcut from footers and help", () => {
		expect(getBoardFooterContent({ hasPriority: false })).toContain("[T/I/F]{/} Filter");
		expect(getTaskListFooterContent({ hasPriority: false })).toContain("[S/T/I/L]{/} Filter");
		expect(getTaskListFooterContent()).toContain("[S/T/P/I/L]{/} Filter");
		expect(getHelpShortcuts("board", { hasPriority: false }).map((shortcut) => shortcut.key)).not.toContain("P");
		expect(getHelpShortcuts("task-list").map((shortcut) => shortcut.key)).toContain("P");
	});

	it("counts scored and unscored tasks for the overview breakdown", () => {
		const stats = getTaskStatistics(
			[createTask(), createTask({ id: "TASK-2", rice: { reach: 1 } }), createTask({ id: "TASK-3", rice: undefined })],
			[],
			["To Do"],
			RICE,
		);
		expect(stats.prioritization).toBe("rice");
		expect(stats.riceCounts).toEqual({ scored: 1, unscored: 2 });
	});
});
