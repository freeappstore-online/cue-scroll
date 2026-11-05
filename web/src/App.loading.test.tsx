// @vitest-environment happy-dom
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { loadLibrary, type Script } from "./scripts";
import App from "./App";
vi.mock("./scripts", async (original) => ({
	...(await original<typeof import("./scripts")>()),
	loadLibrary: vi.fn(),
}));
it("ignores an older initial load completing after the current StrictMode load", async () => {
	let older!: (value: Script[]) => void;
	let newer!: (value: Script[]) => void;
	vi.mocked(loadLibrary)
		.mockReturnValueOnce(
			new Promise((resolve) => {
				older = resolve;
			}),
		)
		.mockReturnValueOnce(
			new Promise((resolve) => {
				newer = resolve;
			}),
		);
	const node = document.createElement("div");
	document.body.append(node);
	const root = createRoot(node);
	(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
	try {
		await act(async () =>
			root.render(
				<StrictMode>
					<App />
				</StrictMode>,
			),
		);
		await act(async () =>
			newer([
				{
					id: "latest",
					title: "Current library",
					body: "My saved script",
					revision: 1,
				},
			]),
		);
		expect(node.textContent).toContain("Current library");
		await act(async () => older([]));
		expect(node.textContent).toContain("Current library");
		expect(node.textContent).not.toContain("A clear cue for every take");
	} finally {
		await act(async () => root.unmount());
		node.remove();
	}
});
