import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.e2e.mjs',workers:1,timeout:90000,use:{baseURL:`http://127.0.0.1:${process.env.DEVKILLER_PORT || 4310}`,viewport:{width:1440,height:1100},screenshot:'only-on-failure'},reporter:'list'});
