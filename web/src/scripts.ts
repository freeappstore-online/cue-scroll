import {
	getRecord,
	openStore,
	withTransaction,
} from "@freeappstore/sdk/persist";
export type Script = {
	id: string;
	title: string;
	body: string;
	revision: number;
};
export const isLibrary = (value: unknown): value is Script[] =>
	Array.isArray(value) &&
	value.every(
		(item) =>
			item &&
			typeof item.id === "string" &&
			typeof item.title === "string" &&
			typeof item.body === "string" &&
			Number.isSafeInteger(item.revision) &&
			item.revision > 0,
	);
export function changeLibrary(
	current: Script[],
	draft: Script,
	remove = false,
): Script[] {
	const existing = current.find((script) => script.id === draft.id);
	if ((existing?.revision ?? 0) !== draft.revision)
		throw new Error(
			"This script changed in another tab. Close this editor and refresh your library before editing again.",
		);
	const rest = current.filter((script) => script.id !== draft.id);
	if (remove) return rest;
	const title = draft.title.trim();
	const body = draft.body.trim();
	if (!title || !body) throw new Error("Enter a title and script text.");
	return [{ ...draft, title, body, revision: draft.revision + 1 }, ...rest];
}
async function store() {
	const opened = await openStore({
		namespace: "cue-scroll-scripts",
		version: 1,
	});
	if (!opened.ok)
		throw new Error(
			"Device storage is unavailable. Your scripts have not been changed.",
		);
	return opened.value;
}
export async function loadLibrary(): Promise<Script[]> {
	const database = await store();
	try {
		const result = await getRecord(database, "library", isLibrary);
		if (!result.ok)
			throw new Error(
				"Could not read your scripts. Existing data has been kept. Try refreshing.",
			);
		return result.value ?? [];
	} finally {
		database.close();
	}
}
export async function saveScript(
	draft: Script,
	remove = false,
): Promise<Script[]> {
	const database = await store();
	let conflict = "";
	try {
		const result = await withTransaction(database, "readwrite", async (tx) => {
			const raw = await tx.get("library");
			if (raw !== undefined && !isLibrary(raw))
				throw new Error("Unreadable library");
			let next: Script[];
			try {
				next = changeLibrary(raw ?? [], draft, remove);
			} catch (error) {
				conflict = (error as Error).message;
				throw error;
			}
			await tx.put("library", next);
			return next;
		});
		if (!result.ok)
			throw new Error(
				conflict ||
					"Could not save to this device. Your changes are still here.",
			);
		return result.value;
	} finally {
		database.close();
	}
}
export const wordCount = (text: string) =>
	text.trim() ? text.trim().split(/\s+/).length : 0;
