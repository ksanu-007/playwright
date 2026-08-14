import { test as base } from '@playwright/test';
import testData from '../utils/testData.json';

export const test = base.extend({
  testData: async ({}, use) => {
    await use(testData);
  },
});
