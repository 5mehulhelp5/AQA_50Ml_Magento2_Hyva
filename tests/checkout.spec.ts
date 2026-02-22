// @ts-check

import { test, expect } from '@playwright/test';
import { UIReference, slugs } from '@config';

import LoginPage from '@poms/frontend/override/login.page';
import ProductPage from '@poms/frontend/override/product.page';
import { requireEnv } from '@utils/env.utils';
import CheckoutPage from '@poms/frontend/override/checkout.page';

test.beforeEach(async ({ page }) => {
    const productPage = new ProductPage(page);

    await page.goto(slugs.productpage.simpleProductSlug);
    await productPage.addSimpleProductToCart(UIReference.productPage.simpleProductTitle, slugs.productpage.simpleProductSlug);
    await page.goto(slugs.checkout.checkoutSlug);
});

test.describe('Checkout (login required)', {
    annotation: {
        type: 'Checkout',
        description: 'Checkout tests requiring authentication'
    }
}, () => {
    test.skip(() => true, 'reCAPTCHA blocks login');

    test.beforeEach(async ({ page, browserName }) => {
        const browserEngine = browserName?.toUpperCase() || "UNKNOWN";
        const emailInputValue = requireEnv(`MAGENTO_EXISTING_ACCOUNT_EMAIL_${browserEngine}`);
        const passwordInputValue = requireEnv('MAGENTO_EXISTING_ACCOUNT_PASSWORD');

        const loginPage = new LoginPage(page);
        await loginPage.login(emailInputValue, passwordInputValue);
        await page.goto(slugs.checkout.checkoutSlug);
    });

    test('Place_order_for_simple_product', { tag: ['@simple-product-order', '@override', '@hot'] }, async ({ page }, testInfo) => {
        const checkoutPage = new CheckoutPage(page);
        let orderNumber = await checkoutPage.placeOrder();
        testInfo.annotations.push({ type: 'Order number', description: `${orderNumber}` });
    });
});

test.describe('Checkout (guest)', {
    annotation: {
        type: 'Checkout',
        description: 'Guest checkout tests'
    }
}, () => {
    test('Guest_can_place_order', { tag: ['@checkout', '@override', '@hot'] }, async ({ page }, testInfo) => {
        const checkoutPage = new CheckoutPage(page);

        await test.step('Place order as guest', async () => {
            await page.goto(slugs.checkout.checkoutSlug);
            let orderNumber = await checkoutPage.placeOrder();
            expect(orderNumber, 'Order number should be generated and returned').toBeTruthy();
            testInfo.annotations.push({ type: 'Order number', description: `${orderNumber}` });
        });
    });
});
