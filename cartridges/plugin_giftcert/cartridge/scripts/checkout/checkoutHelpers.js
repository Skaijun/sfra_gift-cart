"use strict";

var base = module.superModule;

/**
 * Sets the payment transaction amount
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an error object
 */
function calculatePaymentTransaction(currentBasket) {
    var Money = require("dw/value/Money");
    var Transaction = require("dw/system/Transaction");
    var PaymentInstrument = require("dw/order/PaymentInstrument");
    var collections = require("*/cartridge/scripts/util/collections");

    Transaction.wrap(function () {
        var notGiftCardPI = null;
        var giftCertTotal = new Money(0.0, currentBasket.currencyCode);
        var paymentInstruments = currentBasket.getPaymentInstruments();
        collections.forEach(paymentInstruments, function (pi) {
            if (PaymentInstrument.METHOD_GIFT_CERTIFICATE === pi.paymentMethod) {
                giftCertTotal = giftCertTotal.add(pi.getPaymentTransaction().getAmount());
            } else {
                notGiftCardPI = pi;
            }
        });


        if (!notGiftCardPI) {
            return;
        }

        var orderTotal = currentBasket.getTotalGrossPrice();
        var notGiftCertAmount = orderTotal.subtract(giftCertTotal);

        if (notGiftCertAmount.value <= 0.0) {
            var value = new Money(0, notGiftCertAmount.getCurrencyCode());
            notGiftCardPI.paymentTransaction.setAmount(value);
            currentBasket.removePaymentInstrument(notGiftCardPI);
        } else {
            notGiftCardPI.paymentTransaction.setAmount(notGiftCertAmount);
        }
    });


    return { error: false };
}

base.calculatePaymentTransaction = calculatePaymentTransaction;

module.exports = base;