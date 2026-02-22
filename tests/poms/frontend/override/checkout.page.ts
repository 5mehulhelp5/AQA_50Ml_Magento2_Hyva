// @ts-check

import {expect, type Locator, type Page} from '@playwright/test';
import {faker} from '@faker-js/faker';
import {UIReference, outcomeMarker, slugs, inputValues} from '@config';

class CheckoutPage {
    readonly page: Page;

    readonly shippingMethodOptionFixed: Locator;
    readonly paymentMethodOptionCheck: Locator;
    readonly showDiscountFormButton: Locator;
    readonly placeOrderButton: Locator;
    readonly continueShoppingButton: Locator;
    readonly subtotalElement: Locator;
    readonly shippingElement: Locator;
    readonly taxElement: Locator;
    readonly grandTotalElement: Locator;
    readonly paymentMethodOptionCreditCard: Locator;
    readonly paymentMethodOptionPaypal: Locator;
    readonly creditCardNumberField: Locator;
    readonly creditCardExpiryField: Locator;
    readonly creditCardCVVField: Locator;
    readonly creditCardNameField: Locator;

    constructor(page: Page) {
        this.page = page;
        this.shippingMethodOptionFixed = this.page.getByLabel(UIReference.checkout.shippingMethodFixedLabel);
        this.paymentMethodOptionCheck = this.page.getByLabel(UIReference.checkout.paymentOptionCheckLabel);
        this.showDiscountFormButton = this.page.getByRole('button', {name: UIReference.checkout.openDiscountFormLabel});
        this.placeOrderButton = this.page.getByRole('button', {name: UIReference.checkout.placeOrderButtonLabel});
        this.continueShoppingButton = this.page.getByRole('link', {name: UIReference.checkout.continueShoppingLabel});
        this.subtotalElement = page.getByText('Subtotal');
        this.shippingElement = page.getByText('Envío y manipulación');
        this.taxElement = page.getByText('Impuestos');
        this.grandTotalElement = page.getByText('Total general');
        this.paymentMethodOptionCreditCard = this.page.getByLabel(UIReference.checkout.paymentOptionCreditCardLabel);
        this.paymentMethodOptionPaypal = this.page.getByLabel(UIReference.checkout.paymentOptionPaypalLabel);
        this.creditCardNumberField = this.page.getByLabel(UIReference.checkout.creditCardNumberLabel);
        this.creditCardExpiryField = this.page.getByLabel(UIReference.checkout.creditCardExpiryLabel);
        this.creditCardCVVField = this.page.getByLabel(UIReference.checkout.creditCardCVVLabel);
        this.creditCardNameField = this.page.getByLabel(UIReference.checkout.creditCardNameLabel);
    }

    // ==============================================
    // Order-related methods
    // ==============================================

    async placeOrder() {
        let orderPlacedNotification = outcomeMarker.checkout.orderPlacedNotification;

        // If we're not already on the checkout page, go there
        if (!this.page.url().includes(slugs.checkout.checkoutSlug)) {
            await this.page.goto(slugs.checkout.checkoutSlug);
        }

        await this.acceptAllCookies();

        // Check if guest checkout - email field visible
        const emailField = this.page.getByRole('textbox', { name: /Dirección de correo electrónico/i });
        if (await emailField.isVisible({ timeout: 2000 })) {
            // Guest checkout - need to fill shipping address
            await this.fillShippingAddress();
        }

        // Select bank transfer payment method
        await this.paymentMethodOptionCheck.check();
        await this.waitForMagewireRequests();

        // Accept terms and conditions
        const termsCheckbox = this.page.getByRole('checkbox', { name: /Declaro que he leído y acepto los términos/i });
        if (await termsCheckbox.isVisible({ timeout: 2000 })) {
            await termsCheckbox.check();
        }

        // Ensure cookie banner is gone before clicking
        await this.acceptAllCookies();

        await this.placeOrderButton.click();
        await this.waitForMagewireRequests();

        // Wait for success page or order confirmation
        const thankYouHeading = this.page.getByRole('heading', { name: /Gracias por comprar/i });
        await expect(thankYouHeading, `Order success page should be visible`).toBeVisible({ timeout: 30000 });

        let orderNumberLocator = this.page.locator('p').filter({ hasText: outcomeMarker.checkout.orderPlacedNumberText });
        await expect(orderNumberLocator).toBeVisible({ timeout: 10000 });

        // Extract order number from text
        const orderNumberText = await orderNumberLocator.innerText();
        const orderNumber = orderNumberText.replace(/\D/g, '');

        console.log(`Order created successfully: ${orderNumber}`);
        return orderNumber;
    }

