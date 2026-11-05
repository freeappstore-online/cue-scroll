import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Modal } from "@freeappstore/sdk/ui";
import type { Script } from "./scripts";
export function Editor({
	script,
	onSave,
	onClose,
}: {
	script: Script;
	onSave(script: Script): Promise<void>;
	onClose(): void;
}) {
	const id = useId();
	const input = useRef<HTMLInputElement>(null);
	const saving = useRef(false);
	const [title, setTitle] = useState(script.title);
	const [body, setBody] = useState(script.body);
	const [error, setError] = useState("");
	const [invalid, setInvalid] = useState(false);
	const [pending, setPending] = useState(false);
	useEffect(() => {
		if (error && !pending) input.current?.focus();
	}, [error, pending]);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving.current) return;
		if (!title.trim() || !body.trim()) {
			setInvalid(true);
			setError("Enter a title and script text.");
			return;
		}
		setError("");
		setInvalid(false);
		saving.current = true;
		setPending(true);
		try {
			await onSave({ ...script, title, body });
			onClose();
		} catch (error) {
			setError((error as Error).message);
		} finally {
			saving.current = false;
			setPending(false);
		}
	}
	return (
		<Modal
			open
			title={script.revision ? "Edit script" : "New script"}
			maxWidth={640}
			onClose={() => {
				if (!saving.current) onClose();
			}}
		>
			<form noValidate onSubmit={submit} className="cue-form">
				<label htmlFor={`${id}-title`}>Title</label>
				<input
					ref={input}
					data-autofocus
					id={`${id}-title`}
					value={title}
					maxLength={120}
					disabled={pending}
					aria-invalid={invalid && !title.trim()}
					aria-describedby={error ? `${id}-error` : undefined}
					onChange={(event) => {
						setTitle(event.target.value);
						setError("");
						setInvalid(false);
					}}
				/>
				<label htmlFor={`${id}-body`}>Script text</label>
				<textarea
					id={`${id}-body`}
					value={body}
					rows={10}
					maxLength={100000}
					disabled={pending}
					aria-invalid={invalid && !body.trim()}
					aria-describedby={error ? `${id}-error` : undefined}
					onChange={(event) => {
						setBody(event.target.value);
						setError("");
						setInvalid(false);
					}}
				/>
				<p className="cue-muted">
					Saved on this device. Give each thought its own paragraph for easier
					reading.
				</p>
				{error && (
					<p id={`${id}-error`} role="alert" className="cue-error">
						{error}
					</p>
				)}
				{pending && <p role="status">Saving…</p>}
				<div className="cue-actions">
					<button type="button" disabled={pending} onClick={onClose}>
						Cancel
					</button>
					<button className="cue-primary" disabled={pending} type="submit">
						Save script
					</button>
				</div>
			</form>
		</Modal>
	);
}
