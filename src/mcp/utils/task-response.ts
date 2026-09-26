import type { Core } from "../../core/backlog.ts";
import { loadTaskDetail } from "../../core/task-detail.ts";
import { formatTaskPlainText } from "../../formatters/task-plain-text.ts";
import type { Task } from "../../types/index.ts";
import type { CallToolResult } from "../types.ts";

/** Every MCP task result renders through the one plain serializer, so they all read the same. */
export async function formatTaskCallResult(
	core: Core,
	task: Task,
	summaryLines: string[] = [],
	options: { filePathOverride?: string } = {},
): Promise<CallToolResult> {
	const [detail, prioritization] = await Promise.all([loadTaskDetail(core, task), core.filesystem.loadConfig()]);
	const formattedTask = formatTaskPlainText(detail, { ...options, prioritization });
	const summary = summaryLines.filter((line) => line.trim().length > 0).join("\n");
	const text = summary ? `${summary}\n\n${formattedTask}` : formattedTask;

	return {
		content: [
			{
				type: "text",
				text,
			},
		],
	};
}
