import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PageHeader } from "@freeappstore/sdk/ui";
import { type Script, wordCount } from "./scripts";
export type ReadingSession = {
	scroll?: number;
	speed?: number;
	size?: number;
	mirror?: boolean;
	awake?: boolean;
	settingsOpen?: boolean;
};
export function Reader({
	script,
	session,
	onExit,
	exitLabel = "Library",
	onBusy,
}: {
	script: Script;
	session: ReadingSession;
	onExit(): void;
	exitLabel?: string;
	onBusy(value: boolean): void;
}) {
	const area = useRef<HTMLDivElement>(null);
	const [playing, setPlaying] = useState(false);
	const [finished, setFinished] = useState(false);
	const [speed, setSpeed] = useState(session.speed ?? 40);
	const [size, setSize] = useState(session.size ?? 2);
	const [mirror, setMirror] = useState(session.mirror ?? false);
	const [awake, setAwake] = useState(session.awake ?? true);
	const [settingsOpen, setSettingsOpen] = useState(
		session.settingsOpen ?? false,
	);
	const [notice, setNotice] = useState("");
	useLayoutEffect(() => {
		const element = area.current;
		if (!element) return;
		element.scrollTop = session.scroll ?? 0;
		return () => {
			session.scroll = element.scrollTop;
		};
	}, [session]);
	useEffect(() => {
		Object.assign(session, { speed, size, mirror, awake, settingsOpen });
	}, [session, speed, size, mirror, awake, settingsOpen]);
	useEffect(() => {
		onBusy(playing);
		return () => onBusy(false);
	}, [playing, onBusy]);
	useEffect(() => {
		const visibility = () => {
			if (document.hidden) setPlaying(false);
		};
		const keyboard = (event: KeyboardEvent) => {
			if (
				event.code !== "Space" ||
				event.repeat ||
				(event.target as HTMLElement)?.closest?.(
					"input,textarea,select,button,a,summary,[contenteditable=true]",
				)
			)
				return;
			event.preventDefault();
			if (
				area.current &&
				area.current.scrollTop >=
					area.current.scrollHeight - area.current.clientHeight - 1
			)
				area.current.scrollTop = 0;
			setSettingsOpen(false);
			setPlaying((value) => !value);
			setFinished(false);
		};
		document.addEventListener("visibilitychange", visibility);
		document.addEventListener("keydown", keyboard);
		return () => {
			document.removeEventListener("visibilitychange", visibility);
			document.removeEventListener("keydown", keyboard);
		};
	}, []);
	useEffect(() => {
		if (!playing || !awake) return;
		if (!("wakeLock" in navigator)) {
			setNotice("Keep your screen awake in device settings if it dims.");
			return;
		}
		let disposed = false;
		let lock: WakeLockSentinel | undefined;
		navigator.wakeLock
			.request("screen")
			.then((value) => {
				if (disposed) void value.release();
				else lock = value;
			})
			.catch(() => {
				if (!disposed)
					setNotice(
						"Screen wake lock was unavailable. You can keep the screen awake in device settings.",
					);
			});
		return () => {
			disposed = true;
			void lock?.release();
		};
	}, [playing, awake]);
	useEffect(() => {
		if (!playing || !area.current) return;
		const el = area.current;
		let position = el.scrollTop;
		let previous = 0;
		let frame = 0;
		const step = (now: number) => {
			if (previous) position += (speed * Math.min(now - previous, 100)) / 1000;
			previous = now;
			el.scrollTop = position;
			if (position >= el.scrollHeight - el.clientHeight - 1) {
				setPlaying(false);
				setFinished(true);
				return;
			}
			frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	}, [playing, speed, size]);
	function restart() {
		setPlaying(false);
		setFinished(false);
		if (area.current) area.current.scrollTop = 0;
	}
	return (
		<>
			<PageHeader
				title={script.title}
				description={`${wordCount(script.body)} words · Settle in, then press play.`}
				actions={
					<button type="button" onClick={onExit}>
						{exitLabel}
					</button>
				}
			/>
			<section className="cue-reader" aria-label="Teleprompter">
				<div className="cue-actions cue-playback">
					<button
						type="button"
						className="cue-primary"
						onClick={() => {
							if (finished) restart();
							setFinished(false);
							setSettingsOpen(false);
							setPlaying((value) => !value);
						}}
					>
						{playing ? "Pause" : finished ? "Read again" : "Play"}
					</button>
					<button type="button" onClick={restart}>
						Restart
					</button>
					<span role="status" aria-live="polite">
						{playing ? "Reading" : finished ? "End of script" : "Paused"}
					</span>
				</div>
				<details
					className="cue-settings"
					open={settingsOpen}
					onToggle={(event) => {
						setSettingsOpen(event.currentTarget.open);
						if (event.currentTarget.open) setPlaying(false);
					}}
				>
					<summary>Reading settings</summary>
					<div className="cue-controls">
						<label>
							Scroll speed <output>{speed} px/s</output>
							<input
								type="range"
								min="10"
								max="120"
								step="5"
								value={speed}
								onChange={(event) => setSpeed(Number(event.target.value))}
							/>
						</label>
						<label>
							Reading text size <output>{Math.round(size * 100)}%</output>
							<input
								type="range"
								min="1.25"
								max="3.5"
								step="0.25"
								value={size}
								onChange={(event) => setSize(Number(event.target.value))}
							/>
						</label>
						<label className="cue-check">
							<input
								type="checkbox"
								checked={mirror}
								onChange={(event) => setMirror(event.target.checked)}
							/>
							Mirror text
						</label>
						<label className="cue-check">
							<input
								type="checkbox"
								checked={awake}
								onChange={(event) => setAwake(event.target.checked)}
							/>
							Keep screen awake
						</label>
					</div>
				</details>
				<div
					ref={area}
					className="cue-scroll"
					role="region"
					tabIndex={0}
					aria-label="Script reading area"
					onPointerDown={() => setPlaying(false)}
					onWheel={() => setPlaying(false)}
				>
					<div
						className={`cue-reading-text${mirror ? " cue-mirrored" : ""}`}
						style={{ fontSize: `${size}rem` }}
					>
						{script.body}
					</div>
				</div>
				<p className="cue-muted">
					Space to play or pause. Touch or scroll the text to pause.
				</p>
				{notice && <p className="cue-muted">{notice}</p>}
			</section>
		</>
	);
}
