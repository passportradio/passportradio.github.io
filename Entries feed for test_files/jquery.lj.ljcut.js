/* >>> file start: js/jquery/jquery.lj.ljcut.js */
/**
 * @author Valeriy Vasin (valeriy.vasin@sup.com)
 * @name $.lj.ljcut
 * @requires $.ui.core, $.ui.widget, $.lj.basicWidget, LJ
 * @class The widget is responsible for expanding cuts
 */
(function (a) {
  return a;
})();

(function ($) {
  'use strict';

  var cutStates = [];
  $.widget('lj.ljcut', $.lj.basicWidget, {
    options: {
      // journal identifier (comes from server)
      journalid: null,
      // post identifier (comes from server)
      ditemid: null,
      // cut identifier inside of the post (comes from server)
      cutid: null,
      // server request param: use placeholders or not (1 or 0). Comes from server
      placeholders: 0,

      sticky: false,

      selectors: {
        expand: '.ljcut-link-expand',
        collapse: '.ljcut-link-collapse',

        // bottom collapse link
        collapseLink: '.ljcut-pseudolink-collapse',

        // sticky collapse link
        stickyLink: '.b-sticky-cut-link'
      },

      classNames: {
        'preloader': 'ljcut-link-expanding',
        'expanded': 'ljcut-expanded',
        'sticky-cut-visible': 'b-sticky-cut-visible',
        'cut': '.b-sticky-cut'
      }
    },

    _create: function _create() {
      $.lj.basicWidget.prototype._create.apply(this);

      this._window = $(window);

      this.cut = $(this._cl('cut'));

      // use current this in handler
      this._stickyCollapseHandler = this._collapse.bind(this);

      // jQuery element that will contain loaded content of the cut
      this.content = null;
      // test OS for Mac
      this._isMac = /Mac/.test(navigator.userAgent);
      // $.browser.opera is deprecated
      this._isOpera = /Opera/.test(navigator.userAgent);

      // create collapse node that will be cloned and appended into each ljcut
      this._collapseNode = $('<span class="ljcut-pseudolink"><span class="ljcut-decor"><span class="ljcut-pseudolink-collapse">{close}</span></span></span>'.supplant({ close: this._ml('collapse') }));

      this._bindControls();
      this._id = cutStates.length;
      cutStates[this._id] = false;
    },

    _bindControls: function _bindControls() {
      var tapping = false,
          buttons = [this._s('expand'), this._s('collapse')].join(', ');


      $.lj.basicWidget.prototype._bindControls.apply(this);
      this.element.on('click', this._s('expand'), this._expand.bind(this));
      this.element.on('click', this._s('collapse'), this._collapse.bind(this));

      // Add fast click for iOS
      this.element.on('touchstart', buttons, function () {
        tapping = true;
      });

      this.element.on('touchmove', buttons, function () {
        tapping = false;
      });

      this.element.on('touchend', buttons, function (e) {
        if (tapping) {
          $(e.target).trigger('click');
          e.preventDefault();
        }
      });

      $(document).on('keydown', this._shortcuts.bind(this));
      this._window.on('scroll', this._scrolling.bind(this));
    },

    /**
      * Shortcuts handler
      * @param  {Object} e jQuery event object
      */
    _shortcuts: function _shortcuts(e) {
      var ctrl = this._isMac && this._isOpera ? e.metaKey : e.ctrlKey,
          alt = e.altKey;

      if (!ctrl || !alt) {
        return;
      }

      switch (e.which) {
        // expand: ctrl + alt + "+"
        case 61: // FireFox, IE
        // fall through
        case 187:
          // Opera, Chrome, Safari
          this.expand();
          break;

        // collapse: ctrl + alt + "-"
        case 173: // FireFox
        // fall through
        case 31: // Opera Mac
        // fall through
        case 109: // Opera Windows
        // fall through
        case 189:
          // Chrome, Safari
          this.collapse();
          break;

        // no default
      }
      e.preventDefault();
    },

    /**
      * Show or hide preloader
      * @param  {Boolean} state Preloader state: True (show) or False (hide)
      */
    _togglePreloader: function _togglePreloader(state) {
      this.element.toggleClass(this._cl('preloader'), state);
    },

    /**
      * Toggle content state
      * @param  {Boolean} state State of content: expand (true) or collapse (false)
      */
    _toggleContent: function _toggleContent(state, callback) {
      var that = this,
          _top;

      if (this.locked() || !this.content) {
        return;
      }

      this._lock();

      if (typeof callback !== 'function') {
        callback = $.noop;
      }

      this.element.toggleClass(that._cl('expanded'), state);

      if (state) {
        this._showContent(callback);
      } else {
        _top = this.element.offset().top - 30;

        if (!this.element.is(':screenable')) {
          $('body,html').animate({ scrollTop: _top }, 300, function () {
            //delay before collapsing to let user know what is happening
            setTimeout(that._hideContent.bind(that, callback), 50);
          });
        } else {
          this._hideContent(callback);
        }
      }
    },

    /**
      * Show content state
      */
    _showContent: function _showContent(callback) {
      var that = this;

      this.content.show(50, function () {
        that._trigger('show', null, that);
        callback();
        that._unlock();
      });
    },

    /**
      * Hide content state
      */
    _hideContent: function _hideContent(callback) {
      var that = this;

      this.content.slideUp(50, function () {
        that._trigger('hide', null, that);
        callback();
        that._unlock();
      });
    },

    /**
      * Request server for the cut content
      * @param  {Object} data Data that is needed for request
      */
    _requestContent: function _requestContent(data) {
      var that = this;

      this._lock();
      this._togglePreloader(true);
      LJ.Api.call('event.get_lj_cut', data, function (response) {
        that.content = $('<div />', { html: response.text }).hide();
        that.content.find('a:not([target])').attr('target', '_self');
        that.element.after(that.content);
        // eslint-disable-next-line angular/timeout-service
        setTimeout(function () {
          // Wait till content is in DOM
          LJ.Event.trigger('ljcut:appendContent', { $content: that.content });
        }, 0);
        that._unlock();
        that._togglePreloader(false);

        // add handlers after content becomes visible
        that._toggleContent(true, that._addHandlers.bind(that));

        // statistic
        if (response.counter_image_url) {
          LJ.Stat.addCounter(response.counter_image_url);
        }
      });
    },

    /**
      * Provide dynamic behavior for the content (javascript handlers)
      * @private
      */
    _addHandlers: function _addHandlers() {
      this.content.ljLikes();
      LJ.Event.trigger('social:widgets:parse');
      LJ.Event.trigger('social:newinsta:parse');
    },

    /**
      * Expand content
      */
    expand: function expand() {
      if (this.locked()) {
        return;
      }
      if (this.content) {
        this._toggleContent(true);
      } else {
        this._requestContent({
          journalid: this.options.journalid,
          ditemid: this.options.ditemid,
          cutid: this.options.cutid,
          placeholders: this.options.placeholders
        });
      }
    },

    /**
      * Collapse content (for external usage)
      */
    collapse: function collapse() {
      if (!this.locked()) {
        this._toggleContent(false);
        this._toggleStickyClass(false);
      }
    },

    /**
      * Expand link click handler
      * @param  {Object} e jQuery event object
      */
    _expand: function _expand(e) {
      // open link in new tab
      if (e.metaKey || e.ctrlKey) {
        return true;
      }

      e.preventDefault();
      this.expand();
    },

    /**
      * Collapse link click handler
      * @param  {Object} e jQuery event object
      */
    _collapse: function _collapse(e) {
      // open link in new tab
      if (e.metaKey || e.ctrlKey) {
        return true;
      }

      e.preventDefault();
      cutStates[this._id] = false;
      this.collapse();
    },

    /**
     * Handler for scrolling event
     */
    _scrolling: function _scrolling() {
      this._updateStickyCutState();
    },

    /**
     * Check if a sticky cut element is needed to be displayed on the screen and show/hide it
     *
     */
    _updateStickyCutState: function _updateStickyCutState() {
      var viewportHeight, viewportTop, contentHeight, contentTop, contentBottom, state, collapse;

      if (this._isExpanded() && this.options.sticky && this.content) {
        viewportHeight = this._window.height();
        viewportTop = $(document).scrollTop();
        contentHeight = this.content.height();
        contentTop = this.content.offset().top;
        contentBottom = contentTop + contentHeight;
        collapse = this.element.find(this._s('collapse'));
        state = contentTop < viewportTop && contentBottom - viewportHeight > viewportTop;
        cutStates[this._id] = state;
        this._toggleStickyClass(state);
      }
    },

    /**
     * Toggle class of the sticky cut
     *
     * @param {Boolean} state  if `true` - show sticky, cut. Otherwise: hide
     */
    _toggleStickyClass: function _toggleStickyClass(state) {
      this.cut.toggleClass(this._cl('sticky-cut-visible'), cutStates.indexOf(true) > -1);

      if (state) {
        $(document).on('click', this._s('stickyLink'), this._stickyCollapseHandler);
      } else {
        $(document).off('click', this._s('stickyLink'), this._stickyCollapseHandler);
      }
    },

    /**
     * Extend lj-cut functionality with bottom collapse link and it's handlers
     */
    _addBottomCollapser: function _addBottomCollapser() {
      if (!this._bottomCloser && this.options.sticky) {
        this._bottomCloser = this._collapseNode.appendTo(this.content);

        this._bottomCloser.find(this._s('collapseLink')).on('click', this._bottomCloserClickHandler.bind(this));
      }

      return this._bottomCloser;
    },

    _bottomCloserClickHandler: function _bottomCloserClickHandler() {
      event.preventDefault();
      this.collapse();
    },

    _isExpanded: function _isExpanded() {
      return this.element.hasClass(this._cl('expanded'));
    },

    _isCollapsed: function _isCollapsed() {
      return !this._isExpanded();
    }
  });
})(jQuery);
/* <<< file end: js/jquery/jquery.lj.ljcut.js */

//# map link was there [jquery.lj.ljcut.js.map]
