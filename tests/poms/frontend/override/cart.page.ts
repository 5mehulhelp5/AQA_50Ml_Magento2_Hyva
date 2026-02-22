// @ts-check

import { expect, type Locator, type Page } from '@playwright/test';
import { UIReference, outcomeMarker } from '@config';

class CartPage {
    readonly page: Page;
    readonly showDiscountButton: Locator;
    productQuantityInCheckout: string | undefined;
    productPriceInCheckout: string | undefined;

    constructor(page: Page) {
        this.page = page;
        this.showDiscountButton = this.page.getByRole('button', { name: UIReference.cart.showDiscountFormButtonLabel });
    }

    async changeProductQuantity(amount: string) {
        const quantityInput = this.page.getByRole('textbox', { name: UIReference.cart.cartQuantityLabel });
        let currentQuantity = await quantityInput.inputValue();

        if (currentQuantity == amount) {
            amount = '3';
        }

        await quantityInput.fill(amount);

        // Use increase/decrease buttons or wait for auto-update
        await this.page.waitForTimeout(1000);

        // Verify the change
        const newQuantity = await quantityInput.inputValue();
        expect(newQuantity, `quantity should be the new value`).toEqual(amount);
    }

    async removeProduct(productTitle: string) {
        // Use the specific button format from the site: "Remove product \"Product Name\" from cart"
        const removeButton = this.page.getByRole('button', { name: new RegExp(`${UIReference.cart.removeProductButtonPrefix}.*${productTitle}`, 'i') });
        await removeButton.click();
        await this.page.waitForLoadState();

        // Verify product is removed
        await expect(this.page.getByRole('link', { name: productTitle })).toBeHidden({ timeout: 10000 });
    }

    async applyDiscountCode(code: string) {
        // Click to expand discount form if needed
        const discountSection = this.page.getByText(UIReference.cart.showDiscountFormButtonLabel);
        if (await discountSection.isVisible()) {
            await discountSection.click();
        }

        let discountField = this.page.getByPlaceholder(UIReference.cart.discountInputFieldLabel);
        if (await discountField.isHidden()) {
            await this.showDiscountButton.click();
        }

        let applyDiscountButton = this.page.getByRole('button', { name: UIReference.cart.applyDiscountButtonLabel, exact: true });
        await discountField.fill(code);
        await applyDiscountButton.click();
        await this.page.waitForLoadState();

        await expect.soft(this.page.getByText(`${outcomeMarker.cart.discountAppliedNotification} "${code}"`), `Notification that discount code ${code} has been applied`).toBeVisible();
    }

    async removeDiscountCode() {
        let cancelCouponButton = this.page.getByRole('button', { name: UIReference.cart.cancelCouponButtonLabel });
        await cancelCouponButton.click();
        await this.page.waitForLoadState();

        await expect.soft(this.page.getByText(outcomeMarker.cart.discountRemovedNotification), `Notification should be visible`).toBeVisible();
    }

    async enterWrongCouponCode(code: string) {
        const discountSection = this.page.getByText(UIReference.cart.showDiscountFormButtonLabel);
        if (await discountSection.isVisible()) {
            await discountSection.click();
        }

        let discountField = this.page.getByPlaceholder(UIReference.cart.discountInputFieldLabel);
        if (await discountField.isHidden()) {
            await this.showDiscountButton.click();
        }

        let applyDiscountButton = this.page.getByRole('button', { name: UIReference.cart.applyDiscountButtonLabel, exact: true });
        await discountField.fill(code);
        await applyDiscountButton.click();
        await this.page.waitForLoadState();

        let incorrectNotification = `${outcomeMarker.cart.incorrectCouponCodeNotificationOne} "${code}" ${outcomeMarker.cart.incorrectCouponCodeNotificationTwo}`;

        await expect.soft(this.page.getByText(incorrectNotification), `Code should not work`).toBeVisible();
        await expect(discountField).toBeEditable();
    }

    async getCheckoutValues(productName: string, pricePDP: string, amountPDP: string) {
        let cartItemAmount = await this.page.locator(UIReference.miniCart.minicartAmountBubbleLocator).count();
        if (cartItemAmount == 1) {
            await this.page.getByLabel(`${UIReference.checkout.openCartButtonLabel} ${cartItemAmount} ${UIReference.checkout.openCartButtonLabelCont}`).click();
        } else {
            await this.page.getByLabel(`${UIReference.checkout.openCartButtonLabel} ${cartItemAmount} ${UIReference.checkout.openCartButtonLabelContMultiple}`).click();
        }

        let productInCheckout = this.page.locator(UIReference.checkout.cartDetailsLocator).filter({ hasText: productName }).nth(1);
        this.productPriceInCheckout = await productInCheckout.getByText(UIReference.general.genericPriceSymbol).innerText();
        this.productPriceInCheckout = this.productPriceInCheckout.trim();
        let productImage = this.page.locator(UIReference.checkout.cartDetailsLocator)
            .filter({ has: this.page.getByRole('img', { name: productName }) });
        this.productQuantityInCheckout = await productImage.locator('> span').innerText();

        return [this.productPriceInCheckout, this.productQuantityInCheckout];
    }

    async calculateProductPricesAndCompare(pricePDP: string, amountPDP: string, priceCheckout: string, amountCheckout: string) {
        pricePDP = pricePDP.replace(UIReference.general.genericPriceSymbol, '').replace(',', '.').trim();
        let pricePDPInt = Number(pricePDP);
        let quantityPDPInt = +amountPDP;
        let calculatedPricePDP = (pricePDPInt * quantityPDPInt).toFixed(2).replace('.', ',') + ' ' + UIReference.general.genericPriceSymbol;

        expect(amountPDP, `Amount on PDP (${amountPDP}) equals amount in checkout (${amountCheckout})`).toEqual(amountCheckout);
        expect(calculatedPricePDP, `Price * qty on PDP (${calculatedPricePDP}) equals price * qty in checkout (${priceCheckout})`).toEqual(priceCheckout);
    }
}

export default CartPage;
