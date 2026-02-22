import {test, expect} from '@playwright/test';

test('Footer text checking', {tag: ['@custom']}, async ({page}) => {
    await page.goto('/');

    const footerText = page.getByText(/©\d{4} Fast Ventures srl/);
    await expect(footerText).toBeVisible();
});