    async acceptAllCookies() {
        try {
            const cookieBanner = this.page.locator('#iubenda-cs-banner');
            if (await cookieBanner.isVisible({ timeout: 2000 })) {
                const acceptButton = this.page.getByRole('button', { name: /Aceptar todas las cookies/i });
                if (await acceptButton.isVisible({ timeout: 1000 })) {
                    await acceptButton.click({ force: true });
                    await this.page.waitForTimeout(500);
                }
                // Remove banner via JS if still visible
                if (await cookieBanner.isVisible({ timeout: 500 })) {
                    await this.page.evaluate(() => {
                        const banner = document.getElementById('iubenda-cs-banner');
                        if (banner) banner.remove();
                    });
                }
            }
        } catch {
            // Silently handle - banner may not exist
        }
    }

    // ==============================================
    // Discount-related methods
    // ==============================================

    async applyDiscountCodeCheckout(code: string) {
        if (await this.page.getByPlaceholder(UIReference.cart.discountInputFieldLabel).isHidden()) {
            await this.showDiscountFormButton.click();
            await this.waitForMagewireRequests();
        }

        if (await this.page.getByText(outcomeMarker.cart.priceReducedSymbols).isVisible()) {
            let cancelCouponButton = this.page.getByRole('button', {name: UIReference.checkout.cancelDiscountButtonLabel});
            await cancelCouponButton.click();
            await this.waitForMagewireRequests();
        }

        let applyCouponCheckoutButton = this.page.getByRole('button', {name: UIReference.checkout.applyDiscountButtonLabel});
        let checkoutDiscountField = this.page.getByPlaceholder(UIReference.checkout.discountInputFieldLabel);

        await checkoutDiscountField.fill(code);
        await applyCouponCheckoutButton.click();
        await this.waitForMagewireRequests();

        await expect.soft(this.page.getByText(`${outcomeMarker.checkout.couponAppliedNotification}`), `Notification that discount code ${code} has been applied`).toBeVisible({timeout: 30000});
        await expect(this.page.getByText(outcomeMarker.checkout.checkoutPriceReducedSymbol), `'-$' should be visible on the page`).toBeVisible();
    }

    async enterWrongCouponCode(code: string) {
        if (await this.page.getByPlaceholder(UIReference.cart.discountInputFieldLabel).isHidden()) {
            await this.showDiscountFormButton.click();
            await this.waitForMagewireRequests();
        }

        let applyCouponCheckoutButton = this.page.getByRole('button', {name: UIReference.checkout.applyDiscountButtonLabel});
        let checkoutDiscountField = this.page.getByPlaceholder(UIReference.checkout.discountInputFieldLabel);
        await checkoutDiscountField.fill(code);
        await applyCouponCheckoutButton.click();
        await this.waitForMagewireRequests();

        await expect.soft(this.page.getByText(outcomeMarker.checkout.incorrectDiscountNotification), `Code should not work`).toBeVisible();
        await expect(checkoutDiscountField).toBeEditable();
    }

    async removeDiscountCode() {
        if (await this.page.getByPlaceholder(UIReference.cart.discountInputFieldLabel).isHidden()) {
            await this.showDiscountFormButton.click();
            await this.waitForMagewireRequests();
        }

        let cancelCouponButton = this.page.getByRole('button', {name: UIReference.cart.cancelCouponButtonLabel});
        await cancelCouponButton.click();
        await this.waitForMagewireRequests();

        await expect.soft(this.page.getByText(outcomeMarker.checkout.couponRemovedNotification), `Notification should be visible`).toBeVisible();
        await expect(this.page.getByText(outcomeMarker.checkout.checkoutPriceReducedSymbol), `'-$' should not be on the page`).toBeHidden();

        let checkoutDiscountField = this.page.getByPlaceholder(UIReference.checkout.discountInputFieldLabel);
        await expect(checkoutDiscountField).toBeEditable();
    }

    // ==============================================
    // Price summary methods
    // ==============================================

