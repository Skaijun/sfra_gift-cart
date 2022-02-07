
function addGiftCertCode() {
    $(document).on("submit", ".gift-card-form", function(e) {
        e.preventDefault();
        var $form = $(this);
        var $giftCardNumber = $form.find("input[name = giftCardNumber]");
        if ($giftCardNumber.val().length < 16) {
            alert("code must contain 16 characters");
            return;
        }

        $form.spinner().start();
        $.ajax({
            url: $form.attr("action"),
            method: $form.attr("method"),
            data: $form.serialize(),
            success: function(data) {
                $form.spinner().stop();
                $giftCardNumber.val("");
                if (data.error) {
                    alert("Error! Please try another gift code!");
                } else if (data.outputHtml) {
                    var $output = $(".giftcode-output");
                    $output.find(".gc-pi").remove();
                    $output.append(data.outputHtml);
                    $(".remove-gc").on("click", removeGiftCertCodeHandler);
                }
            },
            error: function(err) {
                $form.spinner().stop();
                alert('ERROR!');
            }
        });

    });
}

function removeGiftCertCodeHandler(e) {
    e.preventDefault();
    var url = $(e.currentTarget).attr("href");
    $.ajax({
        url: url,
        method: 'GET',
        success: function(data) {
            if (data.outputHtml) {
                var $output = $(".giftcode-output");
                $output.find(".gc-pi").remove();
                $output.append(data.outputHtml);
                $(".remove-gc").on("click", removeGiftCertCodeHandler);
            }
        },
        error: function(err) {
            $form.spinner().stop();
            alert('ERROR!');
        }
    });
}

module.exports = function() {
    addGiftCertCode();
};
