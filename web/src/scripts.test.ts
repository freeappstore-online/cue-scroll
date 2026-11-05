import { describe, expect, it } from "vitest";
import { changeLibrary, isLibrary, wordCount } from "./scripts";
const script = { id: "one", title: "Intro", body: "Hello world", revision: 1 };
describe("saved script revisions", () => {
	it("preserves scripts added in another tab and increments only the edited revision", () => {
		const other = { ...script, id: "two" };
		expect(
			changeLibrary([script, other], { ...script, title: "Revised" }),
		).toEqual([{ ...script, title: "Revised", revision: 2 }, other]);
	});
	it("does not overwrite or delete a newer edit from another tab", () => {
		expect(() => changeLibrary([{ ...script, revision: 2 }], script)).toThrow(
			"changed in another tab",
		);
		expect(() =>
			changeLibrary([{ ...script, revision: 2 }], script, true),
		).toThrow("changed in another tab");
		expect(() => changeLibrary([], script)).toThrow("changed in another tab");
	});
	it("validates stored data, trims drafts and counts words", () => {
		expect(isLibrary([{ ...script, revision: "1" }])).toBe(false);
		expect(isLibrary([script])).toBe(true);
		expect(
			changeLibrary([], {
				...script,
				title: "  Intro  ",
				body: "  Hello\nworld ",
				revision: 0,
			})[0],
		).toEqual({ ...script, body: "Hello\nworld" });
		expect(() =>
			changeLibrary([], { ...script, title: " ", revision: 0 }),
		).toThrow("Enter a title");
		expect(wordCount("  one\n two\tthree  ")).toBe(3);
	});
});
