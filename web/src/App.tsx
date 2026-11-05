import { useCallback, useEffect, useRef, useState } from "react";
import { initApp } from "@freeappstore/sdk";
import {
	Card,
	Modal,
	type NavItem,
	PageHeader,
	Shell,
} from "@freeappstore/sdk/ui";
import { Editor } from "./Editor";
import { Reader, type ReadingSession } from "./Reader";
import { pwa } from "./pwa";
import { SAMPLE_SCRIPTS } from "./samples";
import { type Script, loadLibrary, saveScript, wordCount } from "./scripts";
export const fas = initApp({ appId: "cue-scroll" });
const NAV: NavItem[] = [
	{ label: "Scripts", href: "/", title: "Cue" },
	{ label: "How to use", href: "/help", title: "How to use — Cue" },
];
const location = () => window.location.pathname + window.location.search;
export default function App() {
	const [path, setPath] = useState(location);
	const [scripts, setScripts] = useState<Script[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [editor, setEditor] = useState<Script | null>(null);
	const [deleting, setDeleting] = useState<Script | null>(null);
	const [pendingDelete, setPendingDelete] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const loadGeneration = useRef(0);
	const readingSessions = useRef<Record<string, ReadingSession>>({});
	const busy = useRef(false);
	const playing = useRef(false);
	const deletion = useRef(false);
	busy.current = !!editor || !!deleting;
	const onBusy = useCallback((value: boolean) => {
		playing.current = value;
	}, []);
	const refresh = useCallback(async () => {
		const generation = ++loadGeneration.current;
		setLoading(true);
		setError("");
		try {
			const next = await loadLibrary();
			if (generation === loadGeneration.current) setScripts(next);
		} catch (error) {
			if (generation === loadGeneration.current)
				setError((error as Error).message);
		} finally {
			if (generation === loadGeneration.current) setLoading(false);
		}
	}, []);
	useEffect(() => {
		void refresh();
		return () => {
			loadGeneration.current++;
		};
	}, [refresh]);
	useEffect(() => {
		const sync = () => setPath(location());
		window.addEventListener("popstate", sync);
		const removeGuard = pwa.addBusyGuard(() => busy.current || playing.current);
		return () => {
			window.removeEventListener("popstate", sync);
			removeGuard();
		};
	}, []);
	const navigate = (href: string) => {
		window.history.pushState(null, "", href);
		setPath(location());
	};
	const url = new URL(path, window.location.origin);
	const sample =
		url.pathname === "/read"
			? SAMPLE_SCRIPTS.find(
					(script) => script.id === url.searchParams.get("sample"),
				)
			: undefined;
	const reading =
		sample ??
		(url.pathname === "/read"
			? scripts.find((script) => script.id === url.searchParams.get("id"))
			: undefined);
	async function remove() {
		if (!deleting || deletion.current) return;
		deletion.current = true;
		setPendingDelete(true);
		setDeleteError("");
		try {
			setScripts(await saveScript(deleting, true));
			setDeleting(null);
		} catch (error) {
			setDeleteError((error as Error).message);
		} finally {
			deletion.current = false;
			setPendingDelete(false);
		}
	}
	return (
		<>
			<Shell app={fas} appName="Cue" nav={NAV} onNavigate={navigate}>
				<div className="cue-page">
					{url.pathname === "/help" ? (
						<>
							<PageHeader
								title="Make room for your words"
								description="A quiet teleprompter for your next take."
							/>
							<Card>
								<ol className="cue-help">
									<li>Add your script and give it a title.</li>
									<li>
										Open it, choose a comfortable size and speed, then press
										Play.
									</li>
									<li>
										Use mirror text with a teleprompter reflector. Space pauses
										playback; touching the text pauses it too.
									</li>
								</ol>
								<p>
									Scripts stay in this browser on this device. Sign-in is
									optional and does not sync scripts. Keep a separate copy of
									text you need elsewhere.
								</p>
								<p>
									After the first successful load, saved scripts and the reader
									work offline. Installation is available from your profile when
									this browser supports it.
								</p>
							</Card>
							<section aria-labelledby="sample-heading">
								<h2 id="sample-heading">Try a sample</h2>
								<p>
									Open a practice script, then press Play. No saving needed.
								</p>
								<div className="cue-library">
									{SAMPLE_SCRIPTS.map((script) => (
										<Card key={script.id}>
											<article className="cue-script">
												<h3>{script.title}</h3>
												<p className="cue-sample-text">{script.body}</p>
												<button
													type="button"
													className="cue-primary"
													aria-label={`Start ${script.title}`}
													onClick={() =>
														navigate(
															`/read?sample=${encodeURIComponent(script.id)}`,
														)
													}
												>
													Start reading
												</button>
											</article>
										</Card>
									))}
								</div>
							</section>
						</>
					) : reading ? (
						<Reader
							key={reading.id}
							script={reading}
							session={
								readingSessions.current[reading.id] ??
								(readingSessions.current[reading.id] = {})
							}
							exitLabel={sample ? "How to use" : "Library"}
							onExit={() => navigate(sample ? "/help" : "/")}
							onBusy={onBusy}
						/>
					) : (
						<>
							<PageHeader
								title="Your next take starts here"
								description="Write it once. Read it at your pace."
								actions={
									<button
										className="cue-primary"
										type="button"
										disabled={loading || !!error}
										onClick={() =>
											setEditor({
												id: crypto.randomUUID(),
												title: "",
												body: "",
												revision: 0,
											})
										}
									>
										New script
									</button>
								}
							/>
							<div className="cue-summary">
								<span>
									{scripts.length} {scripts.length === 1 ? "script" : "scripts"}{" "}
									· Saved on this device
								</span>
								<button
									type="button"
									disabled={loading}
									onClick={() => void refresh()}
								>
									Refresh library
								</button>
							</div>
							{loading ? (
								<p role="status">Opening your scripts…</p>
							) : error ? (
								<p role="alert" className="cue-error">
									{error}
								</p>
							) : scripts.length === 0 ? (
								<Card>
									<div className="cue-empty">
										<span aria-hidden="true" className="cue-mark">
											Aa
										</span>
										<h2>A clear cue for every take</h2>
										<p>Add a speech, video intro, or practice script.</p>
										<button
											className="cue-primary"
											type="button"
											onClick={() =>
												setEditor({
													id: crypto.randomUUID(),
													title: "",
													body: "",
													revision: 0,
												})
											}
										>
											Create your first script
										</button>
									</div>
								</Card>
							) : (
								<div className="cue-library">
									{scripts.map((script) => (
										<Card key={script.id}>
											<article className="cue-script">
												<p className="cue-kicker">
													{wordCount(script.body)} words
												</p>
												<h2>{script.title}</h2>
												<p className="cue-preview">
													{script.body.slice(0, 170)}
													{script.body.length > 170 ? "…" : ""}
												</p>
												<div className="cue-actions">
													<button
														className="cue-primary"
														type="button"
														onClick={() =>
															navigate(
																`/read?id=${encodeURIComponent(script.id)}`,
															)
														}
													>
														Open script
													</button>
													<button
														type="button"
														aria-label={`Edit ${script.title}`}
														onClick={() => setEditor(script)}
													>
														Edit
													</button>
													<button
														type="button"
														aria-label={`Delete ${script.title}`}
														onClick={() => {
															setDeleteError("");
															setDeleting(script);
														}}
													>
														Delete
													</button>
												</div>
											</article>
										</Card>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</Shell>
			{editor && (
				<Editor
					key={editor.id}
					script={editor}
					onSave={async (draft) => {
						setScripts(await saveScript(draft));
					}}
					onClose={() => setEditor(null)}
				/>
			)}
			{deleting && (
				<Modal
					open
					title="Delete script?"
					onClose={() => {
						if (!deletion.current) setDeleting(null);
					}}
				>
					<p>Delete “{deleting.title}” from this device?</p>
					{deleteError && <p role="alert">{deleteError}</p>}
					{pendingDelete && <p role="status">Deleting…</p>}
					<div className="cue-actions">
						<button
							disabled={pendingDelete}
							type="button"
							onClick={() => setDeleting(null)}
						>
							Cancel
						</button>
						<button
							disabled={pendingDelete}
							type="button"
							onClick={() => void remove()}
						>
							Delete script
						</button>
					</div>
				</Modal>
			)}
		</>
	);
}
