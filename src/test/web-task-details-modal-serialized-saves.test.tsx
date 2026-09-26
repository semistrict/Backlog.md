import { afterEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Task } from "../types/index.ts";
import { TaskDetailsModal } from "../web/components/TaskDetailsModal.tsx";
import { ThemeProvider } from "../web/contexts/ThemeContext.tsx";
import { apiClient, type TaskUpdateRequest } from "../web/lib/api.ts";

let root: Root | null = null;
let dom: JSDOM | null = null;
const originalUpdateTask = apiClient.updateTask.bind(apiClient);

const task: Task = {
	id: "BACK-500",
	title: "Original title",
	status: "To Do",
	assignee: [],
	labels: [],
	dependencies: [],
	createdDate: "2026-01-01",
	source: "local",
};

function setupDom(): HTMLElement {
	dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost" });
	(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
	globalThis.window = dom.window as unknown as Window & typeof globalThis;
	globalThis.document = dom.window.document as Document;
	globalThis.navigator = dom.window.navigator as Navigator;
	globalThis.localStorage = dom.window.localStorage;
	globalThis.Element = dom.window.Element;
	globalThis.HTMLElement = dom.window.HTMLElement;
	globalThis.HTMLInputElement = dom.window.HTMLInputElement;
	globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
	globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(callback, 0);
	globalThis.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
	window.matchMedia = () =>
		({
			matches: false,
			media: "",
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList;
	const container = document.getElementById("root");
	if (!container) throw new Error("Missing test root");
	root = createRoot(container);
	return container;
}

async function settle(): Promise<void> {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
	for (let attempt = 0; attempt < 50; attempt += 1) {
		if (predicate()) return;
		await settle();
	}
	throw new Error(`Timed out waiting for ${label}`);
}

function findButton(text: string): HTMLButtonElement | undefined {
	return Array.from(document.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === text);
}

function buttonWithText(text: string): HTMLButtonElement {
	const button = findButton(text);
	if (!button) throw new Error(`Missing button "${text}"`);
	return button;
}

afterEach(() => {
	apiClient.updateTask = originalUpdateTask;
	if (root) {
		act(() => root?.unmount());
		root = null;
	}
	dom?.window.close();
	dom = null;
});

describe("Web task modal saves", () => {
	it("sends the title's blur save and the Save click one after another", async () => {
		setupDom();
		const requests: Array<{ updates: TaskUpdateRequest; finish: () => void }> = [];
		let inFlight = 0;
		let maxInFlight = 0;
		apiClient.updateTask = (_id, updates) => {
			inFlight += 1;
			maxInFlight = Math.max(maxInFlight, inFlight);
			return new Promise<Task>((resolve) => {
				requests.push({
					updates,
					finish: () => {
						inFlight -= 1;
						resolve({ ...task, title: String(updates.title ?? task.title) });
					},
				});
			});
		};

		await act(async () => {
			root?.render(
				<ThemeProvider>
					<TaskDetailsModal task={task} isOpen={true} onClose={() => {}} onSaved={() => {}} />
				</ThemeProvider>,
			);
		});
		await act(async () => {
			buttonWithText("Edit").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
		});

		const titleInput = Array.from(document.querySelectorAll("input")).find((input) => input.value === task.title);
		if (!titleInput) throw new Error("Missing sidebar title input");
		const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
		await act(async () => {
			titleInput.focus();
			setValue?.call(titleInput, "Renamed title");
			titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));
		});

		// Clicking Save blurs the title first, exactly as a real click does.
		await act(async () => {
			titleInput.dispatchEvent(new window.FocusEvent("focusout", { bubbles: true }));
			buttonWithText("Save").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
		});

		expect(requests.map((request) => request.updates.title)).toEqual(["Renamed title"]);
		await act(async () => requests[0]?.finish());
		await waitFor(() => requests.length === 2, "the Save request");
		expect(requests[1]?.updates.title).toBe("Renamed title");
		await act(async () => requests[1]?.finish());
		// A successful save returns the modal to preview, where Edit is offered again.
		await waitFor(() => findButton("Edit") !== undefined, "the modal to leave edit mode");

		expect(maxInFlight).toBe(1);
		expect(document.body.textContent).not.toContain("being modified");
	});
});
