import { test as base } from "@playwright/test";
export const test = process.env.QA_ISOLATED_BROWSER
  ? base.extend({
      page: async (
        {
          playwright,
          browserName,
          launchOptions,
          viewport,
          isMobile,
          deviceScaleFactor,
          hasTouch,
          userAgent,
          baseURL,
        },
        use,
      ) => {
        const browser = await playwright[browserName].launch(launchOptions);
        try {
          const context = await browser.newContext({
            viewport,
            isMobile,
            deviceScaleFactor,
            hasTouch,
            userAgent,
            baseURL,
          });
          await use(await context.newPage());
        } finally {
          await browser.close();
        }
      },
    })
  : base;
