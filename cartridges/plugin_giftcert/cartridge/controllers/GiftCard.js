"use strict";

var server = require("server");

var GiftCertificateMgr = require("dw/order/GiftCertificateMgr");
var Transaction = require("dw/system/Transaction");
var BasketMgr = require("dw/order/BasketMgr");
var Resource = require("dw/web/Resource");
var URLUtils = require("dw/web/URLUtils");
var Money = require("dw/value/Money");

var HookManager = require("dw/system/HookMgr");
var PaymentMgr = require("dw/order/PaymentMgr");
var PaymentInstrument = require("dw/order/PaymentInstrument");

var HashMap = require("dw/util/HashMap");
var Template = require("dw/util/Template");

var collections = require("*/cartridge/scripts/util/collections");
var csrfProtection = require("*/cartridge/scripts/middleware/csrf");
var COHelpers = require("*/cartridge/scripts/checkout/checkoutHelpers");

server.post(
    "Add",
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var giftCode = req.form.giftCardNumber;
        var basket = BasketMgr.getCurrentOrNewBasket();
        if (!basket) {
            res.setStatusCode(500);
            res.json({
                success: false,
                redirectUrl: URLUtils.url("Cart-Show").toString()
            });
            return next();
        }

        var paymentMethodIdValue = "GIFT_CERTIFICATE"; // paymentForm.paymentMethod.value;
        if (!PaymentMgr.getPaymentMethod(paymentMethodIdValue).paymentProcessor) {
            throw new Error(Resource.msg(
                "error.payment.processor.missing",
                "checkout",
                null
            ));
        }

        var paymentProcessor = PaymentMgr.getPaymentMethod("GIFT_CERTIFICATE").getPaymentProcessor();

        var paymentResult;
        if (HookManager.hasHook("app.payment.processor." + paymentProcessor.ID.toLowerCase())) {
            paymentResult = HookManager.callHook(
                "app.payment.processor." + paymentProcessor.ID.toLowerCase(),
                "Handle",
                basket,
                giftCode,
                req
            );
        } else {
            res.json({
                fieldErrors: [],
                serverErrors: ["payment is not supported"],
                error: true
            });
            return next();
        }

        if (paymentResult.error) {
            res.json({
                fieldErrors: paymentResult.fieldErrors,
                serverErrors: paymentResult.serverErrors,
                error: true
            });
            return next();
        }

        // calc payment transaction
        var gcList = [];

        Transaction.wrap(function () {
            var paymentInstruments = basket.getPaymentInstruments();
            if (!paymentInstruments.length) {
                return;
            }
            var orderTotalPrice = basket.getTotalGrossPrice();
            collections.forEach(paymentInstruments, function (pi) {
                if (PaymentInstrument.METHOD_GIFT_CERTIFICATE === pi.paymentMethod) {
                    var gcID = pi.getGiftCertificateCode();
                    var giftCert = GiftCertificateMgr.getGiftCertificateByCode(gcID);
                    var gcBalance = giftCert.getBalance();
                    var gcBalanceValue = gcBalance.value;
                    var orderValue = orderTotalPrice.value;
                    gcList.push({
                        id: gcID,
                        balance: gcBalance
                    });

                    if (orderValue > gcBalanceValue) {
                        pi.paymentTransaction.setAmount(gcBalance);
                        orderValue = orderValue - gcBalanceValue; // > 0
                    } else {
                        pi.paymentTransaction.setAmount(orderTotalPrice);
                        orderValue = orderValue - orderValue; // 0
                    }
                    orderTotalPrice = new Money(orderValue, basket.currencyCode);
                } else {
                    pi.paymentTransaction.setAmount(orderTotalPrice);
                }
            });
        });

        var outputHtml = "";
        var template = new Template("checkout/components/giftCardOutput");
        var params = new HashMap();
        params.put("basket", basket);
        params.put("gcList", gcList);
        outputHtml = template.render(params).text;

        res.json({ error: false, outputHtml: outputHtml });
        next();
    }
);

server.get("Remove", function(req, res, next) {
    var basket = BasketMgr.getCurrentBasket();

    if (!empty(req.querystring.giftCertCode)) {
        Transaction.wrap(function() {
            var gcPaymentInstruments = basket.getGiftCertificatePaymentInstruments(req.querystring.giftCertCode);
            collections.forEach(gcPaymentInstruments, function (pi) {
                basket.removePaymentInstrument(pi);
            });
            COHelpers.recalculateBasket(basket);
        });
    }

    var gcList = [];
    var gcPIs = basket.getGiftCertificatePaymentInstruments();
    collections.forEach(gcPIs, function (pi) {
        var gcID = pi.getGiftCertificateCode();
        var giftCert = GiftCertificateMgr.getGiftCertificateByCode(gcID);
        var gcBalance = giftCert.getBalance();

        gcList.push({
            id: gcID,
            balance: gcBalance
        });
    });

    var outputHtml = "";
    var template = new Template("checkout/components/giftCardOutput");
    var params = new HashMap();
    params.put("basket", basket);
    params.put("gcList", gcList);
    outputHtml = template.render(params).text;

    res.json({ error: false, outputHtml: outputHtml });
    next();
});

server.get("Balance", function(req, res, next) {
    var giftCertificate = null;

    var gcID = req.querystring.giftCardID;
    if (gcID) {
        giftCertificate = GiftCertificateMgr.getGiftCertificateByCode(gcID);
    }

    if (!empty(giftCertificate) && giftCertificate.enabled) {
        var balance = giftCertificate.balance.value + giftCertificate.balance.currencyCode;
        res.json({
            success: true,
            balance: balance
        });
    } else {
        res.json({
            success: false
        });
    }

    next();
});


module.exports = server.exports();
