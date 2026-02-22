// @ts-check

import {test} from '@playwright/test';
import {UIReference, slugs} from '@config';
import {requireEnv} from '@utils/env.utils';

import LoginPage from '@poms/frontend/override/login.page';
import ProductPage from '@poms/frontend/override/product.page';
import CheckoutPage from '@poms/frontend/override/checkout.page';
import OrderHistoryPage from '@poms/frontend/override/orderhistory.page';

test.skip('Recent_order_is_visible_in_history', {tag: ['@cold', '@override']}, async ({page, browserName}) => {
    const browserEngine = browserName?.toUpperCase() || 'UNKNOWN';
    const emailInputValue = requireEnv(`MAGENTO_EXISTING_ACCOUNT_EMAIL_${browserEngine}`);
    const passwordInputValue = requireEnv('MAGENTO_EXISTING_ACCOUNT_PASSWORD');

    const loginPage = new LoginPage(page);
    const productPage = new ProductPage(page);
    const checkoutPage = new CheckoutPage(page);
    const orderHistoryPage = new OrderHistoryPage(page);

    await loginPage.login(emailInputValue, passwordInputValue);

    await page.goto(slugs.productpage.simpleProductSlug);
    await productPage.addSimpleProductToCart(UIReference.productPage.simpleProductTitle, slugs.productpage.simpleProductSlug);
    await page.goto(slugs.checkout.checkoutSlug);
    const orderNumber = await checkoutPage.placeOrder();

    console.log(`Created order number: ${orderNumber}`);

    await orderHistoryPage.open();
    await orderHistoryPage.verifyOrderPresent(orderNumber);
});
