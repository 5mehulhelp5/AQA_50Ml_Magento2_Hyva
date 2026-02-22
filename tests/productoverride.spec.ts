// @ts-check

import {test} from '@playwright/test';
import {UIReference, slugs} from '@config';

import ProductPage from '@poms/frontend/override/product.page';
import LoginPage from '@poms/frontend/override/login.page';
import {requireEnv} from '@utils/env.utils';

test.describe('Product page tests', {tag: '@product',}, () => {
    test.skip('Add_product_to_wishlist', {tag: ['@cold', '@override']}, async ({page, browserName}) => {
        await test.step('Log in with account', async () => {
            const browserEngine = browserName?.toUpperCase() || "UNKNOWN";
            const emailInputValue = requireEnv(`MAGENTO_EXISTING_ACCOUNT_EMAIL_${browserEngine}`);
            const passwordInputValue = requireEnv('MAGENTO_EXISTING_ACCOUNT_PASSWORD');

            const loginPage = new LoginPage(page);
            await loginPage.login(emailInputValue, passwordInputValue);
        });

        await test.step('Add product to wishlist', async () => {
            const productPage = new ProductPage(page);
            await productPage.addProductToWishlist(UIReference.productPage.simpleProductTitle, slugs.productpage.simpleProductSlug);
        });
    });
});
