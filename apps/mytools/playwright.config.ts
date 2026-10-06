import { defineConfig, devices } from "@playwright/test";
const chromiumOptions = process.env.CHROMIUM_EXECUTABLE
  ? {
      executablePath: process.env.CHROMIUM_EXECUTABLE,
      args: [
        "--no-sandbox",
        "--no-zygote",
        ...(process.env.QA_ISOLATED_BROWSER ? ["--single-process"] : []),
        "--disable-dev-shm-usage",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    }
  : {};
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL:
      process.env.DEMO_URL || "http://127.0.0.1:4173/ia-apps-webs/mytools/",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumOptions,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        launchOptions: chromiumOptions,
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: process.env.DEMO_URL
    ? undefined
    : {
        command:
          "npm run build && npx vite preview --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173/ia-apps-webs/mytools/",
        reuseExistingServer: true,
        timeout: 120000,
      },
});
