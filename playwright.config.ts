import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.CUE_BASE_URL ?? "http://127.0.0.1:4187";
export default defineConfig({
	testDir: "./tests",
	timeout: 60_000,
	fullyParallel: false,
	workers: 1,
	use: { baseURL, trace: "retain-on-failure" },
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{
			name: "mobile",
			use: { ...devices["iPhone SE"], defaultBrowserType: "chromium" },
		},
		{ name: "webkit", use: { ...devices["iPhone 14"] } },
	],
	webServer: process.env.CUE_BASE_URL
		? undefined
		: {
				command: "pnpm preview --host 127.0.0.1 --port 4187",
				url: baseURL,
				reuseExistingServer: !process.env.CI,
				timeout: 30_000,
			},
});
