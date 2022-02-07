'use strict';

/* API Includes */
var PaymentInstrument = require('dw/order/PaymentInstrument');
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');
var GiftCertificate = require("dw/order/GiftCertificate");
var Transaction = require('dw/system/Transaction');
var PaymentMgr = require('dw/order/PaymentMgr');
var Resource = require('dw/web/Resource');
var collections = require("*/cartridge/scripts/util/collections");

/**
 * Verifies that provided gift certificate is enabled, not redeemed, not expired
 * has a balance available for use, has no duplicates added to the basket
 * @param {dw.order.Basket} basket Current users's basket
 * @param {String} giftCode - gift certificate code provided by customer
 * @param {Object} req the request object
 * @return {Object} returns an object with error flag and Gift Certificate Object
 */
function Handle(basket, giftCode, req) {
    var giftCert = GiftCertificateMgr.getGiftCertificateByCode(giftCode);
    if (!giftCert) {
        var errMsg = Resource.msg('error.invalid.gift.card', 'giftCard', null);
        return {
            error: true,
            fieldErrors: [],
            serverErrors: [].push(errMsg)
        }
    }

    var isEnabled = giftCert.isEnabled();
    if (!isEnabled || giftCert.getStatus() === GiftCertificate.STATUS_PENDING) {
        var errMsg = Resource.msg('error.not.enabled.gift.card', 'giftCard', null);
        return {
            error: true,
            fieldErrors: [],
            serverErrors: [].push(errMsg)
        }
    }

    if (giftCert.getStatus() === GiftCertificate.STATUS_REDEEMED) {
        var errMsg = Resource.msg('error.redeemed.gift.card', 'giftCard', null);
        return {
            error: true,
            fieldErrors: [],
            serverErrors: [].push(errMsg)
        }
    }

    var balance = giftCert.getBalance();
    var paymentInstruments = basket.getPaymentInstruments(
        PaymentInstrument.METHOD_GIFT_CERTIFICATE
    );
    collections.forEach(paymentInstruments, function (pi) {
        if (pi.giftCertificateCode === giftCode) {
            basket.removePaymentInstrument(pi);
        }
    });

    if (basket.totalGrossPrice.value > balance.value) {
        Transaction.wrap(function () {
            var pi = basket.createPaymentInstrument(PaymentInstrument.METHOD_GIFT_CERTIFICATE, balance);
            pi.setGiftCertificateCode(giftCode);
        });
    } else {
        Transaction.wrap(function () {
            var pi = basket.createPaymentInstrument(PaymentInstrument.METHOD_GIFT_CERTIFICATE, basket.totalGrossPrice);
            pi.setGiftCertificateCode(giftCode);
        });
    }

    return { error: false, giftCert: giftCert };
}

/**
 * Authorizes a payment using a gift certificate. The payment is authorized by redeeming the gift certificate and
 * simply setting the order no as transaction ID.
 * @param {number} orderNumber - The current order's number
 * @param {dw.order.PaymentInstrument} paymentInstrument -  The payment instrument to authorize
 * @param {dw.order.PaymentProcessor} paymentProcessor -  The payment processor of the current
 *      payment method
 * @return {Object} returns an error object
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();

    var status;
    Transaction.begin();

    paymentInstrument.paymentTransaction.transactionID = orderNumber;
    paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;

    status = GiftCertificateMgr.redeemGiftCertificate(paymentInstrument.paymentTransaction.paymentInstrument);

    Transaction.commit();

    if (status.isError()) {
        return {error: true};
    } else {
        return {authorized: true};
    }
}

exports.Authorize = Authorize;
exports.Handle = Handle;
