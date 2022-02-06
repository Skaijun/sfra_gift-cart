'use strict';

/**
 * Verifies the required information for billing form is provided.
 * @param {Object} req - The request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has error information or payment information
 */
function processForm(req, paymentForm, viewFormData) {
    // TODO extend logic

    var viewData = viewFormData;
    var paymentMethod = {
        value: 'GIFT_CERTIFICATE'
    }
    viewData.paymentMethod = paymentMethod;

    return {
        error: false,
        viewData: viewData
    };
}

exports.processForm = processForm;
