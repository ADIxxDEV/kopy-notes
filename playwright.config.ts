import {defineConfig} from '@playwright/test';
const port=process.env.KOPY_TEST_PORT || '5195';
export default defineConfig({
  testDir:'test/browser',timeout:120000,use:{baseURL:`http://127.0.0.1:${port}`,headless:true,viewport:{width:1280,height:720},trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{}},
  webServer:{command:`npm run dev -- --port ${port}`,url:`http://127.0.0.1:${port}`,reuseExistingServer:!process.env.CI,timeout:60000}
});
