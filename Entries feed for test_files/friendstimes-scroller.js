/* >>> file start: js/friendstimes-scroller.js */
// Successor of js/pagescroller.js, which was used in old /friends page.
// This one is used at least in /feed

/* eslint-disable angular/angularelement */

jQuery(function ($) {

    var numSort = function numSort(a, b) {
        return a - b;
    },
        documentLoaded = false,
        targetOffset = null,
        calculateOffsets;

    calculateOffsets = function calculateOffsets() {
        var offsets = [0];

        $('.b-lenta-item').add('.entryunit--feed').each(function (i, item) {
            offsets.push($(item).offset().top - 12);
        });

        offsets.sort(numSort);

        if (documentLoaded) {
            $('.b-lenta-item-content').add('.entryunit__body').find('img:visible').each(function (i, image) {
                if (image.height >= 300) {
                    offsets.push($(image).offset().top);
                }
            });
            offsets.sort(numSort);
        }

        return offsets;
    };

    $(window).load(function () {
        documentLoaded = true;
    });

    $(document).keyup(function (e) {
        var currentOffset, offsets, foundOffset;

        if (e.which !== 74 && e.which !== 75) {
            return;
        }

        // prevent navigation when typing inside of input or textarea
        if (/input|textarea/gi.test($(e.target).prop('tagName'))) {
            return;
        }

        currentOffset = targetOffset;
        if (currentOffset === null) {
            currentOffset = $(window).scrollTop();
        }

        offsets = calculateOffsets();

        if (e.which === 74) {
            // 'j'

            offsets.some(function (offset) {
                if (offset > currentOffset + 1) {
                    targetOffset = offset;
                    foundOffset = true;
                    return true;
                }

                return false;
            });

            if (foundOffset) {
                $('html, body').animate({ scrollTop: targetOffset }, 'fast', function () {
                    targetOffset = null;
                });
            }
        } else if (e.which === 75) {
            // 'k'

            offsets.forEach(function (offset) {
                if (offset < currentOffset) {
                    targetOffset = offset;
                    foundOffset = true;
                }
            });

            if (foundOffset) {
                $('html, body').animate({ scrollTop: targetOffset }, 'fast', function () {
                    targetOffset = null;
                });
            }
        }
    });
});
/* <<< file end: js/friendstimes-scroller.js */

//# map link was there [friendstimes-scroller.js.map]
