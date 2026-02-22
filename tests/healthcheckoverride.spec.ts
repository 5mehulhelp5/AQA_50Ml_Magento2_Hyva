// @ts-check

import {test, expect} from '@playwright/test';
import {UIReference, slugs} from '@config';

test.describe('Page health checks', () => {
    test('Homepage_returns_200', {tag: ['@smoke', '@cold', '@override']}, async ({page}) => {
        const homepageURL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL;
        if (!homepageURL) {
            throw new Error("PLAYWRIGHT_BASE_URL has not been defined in the .env file.");
        }

        const homepageResponsePromise = page.waitForResponse(homepageURL);
        await page.goto(homepageURL);
        const homepageResponse = await homepageResponsePromise;
        expect(homepageResponse.status(), 'Homepage should return 200').toBe(200);

    });

    test('Plp_returns_200', {tag: ['@smoke', '@cold', '@override']}, async ({page}) => {
        const response = await page.goto(slugs.categoryPage.categorySlug);
        expect(response?.status(), 'PLP should return 200').toBe(200);

        await expect(
            page.getByRole('heading', {level: 1}).first(),
            'PLP has a visible title'
        ).toBeVisible();
    });

    test('Pdp_returns_200', {tag: ['@smoke', '@cold', '@override']}, async ({page}) => {
        const pdpResponse = await page.goto(slugs.productpage.simpleProductSlug);
        expect(pdpResponse.status(), 'PDP should return 200').toBe(200);

        await expect(
            page.getByRole('heading', {level: 1, name: UIReference.productPage.simpleProductTitle}),
            'PDP has a visible title'
        ).toBeVisible();
    });

    test('Checkout_returns_200', {tag: ['@smoke', '@cold', '@override']}, async ({page}) => {
        const responsePromise = page.waitForResponse(slugs.checkout.checkoutSlug);

        await page.goto(slugs.checkout.checkoutSlug);
        const response = await responsePromise;

        expect([302, 308], 'Cart empty, checkout should redirect').toContain(response.status());
        expect(page.url(), 'Cart empty, checkout should redirect to cart').toContain('/checkout/cart');

        expect((await page.request.head(page.url())).status(), `Current page (${page.url()}) should return 200`).toBe(200);
    });
});
