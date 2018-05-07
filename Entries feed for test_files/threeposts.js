/* >>> file start: js/threeposts.js */
/**
 * Script determines available space for threeposts widget
 * and sets items layout.
 *
 * @author yoksel
 */

(function (a) {
  return a;
})();

(function ($) {
  'use strict';

  $(function () {
    var wrapperClass = 'threeposts',
        $wrapperElem = $('.' + wrapperClass),
        wrapperInitialClass = $wrapperElem.attr('class'),
        $placeHolder = $('.placeholder-threeposts'),
        $itemsList = $('.threeposts__items'),
        itemClass = 'threeposts__item',
        $items = $('.' + itemClass),
        $itemsFirst = $($items.get(0)),
        itemsCount = $items.length,
        itemTitleInnerClass = 'threeposts__title-inner',
        itemHasShortTitle = 'threeposts__item--short-title',
        itemHasPicClass = 'threeposts__item--pic',
        $itemsHasPic = $('.' + itemHasPicClass),
        itemsHasPicCount = $itemsHasPic.length,
        minWidgetWidth = 235,
        tinyWidgetWidth = 200,
        fullWidth = 1200,
        itemsInRow = 3,
        sizeClass = 'xxs',
        itemSize = 'xxs',
        wrapperWidth = $wrapperElem.width();

    setClassBySize();
    $(window).resize(LJ.Function.debounce(setClassBySize, 50));

    //-------------------------------------------------
    // Returns number of items in row in case
    // if wrapperWidth > 900 ( $fullWidth )

    function normalWidth() {
      var itemsInRow = 3,
          itemsInRowByCount = {
        '7': 4,
        '8': 4,
        '9': 3
      };

      if (itemsInRowByCount[itemsCount] > 0) {
        itemsInRow = itemsInRowByCount[itemsCount];
      } else {
        itemsInRow = itemsCount;
      }

      return itemsInRow;
    }

    //-------------------------------------------------
    // Returns number of items in row in case
    // if wrapperWidth < 900 ( $fullWidth )

    function lessWidth() {

      var itemsInRow = 1;

      if (wrapperWidth < minWidgetWidth) {
        itemsInRow = 1;
        return itemsInRow;
      }

      if (itemsCount >= 2) {

        itemsInRow = Math.floor(wrapperWidth / minWidgetWidth);

        // Number of widgets less than number of possible slots
        // Set number items in row equal to number of widgets
        if (itemsInRow > itemsCount) {
          itemsInRow = itemsCount;
        }

        var widgetsTail = itemsCount % itemsInRow;

        // Last row isn't full
        if (widgetsTail > 0) {

          if (itemsCount % (itemsInRow - 1) === 0) {
            itemsInRow--;
          }
          // 5 in 800
          else if (itemsCount % (itemsInRow + 1) === 0) {
              itemsInRow++;
            }
            // 7 in 600,700
            else if (widgetsTail === 1) {

                var widgetWidthPluOne = wrapperWidth / (itemsInRow + 1);
                if (widgetWidthPluOne >= tinyWidgetWidth) {
                  itemsInRow++;
                }
              }
        } //----------------
      } // widgets >= 2

      return itemsInRow;
    }

    //-------------------------------------------------
    // Determines widget width depending
    // of the available space for widgets

    function countWidgetsLayout() {

      wrapperWidth = $wrapperElem.width();

      //Less width
      if (wrapperWidth < fullWidth) {
        itemsInRow = lessWidth();
      } else {
        itemsInRow = normalWidth();
      }

      setWidgetSizeClass(wrapperWidth / itemsInRow);
    }

    //-------------------------------------------------
    // Set widget size class depending
    // of the available types of layouts

    function setWidgetSizeClass(itemWidth) {

      var sizeSteps = [150, 300, 330, 400, 500, 600, 800],
          sizeKeys = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'];

      sizeSteps.forEach(function (step) {
        if (itemWidth > step) {
          itemSize = sizeKeys[sizeSteps.indexOf(step)];
        }
      });
    }

    //-------------------------------------------------
    // Check if title short there is available space for text

    function checkTitleLength() {

      $wrapperElem.find('.' + itemHasShortTitle).removeClass(itemHasShortTitle);

      // Works only for xs widget layout
      if (itemSize !== 'xs') {
        return;
      }

      $itemsHasPic.each(function () {
        var $itemTitleObj = $(this).find('.' + itemTitleInnerClass),
            itemTitleElemLength = $itemTitleObj.get(0).getClientRects().length;

        // itemTitle contains 1 line of text
        if (itemTitleElemLength < 2) {
          $(this).addClass(itemHasShortTitle);
        }
      });
    }

    //-------------------------------------------------
    // For using in map

    function getScrollHeight(i) {
      return $items.get(i).scrollHeight;
    }

    //-------------------------------------------------
    // Check if there are any images in widgets

    function checkPicsInWidgets() {

      // If all widgets has no pics
      // and have height > 0
      if (itemsHasPicCount === 0 && $itemsFirst.height() > 0) {

        // Reset widgets height to auto
        $items.height('auto');

        // Find maxHeight
        var scrollHeightsList = $items.map(getScrollHeight),
            maxHeight = Math.max.apply(Math, scrollHeightsList);


        // Set maxHeight to each widget
        $items.height(maxHeight);
      }
    }

    //-------------------------------------------------
    // Set wrapper size class depending
    // of the available types of layouts

    function setClassBySize() {

      wrapperWidth = $wrapperElem.width();

      var sizeSteps = [400, 600, 800, 1000, 1200, 1400],
          sizeKeys = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

      sizeSteps.forEach(function (step) {
        if (wrapperWidth > step) {
          sizeClass = sizeKeys[sizeSteps.indexOf(step)];
        }
      });

      countWidgetsLayout();
      changeWrapperClass();
    }

    //-------------------------------------------------
    // Set wrapper classes using information
    // about wrapper layout and items layout

    function changeWrapperClass() {
      var wrapperSizeClass = wrapperClass + '--size-' + sizeClass,
          itemsInRowClass = wrapperClass + '--items-in-row-' + itemsInRow,
          itemSizeClass = wrapperClass + '--item-size-' + itemSize,
          changedClass = wrapperInitialClass + '\n' + wrapperSizeClass + '\n' + itemsInRowClass + '\n' + itemSizeClass;

      $wrapperElem.attr('class', changedClass);
      $wrapperElem.attr('data-item-layout', itemSize);
      $placeHolder.hide();
      $itemsList.show();
      checkPicsInWidgets();
      checkTitleLength();
    }
  });
})(jQuery);
/* <<< file end: js/threeposts.js */

//# map link was there [threeposts.js.map]
