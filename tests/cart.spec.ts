// @ts-check

import { test, expect } from '@playwright/test';
import { UIReference, slugs } from '@config';

import CartPage from '@poms/frontend/override/cart.page';
import LoginPage from '@poms/frontend/override/login.page';
import ProductPage from '@poms/frontend/override/product.page';
import { requireEnv } from '@utils/env.utils';

test.describe('Cart functionalities (guest)', {
    annotation: {
        type: 'Cart',
        description: 'Cart functionality tests'
    }
}, () => {
    test.beforeEach(async ({ page }) => {
        const productPage = new ProductPage(page);
        await page.goto(slugs.productpage.simpleProductSlug);
        await productPage.addSimpleProductToCart(UIReference.productPage.simpleProductTitle, slugs.productpage.simpleProductSlug);
        await page.goto(slugs.cart.cartSlug);
        await page.waitForLoadState('domcontentloaded');
    });

    test('Add_product_to_cart', { tag: ['@cart', '@override', '@cold'] }, async ({ page }) => {
        // Product is displayed as a link on this site's cart page
        await expect(page.getByRole('link', { name: UIReference.productPage.simpleProductTitle }), `Product is visible in cart`).toBeVisible();
    });

    test.skip('Product_remains_in_cart_after_login', { tag: ['@cart', '@account', '@override', '@hot'] }, async ({ page, browserName }) => {
        // Verify product is in cart before login
        await expect(page.getByRole('link', { name: UIReference.productPage.simpleProductTitle })).toBeVisible();

        await test.step('Log in with account', async () => {
            const browserEngine = browserName?.toUpperCase() || "UNKNOWN";
            const loginPage = new LoginPage(page);
            const emailInputValue = requireEnv(`MAGENTO_EXISTING_ACCOUNT_EMAIL_${browserEngine}`);
            const passwordInputValue = requireEnv('MAGENTO_EXISTING_ACCOUNT_PASSWORD');

            await loginPage.login(emailInputValue, passwordInputValue);
        });

        await page.goto(slugs.cart.cartSlug);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByRole('link', { name: UIReference.productPage.simpleProductTitle }), `${UIReference.productPage.simpleProductTitle} should still be in cart after login`).toBeVisible();
    });

    test('Remove_product_from_cart', { tag: ['@cart', '@override', '@cold'] }, async ({ page }) => {
        const cart = new CartPage(page);
        await cart.removeProduct(UIReference.productPage.simpleProductTitle);
    });

    test('Change_product_quantity_in_cart', { tag: ['@cart', '@override', '@cold'] }, async ({ page }) => {
        const cart = new CartPage(page);
        await cart.changeProductQuantity('2');
    });
});
