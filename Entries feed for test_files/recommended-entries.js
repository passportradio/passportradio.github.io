/* >>> file start: js/recommended-entries.js */
/**

 * Script determines available space for recommended entries widget
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
    var wrapperClass = 'recommended-entries',
        $wrapperElem = $('.' + wrapperClass),
        wrapperInitialClass = $wrapperElem.attr('class'),
        $itemsList = $('.recommended-entries__list'),
        itemClass = 'recommended-entries__item',
        $items = $('.' + itemClass),
        $itemsFirst = $($items.get(0)),
        itemsCount = $items.length,
        itemTitleInnerClass = 'threeposts__title-inner',
        itemHasShortTitle = 'threeposts__item--short-title',
        itemHasPicClass = 'threeposts__item--pic',
        $itemsHasPic = $('.' + itemHasPicClass),
        itemsHasPicCount = $itemsHasPic.length,
        minWidgetWidth = 220,
        tinyWidgetWidth = 155,
        itemWidth = 0,
        fullWidth = 1044,
        itemsInRow = 6,
        sizeClass = 'xxs',
        itemSize = 'xxs',
        wrapperWidth = $wrapperElem.width();

    getItems();

    function getItems() {
      $wrapperElem = $('.' + wrapperClass);

      if ($wrapperElem.length == 0) {
        setTimeout(getItems, 1000);
        return;
      }

      wrapperInitialClass = $wrapperElem.attr('class');
      wrapperWidth = $wrapperElem.width();

      $itemsList = $('.recommended-entries__list');
      $items = $('.' + itemClass), $itemsFirst = $($items.get(0));
      itemsCount = $items.length;

      setClassBySize();
    }

    $(window).resize(LJ.Function.debounce(setClassBySize, 50));

    //-------------------------------------------------
    // Returns number of items in row in case
    // if wrapperWidth < $fullWidth

    function lessWidth() {
      var itemsInRow = 1;

      if (wrapperWidth < minWidgetWidth) {
        return itemsInRow;
      }

      if (itemsCount >= 2) {

        itemsInRow = Math.floor(wrapperWidth / minWidgetWidth);

        if (itemsInRow < 6) {
          itemsInRow = Math.floor(wrapperWidth / tinyWidgetWidth);
        }

        if (itemsInRow > 2 && itemsInRow < 6) {
          itemsInRow = 3;
        }
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
      }

      itemWidth = wrapperWidth / itemsInRow;
      setWidgetSizeClass(itemWidth);
    }

    //-------------------------------------------------
    // Set widget size class depending
    // of the available types of layouts

    function setWidgetSizeClass() {

      var sizeSteps = [150, 250, 330, 400, 500, 600, 800],
          sizeKeys = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'];

      sizeSteps.forEach(function (step) {
        if (itemWidth > step) {
          itemSize = sizeKeys[sizeSteps.indexOf(step)];
        }
      });
    }

    //-------------------------------------------------
    // For using in map

    function getScrollHeight(i) {
      return $items.get(i).scrollHeight;
    }

    //-------------------------------------------------
    // Set wrapper size class depending
    // of the available types of layouts

    function setClassBySize() {
      wrapperWidth = $wrapperElem.width();

      var sizeSteps = [280, 300, 400, 800, 1000, 1200, 1400],
          sizeKeys = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'];

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
      $wrapperElem.attr('data-layout', wrapperWidth + '/' + sizeClass + '|' + itemsInRow);
      $wrapperElem.attr('data-item-layout', itemWidth + '/' + itemSize);
      $itemsList.show();
    }
  });
})(jQuery);
/* <<< file end: js/recommended-entries.js */

//# map link was there [recommended-entries.js.map]