    async getPriceValue(element: Locator): Promise<number> {
        const priceText = await element.innerText();
        const match = priceText.match(/[\d,.]+\s*€/);
        if (match) {
            return parseFloat(match[0].replace(',', '.').replace('€', '').trim());
        }
        return 0;
    }

    async verifyPriceCalculations() {
        const subtotal = await this.getPriceValue(this.subtotalElement);
        const shipping = await this.getPriceValue(this.shippingElement);
        const tax = await this.getPriceValue(this.taxElement);
        const grandTotal = await this.getPriceValue(this.grandTotalElement);

        const calculatedTotal = +(subtotal + shipping + tax).toFixed(2);

        expect(subtotal, `Subtotal (${subtotal}) should be greater than 0`).toBeGreaterThan(0);
        expect(shipping, `Shipping cost (${shipping}) should be greater than 0`).toBeGreaterThan(0);
        expect(grandTotal, `Grand total (${grandTotal}) should equal calculated total (${calculatedTotal})`).toBe(calculatedTotal);
    }

    async selectPaymentMethod(method: 'check' | 'creditcard' | 'paypal'): Promise<void> {
        switch (method) {
            case 'check':
                await this.paymentMethodOptionCheck.check();
                break;
            case 'creditcard':
                await this.paymentMethodOptionCreditCard.check();
                await this.creditCardNumberField.fill(inputValues.payment?.creditCard?.number || '4111111111111111');
                await this.creditCardExpiryField.fill(inputValues.payment?.creditCard?.expiry || '12/25');
                await this.creditCardCVVField.fill(inputValues.payment?.creditCard?.cvv || '123');
                await this.creditCardNameField.fill(inputValues.payment?.creditCard?.name || 'Test User');
                break;
            case 'paypal':
                await this.paymentMethodOptionPaypal.check();
                break;
        }

        await this.waitForMagewireRequests();
    }

    async fillShippingAddress() {
        // Fill email for guest checkout
        const emailField = this.page.getByRole('textbox', { name: /Dirección de correo electrónico/i });
        if (await emailField.isVisible({ timeout: 2000 })) {
            const randomNum = Math.floor(Math.random() * 100000);
            await emailField.fill(`testuser${randomNum}@gmail.com`);
            // Trigger blur to validate
            await emailField.blur();
            await this.waitForMagewireRequests();
        }

        // Fill name fields
        const firstNameField = this.page.getByRole('textbox', { name: /^Nombre \*/i });
        const lastNameField = this.page.getByRole('textbox', { name: /Apellidos/i });

        await firstNameField.fill(faker.person.firstName());
        await lastNameField.fill(faker.person.lastName());

        // Fill address
        const addressField = this.page.getByRole('textbox', { name: /^Dirección \*/i });
        await addressField.fill(faker.location.streetAddress());

        // Fill postal code
        const zipField = this.page.getByRole('textbox', { name: /Código Postal/i });
        await zipField.fill('28001');

        // Fill city
        const cityField = this.page.getByRole('textbox', { name: /Ciudad/i });
        await cityField.fill('Madrid');

        // Select region/state
        const regionSelect = this.page.getByRole('combobox', { name: /Estado\/provincia/i });
        await regionSelect.selectOption({ label: 'Madrid' });
        await this.waitForMagewireRequests();

        // Fill phone number
        const phoneField = this.page.getByRole('textbox', { name: /Phone Number/i });
        await phoneField.fill('+34612345678');

        await this.waitForMagewireRequests();
        console.log('Shipping address filled');
    }

    // Override waitForMagewireRequests to be more resilient
    async waitForMagewireRequests(): Promise<void> {
        try {
            // Try to wait for Magewire messenger element (may not exist on this site)
            await this.page.waitForFunction(() => {
                const element = document.querySelector('.magewire\\.messenger');
                return !element || getComputedStyle(element).height === '0px';
            }, { timeout: 5000 });
        } catch {
            // Element doesn't exist, that's ok
        }

        try {
            // Wait for any pending Magewire network requests
            await this.page.waitForFunction(() => {
                return !(window as any).magewire || !(window as any).magewire.processing;
            }, { timeout: 5000 });
        } catch {
            // Magewire not present, that's ok
        }

        // Wait for network to be idle
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.page.waitForTimeout(300);
    }
}

export default CheckoutPage;
