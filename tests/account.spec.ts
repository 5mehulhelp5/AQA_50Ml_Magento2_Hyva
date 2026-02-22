// @ts-check

import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { UIReference, slugs, inputValues } from '@config';
import { requireEnv } from '@utils/env.utils';

import AccountPage from '@poms/frontend/override/account.page';
import LoginPage from '@poms/frontend/override/login.page';

test.describe('Account address book actions', {
    annotation: {
        type: 'Account Dashboard',
        description: 'Tests for the Address Book'
    }
}, () => {
    test.skip(() => true, 'reCAPTCHA blocks login');

    test.beforeEach(async ({ page, browserName }) => {
        const browserEngine = browserName?.toUpperCase() || "UNKNOWN";
        const emailInputValue = requireEnv(`MAGENTO_EXISTING_ACCOUNT_EMAIL_${browserEngine}`);
        const passwordInputValue = requireEnv('MAGENTO_EXISTING_ACCOUNT_PASSWORD');

        const loginPage = new LoginPage(page);
        await loginPage.login(emailInputValue, passwordInputValue);
    });

    test('Add_first_address', { tag: ['@account-credentials', '@override', '@hot'] }, async ({ page }) => {
        const accountPage = new AccountPage(page);
        await page.goto(slugs.account.addressNewSlug);
        await page.waitForLoadState('domcontentloaded');

        const firstAddress = inputValues.firstAddress;
        const streetValue = firstAddress.firstStreetAddressValue + ' ' + Math.floor(Math.random() * 100 + 1);
        const companyName = faker.company.name();
        await accountPage.addNewAddress({
            company: companyName,
            phone: firstAddress.firstPhoneNumberValue,
            street: streetValue,
            zip: firstAddress.firstZipCodeValue,
            city: firstAddress.firstCityValue,
            state: firstAddress.firstProvinceValue,
            country: firstAddress.firstNonDefaultCountry,
        });

        await expect(page.getByText(companyName)).toBeVisible();
        await expect(page.getByText(streetValue)).toBeVisible();
    });

    test('Add_another_address', { tag: ['@account-credentials', '@override', '@hot'] }, async ({ page }) => {
        await page.goto(slugs.account.addressNewSlug);
        await page.waitForLoadState('domcontentloaded');

        const accountPage = new AccountPage(page);
        const secondAddress = inputValues.secondAddress;
        const companyName = faker.company.name();
        const streetValue = secondAddress.secondStreetAddressValue + ' ' + Math.floor(Math.random() * 100 + 1);
        await accountPage.addNewAddress({
            company: companyName,
            phone: secondAddress.secondPhoneNumberValue,
            street: streetValue,
            zip: secondAddress.secondZipCodeValue,
            city: secondAddress.secondCityValue,
            state: secondAddress.secondProvinceValue,
            country: secondAddress.secondNonDefaultCountry,
        });

        await expect(page.getByText(companyName)).toBeVisible();
        await expect(page.getByText(streetValue)).toBeVisible();
    });

    test('Missing_required_field_prevents_creation', { tag: ['@account-credentials', '@override'] }, async ({ page }) => {
        await page.goto(slugs.account.addressNewSlug);
        await page.waitForLoadState('domcontentloaded');

        const accountPage = new AccountPage(page);
        await accountPage.phoneNumberField.fill(inputValues.firstAddress.firstPhoneNumberValue);
        await accountPage.saveAddressButton.click();

        const errorMessage = page.getByText(UIReference.general.errorMessageRequiredFieldText).first();
        await errorMessage.waitFor({ timeout: 10000 });
        await expect(errorMessage).toBeVisible();
    });
});
