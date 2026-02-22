// @ts-check

import {test} from '@playwright/test';
import {UIReference, slugs} from '@config';

import LoginPage from '@poms/frontend/override/login.page';
import MainMenuPage from '@poms/frontend/override/mainmenu.page';
import ProductPage from '@poms/frontend/override/product.page';
import {requireEnv} from '@utils/env.utils';

test.describe('Main menu (requires login)', () => {
    test.skip(() => true, 'reCAPTCHA blocks login');

    test.beforeEach(async ({page, browserName}) => {
        const browserEngine = browserName?.toUpperCase() || "UNKNOWN";
        const emailInputValue = requireEnv(`MAGENTO_EXISTING_ACCOUNT_EMAIL_${browserEngine}`);
        const passwordInputValue = requireEnv('MAGENTO_EXISTING_ACCOUNT_PASSWORD');

        const loginPage = new LoginPage(page)
        await loginPage.login(emailInputValue, passwordInputValue);
        await page.waitForLoadState('domcontentloaded');
    });

    test('User_logs_out', {tag: ['@mainmenu', '@hot', '@override']}, async ({page}) => {
        const mainMenu = new MainMenuPage(page);
        await mainMenu.logout();
    });

    test('Navigate_to_account_page', {tag: ['@mainmenu', '@hot', '@override']}, async ({page}) => {
        const mainMenu = new MainMenuPage(page);
        await mainMenu.gotoMyAccount();
    });
});

test.describe('Main menu (guest)', () => {
    test('Add_simple_product_to_cart', {tag: ['@mainmenu', '@cold', '@override']}, async ({page}, testInfo) => {
        testInfo.annotations.push({
            type: 'WARNING (FIREFOX)',
            description: `The minicart icon does not lose its aria-disabled=true flag when the first product is added. This prevents Playwright from clicking it. A fix will be added in the future.`
        });

        const productPage = new ProductPage(page);
        await productPage.addSimpleProductToCart(UIReference.productPage.simpleProductTitle, slugs.productpage.simpleProductSlug);
    });
});
