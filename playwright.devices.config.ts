import {defineConfig,devices} from '@playwright/test';
const browser=process.env.KOPY_DEVICE_BROWSER;
const projects=[
  {name:'ipad-portrait',use:{...devices['iPad (gen 7)'],browserName:'webkit' as const}},
  {name:'ipad-landscape',use:{...devices['iPad (gen 7) landscape'],browserName:'webkit' as const}},
  {name:'iphone',use:{...devices['iPhone 13'],browserName:'webkit' as const}},
  {name:'android-phone',use:{...devices['Pixel 7'],browserName:'chromium' as const}},
  {name:'windows-desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900},browserName:'chromium' as const}},
  {name:'smartboard',use:{browserName:'chromium' as const,viewport:{width:2560,height:1440},hasTouch:true}},
  {name:'firefox-desktop',use:{...devices['Desktop Firefox'],browserName:'firefox' as const}},
];
export default defineConfig({
  testDir:'test/device',workers:1,timeout:60000,retries:0,
  use:{baseURL:'http://127.0.0.1:5196',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:projects.filter(project=>!browser||project.use.browserName===browser),
  webServer:{command:'npm run dev -- --port 5196',url:'http://127.0.0.1:5196',reuseExistingServer:!process.env.CI,timeout:60000},
});
