import { expect, test } from "@playwright/test";
const text =
	"Welcome to the launch briefing. Take a breath, look up, and speak at your own pace.\n\n".repeat(
		25,
	);
test("write, recover a failed save, reload, read and return from profile", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("button", { name: "New script", exact: true }).click();
	await page.getByRole("button", { name: "Save script", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText(
		"Enter a title and script text",
	);
	await page
		.getByLabel("Title", { exact: true })
		.pressSequentially("Launch briefing");
	await page.getByLabel("Script text", { exact: true }).pressSequentially(text);
	await page.evaluate(() => {
		const original = IDBDatabase.prototype.transaction;
		(window as any).failCueWrite = true;
		IDBDatabase.prototype.transaction = function (...args: any[]) {
			if ((window as any).failCueWrite && args[1] === "readwrite")
				throw new DOMException("Test storage quota", "QuotaExceededError");
			return original.apply(this, args as any);
		};
	});
	await page.getByRole("button", { name: "Save script", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText("Could not save");
	await expect(page.getByLabel("Script text", { exact: true })).toHaveValue(
		text,
	);
	await page.evaluate(() => {
		(window as any).failCueWrite = false;
	});
	await page.getByRole("button", { name: "Save script", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Launch briefing" }),
	).toBeVisible();
	await page.reload();
	await page.getByRole("button", { name: "Open script", exact: true }).click();
	const area = page.getByLabel("Script reading area", { exact: true });
	await expect(area).toBeInViewport({ ratio: 0.5 });
	await page.getByRole("button", { name: "Play", exact: true }).click();
	await expect
		.poll(() => area.evaluate((el) => el.scrollTop))
		.toBeGreaterThan(10);
	await page.getByRole("button", { name: "Pause", exact: true }).click();
	const settings = page.locator("summary", { hasText: "Reading settings" });
	await settings.focus();
	await page.keyboard.press("Space");
	await expect(page.getByLabel("Mirror text", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Play", exact: true }),
	).toBeVisible();
	await page.getByLabel("Mirror text", { exact: true }).check();
	await expect(page.locator(".cue-reading-text")).toHaveCSS(
		"transform",
		"matrix(-1, 0, 0, 1, 0, 0)",
	);
	await area.focus();
	await page.keyboard.press("Space");
	await expect(
		page.getByRole("button", { name: "Pause", exact: true }),
	).toBeVisible();
	await page.keyboard.press("Space");
	await expect(
		page.getByRole("button", { name: "Play", exact: true }),
	).toBeVisible();
	await page.getByRole("link", { name: "Profile", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Profile", exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("Sign in with GitHub", { exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("Sign in with Google", { exact: true }),
	).toBeVisible();
	await expect(page.getByText("Back to app", { exact: true })).toHaveCount(0);
	await expect(
		page.getByText("Install this app for easier access.", { exact: false }),
	).toHaveCount(0);
	await page.getByRole("link", { name: "Close profile", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Launch briefing" }),
	).toBeVisible();
	await expect
		.poll(() => area.evaluate((el) => el.scrollTop))
		.toBeGreaterThan(10);
	await expect(page.getByLabel("Mirror text", { exact: true })).toBeChecked();
	await expect(
		page.getByRole("button", { name: "Play", exact: true }),
	).toBeVisible();
	await page.setViewportSize({ width: 320, height: 740 });
	await page.evaluate(() => (document.documentElement.dataset.text = "lg"));
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await expect(
		page.getByRole("link", { name: "Profile", exact: true }),
	).toHaveCSS("width", "44px");
});

test("offline scripts, real identity assets and stale-tab conflict handling", async ({
	page,
	context,
}) => {
	await page.goto("/");
	await page.getByRole("button", { name: "New script", exact: true }).click();
	await page.getByLabel("Title", { exact: true }).fill("Offline rehearsal");
	await page.getByLabel("Script text", { exact: true }).fill(text);
	await page.getByRole("button", { name: "Save script", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Offline rehearsal" }),
	).toBeVisible();
	const other = await context.newPage();
	await other.goto("/");
	await other
		.getByRole("button", { name: "Edit Offline rehearsal", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Edit Offline rehearsal", exact: true })
		.click();
	await page.getByLabel("Title", { exact: true }).fill("Newer rehearsal");
	await page.getByRole("button", { name: "Save script", exact: true }).click();
	await other.getByRole("button", { name: "Save script", exact: true }).click();
	await expect(other.getByRole("alert")).toContainText(
		"changed in another tab",
	);
	await other.close();
	const manifest = await (await page.request.get("/manifest.json")).json();
	for (const icon of manifest.icons) {
		const response = await page.request.get(icon.src);
		expect(response.ok()).toBe(true);
		const size = await page.evaluate(async (src) => {
			const img = new Image();
			img.src = src;
			await img.decode();
			return `${img.naturalWidth}x${img.naturalHeight}`;
		}, icon.src);
		expect(size).toBe(icon.sizes);
	}
	expect((await page.request.get("/favicon.ico")).ok()).toBe(true);
	const touch = await page
		.locator('link[rel="apple-touch-icon"]')
		.getAttribute("href");
	expect((await page.request.get(touch!)).ok()).toBe(true);
	await page.evaluate(async () => {
		const registration = await navigator.serviceWorker.ready;
		if (!navigator.serviceWorker.controller)
			await new Promise<void>((resolve) =>
				navigator.serviceWorker.addEventListener(
					"controllerchange",
					() => resolve(),
					{ once: true },
				),
			);
		return !!registration.active;
	});
	await context.setOffline(true);
	await page.reload();
	await expect(
		page.getByRole("heading", { name: "Newer rehearsal" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Open script", exact: true }).click();
	await page.getByRole("button", { name: "Play", exact: true }).click();
	await expect
		.poll(() => page.locator(".cue-scroll").evaluate((el) => el.scrollTop))
		.toBeGreaterThan(5);
});
