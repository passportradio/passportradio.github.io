/* >>> file start: js/core/angular/activity.js */
(function () {
  'use strict';

  /**
   * @ngdoc
   * @module LJ.Activity
   * @description provides Activity service
   */

  angular.module('LJ.Activity', []);

  angular.module('LJ.Activity').factory('Activity', Activity);

  /**
   * @ngdoc
   * @service Activity
   * @requires $document
   * @requires $timeout
   */
  Activity.$inject = ['$document', '$timeout'];
  /**
   * Activity
   *
   * @name Activity
   * @function
   * @public
   * @param {object} $document - document ng wrapper
   * @param {function} $timeout - setTimeout ng service
   * @return {object} service instance
   */
  function Activity($document, $timeout) {
    var active, timer;

    /**
     * isActive
     *
     * @name isActive
     * @function
     * @public
     * @return {boolean} activity status
     */
    function isActive() {
      return active;
    }

    /**
     * setActive
     *
     * @name setActive
     * @function
     * @public
     * @param {boolean|*} value - activity status
     */
    function setActive(value) {
      active = value;
    }

    refresh();

    $document.on('click touchstart touchend keydown mousemove mousewheel', LJ.Function.debounce(refresh, 1e2, true)); // call on event every 100ms

    /**
     * refresh timer
     * @description set activity on user interaction
     * @name refresh
     * @function
     * @public
     */
    function refresh() {
      $timeout.cancel(timer);
      setActive(true);

      timer = $timeout(setActive.bind(this, false), 15 * 60 * 1e3); // call in 15min
    }

    return {
      isActive: isActive
    };
  }
})();
/* <<< file end: js/core/angular/activity.js */

//# map link was there [activity.js.map]
/* >>> file start: js/core/angular/api.js */
// jscs:disable jsDoc

//!= require js/core/angular/messages.js
//= require js/core/angular/activity.js

/**
 * @description Angular wrapper of LJ.Api
 * @author Valeriy Vasin (valeriy.vasin@sup.com)
 *
 * @method call
 * @description
 * Available options:
 *  - cache: turn on/off caching for the request
 *  - silent: turn on/off messages (error/info etc)
 *  - meta: result will be returned with meta information
 *          is needed to determine is response from cache or not at the moment
 *          If provided promise will be resolved with object that contains fields:
 *          - response:  {*}       - server response
 *          - fromCache: {Boolean} - is response from cache or not
 *
 * @example Fetch without caching
 *   Api.call('rpc.method', {param: 'value'});
 *
 * @example Fetch with caching
 *   Api.call('rpc.method', { param: 'value' }, { cache: true });
 *
 * @example Usage of meta information
 *   Api.call('ratings.journals_top', params, { cache: true, meta: true })
 *     .then(function (result) {
 *       var response = result.response;
 *
 *       // cache users if result is from server
 *       if ( !result.fromCache ) {
 *
 *         Users.Cache.add(
 *           response.journals.map( LJ.Function.get('user') )
 *         );
 *       }
 *     });
 *
 * @example Turn off messages for the request
 *   Api.call('rpc.method', {param: 'value'}, {silent: true});
 *
 *
 * @method  invalidate
 * @example Cache invalidation
 *   Api.invalidate('rpc.method', {some: 'params'});
 */

(function () {
  'use strict';

  /**
   * @module LJ.Api
   */

  angular.module('LJ.Api', ['LJ.Messages', 'LJ.Activity']).factory('Api', Api);

  /**
   * @factory Api
   */
  Api.$inject = ['$timeout', '$cacheFactory', '$rootScope', '$q', 'Messages', 'Activity'];
  function Api($timeout, $cacheFactory, $rootScope, $q, Messages, Activity) {
    var factory = {
      call: call,
      invalidate: invalidate
    },
        cachePromises = $cacheFactory('LJApiPromises');

    /**
     * Get cache key for method and params
     * @param  {String} method   Method name
     * @param  {Object} [params] Method params
     */
    function getCacheKey(method, params) {
      return typeof params === 'undefined' ? method : method + angular.toJson(_sortedByKeys(params));
    }

    /**
     * Get newly greated object with properties that added in sorted order
     *
     * Notice:
     *   If not object provided - it will be returned without changes
     *
     * @param  {Object} obj Object to sort properties of
     * @return {Object}     Object with sorted properties
     */
    function _sortedByKeys(obj) {
      var sorted;

      if (!angular.isObject(obj)) {
        return obj;
      }

      sorted = {};

      Object.keys(obj).sort().forEach(function (key) {
        sorted[key] = _sortedByKeys(obj[key]);
      });

      return sorted;
    }

    /**
     * Invalidate cached data
     *
     * @param  {String} method    Methods for which we should invalidate cache
     * @param  {Object} [params]  Params for which we should invalicate cache
     */
    function invalidate(method, params) {
      cachePromises.remove(getCacheKey(method, params));
    }

    /**
     * Call JSON Rpc API
     *
     * @param {String}    method            JSON Rpc method
     * @param {Object}    [params]          JSON Rpc method params
     * @param {Function}  [callback]        Callback to call after data recieved
     * @param {Object}    [options]         Additional api options
     * @param {Boolean}   [options.cache]   Cache options: turn on/off cache for request
     * @param {Boolean}   [options.silent]  Turn on/off messages (error/info etc)
     * @param {Boolean}   [options.meta]    If set to `true` - result will be returned with meta
     *                                      information, e.g. { response, fromCache }
     *
     * @return {Promise}   Promise that will be resolved when data received
     */
    function call(method, params, callback, options) {
      var defer = $q.defer(),
          defaults = { cache: false, silent: false, meta: false },
          fromCache = false,
          promise,
          cacheKey;

      if (!Activity.isActive()) {
        defer.reject();
        return defer.promise;
      }

      // only `Object` and `null` are allowed, otherwise - empty object
      if (!angular.isObject(params) || params === null) {
        params = {};
      }

      if (angular.isObject(callback)) {
        options = callback;
        callback = null;
      }

      options = angular.extend(defaults, options || {});

      cacheKey = getCacheKey(method, params);

      if (options.cache) {
        promise = cachePromises.get(cacheKey);

        if (promise) {
          fromCache = true;
        }
      }

      if (!fromCache) {
        promise = defer.promise;

        LJ.Api.call(method, params, function (response) {
          $timeout(function () {
            // using $timeout service to mitigate inprog errors: https://goo.gl/sYX3QL
            if (response.error) {
              defer.reject(response.error);
            } else {
              defer.resolve(response);
            }
            $rootScope.$apply();
          }, 0);
          // return response;
        });

        // save original promise
        if (options.cache) {
          cachePromises.put(cacheKey, promise);
        }
      }

      // trigger events
      LJ.Event.trigger('api:request:change', method, true);
      promise.then(function () {
        LJ.Event.trigger('api:request:change', method, false);
      });

      // show errors/messages
      if (!options.silent) {
        promise.then(function showMessage(response) {
          var message = {};

          if (typeof response.message === 'undefined') {
            return;
          }

          if (angular.isString(response.message)) {
            message.body = response.message;
            message.type = 'success';
          } else {
            message.body = response.message.content;
            message.type = 'success';
          }

          Messages.add(message);
        }, function showErrorMessage(error) {
          // no error message provided
          if (typeof error.message === 'undefined') {
            return;
          }

          // Do not show internal api error
          // See: lj.api.js#handleError
          if (error.code === 1) {
            return;
          }

          Messages.error({ body: error.message });
        });
      }

      // add meta information
      if (options.meta) {
        promise = promise.then(function (response) {
          return {
            response: response,
            fromCache: fromCache
          };
        });
      }

      if (angular.isFunction(callback)) {
        promise.then(callback);
      }

      return promise;
    }

    return factory;
  }
})();
/* <<< file end: js/core/angular/api.js */

//# map link was there [api.js.map]
/* >>> file start: js/lib/jquery.selectric.min.js */
/*! Selectric ϟ v1.8.6 (2014-10-14) - git.io/tjl9sQ - Copyright (c) 2014 Leonardo Santos - Dual licensed: MIT/GPL */
!function (e) {
  "use strict";
  var t = "selectric",
      s = "Input Items Open Disabled TempShow HideSelect Wrapper Hover Responsive Above Scroll",
      o = ".sl",
      i = { onChange: function onChange(t) {
      e(t).change();
    }, maxHeight: 300, keySearchTimeout: 500, arrowButtonMarkup: '<b class="button">&#x25be;</b>', disableOnMobile: !0, openOnHover: !1, expandToItemText: !1, responsive: !1, preventWindowScroll: !0, inheritOriginalWidth: !1, customClass: { prefix: t, postfixes: s, camelCase: !0, overwrite: !0 }, optionsItemBuilder: "{text}" },
      n = { add: function add(e, t, s) {
      this[e] || (this[e] = {}), this[e][t] = s;
    }, remove: function remove(e, t) {
      delete this[e][t];
    } },
      a = { replaceDiacritics: function replaceDiacritics(e) {
      for (var t = "40-46 50-53 54-57 62-70 71-74 61 47 77".replace(/\d+/g, "\\3$&").split(" "), s = t.length; s--;) {
        e = e.toLowerCase().replace(RegExp("[" + t[s] + "]", "g"), "aeiouncy".charAt(s));
      }return e;
    }, format: function format(e) {
      var t = arguments;return ("" + e).replace(/{(\d+|(\w+))}/g, function (e, s, o) {
        return o && t[1] ? t[1][o] : t[s];
      });
    }, nextEnabledItem: function nextEnabledItem(e, t) {
      for (; e[t = (t + 1) % e.length].disabled;) {}return t;
    }, previousEnabledItem: function previousEnabledItem(e, t) {
      for (; e[t = (t > 0 ? t : e.length) - 1].disabled;) {}return t;
    }, toDash: function toDash(e) {
      return e.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }, triggerCallback: function triggerCallback(s, o) {
      var i = o.element,
          l = o.options["on" + s];e.isFunction(l) && l.call(i, i, o), n[s] && e.each(n[s], function () {
        this.call(i, i, o);
      }), e(i).trigger(t + "-" + a.toDash(s), o);
    } },
      l = e(document),
      r = e(window),
      c = function c(n, _c) {
    function d(t) {
      if ($.options = e.extend(!0, {}, i, $.options, t), $.classes = {}, $.element = n, a.triggerCallback("BeforeInit", $), $.options.disableOnMobile && L) return void ($.disableOnMobile = !0);C(!0);var o = $.options.customClass,
          l = o.postfixes.split(" "),
          r = R.width();e.each(s.split(" "), function (e, t) {
        var s = o.prefix + l[e];$.classes[t.toLowerCase()] = o.camelCase ? s : a.toDash(s);
      }), x = e("<input/>", { "class": $.classes.input, readonly: L }), k = e("<div/>", { "class": $.classes.items, tabindex: -1 }), T = e("<div/>", { "class": $.classes.scroll }), D = e("<div/>", { "class": o.prefix, html: $.options.arrowButtonMarkup }), y = e('<p class="label"/>'), I = R.wrap("<div>").parent().append(D.prepend(y), k, x), A = { open: v, close: g, destroy: C, refresh: u, init: d }, R.on(A).wrap('<div class="' + $.classes.hideselect + '">'), e.extend($, A), $.options.inheritOriginalWidth && r > 0 && I.width(r), p();
    }function p() {
      $.items = [];var t = R.children(),
          s = "<ul>",
          i = t.filter(":selected").index();H = S = ~i ? i : 0, (E = t.length) && (t.each(function (t) {
        var o = e(this),
            i = o.html(),
            n = o.prop("disabled"),
            l = $.options.optionsItemBuilder;$.items[t] = { value: o.val(), text: i, slug: a.replaceDiacritics(i), disabled: n }, s += a.format('<li class="{1}">{2}</li>', e.trim([t == H ? "selected" : "", t == E - 1 ? "last" : "", n ? "disabled" : ""].join(" ")), e.isFunction(l) ? l($.items[t], o, t) : a.format(l, $.items[t]));
      }), k.append(T.html(s + "</ul>")), y.html($.items[H].text)), D.add(R).add(I).add(x).off(o), I.prop("class", [$.classes.wrapper, $.options.customClass.overwrite ? R.prop("class").replace(/\S+/g, $.options.customClass.prefix + "-$&") : R.prop("class"), $.options.responsive ? $.classes.responsive : ""].join(" ")), R.prop("disabled") ? (I.addClass($.classes.disabled), x.prop("disabled", !0)) : (j = !0, I.removeClass($.classes.disabled).on("mouseenter" + o + " mouseleave" + o, function (t) {
        e(this).toggleClass($.classes.hover), $.options.openOnHover && (clearTimeout($.closeTimer), "mouseleave" == t.type ? $.closeTimer = setTimeout(g, 500) : v());
      }), D.on("click" + o, function (e) {
        Y ? g() : v(e);
      }), x.prop({ tabindex: q, disabled: !1 }).on("keypress" + o, h).on("keydown" + o, function (e) {
        h(e), clearTimeout($.resetStr), $.resetStr = setTimeout(function () {
          x.val("");
        }, $.options.keySearchTimeout);var t = e.keyCode || e.which;t > 36 && 41 > t && b(a[(39 > t ? "previous" : "next") + "EnabledItem"]($.items, S));
      }).on("focusin" + o, function (e) {
        x.one("blur", function () {
          x.blur();
        }), Y || v(e);
      }).on("oninput" in x[0] ? "input" : "keyup", function () {
        x.val().length && e.each($.items, function (e, t) {
          return RegExp("^" + x.val(), "i").test(t.slug) && !t.disabled ? (b(e), !1) : void 0;
        });
      }), R.prop("tabindex", !1), O = e("li", k.removeAttr("style")).click(function () {
        return b(e(this).index(), !0), !1;
      })), a.triggerCallback("Init", $);
    }function u() {
      a.triggerCallback("Refresh", $), p();
    }function h(e) {
      var t = e.keyCode || e.which;13 == t && e.preventDefault(), /^(9|13|27)$/.test(t) && (e.stopPropagation(), b(S, !0));
    }function f() {
      var e = k.closest(":visible").children(":hidden"),
          t = $.options.maxHeight;e.addClass($.classes.tempshow);var s = k.outerWidth(),
          o = D.outerWidth() - (s - k.width());!$.options.expandToItemText || o > s ? W = o : (k.css("overflow", "scroll"), I.width(9e4), W = k.width(), k.css("overflow", ""), I.width("")), k.width(W).height() > t && k.height(t), e.removeClass($.classes.tempshow);
    }function v(s) {
      a.triggerCallback("BeforeOpen", $), s && (s.preventDefault(), s.stopPropagation()), j && (f(), e("." + $.classes.hideselect, "." + $.classes.open).children()[t]("close"), Y = !0, B = k.outerHeight(), M = k.height(), x.val("").is(":focus") || x.focus(), l.on("click" + o, g).on("scroll" + o, m), m(), $.options.preventWindowScroll && l.on("mousewheel" + o + " DOMMouseScroll" + o, "." + $.classes.scroll, function (t) {
        var s = t.originalEvent,
            o = e(this).scrollTop(),
            i = 0;"detail" in s && (i = -1 * s.detail), "wheelDelta" in s && (i = s.wheelDelta), "wheelDeltaY" in s && (i = s.wheelDeltaY), "deltaY" in s && (i = -1 * s.deltaY), (o == this.scrollHeight - M && 0 > i || 0 == o && i > 0) && t.preventDefault();
      }), I.addClass($.classes.open), w(S), a.triggerCallback("Open", $));
    }function m() {
      f(), I.toggleClass($.classes.above, I.offset().top + I.outerHeight() + B > r.scrollTop() + r.height());
    }function g() {
      if (a.triggerCallback("BeforeClose", $), H != S) {
        a.triggerCallback("BeforeChange", $);var e = $.items[S].text;R.prop("selectedIndex", H = S).data("value", e), y.html(e), a.triggerCallback("Change", $);
      }l.off(o), I.removeClass($.classes.open), Y = !1, a.triggerCallback("Close", $);
    }function b(e, t) {
      $.items[e].disabled || (O.removeClass("selected").eq(S = e).addClass("selected"), w(e), t && g());
    }function w(e) {
      var t = O.eq(e).outerHeight(),
          s = O[e].offsetTop,
          o = T.scrollTop(),
          i = s + 2 * t;T.scrollTop(i > o + B ? i - B : o > s - t ? s - t : o);
    }function C(e) {
      j && (k.add(D).add(x).remove(), !e && R.removeData(t).removeData("value"), R.prop("tabindex", q).off(o).off(A).unwrap().unwrap(), j = !1);
    }var x,
        k,
        T,
        D,
        y,
        I,
        O,
        S,
        H,
        B,
        M,
        W,
        E,
        A,
        $ = this,
        R = e(n),
        Y = !1,
        j = !1,
        L = /android|ip(hone|od|ad)/i.test(navigator.userAgent),
        q = R.prop("tabindex");d(_c);
  };e.fn[t] = function (s) {
    return this.each(function () {
      var o = e.data(this, t);o && !o.disableOnMobile ? "" + s === s && o[s] ? o[s]() : o.init(s) : e.data(this, t, new c(this, s));
    });
  }, e.fn[t].hooks = n;
}(jQuery);
/* <<< file end: js/lib/jquery.selectric.min.js */

//# map link was there [jquery.selectric.min.js.map]
/* >>> file start: js/captcha.js */
/*global grecaptcha */
/**
 * LiveJournal implementation of captcha
 * @author Valeriy Vasin (valeriy.vasin@sup.com)
 */

/* eslint-disable angular/window-service */
/* eslint-disable angular/document-service */
/* eslint-disable angular/interval-service */
/* eslint-disable angular/log */
/* eslint-disable angular/angularelement */
/* eslint-disable angular/definedundefined */
(function (a) {
  return a;
})();

(function ($) {

  LJ.define('LJ.Captcha');

  LJ.Captcha = {
    create: create,
    reload: reload,
    destroy: destroy,

    getChallenge: getChallenge,
    getResponse: getResponse,
    isDefined: _isCaptchaDefined,
    execute: execute,
    current: ['recaptcha'].filter(LJ.Flags.isEnabled).shift()
  };

  // "Is any kind of Captcha enabled sitewise and not disabled by flag?"
  LJ.Captcha.available = !!LJ.Captcha.current;

  // Popup detection methods
  var waitForPopupCreation = void 0,
      waitForPopupHide = void 0,
      waitForPopupShow = void 0,
      publicKey,
      Captcha,
      options = {
    lang: 'ru'
  };


  function _isCaptchaDefined() {
    return typeof Captcha !== 'undefined';
  }

  function _getPublicKey() {
    // eslint-disable-next-line new-cap
    var defer = $.Deferred();

    if (publicKey) {
      defer.resolve(publicKey);
    } else {
      LJ.Api.call('captcha.get_public_key', {}, function (response) {
        publicKey = response.captcha_public;
        defer.resolve(publicKey);
      });
    }

    return defer.promise();
  }

  // eslint-disable-next-line new-cap
  var recaptchaLoaded = $.Deferred();

  // eslint-disable-next-line angular/window-service
  window.onRecaptchaLoad = function () {
    recaptchaLoaded.resolve();
  };

  function _getCaptchaScriptLink() {
    return location.protocol + '//www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
  }

  var _loadCaptchaScript = LJ.Function.once(function () {
    // eslint-disable-next-line new-cap
    var defer = $.Deferred();

    LJ.injectScript(_getCaptchaScriptLink());
    recaptchaLoaded.then(function () {
      Captcha = grecaptcha;
      defer.resolve();
    });

    return defer.promise();
  });

  function create(containerId, opts) {
    // eslint-disable-next-line new-cap
    var defer = $.Deferred();

    opts = $.extend(options, opts || {});

    if (!LJ.Captcha.current) {
      defer.resolve();
      return defer.promise();
    }

    return $.when(_getPublicKey(), _loadCaptchaScript()).then(function () {
      if (_isCaptchaDefined()) {
        opts.sitekey = publicKey;
        waitForPopupCreation();
        return Captcha.render(containerId, opts);
      } else {
        console.error('Something went wrong. Captcha object is not defined.');
      }
    });
  }

  // The only supported captcha option (invisible reCaptcha) does not support this method.
  function destroy() {}

  function reload() {
    if (_isCaptchaDefined()) {
      waitForPopupCreation();
      return Captcha.reset.apply(null, arguments);
    }
  }

  function getChallenge() {
    return null;
  }

  function getResponse(captchaWidgetId) {
    if (_isCaptchaDefined()) {
      return Captcha.getResponse(captchaWidgetId);
    }
  }

  function execute() {
    waitForPopupShow();
    return (Captcha || grecaptcha).execute.apply(null, arguments);
  }

  LJ.Captcha.getCaptchaApiObject = function () {
    return Captcha || grecaptcha;
  };

  // Helper for Invisible ReCAPTCHA
  // Used on pages with a single simple form,
  // where captcha is inserted in template by server.
  LJ.Captcha.setOnSimpleForm = function (formNode, submitBtnNode) {
    waitForPopupCreation();
    window.onCaptchaPass = function () {
      // We may have a button[name=submit] here,
      // which shadows the method needed
      var submitFormFunction = Object.getPrototypeOf(formNode).submit;
      submitFormFunction.call(formNode);
    };
    submitBtnNode.addEventListener('click', function (event) {
      event.preventDefault();
      execute();
    });
  };

  LJ.Event.on('reCAPTCHA::popup::created', function (popupTopContainer) {
    var overlay = popupTopContainer.firstChild,
        iframeContainer = popupTopContainer.lastChild,
        iframe = iframeContainer.firstChild;

    popupTopContainer.classList.add('recaptcha-tiles');
    overlay && overlay.classList.add('recaptcha-tiles__fader');
    iframeContainer && iframeContainer.classList.add('recaptcha-tiles__iframe-wrapper');
    iframe && iframe.classList.add('recaptcha-tiles__iframe');
  });

  LJ.Event.on('reCAPTCHA::popup::shown', function () {
    document.body.classList.add('body--recaptcha-opened');
  });

  LJ.Event.on('reCAPTCHA::popup::hidden', function () {
    document.body.classList.remove('body--recaptcha-opened');
  });

  // Heuristic for Invisible reCAPTCHA challenge iframe detection,
  // May cease to work after future reCAPTCHA updates
  function isChallengeIframe(iframe) {
    var titleAttr = iframe.attributes.title,
        srcAttr = iframe.attributes.src;

    if (titleAttr) {
      var title = titleAttr.value;
      if (/испытание|challenge/.test(title) && /recaptcha/.test(title)) {
        return true;
      }
    }
    if (srcAttr) {
      var src = srcAttr.value;
      if (/google\.com.*recaptcha.*bframe/.test(src)) {
        return true;
      }
    }
    return false;
  }

  // Popup detection
  (function () {
    var creationInterval = void 0,
        popupTopContainer = void 0;


    // Tries to detect popup node
    // by checking last body child by certain criteria
    waitForPopupCreation = function waitForPopupCreation() {
      var lastChild = document.body.lastChild;
      creationInterval = setInterval(function () {
        var currentLastChild = document.body.lastChild;
        if (currentLastChild === lastChild) {
          return;
        }
        lastChild = currentLastChild;
        var iframe = lastChild.querySelector('iframe');
        if (!(iframe && isChallengeIframe(iframe))) {
          return;
        }
        popupTopContainer = lastChild;
        console.log('reCAPTCHA popup created');
        LJ.Event.trigger('reCAPTCHA::popup::created', popupTopContainer);
        clearInterval(creationInterval);
        creationInterval = null;
      }, 100);
    };

    var waitingSince = void 0,
        showHideInterval = void 0;


    waitForPopupHide = function waitForPopupHide() {
      waitingSince = new Date();
      if (showHideInterval) {
        return;
      }
      showHideInterval = setInterval(function () {
        if (popupTopContainer && +popupTopContainer.style.opacity === 0) {
          console.log('reCAPTCHA popup hidden');
          LJ.Event.trigger('reCAPTCHA::popup::hidden');
          clearInterval(showHideInterval);
          showHideInterval = null;
        }
      }, 100);
    };

    var MAX_WAIT_SHOW = 10 * 1000;

    waitForPopupShow = function waitForPopupShow() {
      waitingSince = new Date();
      if (showHideInterval) {
        return;
      }
      showHideInterval = setInterval(function () {
        if (popupTopContainer && +popupTopContainer.style.opacity === 1) {
          console.log('reCAPTCHA popup shown');
          LJ.Event.trigger('reCAPTCHA::popup::shown');
          clearInterval(showHideInterval);
          showHideInterval = null;
          waitForPopupHide();
        } else if (new Date() > waitingSince + MAX_WAIT_SHOW) {
          console.log('reCAPTCHA popup taking too long to appear, aborting wait');
          clearInterval(showHideInterval);
          showHideInterval = null;
        }
      }, 100);
    };
  })();
})(jQuery);
/* <<< file end: js/captcha.js */

//# map link was there [captcha.js.map]
/* >>> file start: js/scheme/schemius/feedback.js */
/* eslint angular/angularelement: 0 */

(function ($) {
  'use strict';

  $(function () {
    var that = this,
        _body = $('body'),
        isFeedbackOpen = false,
        id = $('.js-feedback').attr('data-spcatid'),
        $welcome = $('.s-welcometo'),
        $icon = $('.s-do-item-feedback'),
        $feedback = $('.s-feedback'),
        $error = $feedback.find('.s-feedback-error'),
        $success = $feedback.find('.b-bubble-success-inner'),
        $spcatid = $feedback.find('.s-feedback-body .s-feedback-form input[name="spcatid"]'),
        stateClass = {
      inprogress: 's-feedback-creating',
      done: 's-feedback-successfully',
      error: 's-feedback-erroneously'
    };

    $('.js-feedback').on('click', function (event) {
      event.preventDefault();
      showFeedback();
    });

    function showFeedback() {
      // show feedback form
      _body.addClass('p-feedback');
      isFeedbackOpen = true;
      $spcatid.val(id);

      // captcha should be shown only for non logged users
      if (!LJ.get('remote')) {
        LJ.Captcha.create('b-captcha', { tabindex: 50 });
      }

      // hide bubble
      $welcome.bubble('hide');
    }

    this.setState = function (state) {
      $feedback.toggleClass(stateClass.inprogress, state === 'inprogress');
      $feedback.toggleClass(stateClass.done, state === 'done');
      $feedback.toggleClass(stateClass.error, state === 'error');
    };

    $feedback.on('click', '.s-feedback-submit', function (event) {
      var data = {};

      event.preventDefault();

      that.setState('inprogress');

      $feedback.find('input, textarea, select').each(function () {
        data[this.name] = $(this).val();
      });

      LJ.Api.call('support.create_request', data, function (response) {
        if (response.error) {
          $error.html(response.error.message);

          return that.setState('error');
        }

        $success.html($('<a>').attr('href', response.request.url).html(response.request.url));
        that.setState('done');
      });
    }).on('click', '.s-feedback-another', function (event) {
      event.preventDefault();

      $feedback.find('input, textarea').each(function () {
        $(this).val('');
      });

      LJ.Captcha.reload();

      that.setState(null);
    });

    $welcome.bubble({
      target: $icon,
      showOn: 'click',
      alwaysShowUnderTarget: true,
      arrowWidth: 'auto'
    })

    // click button in bubble
    .on('click', '.s-welcometo-action .b-flatbutton', function (event) {
      event.preventDefault();

      showFeedback();
    })

    // return to old design.
    .on('click', '.s-welcometo-switcher', function (event) {
      event.preventDefault();

      // not logged - set cookie
      if (!LJ.get('remote')) {
        LJ.Cookie.setGlobal('ljold', 1, { expires: 7 });
        location.reload();
        return;
      }

      // logged - Api call
      LJ.Api.call('settings.set_old_design', { value: 1 }, function () {
        location.reload();
      });
    });

    // close feedback form
    _body.on('click', function (event) {
      var target = $(event.target);

      if (!isFeedbackOpen || !target.hasClass('b-fader') && !target.hasClass('s-feedback-close')) {
        return;
      }

      _body.removeClass('p-feedback');
      $spcatid.val('');
      isFeedbackOpen = false;
      that.setState(null);

      // destroy captcha
      if (!LJ.get('remote')) {
        LJ.Captcha.destroy();
      }
    });
  });
})(jQuery);
/* <<< file end: js/scheme/schemius/feedback.js */

//# map link was there [feedback.js.map]
/* >>> file start: js/core/angular/ref.js */
/**
 * Define ref in HTML:
 *   <div lj-ref="my-target" />
 *
 * Scroll to ref:
 *   Ref.scrollTo('ref', { onlyUp: true });
 */

(function (a) {
  return a;
})();

(function () {
  'use strict';

  angular.module('LJ.Ref', []).factory('Ref', function () {
    var refs = {};

    function add(id, element) {
      if (refs[id]) {
        console.error('Ref element with id `%s` has been registered before.', id);
        return;
      }

      refs[id] = element;
    }

    function remove(id) {
      if (refs[id]) {
        delete refs[id];
      }
    }

    function get(id) {
      var ref = refs[id];

      if (!ref) {
        console.error('Ref `%s` not found.', id);
      }

      return ref;
    }

    /**
     * Scroll to ref element
     * @param {String} ref                        Ref id
     * @param {Object} [options]                  Scroll options
     * @param {Boolean} [options.onlyUp]          Scroll to the up only. Prevent scrolling down
     * @param {Boolean} [options.onlyOutOfScreen] Scroll to ref if it displays out of viewport
     * @param {Boolean} [options.toParent]        Scroll parent element instead of <body> to ref.
     */
    function _scrollTo(ref, options) {
      if (typeof options === 'undefined') {
        options = {};
      }

      var element = get(ref),
          rootElement = angular.element('html, body');

      if (!element) {
        console.error('Could not scroll to the ref `%s` that has not been already defined.', ref);
        return;
      }

      var top = element.offset().top;

      // do not scroll down if it is restricted
      if (options.onlyUp && angular.element(window).scrollTop() <= top) {
        return;
      }

      if (options.onlyOutOfScreen && !outOfScreen(element)) {
        return;
      }

      if (options.toParent) {
        rootElement = element.parent();
        top = 0;
      }

      rootElement.animate({
        scrollTop: top
      });
    }

    function outOfScreen(element) {
      var _window = angular.element(window),
          screenTop = _window.scrollTop(),
          screenBottom = screenTop + _window.height(),
          elementTop = element.offset().top;

      return elementTop > screenBottom - 100 || elementTop < screenTop;
    }

    return {
      add: add,
      remove: remove,
      get: get,

      scrollTo: _scrollTo
    };
  }).directive('ljRef', ['Ref', function (Ref) {
    return {
      restrict: 'A',
      scope: true,
      link: function link($scope, $element, $attrs) {
        var id = $attrs.ljRef;

        Ref.add(id, $element);

        $scope.$on('$destroy', function () {
          Ref.remove(id);
        });
      }
    };
  }]);
})();
/* <<< file end: js/core/angular/ref.js */

//# map link was there [ref.js.map]
/* >>> file start: js/core/angular/bubble.js */
/* global JSON */

//= require js/core/angular/ref.js

Site.page.template['Widgets/ljBubble.tmpl'] = '<div\n    class=\"\n        b-popup\n        bubble-node\n        b-popup-withclosecontrol\n        b-bubble-{{bubble.name}}\n        \"\n    ng-show=\"show\"\n    lj-switch-off=\"show\"\n    lj-switch-off-action=\"bubble.close()\"\n    lj-switch-off-ignore-sticky=true\n    ng-style=\"{ left: position.x, top: position.y, visibility: visibility }\"\n    ng-class=\"{\n        \'b-popup-noclosecontrol\': !bubble.options.closeControl\n    }\"\n    lj-switch-off-skip>\n    <div class=\"b-popup-outer\">\n        <div class=\"b-popup-inner\">\n            <i class=\"i-popup-arr\" ng-class=\"arrowClass()\">\n                <i class=\"i-popup-arr-brdr-outer\">\n                    <i class=\"i-popup-arr-brdr-inner\">\n                        <i class=\"i-popup-arr-bg\"></i>\n                    </i>\n                </i>\n            </i>\n            <div ng-include src=\"template\"></div>\n            <i class=\"i-popup-close\" ng-click=\"bubble.close()\"></i>\n        </div>\n    </div>\n</div>\n';
Site.page.template['angular/confirm.bubble.ng.tmpl'] = '<div class=\"b-popup-content b-popup-options-centered\">\n  <div class=\"b-popup-content-header\">\n    <span>{{ bubble.options.header }}</span>\n  </div>\n  <div class=\"b-popup-content-confirm\" ng-bind-html=\"bubble.options.text\"></div>\n  <div class=\"b-popup-submit-options\">\n    <button class=\"b-popup-btn b-flatbutton b-flatbutton-simple\" ng-click=\"bubble.options.confirm()\">{{ bubble.options.yes }}</button>\n    <button class=\"b-popup-cancel b-flatbutton b-flatbutton-simple b-flatbutton-neutral\" ng-click=\"bubble.close()\">{{ bubble.options.no }}</button>\n  </div>\n</div>\n';

//= require_ml confirm.bubble.yes
//= require_ml confirm.bubble.no

/**
 * LJ bubble directive
 *
 * Options:
 *   - closeControl: show close control or not. Default: true
 *   - alwaysLeft / alwaysRight:  always place bubble left / right. Default: false
 *   - alwaysTop / alwaysBottom:  always place bubble top / bottom. Default: false
 *   - eventType: open bubble event. Default: 'click'
 *   - autoClose: auto close timer in milliseconds. Default: 0
 *   - arrowInitialVertical: default vertical arrow position on bubble. Default: 't'
 *   - arrowInitialHorizontal: default horizontal arrow position on bubble. Default: 'l'
 *   - aside: place bubble aside, so the arrow is on the left or right side edges. Default: false
 *   - tryAsideIfNoHorizSpace: will place itself aside if out of screen bounds regardless of horizontal arrow position.
         Works when `aside` is OFF (not set). Default: false
 *
 * @example
 *   html:
 *     <!--
 *       Following will add click handler to button
 *       and include myBubble.tmpl inside bubble.
 *     -->
 *     <button lj-bubble="{
 *         name: 'myBubble',
 *         template: 'settings.ng.tmpl',
 *         closeControl: false
 *       }"
 *       >Show bubble!</button>
 *
 *   js:
 *     angular.module('MyModule', ['LJ.Bubble'])
 *     .controller('MyCtrl', ['$scope', 'Bubble', function($scope, Bubble) {
 *
 *       // Use Bubble.open to control bubble from JS.
 *       // You can pass jQuery node to reposition the bubble from the original placement.
 *       Bubble.open('myBubble', { 'some-stuff': 'optional' }, jQuery('.b-some-other-block'));
 *     }]);
 *
 * @todo
 *   Refactor detection of current bubble open
 *   Refactor disableClick option of directive
 *
 * @author
 *   Artem Tyurin (artem.tyurin@sup.com)
 *   Valeriy Vasin (valeriy.vasin@sup.com)
 */

(function () {
  'use strict';

  angular.module('LJ.Bubble', ['LJ.Templates', 'LJ.Directives', 'LJ.Ref']);

  angular.module('LJ.Bubble').factory('Bubble', bubbleFactoryFn).directive('ljBubble', ljBubbleDirective);

  // body className flag
  var bubbleOpenClass = 'p-openpopup';

  ljBubbleDirective.$inject = ['Bubble', '$parse', '$compile', '$timeout', '$templateCache'];
  /**
   * ljBubbleDirective
   *
   * @name ljBubbleDirective
   * @function
   * @public
   * @param {object} Bubble - buuble object
   * @param {function} $parse - parse function
   * @param {function} $compile - ng compiler
   * @param {function} $timeout - setTimeout
   * @param {object} $templateCache  - template cache service
   * @return {object} directive fabric object
   */
  function ljBubbleDirective(Bubble, $parse, $compile, $timeout, $templateCache) {
    return {
      scope: true,
      /**
       * link
       *
       * @name link
       * @function
       * @public
       * @param {object} scope - local scope
       * @param {object} element - html element
       * @param {object} attrs - html attributes
       */
      link: function link(scope, element, attrs) {
        var options = $parse(attrs.ljBubble)(scope),
            name = options.name,
            bubble = $compile($templateCache.get('ljBubble.tmpl'))(scope),
            setPosition = LJ.Function.throttle(_setPosition, 50),
            arrow = bubble.find('.i-popup-arr'),
            $window = angular.element(window),
            eventType = options.eventType || 'click',
            autoClose = Number(options.autoClose || 0),
            autoCloseTimeoutPromise;

        scope.show = false;

        Bubble._register(name, options);

        scope.template = options.template || name + '.html';
        scope.bubble = {
          name: name,
          close: Bubble.close,
          options: Bubble.options(name)
        };

        /**
         * clear
         *
         * @name clear
         * @function
         * @public
         */
        scope.clear = function () {
          scope.arrow = {
            vertical: options.arrowInitialVertical || 't', /* top  (t) or bottom (b) */
            horizontal: options.arrowInitialHorizontal || 'l' /* left (l) or right  (r) */
          };
        };

        scope.position = {
          x: -9999,
          y: -9999
        };

        scope.visibility = 'hidden';

        /**
         * arrowClass
         *
         * @name arrowClass
         * @function
         * @public
         * @return {string} arrow class
         */
        scope.arrowClass = function () {
          var opts = scope.bubble.options,
              vertical = scope.arrow.vertical,
              horizontal = scope.arrow.horizontal;

          return opts.aside || options.aside ? 'i-popup-arr' + horizontal + vertical : 'i-popup-arr' + vertical + horizontal;
        };

        scope.$watch(function () {
          return Bubble.current;
        }, function (value) {
          hideFromViewport();

          $timeout(function () {
            scope.show = value === name;

            if (value && scope.show) {
              scope.clear();
              $timeout(setPosition);
            }
          });
        }, true);

        /**
         * _setPosition
         *
         * @name _setPosition
         * @function
         * @private
         */
        function _setPosition() {
          // try to use top/left coords
          var vertical = scope.arrow.vertical,
              horizontal = scope.arrow.horizontal,
              aside = options.aside,
              isModal = $window.innerWidth <= 650 ? true : false; // bubble fix, shoud be like - angular.element('body').hasClass(bubbleOpenClass);

          scope.visibility = 'hidden';

          if (options.keepInitialWidth && !options.widthSaved) {
            options.widthSaved = true;
            bubble.width(bubble.width());
          }

          // calculate positions initially
          recalculatePositions();

          if (isOutOfViewportY() && !isModal) {
            // we are out of vertical space
            scope.arrow.vertical = vertical === 'b' ? _isOption('alwaysTop') ? 'b' : 't' : _isOption('alwaysBottom') ? 't' : 'b';

            recalculatePositions();
            // We prefer to put bubble below target
            // if both options `t`/`b` work poorly.
            // That happens in case of a very small height of `window`
            if (notEnoughSpaceOnTop() && !_isOption('alwaysTop')) {
              scope.arrow.vertical = 't';
              recalculatePositions();
            }
          }

          if (isOutOfViewportX() && !isModal) {
            // we are out of horizontal space
            scope.arrow.horizontal = horizontal === 'l' ? _isOption('alwaysRight') || notEnoughSpaceOnTheLeft() ? 'l' : 'r' : _isOption('alwaysLeft') || notEnoughSpaceOnTheRight() ? 'r' : 'l';
          }

          if (!isModal && isOutOfViewportX()
          // if we did not do anything on previous stage
          && scope.arrow.horizontal === horizontal && canSwitchToAside()) {
            options.aside = true;
          }

          // top/left coords can't be used
          if (!isModal && (scope.arrow.horizontal !== horizontal || scope.arrow.vertical !== vertical || options.aside !== aside)) {
            $timeout(showRecalculatedPosition);
          } else {
            scope.visibility = 'visible';
          }
        }

        /**
         * showRecalculatedPosition
         * positions should be recalculated
         * timeout is needed to apply arrow positions
         *
         * @name showRecalculatedPosition
         * @function
         * @public
         */
        function showRecalculatedPosition() {
          recalculatePositions();

          if (isOutOfViewportX() && canSwitchToAside()) {

            options.aside = true;
            // force DOM to update for correct measurements
            scope.$apply();
            showRecalculatedPosition();
            return;
          }

          // if out of screen yet set arrow  to center
          if (isOutOfViewportX() && !_isOption('aside') && scope.arrow.horizontal) {
            scope.arrow.horizontal = '';
            showRecalculatedPosition();
            return;
          }

          scope.visibility = 'visible';
        }

        function canSwitchToAside() {
          return !_isOption('aside') && _isOption('tryAsideIfNoHorizSpace');
        }

        /**
         * _isOption
         *
         * @name _isOption
         * @function
         * @private
         * @param {string} option - bubble option name
         * @return {*} option value
         */
        function _isOption(option) {
          return scope.bubble.options[option] || options[option];
        }

        /**
         * recalculatePositions
         *
         * @name recalculatePositions
         * @function
         * @public
         */
        function recalculatePositions() {
          var el = Bubble.node || element,
              centerX = el.offset().left + Math.floor(el.outerWidth() / 2),
              forceX = scope.bubble.options.forceX || 0,
              forceY = scope.bubble.options.forceY || 0;

          if (_isOption('aside')) {
            scope.position.x = scope.arrow.horizontal === 'r' ? el.offset().left - bubble.outerWidth() - arrow.outerWidth() + forceX : el.offset().left + el.outerWidth() + arrow.outerWidth() + forceX;

            scope.position.y = el.offset().top - arrow.position().top + (el.outerHeight() - arrow.outerHeight()) / 2 + forceY;
          } else {
            scope.position.x = scope.arrow.horizontal ? centerX - arrow.position().left - Math.floor(arrow.outerWidth() / 2) - 2 + forceX : centerX - bubble.outerWidth() / 2 - Math.floor(arrow.outerWidth() / 4) - 2 + forceX;

            scope.position.y = scope.arrow.vertical === 't' ? el.offset().top + el.outerHeight() + arrow.outerHeight() + forceY : el.offset().top - arrow.outerHeight() - bubble.outerHeight() + forceY;
          }
        }

        /**
         * hideFromViewport
         *
         * @name hideFromViewport
         * @function
         * @public
         */
        function hideFromViewport() {
          scope.position.x = -9999;
        }

        /**
         * isOutOfViewportY
         *
         * @name isOutOfViewportY
         * @function
         * @public
         * @return {boolean} is out of viewport Y
         */
        function isOutOfViewportY() {

          if (notEnoughSpaceOnTop()) return true;

          return scope.position.y + bubble.outerHeight() > $window.scrollTop() + $window.outerHeight();
        }

        function notEnoughSpaceOnTop() {
          return scope.position.y < $window.scrollTop();
        }

        /**
         * isOutOfViewportX
         *
         * @name isOutOfViewportX
         * @function
         * @public
         * @return {boolean} is out of viewport X
         */
        function isOutOfViewportX() {
          return notEnoughSpaceOnTheLeft() || notEnoughSpaceOnTheRight();
        }

        function notEnoughSpaceOnTheLeft() {
          return scope.position.x < $window.scrollLeft();
        }

        function notEnoughSpaceOnTheRight() {
          return scope.position.x + bubble.outerWidth() > $window.scrollLeft() + $window.outerWidth();
        }

        /**
         * Bubble target click handler
         * @param  {jQuery.Event} event Click event object
         */
        function onTargetClick(event) {
          event.preventDefault();

          if (Bubble.current === options.name) {
            return;
          }

          $timeout(function () {
            Bubble.open(options.name);
          });
        }

        /**
         * startTimeoutToClose
         *
         * @name startTimeoutToClose
         * @function
         * @public
         */
        function startTimeoutToClose() {
          stopTimeoutToClose();

          if (autoClose) {
            autoCloseTimeoutPromise = $timeout(Bubble.close, autoClose);
          }
        }

        /**
         * stopTimeoutToClose
         *
         * @name stopTimeoutToClose
         * @function
         * @public
         */
        function stopTimeoutToClose() {
          $timeout.cancel(autoCloseTimeoutPromise);
        }

        /**
         * finishTimeoutAndClose
         *
         * @name finishTimeoutAndClose
         * @function
         * @public
         */
        function finishTimeoutAndClose() {
          var bubbleToClose = options.name,
              openedBubble = Bubble.current;
          if (bubbleToClose !== openedBubble) {
            return;
          }
          stopTimeoutToClose();
          Bubble.close();
          scope.$apply();
        }

        /**
         * onResize
         *
         * @name onResize
         * @function
         * @public
         */
        function onResize() {
          if (scope.show) {
            $timeout(setPosition);
          }
        }

        if (!options.disableClick) {
          element.on(eventType, onTargetClick);
        }

        // android view triggers resize on opening soft keyboard
        if (!options.disableResizeListener) {
          $window.on('resize', onResize);
        }

        if (options.recalculateOnOrientationChange) {
          $window.on('orientationchange', function () {
            onResize();
            $window.on('resize', onResize);
            $timeout(function () {
              $window.off('resize', onResize);
            }, 1000);
          });
        }

        if (options.recalculateOnScroll) {
          $window.on('scroll', onResize);
        }

        if (options.closeOnScroll) {
          $window.on('scroll', finishTimeoutAndClose);
        }

        angular.element('body').append(bubble);

        element.on('mouseleave', startTimeoutToClose);
        bubble.on('mouseenter', stopTimeoutToClose);
        bubble.on('mouseleave', startTimeoutToClose);

        scope.clear();
        scope.$on('$destroy', function () {
          element.off(eventType, onTargetClick);
          $window.off('resize', onResize);
          $window.off('scroll', onResize);
          $window.off('scroll', Bubble.close);
          element.off('mouseleave', startTimeoutToClose);
          bubble.off('mouseenter', stopTimeoutToClose);
          bubble.off('mouseleave', startTimeoutToClose);
          Bubble._unregister(name);
          bubble.remove();
        });
      }
    };
  }

  bubbleFactoryFn.$inject = ['$rootScope', '$compile', 'Ref', '$timeout', '$window', '$log'];
  /**
   * bubbleFactoryFn
   *
   * @name bubbleFactoryFn
   * @function
   * @public
   * @param {object} $rootScope - scope root
   * @param {function} $compile - compiler ng
   * @param {object} Ref - ??
   * @param {function} $timeout - settimeout
   * @param {object} $window - global
   * @param {object} $log - console
   * @return {object} service instance
   */
  function bubbleFactoryFn($rootScope, $compile, Ref, $timeout, $window, $log) {
    var factory = {},


    // bubbles options
    _options = {};

    // currently opened bubble name
    factory.current = null;

    // we can change bubble node while opening bubble
    factory.node = null;

    /**
     * Register bubble from service
     * @example
     *   Bubble.register({ name: 'share', template: 'share.ng.tmpl' });
     */
    factory.register = function () {
      // cache for registerd from service bubbles
      var cache = {};

      /**
       * register
       *
       * @name register
       * @function
       * @public
       * @param {object} opts - ??
       * @param {object} scope - ??
       * @return {function} unregister fn
       */
      function register(opts, scope) {
        var name, bubbleNode, isScopeCreated;

        if (!opts || !opts.name || !opts.template) {
          $log.error('Incorrect bubble options. You should provide name and template.', opts);
          return;
        }

        name = opts.name;

        // click is always disabled when register from factory
        opts.disableClick = true;

        // bubble has been registered before - increase counter
        if (cache[name]) {
          cache[name].count += 1;
          return unregister.bind(null, name);
        }

        // create lj-bubble node with params
        bubbleNode = angular.element('<div />').attr('lj-bubble', angular.toJson(opts));

        // create new isolated scope for the bubble if we not provided it
        isScopeCreated = typeof scope === 'undefined';

        if (isScopeCreated) {
          scope = $rootScope.$new(true);
        }

        bubbleNode.appendTo('body');
        $compile(bubbleNode)(scope);

        cache[name] = {
          count: 1,
          node: bubbleNode,
          scope: scope,
          isScopeCreated: isScopeCreated
        };

        // unregistration function
        return unregister.bind(null, name);
      }

      /**
       * unregister
       *
       * @name unregister
       * @function
       * @public
       * @param {string} name - ??
       */
      function unregister(name) {
        var opts = cache[name];

        if (!opts) {
          // nothing to unregister
          return;
        }

        opts.count -= 1;

        // perform remove
        if (opts.count === 0) {
          // do not destroy scope we have not created
          if (!opts.isScopeCreated) {
            opts.scope.$destroy();
          }

          opts.node.remove();
          delete cache[name];
        }
      }

      return register;
    }();

    /**
     * exists
     *
     * @name exists
     * @function
     * @public
     * @param {string} name - bubble name
     * @return {boolean} has it been registered before
     */
    factory.exists = function exists(name) {
      return _options.hasOwnProperty(name);
    };

    /**
     * Register bubble and copy options as prototype.
     * @param {String} name Bubble name
     * @param {object} options - ??
     */
    factory._register = function (name, options) {
      var opts;

      if (_options.hasOwnProperty(name)) {
        throw 'Warning: bubble with name ' + name + ' has been registered before!';
      }

      opts = angular.isDefined(options) ? angular.copy(options) : {};

      // extend with default options
      opts = angular.extend({
        closeControl: true
      }, opts);

      _options[name] = Object.create(opts);
    };

    /**
     * _unregister
     *
     * @name _unregister
     * @function
     * @private
     * @param {string} name - ??
     */
    factory._unregister = function (name) {
      delete _options[name];

      if (factory.current === name) {
        factory.current = null;
      }
    };

    /**
     * confirmBubble
     *
     * @name confirmBubble
     * @function
     * @public
     * @param {object} options - {confirm:function text,header: string}
     */
    factory.confirm = function confirmBubble(options) {
      var yes = LJ.ml('confirm.bubble.yes'),
          no = LJ.ml('confirm.bubble.no'),
          params = {
        closeControl: false,
        confirm: options.confirm,
        header: options.header,
        text: options.text,
        yes: options.yes || yes,
        no: options.no || no
      };

      factory.open(options.id, params);

      $timeout(scrollHack);
      $timeout(scrollHack, 1e2);
      $timeout(scrollHack, 2e2);
      $timeout(scrollHack, 3e2);
      /**
       * scrollHack // this @hack is to recalculate bubble position correctly
       *
       * @name scrollHack
       * @function
       * @public
       */
      function scrollHack() {
        $window.scrollBy(0, 1);
        $window.scrollBy(0, -1);
      }
    };

    /**
     * Open bubble with provided name
     * @param {String}        name       Bubble name
     * @param {Object}        [options]  Options that will be available for bubble
     * @param {jQuery|String} [node]     jQuery: Node relative to which bubble will be positioned
     *                                   String: Registered ref id
     */
    factory.open = function (name, options, node) {
      if (!_options.hasOwnProperty(name)) {
        $log.error('Bubble `' + name + '` can\'t be opened, it has not been registered yet.');
        return;
      }

      if (options instanceof jQuery) {
        node = options;
        options = {};
      }

      if (angular.isString(options)) {
        node = Ref.get(options);
        options = {};
      }

      if (angular.isObject(options)) {
        factory.options(name, options);
      }

      if (node instanceof jQuery) {
        factory.node = node;
      }

      if (angular.isString(node)) {
        factory.node = Ref.get(node);
      }

      factory.current = name;
      $rootScope.$broadcast('bubble:open', name, options, node);
      $rootScope.$broadcast('bubble:open:' + name, name, options, node);
      angular.element('body').addClass(bubbleOpenClass);
    };

    /**
     * Close all opened bubbles
     * @param {String} [name] Close bubble
     */
    factory.close = function () {
      var name = factory.current,
          options = _options[name],
          option;

      $rootScope.$broadcast('bubble:close', name, options, factory.node);
      $rootScope.$broadcast('bubble:close:' + name, name, options, factory.node);

      // clear current bubble options
      for (option in options) {
        if (options.hasOwnProperty(option)) {
          delete options[option];
        }
      }

      factory.current = null;
      factory.node = null;
      angular.element('body').removeClass(bubbleOpenClass);
    };

    /**
     * Set context for opened bubble
     * @param  {String} name    Bubble name
     * @param  {Object} options Opening context (arguments)
     * @return {Object}         Bubble options
     */
    factory.options = function (name, options) {
      if (typeof options === 'undefined' || options === _options[name]) {
        return _options[name];
      }

      angular.copy(options, _options[name]);
    };

    return factory;
  }
})();
/* <<< file end: js/core/angular/bubble.js */

//# map link was there [bubble.js.map]
/* >>> file start: js/core/angular/simple-scrollbar.js */
(function (w, d) {
  'use strict';

  angular.module('Scrollbar', []);
  angular.module('Scrollbar').constant('SimpleScrollbar', ss);

  // Simple-scroll library from https://github.com/buzinas/simple-scrollbar

  var raf = w.requestAnimationFrame || w.setImmediate || function (c) {
    return setTimeout(c, 0);
  };

  // Mouse drag handler
  function dragDealer(el, context) {
    var lastPageY;

    el.addEventListener('mousedown', function (e) {
      lastPageY = e.pageY;
      el.classList.add('ss-grabbed');
      d.body.classList.add('ss-grabbed');

      d.addEventListener('mousemove', drag);
      d.addEventListener('mouseup', stop);

      return false;
    });

    function drag(e) {
      var delta = e.pageY - lastPageY;
      lastPageY = e.pageY;

      raf(function () {
        context.el.scrollTop += delta / context.scrollRatio;
      });
    }

    function stop() {
      el.classList.remove('ss-grabbed');
      d.body.classList.remove('ss-grabbed');
      d.removeEventListener('mousemove', drag);
      d.removeEventListener('mouseup', stop);
    }
  }

  // Constructor
  function ss(el) {
    this.target = el;

    this.bar = '<div class="ss-scroll">';

    this.wrapper = d.createElement('div');
    this.wrapper.setAttribute('class', 'ss-wrapper');

    this.el = d.createElement('div');
    this.el.setAttribute('class', 'ss-content');

    this.wrapper.appendChild(this.el);

    while (this.target.firstChild) {
      this.el.appendChild(this.target.firstChild);
    }
    this.target.appendChild(this.wrapper);

    this.target.insertAdjacentHTML('beforeend', this.bar);
    this.bar = this.target.lastChild;

    dragDealer(this.bar, this);
    this.moveBar();

    this.el.addEventListener('scroll', this.moveBar.bind(this));
    this.el.addEventListener('mouseenter', this.moveBar.bind(this));

    this.target.classList.add('ss-container');

    var css = w.getComputedStyle(el);
    if (css.height === '0px' && css['max-height'] !== '0px') {
      el.style.height = css['max-height'];
    }
  }

  ss.prototype = {
    moveBar: function moveBar() {
      var totalHeight = this.el.scrollHeight,
          ownHeight = this.el.clientHeight,
          _this = this;

      this.scrollRatio = ownHeight / totalHeight;

      raf(function () {
        // Hide scrollbar if no scrolling is possible
        if (_this.scrollRatio === 1) {
          _this.bar.classList.add('ss-hidden');
        } else {
          _this.bar.classList.remove('ss-hidden');
          _this.bar.style.cssText = 'height:' + _this.scrollRatio * 100 + '%; top:' + _this.el.scrollTop / totalHeight * 100 + '%;right:-' + (_this.target.clientWidth - _this.bar.clientWidth) + 'px;';
        }
      });
    },
    // need this for dinamic data sets
    setElementHeight: function setElementHeight(height) {
      this.el.style.height = height;
      this.moveBar();
    }
  };
})(window, document);
/* <<< file end: js/core/angular/simple-scrollbar.js */

//# map link was there [simple-scrollbar.js.map]
/* >>> file start: js/notifications/main.js */
Site.page.template['angular/widgets/notifications/notifications.ng.tmpl'] = '<div class=\"popupus popupus--notices\" ng-class=\"{\'svgpreloader-30 svgpreloader-pseudo svgpreloader\': notifications.loading}\" ng-controller=\"NotificationCtrl as notifications\">\n    <div class=\"popupus__inner\">\n        <div\n            class=\"notices\"\n            ng-class=\"{\'notices__has-notifications\': notifications.counter > 0}\"\n            >\n            <header class=\"notices__header\">\n                <h3\n                    class=\"notices__title\"\n                    lj-ml=\"notification.centre.title\"\n                    lj-ml-resolve=\"{ count: notifications.counter }\"\n                    lj-ml-dynamic=\"notifications.counter\"\n                    >\n                    </h3>\n                <a \n                    href=\"#\"\n                    ng-click=\"notifications.readAll()\"\n                    ng-show=\"notifications.entries.length > 0\"\n                    class=\"notices__read\"\n                    lj-ml=\"notification.centre.read.all\"\n                    >\n                    </a>\n                <span><TMPL_VAR statprefix></span>\n            </header>\n            <div\n                class=\"notices__body\"\n                notifications-content\n                ng-show=\"notifications.entries.length > 0\"\n                >\n                <div class=\"notices__body-wrapper\">\n                <ul class=\"notices__list\">\n                    <li\n                        ng-repeat=\"entry in notifications.entries\"\n                        class=\"notices__item\"\n                        ng-class=\"{\n                            \'notices--{{entry.action}}\': true,\n                            \'notices--unread\': entry.unread\n                            }\"\n                        ng-mouseover=\"notifications.read(entry)\"\n                        >\n                        <a class=\"notices__item__link\" href=\"#\">\n                            <img ng-src=\"{{entry.main_user.img_url || notifications.defaultPic}}\" ng-alt=\"{{entry.main_user.name}}\" class=\"notices__userpic\">\n                            <h5 class=\"notices__item__title\">{{entry.notification_text}}</h5>\n                            <time class=\"notices__date\">{{entry.date}}</time>\n                            <p class=\"notices__publication-content\">{{entry.title}}</p>\n                            <ul class=\"notices__consilient-users-list\">\n                                <li class=\"notices__consilient-user\" ng-repeat=\"user in entry.other_users\">\n                                    <img ng-src=\"{{user.img_url || notifications.defaultPic}}\" ng-alt=\"{{user.name}}\" class=\"notices__consilient-userpic\">\n                                </li>\n                            </ul>\n                        </a>\n                    </li>\n                </ul>\n                </div>\n            </div>\n            <div\n                class=\"notices__body-empty\"\n                ng-show=\"notifications.entries.length === 0\"\n                >\n                You don\'t have any notifications\n            </div>\n\n            <div class=\"notices__footer\" ng-if=\"notifications.shouldShowMore()\">\n                <div class=\"notices__more\">\n                    <button\n                        ng-click=\"notifications.nextPage()\"\n                        class=\"\n                            flatbutton\n                            flatbutton--small\n                            flatbutton--neutral\n                            flatbutton--max\n                            \"\n                        lj-ml=\"notification.centre.previous\"\n                        >\n                        </button>\n                </div>\n            </div>\n        </div>\n    </div>\n</div>';
Site.page.template['angular/widgets/notifications/notificationsIcon.ng.tmpl'] = '<div\n    class=\"\n        s-header-control\n        s-header-notifications\n        \"\n    >\n    <a\n        class=\"\n            s-header-control__icon\n            s-header-control__icon--circle\n            s-header-notifications__icon\n            \"\n        href=\"javascript: void(0)\"\n        notifications-panel\n        ng-if=\"enabled\"\n        lj-svg-icon=\"flaticon--notifications\"\n        ></a>\n    <span\n        class=\"s-header-notifications__counter\"\n        ng-class=\"{\'counter--shown\': count.count > 0}\"\n        ng-if=\"enabled\"\n        ng-controller=\"NotificationsCountCtrl as count\"\n        >{{count.count}}</span>\n</div>\n';

//= require js/core/angular/bubble.js
//= require js/core/angular/api.js
//= require js/core/angular/simple-scrollbar.js

//= require_ml notification.centre.title
//= require_ml notification.centre.read.all
//= require_ml notification.centre.previous

/* global JSON, angular */

(function (a) {
	return a;
})();

(function () {
	'use strict';

	angular.module('Notifications', ['LJ.Bubble', 'LJ.Api', 'Scrollbar']);
	angular.module('Notifications').constant('READ_PUSH_DELAY', 3000).constant('CHECK_NEW_DELAY', 10000).factory('notificationService', notificationFactory).directive('ljNotificationsIcon', ljNotificationsIcon).directive('notificationsPanel', notificationsDirective).directive('notificationsContent', notificationsContentDirective).controller('NotificationCtrl', notificationController).controller('NotificationsCountCtrl', notificationCounterController);

	notificationFactory.$inject = ['$rootScope', '$interval', 'Api', 'READ_PUSH_DELAY', 'CHECK_NEW_DELAY'];
	function notificationFactory($rootScope, $interval, Api, READ_PUSH_DELAY, CHECK_NEW_DELAY) {
		var read = [],
		    _entries = [],
		    _counter = 0;
		function updateCounter() {
			var off = void 0;
			if (read.length > 0) {
				off = $rootScope.$on('notifications:readPushed', function () {
					processCounterUpdate();
					off();
				});
				return;
			}
			processCounterUpdate();
		}

		function processCounterUpdate() {
			getCounter().then(function (result) {
				if (_counter !== result.notifications) {
					_counter = result.notifications;
					$rootScope.$broadcast('notifications:counterUpdated');
				}
			});
		}

		updateCounter();

		$interval(updateCounter, CHECK_NEW_DELAY);

		var debouncedPush = LJ.Function.debounce(push, READ_PUSH_DELAY);

		function getCounter() {
			return Api.call('notifications.getn', { silent: true });
		}

		function getNotifications(page) {
			return Api.call('notifications.get', { page: page, silent: true });
		}

		function push() {
			Api.call('notifications.release', { id: read, silent: true });
			read = [];
			$rootScope.$broadcast('notifications:readPushed');
		}

		function pushRead(entry) {
			read.push(entry.id);
			entry.unread = false;
			_counter--;
			$rootScope.$broadcast('notifications:counterUpdated');
			debouncedPush();
		}

		function readAll() {
			Api.call('notifications.release_all', { silent: true }).then(function (result) {
				if (result === 'ok') {
					_counter = 0;
					$rootScope.$broadcast('notifications:counterUpdated');
				}
			});
		}

		return {
			pushRead: pushRead,
			entries: function entries() {
				return _entries;
			},
			counter: function counter() {
				return _counter;
			},
			getNotifications: getNotifications,
			readAll: readAll
		};
	}

	notificationController.$inject = ['$scope', '$timeout', '$interval', 'notificationService'];
	function notificationController($scope, $timeout, $interval, notificationService) {
		var vm = this,
		    page = 0,
		    pagesCount = 0;

		vm.entries = [];
		vm.counter = notificationService.counter();
		vm.loading = false;

		vm.defaultPic = LJ.get('statprefix') + '/img/userpics/userpic-user.png?v=15821';

		vm.getPage = function (event) {
			vm.loading = true;
			notificationService.getNotifications(page).then(function (result) {
				vm.entries = result.notifications;
				pagesCount = result.pages;
				vm.loading = false;
				$scope.$broadcast('notifications:pageLoad:' + event);
			});
		};

		vm.read = function (entry) {
			if (entry.unread) {
				notificationService.pushRead(entry);
			}
		};

		vm.readPage = function () {
			vm.part.forEach(vm.read);
		};

		vm.readAll = notificationService.readAll;

		vm.shouldShowMore = function () {
			return vm.entries && page < pagesCount - 1;
		};

		vm.nextPage = function () {
			page++;
			vm.getPage('next');
			mobileReadAll();
			$scope.$emit('notifications:nextPage');
		};

		$scope.$on('notifications:counterUpdated', function () {
			vm.counter = notificationService.counter();
		});

		$scope.$on('bubble:open:notifications', function () {
			vm.getPage('open');
			mobileReadAll();
		});

		$scope.$on('bubble:close:notifications', function () {
			page = 0;
			vm.entries = [];
		});

		function mobileReadAll() {
			if (LJ.Support.isMobile() || LJ.Support.touch) {
				$timeout(vm.readPage, 1000);
			}
		}
	}

	ljNotificationsIcon.$inject = ['notificationService'];
	function ljNotificationsIcon(notificationService) {
		// eslint-disable-line no-unused-vars
		return {
			templateUrl: 'notificationsIcon.ng.tmpl',
			link: link
		};

		function link(scope, element) {
			var notificationsDisplay = LJ.Flags.isEnabled('notification_center_display');
			scope.enabled = notificationsDisplay;
			if (notificationsDisplay) {
				element.removeClass('notices--hidden');
			}
		}
	}

	notificationCounterController.$inject = ['$scope', '$timeout', 'notificationService'];
	function notificationCounterController($scope, $timeout, notificationService) {
		var vm = this;
		$scope.$on('notifications:counterUpdated', function () {
			$timeout(function () {
				vm.count = notificationService.counter();
			});
		});
	}

	notificationsDirective.$inject = ['Bubble'];
	function notificationsDirective(Bubble) {
		return {
			link: link
		};
		function link(scope, element) {
			Bubble.register({ name: 'notifications', template: 'notifications.ng.tmpl' });
			element.click(function () {
				scope.$apply(function () {
					Bubble.open('notifications', { alwaysBottom: true, closeControl: false }, element);
				});
			});
		}
	}

	notificationsContentDirective.$inject = ['$timeout', 'SimpleScrollbar'];
	function notificationsContentDirective($timeout, SimpleScrollbar) {
		return {
			link: link
		};

		function link(scope, element) {
			var list = element.find('.notices__body-wrapper')[0],
			    listContainer = new SimpleScrollbar(list);
			scope.$on('notifications:pageLoad:open', function () {
				$timeout(function () {
					return setCalculatedHeight(listContainer, element);
				});
			});
			scope.$on('bubble:close:notifications', function () {
				$timeout(function () {
					return setAutoHeight(listContainer);
				});
			});
			scope.$on('notifications:pageLoad:next', function () {
				$timeout(function () {
					setAutoHeight(listContainer);
					setCalculatedHeight(listContainer, element);
				});
			});
		}

		function setCalculatedHeight(scrollElement, parent) {
			scrollElement.setElementHeight(parent.height() + 'px');
		}

		function setAutoHeight(scrollElement) {
			scrollElement.setElementHeight('100%');
		}
	}
})();
/* <<< file end: js/notifications/main.js */

//# map link was there [main.js.map]
/* >>> file start: js/node_modules/moment/min/moment.min.js */
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

//! moment.js
//! version : 2.10.6
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com
!function (a, b) {
  "object" == (typeof exports === "undefined" ? "undefined" : _typeof(exports)) && "undefined" != typeof module ? module.exports = b() : "function" == typeof define && define.amd ? define(b) : a.moment = b();
}(this, function () {
  "use strict";
  function a() {
    return Hc.apply(null, arguments);
  }function b(a) {
    Hc = a;
  }function c(a) {
    return "[object Array]" === Object.prototype.toString.call(a);
  }function d(a) {
    return a instanceof Date || "[object Date]" === Object.prototype.toString.call(a);
  }function e(a, b) {
    var c,
        d = [];for (c = 0; c < a.length; ++c) {
      d.push(b(a[c], c));
    }return d;
  }function f(a, b) {
    return Object.prototype.hasOwnProperty.call(a, b);
  }function g(a, b) {
    for (var c in b) {
      f(b, c) && (a[c] = b[c]);
    }return f(b, "toString") && (a.toString = b.toString), f(b, "valueOf") && (a.valueOf = b.valueOf), a;
  }function h(a, b, c, d) {
    return Ca(a, b, c, d, !0).utc();
  }function i() {
    return { empty: !1, unusedTokens: [], unusedInput: [], overflow: -2, charsLeftOver: 0, nullInput: !1, invalidMonth: null, invalidFormat: !1, userInvalidated: !1, iso: !1 };
  }function j(a) {
    return null == a._pf && (a._pf = i()), a._pf;
  }function k(a) {
    if (null == a._isValid) {
      var b = j(a);a._isValid = !(isNaN(a._d.getTime()) || !(b.overflow < 0) || b.empty || b.invalidMonth || b.invalidWeekday || b.nullInput || b.invalidFormat || b.userInvalidated), a._strict && (a._isValid = a._isValid && 0 === b.charsLeftOver && 0 === b.unusedTokens.length && void 0 === b.bigHour);
    }return a._isValid;
  }function l(a) {
    var b = h(NaN);return null != a ? g(j(b), a) : j(b).userInvalidated = !0, b;
  }function m(a, b) {
    var c, d, e;if ("undefined" != typeof b._isAMomentObject && (a._isAMomentObject = b._isAMomentObject), "undefined" != typeof b._i && (a._i = b._i), "undefined" != typeof b._f && (a._f = b._f), "undefined" != typeof b._l && (a._l = b._l), "undefined" != typeof b._strict && (a._strict = b._strict), "undefined" != typeof b._tzm && (a._tzm = b._tzm), "undefined" != typeof b._isUTC && (a._isUTC = b._isUTC), "undefined" != typeof b._offset && (a._offset = b._offset), "undefined" != typeof b._pf && (a._pf = j(b)), "undefined" != typeof b._locale && (a._locale = b._locale), Jc.length > 0) for (c in Jc) {
      d = Jc[c], e = b[d], "undefined" != typeof e && (a[d] = e);
    }return a;
  }function n(b) {
    m(this, b), this._d = new Date(null != b._d ? b._d.getTime() : NaN), Kc === !1 && (Kc = !0, a.updateOffset(this), Kc = !1);
  }function o(a) {
    return a instanceof n || null != a && null != a._isAMomentObject;
  }function p(a) {
    return 0 > a ? Math.ceil(a) : Math.floor(a);
  }function q(a) {
    var b = +a,
        c = 0;return 0 !== b && isFinite(b) && (c = p(b)), c;
  }function r(a, b, c) {
    var d,
        e = Math.min(a.length, b.length),
        f = Math.abs(a.length - b.length),
        g = 0;for (d = 0; e > d; d++) {
      (c && a[d] !== b[d] || !c && q(a[d]) !== q(b[d])) && g++;
    }return g + f;
  }function s() {}function t(a) {
    return a ? a.toLowerCase().replace("_", "-") : a;
  }function u(a) {
    for (var b, c, d, e, f = 0; f < a.length;) {
      for (e = t(a[f]).split("-"), b = e.length, c = t(a[f + 1]), c = c ? c.split("-") : null; b > 0;) {
        if (d = v(e.slice(0, b).join("-"))) return d;if (c && c.length >= b && r(e, c, !0) >= b - 1) break;b--;
      }f++;
    }return null;
  }function v(a) {
    var b = null;if (!Lc[a] && "undefined" != typeof module && module && module.exports) try {
      b = Ic._abbr, require("./locale/" + a), w(b);
    } catch (c) {}return Lc[a];
  }function w(a, b) {
    var c;return a && (c = "undefined" == typeof b ? y(a) : x(a, b), c && (Ic = c)), Ic._abbr;
  }function x(a, b) {
    return null !== b ? (b.abbr = a, Lc[a] = Lc[a] || new s(), Lc[a].set(b), w(a), Lc[a]) : (delete Lc[a], null);
  }function y(a) {
    var b;if (a && a._locale && a._locale._abbr && (a = a._locale._abbr), !a) return Ic;if (!c(a)) {
      if (b = v(a)) return b;a = [a];
    }return u(a);
  }function z(a, b) {
    var c = a.toLowerCase();Mc[c] = Mc[c + "s"] = Mc[b] = a;
  }function A(a) {
    return "string" == typeof a ? Mc[a] || Mc[a.toLowerCase()] : void 0;
  }function B(a) {
    var b,
        c,
        d = {};for (c in a) {
      f(a, c) && (b = A(c), b && (d[b] = a[c]));
    }return d;
  }function C(b, c) {
    return function (d) {
      return null != d ? (E(this, b, d), a.updateOffset(this, c), this) : D(this, b);
    };
  }function D(a, b) {
    return a._d["get" + (a._isUTC ? "UTC" : "") + b]();
  }function E(a, b, c) {
    return a._d["set" + (a._isUTC ? "UTC" : "") + b](c);
  }function F(a, b) {
    var c;if ("object" == (typeof a === "undefined" ? "undefined" : _typeof(a))) for (c in a) {
      this.set(c, a[c]);
    } else if (a = A(a), "function" == typeof this[a]) return this[a](b);return this;
  }function G(a, b, c) {
    var d = "" + Math.abs(a),
        e = b - d.length,
        f = a >= 0;return (f ? c ? "+" : "" : "-") + Math.pow(10, Math.max(0, e)).toString().substr(1) + d;
  }function H(a, b, c, d) {
    var e = d;"string" == typeof d && (e = function e() {
      return this[d]();
    }), a && (Qc[a] = e), b && (Qc[b[0]] = function () {
      return G(e.apply(this, arguments), b[1], b[2]);
    }), c && (Qc[c] = function () {
      return this.localeData().ordinal(e.apply(this, arguments), a);
    });
  }function I(a) {
    return a.match(/\[[\s\S]/) ? a.replace(/^\[|\]$/g, "") : a.replace(/\\/g, "");
  }function J(a) {
    var b,
        c,
        d = a.match(Nc);for (b = 0, c = d.length; c > b; b++) {
      Qc[d[b]] ? d[b] = Qc[d[b]] : d[b] = I(d[b]);
    }return function (e) {
      var f = "";for (b = 0; c > b; b++) {
        f += d[b] instanceof Function ? d[b].call(e, a) : d[b];
      }return f;
    };
  }function K(a, b) {
    return a.isValid() ? (b = L(b, a.localeData()), Pc[b] = Pc[b] || J(b), Pc[b](a)) : a.localeData().invalidDate();
  }function L(a, b) {
    function c(a) {
      return b.longDateFormat(a) || a;
    }var d = 5;for (Oc.lastIndex = 0; d >= 0 && Oc.test(a);) {
      a = a.replace(Oc, c), Oc.lastIndex = 0, d -= 1;
    }return a;
  }function M(a) {
    return "function" == typeof a && "[object Function]" === Object.prototype.toString.call(a);
  }function N(a, b, c) {
    dd[a] = M(b) ? b : function (a) {
      return a && c ? c : b;
    };
  }function O(a, b) {
    return f(dd, a) ? dd[a](b._strict, b._locale) : new RegExp(P(a));
  }function P(a) {
    return a.replace("\\", "").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (a, b, c, d, e) {
      return b || c || d || e;
    }).replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  }function Q(a, b) {
    var c,
        d = b;for ("string" == typeof a && (a = [a]), "number" == typeof b && (d = function d(a, c) {
      c[b] = q(a);
    }), c = 0; c < a.length; c++) {
      ed[a[c]] = d;
    }
  }function R(a, b) {
    Q(a, function (a, c, d, e) {
      d._w = d._w || {}, b(a, d._w, d, e);
    });
  }function S(a, b, c) {
    null != b && f(ed, a) && ed[a](b, c._a, c, a);
  }function T(a, b) {
    return new Date(Date.UTC(a, b + 1, 0)).getUTCDate();
  }function U(a) {
    return this._months[a.month()];
  }function V(a) {
    return this._monthsShort[a.month()];
  }function W(a, b, c) {
    var d, e, f;for (this._monthsParse || (this._monthsParse = [], this._longMonthsParse = [], this._shortMonthsParse = []), d = 0; 12 > d; d++) {
      if (e = h([2e3, d]), c && !this._longMonthsParse[d] && (this._longMonthsParse[d] = new RegExp("^" + this.months(e, "").replace(".", "") + "$", "i"), this._shortMonthsParse[d] = new RegExp("^" + this.monthsShort(e, "").replace(".", "") + "$", "i")), c || this._monthsParse[d] || (f = "^" + this.months(e, "") + "|^" + this.monthsShort(e, ""), this._monthsParse[d] = new RegExp(f.replace(".", ""), "i")), c && "MMMM" === b && this._longMonthsParse[d].test(a)) return d;if (c && "MMM" === b && this._shortMonthsParse[d].test(a)) return d;if (!c && this._monthsParse[d].test(a)) return d;
    }
  }function X(a, b) {
    var c;return "string" == typeof b && (b = a.localeData().monthsParse(b), "number" != typeof b) ? a : (c = Math.min(a.date(), T(a.year(), b)), a._d["set" + (a._isUTC ? "UTC" : "") + "Month"](b, c), a);
  }function Y(b) {
    return null != b ? (X(this, b), a.updateOffset(this, !0), this) : D(this, "Month");
  }function Z() {
    return T(this.year(), this.month());
  }function $(a) {
    var b,
        c = a._a;return c && -2 === j(a).overflow && (b = c[gd] < 0 || c[gd] > 11 ? gd : c[hd] < 1 || c[hd] > T(c[fd], c[gd]) ? hd : c[id] < 0 || c[id] > 24 || 24 === c[id] && (0 !== c[jd] || 0 !== c[kd] || 0 !== c[ld]) ? id : c[jd] < 0 || c[jd] > 59 ? jd : c[kd] < 0 || c[kd] > 59 ? kd : c[ld] < 0 || c[ld] > 999 ? ld : -1, j(a)._overflowDayOfYear && (fd > b || b > hd) && (b = hd), j(a).overflow = b), a;
  }function _(b) {
    a.suppressDeprecationWarnings === !1 && "undefined" != typeof console && console.warn && console.warn("Deprecation warning: " + b);
  }function aa(a, b) {
    var c = !0;return g(function () {
      return c && (_(a + "\n" + new Error().stack), c = !1), b.apply(this, arguments);
    }, b);
  }function ba(a, b) {
    od[a] || (_(b), od[a] = !0);
  }function ca(a) {
    var b,
        c,
        d = a._i,
        e = pd.exec(d);if (e) {
      for (j(a).iso = !0, b = 0, c = qd.length; c > b; b++) {
        if (qd[b][1].exec(d)) {
          a._f = qd[b][0];break;
        }
      }for (b = 0, c = rd.length; c > b; b++) {
        if (rd[b][1].exec(d)) {
          a._f += (e[6] || " ") + rd[b][0];break;
        }
      }d.match(ad) && (a._f += "Z"), va(a);
    } else a._isValid = !1;
  }function da(b) {
    var c = sd.exec(b._i);return null !== c ? void (b._d = new Date(+c[1])) : (ca(b), void (b._isValid === !1 && (delete b._isValid, a.createFromInputFallback(b))));
  }function ea(a, b, c, d, e, f, g) {
    var h = new Date(a, b, c, d, e, f, g);return 1970 > a && h.setFullYear(a), h;
  }function fa(a) {
    var b = new Date(Date.UTC.apply(null, arguments));return 1970 > a && b.setUTCFullYear(a), b;
  }function ga(a) {
    return ha(a) ? 366 : 365;
  }function ha(a) {
    return a % 4 === 0 && a % 100 !== 0 || a % 400 === 0;
  }function ia() {
    return ha(this.year());
  }function ja(a, b, c) {
    var d,
        e = c - b,
        f = c - a.day();return f > e && (f -= 7), e - 7 > f && (f += 7), d = Da(a).add(f, "d"), { week: Math.ceil(d.dayOfYear() / 7), year: d.year() };
  }function ka(a) {
    return ja(a, this._week.dow, this._week.doy).week;
  }function la() {
    return this._week.dow;
  }function ma() {
    return this._week.doy;
  }function na(a) {
    var b = this.localeData().week(this);return null == a ? b : this.add(7 * (a - b), "d");
  }function oa(a) {
    var b = ja(this, 1, 4).week;return null == a ? b : this.add(7 * (a - b), "d");
  }function pa(a, b, c, d, e) {
    var f,
        g = 6 + e - d,
        h = fa(a, 0, 1 + g),
        i = h.getUTCDay();return e > i && (i += 7), c = null != c ? 1 * c : e, f = 1 + g + 7 * (b - 1) - i + c, { year: f > 0 ? a : a - 1, dayOfYear: f > 0 ? f : ga(a - 1) + f };
  }function qa(a) {
    var b = Math.round((this.clone().startOf("day") - this.clone().startOf("year")) / 864e5) + 1;return null == a ? b : this.add(a - b, "d");
  }function ra(a, b, c) {
    return null != a ? a : null != b ? b : c;
  }function sa(a) {
    var b = new Date();return a._useUTC ? [b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()] : [b.getFullYear(), b.getMonth(), b.getDate()];
  }function ta(a) {
    var b,
        c,
        d,
        e,
        f = [];if (!a._d) {
      for (d = sa(a), a._w && null == a._a[hd] && null == a._a[gd] && ua(a), a._dayOfYear && (e = ra(a._a[fd], d[fd]), a._dayOfYear > ga(e) && (j(a)._overflowDayOfYear = !0), c = fa(e, 0, a._dayOfYear), a._a[gd] = c.getUTCMonth(), a._a[hd] = c.getUTCDate()), b = 0; 3 > b && null == a._a[b]; ++b) {
        a._a[b] = f[b] = d[b];
      }for (; 7 > b; b++) {
        a._a[b] = f[b] = null == a._a[b] ? 2 === b ? 1 : 0 : a._a[b];
      }24 === a._a[id] && 0 === a._a[jd] && 0 === a._a[kd] && 0 === a._a[ld] && (a._nextDay = !0, a._a[id] = 0), a._d = (a._useUTC ? fa : ea).apply(null, f), null != a._tzm && a._d.setUTCMinutes(a._d.getUTCMinutes() - a._tzm), a._nextDay && (a._a[id] = 24);
    }
  }function ua(a) {
    var b, c, d, e, f, g, h;b = a._w, null != b.GG || null != b.W || null != b.E ? (f = 1, g = 4, c = ra(b.GG, a._a[fd], ja(Da(), 1, 4).year), d = ra(b.W, 1), e = ra(b.E, 1)) : (f = a._locale._week.dow, g = a._locale._week.doy, c = ra(b.gg, a._a[fd], ja(Da(), f, g).year), d = ra(b.w, 1), null != b.d ? (e = b.d, f > e && ++d) : e = null != b.e ? b.e + f : f), h = pa(c, d, e, g, f), a._a[fd] = h.year, a._dayOfYear = h.dayOfYear;
  }function va(b) {
    if (b._f === a.ISO_8601) return void ca(b);b._a = [], j(b).empty = !0;var c,
        d,
        e,
        f,
        g,
        h = "" + b._i,
        i = h.length,
        k = 0;for (e = L(b._f, b._locale).match(Nc) || [], c = 0; c < e.length; c++) {
      f = e[c], d = (h.match(O(f, b)) || [])[0], d && (g = h.substr(0, h.indexOf(d)), g.length > 0 && j(b).unusedInput.push(g), h = h.slice(h.indexOf(d) + d.length), k += d.length), Qc[f] ? (d ? j(b).empty = !1 : j(b).unusedTokens.push(f), S(f, d, b)) : b._strict && !d && j(b).unusedTokens.push(f);
    }j(b).charsLeftOver = i - k, h.length > 0 && j(b).unusedInput.push(h), j(b).bigHour === !0 && b._a[id] <= 12 && b._a[id] > 0 && (j(b).bigHour = void 0), b._a[id] = wa(b._locale, b._a[id], b._meridiem), ta(b), $(b);
  }function wa(a, b, c) {
    var d;return null == c ? b : null != a.meridiemHour ? a.meridiemHour(b, c) : null != a.isPM ? (d = a.isPM(c), d && 12 > b && (b += 12), d || 12 !== b || (b = 0), b) : b;
  }function xa(a) {
    var b, c, d, e, f;if (0 === a._f.length) return j(a).invalidFormat = !0, void (a._d = new Date(NaN));for (e = 0; e < a._f.length; e++) {
      f = 0, b = m({}, a), null != a._useUTC && (b._useUTC = a._useUTC), b._f = a._f[e], va(b), k(b) && (f += j(b).charsLeftOver, f += 10 * j(b).unusedTokens.length, j(b).score = f, (null == d || d > f) && (d = f, c = b));
    }g(a, c || b);
  }function ya(a) {
    if (!a._d) {
      var b = B(a._i);a._a = [b.year, b.month, b.day || b.date, b.hour, b.minute, b.second, b.millisecond], ta(a);
    }
  }function za(a) {
    var b = new n($(Aa(a)));return b._nextDay && (b.add(1, "d"), b._nextDay = void 0), b;
  }function Aa(a) {
    var b = a._i,
        e = a._f;return a._locale = a._locale || y(a._l), null === b || void 0 === e && "" === b ? l({ nullInput: !0 }) : ("string" == typeof b && (a._i = b = a._locale.preparse(b)), o(b) ? new n($(b)) : (c(e) ? xa(a) : e ? va(a) : d(b) ? a._d = b : Ba(a), a));
  }function Ba(b) {
    var f = b._i;void 0 === f ? b._d = new Date() : d(f) ? b._d = new Date(+f) : "string" == typeof f ? da(b) : c(f) ? (b._a = e(f.slice(0), function (a) {
      return parseInt(a, 10);
    }), ta(b)) : "object" == (typeof f === "undefined" ? "undefined" : _typeof(f)) ? ya(b) : "number" == typeof f ? b._d = new Date(f) : a.createFromInputFallback(b);
  }function Ca(a, b, c, d, e) {
    var f = {};return "boolean" == typeof c && (d = c, c = void 0), f._isAMomentObject = !0, f._useUTC = f._isUTC = e, f._l = c, f._i = a, f._f = b, f._strict = d, za(f);
  }function Da(a, b, c, d) {
    return Ca(a, b, c, d, !1);
  }function Ea(a, b) {
    var d, e;if (1 === b.length && c(b[0]) && (b = b[0]), !b.length) return Da();for (d = b[0], e = 1; e < b.length; ++e) {
      (!b[e].isValid() || b[e][a](d)) && (d = b[e]);
    }return d;
  }function Fa() {
    var a = [].slice.call(arguments, 0);return Ea("isBefore", a);
  }function Ga() {
    var a = [].slice.call(arguments, 0);return Ea("isAfter", a);
  }function Ha(a) {
    var b = B(a),
        c = b.year || 0,
        d = b.quarter || 0,
        e = b.month || 0,
        f = b.week || 0,
        g = b.day || 0,
        h = b.hour || 0,
        i = b.minute || 0,
        j = b.second || 0,
        k = b.millisecond || 0;this._milliseconds = +k + 1e3 * j + 6e4 * i + 36e5 * h, this._days = +g + 7 * f, this._months = +e + 3 * d + 12 * c, this._data = {}, this._locale = y(), this._bubble();
  }function Ia(a) {
    return a instanceof Ha;
  }function Ja(a, b) {
    H(a, 0, 0, function () {
      var a = this.utcOffset(),
          c = "+";return 0 > a && (a = -a, c = "-"), c + G(~~(a / 60), 2) + b + G(~~a % 60, 2);
    });
  }function Ka(a) {
    var b = (a || "").match(ad) || [],
        c = b[b.length - 1] || [],
        d = (c + "").match(xd) || ["-", 0, 0],
        e = +(60 * d[1]) + q(d[2]);return "+" === d[0] ? e : -e;
  }function La(b, c) {
    var e, f;return c._isUTC ? (e = c.clone(), f = (o(b) || d(b) ? +b : +Da(b)) - +e, e._d.setTime(+e._d + f), a.updateOffset(e, !1), e) : Da(b).local();
  }function Ma(a) {
    return 15 * -Math.round(a._d.getTimezoneOffset() / 15);
  }function Na(b, c) {
    var d,
        e = this._offset || 0;return null != b ? ("string" == typeof b && (b = Ka(b)), Math.abs(b) < 16 && (b = 60 * b), !this._isUTC && c && (d = Ma(this)), this._offset = b, this._isUTC = !0, null != d && this.add(d, "m"), e !== b && (!c || this._changeInProgress ? bb(this, Ya(b - e, "m"), 1, !1) : this._changeInProgress || (this._changeInProgress = !0, a.updateOffset(this, !0), this._changeInProgress = null)), this) : this._isUTC ? e : Ma(this);
  }function Oa(a, b) {
    return null != a ? ("string" != typeof a && (a = -a), this.utcOffset(a, b), this) : -this.utcOffset();
  }function Pa(a) {
    return this.utcOffset(0, a);
  }function Qa(a) {
    return this._isUTC && (this.utcOffset(0, a), this._isUTC = !1, a && this.subtract(Ma(this), "m")), this;
  }function Ra() {
    return this._tzm ? this.utcOffset(this._tzm) : "string" == typeof this._i && this.utcOffset(Ka(this._i)), this;
  }function Sa(a) {
    return a = a ? Da(a).utcOffset() : 0, (this.utcOffset() - a) % 60 === 0;
  }function Ta() {
    return this.utcOffset() > this.clone().month(0).utcOffset() || this.utcOffset() > this.clone().month(5).utcOffset();
  }function Ua() {
    if ("undefined" != typeof this._isDSTShifted) return this._isDSTShifted;var a = {};if (m(a, this), a = Aa(a), a._a) {
      var b = a._isUTC ? h(a._a) : Da(a._a);this._isDSTShifted = this.isValid() && r(a._a, b.toArray()) > 0;
    } else this._isDSTShifted = !1;return this._isDSTShifted;
  }function Va() {
    return !this._isUTC;
  }function Wa() {
    return this._isUTC;
  }function Xa() {
    return this._isUTC && 0 === this._offset;
  }function Ya(a, b) {
    var c,
        d,
        e,
        g = a,
        h = null;return Ia(a) ? g = { ms: a._milliseconds, d: a._days, M: a._months } : "number" == typeof a ? (g = {}, b ? g[b] = a : g.milliseconds = a) : (h = yd.exec(a)) ? (c = "-" === h[1] ? -1 : 1, g = { y: 0, d: q(h[hd]) * c, h: q(h[id]) * c, m: q(h[jd]) * c, s: q(h[kd]) * c, ms: q(h[ld]) * c }) : (h = zd.exec(a)) ? (c = "-" === h[1] ? -1 : 1, g = { y: Za(h[2], c), M: Za(h[3], c), d: Za(h[4], c), h: Za(h[5], c), m: Za(h[6], c), s: Za(h[7], c), w: Za(h[8], c) }) : null == g ? g = {} : "object" == (typeof g === "undefined" ? "undefined" : _typeof(g)) && ("from" in g || "to" in g) && (e = _a(Da(g.from), Da(g.to)), g = {}, g.ms = e.milliseconds, g.M = e.months), d = new Ha(g), Ia(a) && f(a, "_locale") && (d._locale = a._locale), d;
  }function Za(a, b) {
    var c = a && parseFloat(a.replace(",", "."));return (isNaN(c) ? 0 : c) * b;
  }function $a(a, b) {
    var c = { milliseconds: 0, months: 0 };return c.months = b.month() - a.month() + 12 * (b.year() - a.year()), a.clone().add(c.months, "M").isAfter(b) && --c.months, c.milliseconds = +b - +a.clone().add(c.months, "M"), c;
  }function _a(a, b) {
    var c;return b = La(b, a), a.isBefore(b) ? c = $a(a, b) : (c = $a(b, a), c.milliseconds = -c.milliseconds, c.months = -c.months), c;
  }function ab(a, b) {
    return function (c, d) {
      var e, f;return null === d || isNaN(+d) || (ba(b, "moment()." + b + "(period, number) is deprecated. Please use moment()." + b + "(number, period)."), f = c, c = d, d = f), c = "string" == typeof c ? +c : c, e = Ya(c, d), bb(this, e, a), this;
    };
  }function bb(b, c, d, e) {
    var f = c._milliseconds,
        g = c._days,
        h = c._months;e = null == e ? !0 : e, f && b._d.setTime(+b._d + f * d), g && E(b, "Date", D(b, "Date") + g * d), h && X(b, D(b, "Month") + h * d), e && a.updateOffset(b, g || h);
  }function cb(a, b) {
    var c = a || Da(),
        d = La(c, this).startOf("day"),
        e = this.diff(d, "days", !0),
        f = -6 > e ? "sameElse" : -1 > e ? "lastWeek" : 0 > e ? "lastDay" : 1 > e ? "sameDay" : 2 > e ? "nextDay" : 7 > e ? "nextWeek" : "sameElse";return this.format(b && b[f] || this.localeData().calendar(f, this, Da(c)));
  }function db() {
    return new n(this);
  }function eb(a, b) {
    var c;return b = A("undefined" != typeof b ? b : "millisecond"), "millisecond" === b ? (a = o(a) ? a : Da(a), +this > +a) : (c = o(a) ? +a : +Da(a), c < +this.clone().startOf(b));
  }function fb(a, b) {
    var c;return b = A("undefined" != typeof b ? b : "millisecond"), "millisecond" === b ? (a = o(a) ? a : Da(a), +a > +this) : (c = o(a) ? +a : +Da(a), +this.clone().endOf(b) < c);
  }function gb(a, b, c) {
    return this.isAfter(a, c) && this.isBefore(b, c);
  }function hb(a, b) {
    var c;return b = A(b || "millisecond"), "millisecond" === b ? (a = o(a) ? a : Da(a), +this === +a) : (c = +Da(a), +this.clone().startOf(b) <= c && c <= +this.clone().endOf(b));
  }function ib(a, b, c) {
    var d,
        e,
        f = La(a, this),
        g = 6e4 * (f.utcOffset() - this.utcOffset());return b = A(b), "year" === b || "month" === b || "quarter" === b ? (e = jb(this, f), "quarter" === b ? e /= 3 : "year" === b && (e /= 12)) : (d = this - f, e = "second" === b ? d / 1e3 : "minute" === b ? d / 6e4 : "hour" === b ? d / 36e5 : "day" === b ? (d - g) / 864e5 : "week" === b ? (d - g) / 6048e5 : d), c ? e : p(e);
  }function jb(a, b) {
    var c,
        d,
        e = 12 * (b.year() - a.year()) + (b.month() - a.month()),
        f = a.clone().add(e, "months");return 0 > b - f ? (c = a.clone().add(e - 1, "months"), d = (b - f) / (f - c)) : (c = a.clone().add(e + 1, "months"), d = (b - f) / (c - f)), -(e + d);
  }function kb() {
    return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
  }function lb() {
    var a = this.clone().utc();return 0 < a.year() && a.year() <= 9999 ? "function" == typeof Date.prototype.toISOString ? this.toDate().toISOString() : K(a, "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]") : K(a, "YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]");
  }function mb(b) {
    var c = K(this, b || a.defaultFormat);return this.localeData().postformat(c);
  }function nb(a, b) {
    return this.isValid() ? Ya({ to: this, from: a }).locale(this.locale()).humanize(!b) : this.localeData().invalidDate();
  }function ob(a) {
    return this.from(Da(), a);
  }function pb(a, b) {
    return this.isValid() ? Ya({ from: this, to: a }).locale(this.locale()).humanize(!b) : this.localeData().invalidDate();
  }function qb(a) {
    return this.to(Da(), a);
  }function rb(a) {
    var b;return void 0 === a ? this._locale._abbr : (b = y(a), null != b && (this._locale = b), this);
  }function sb() {
    return this._locale;
  }function tb(a) {
    switch (a = A(a)) {case "year":
        this.month(0);case "quarter":case "month":
        this.date(1);case "week":case "isoWeek":case "day":
        this.hours(0);case "hour":
        this.minutes(0);case "minute":
        this.seconds(0);case "second":
        this.milliseconds(0);}return "week" === a && this.weekday(0), "isoWeek" === a && this.isoWeekday(1), "quarter" === a && this.month(3 * Math.floor(this.month() / 3)), this;
  }function ub(a) {
    return a = A(a), void 0 === a || "millisecond" === a ? this : this.startOf(a).add(1, "isoWeek" === a ? "week" : a).subtract(1, "ms");
  }function vb() {
    return +this._d - 6e4 * (this._offset || 0);
  }function wb() {
    return Math.floor(+this / 1e3);
  }function xb() {
    return this._offset ? new Date(+this) : this._d;
  }function yb() {
    var a = this;return [a.year(), a.month(), a.date(), a.hour(), a.minute(), a.second(), a.millisecond()];
  }function zb() {
    var a = this;return { years: a.year(), months: a.month(), date: a.date(), hours: a.hours(), minutes: a.minutes(), seconds: a.seconds(), milliseconds: a.milliseconds() };
  }function Ab() {
    return k(this);
  }function Bb() {
    return g({}, j(this));
  }function Cb() {
    return j(this).overflow;
  }function Db(a, b) {
    H(0, [a, a.length], 0, b);
  }function Eb(a, b, c) {
    return ja(Da([a, 11, 31 + b - c]), b, c).week;
  }function Fb(a) {
    var b = ja(this, this.localeData()._week.dow, this.localeData()._week.doy).year;return null == a ? b : this.add(a - b, "y");
  }function Gb(a) {
    var b = ja(this, 1, 4).year;return null == a ? b : this.add(a - b, "y");
  }function Hb() {
    return Eb(this.year(), 1, 4);
  }function Ib() {
    var a = this.localeData()._week;return Eb(this.year(), a.dow, a.doy);
  }function Jb(a) {
    return null == a ? Math.ceil((this.month() + 1) / 3) : this.month(3 * (a - 1) + this.month() % 3);
  }function Kb(a, b) {
    return "string" != typeof a ? a : isNaN(a) ? (a = b.weekdaysParse(a), "number" == typeof a ? a : null) : parseInt(a, 10);
  }function Lb(a) {
    return this._weekdays[a.day()];
  }function Mb(a) {
    return this._weekdaysShort[a.day()];
  }function Nb(a) {
    return this._weekdaysMin[a.day()];
  }function Ob(a) {
    var b, c, d;for (this._weekdaysParse = this._weekdaysParse || [], b = 0; 7 > b; b++) {
      if (this._weekdaysParse[b] || (c = Da([2e3, 1]).day(b), d = "^" + this.weekdays(c, "") + "|^" + this.weekdaysShort(c, "") + "|^" + this.weekdaysMin(c, ""), this._weekdaysParse[b] = new RegExp(d.replace(".", ""), "i")), this._weekdaysParse[b].test(a)) return b;
    }
  }function Pb(a) {
    var b = this._isUTC ? this._d.getUTCDay() : this._d.getDay();return null != a ? (a = Kb(a, this.localeData()), this.add(a - b, "d")) : b;
  }function Qb(a) {
    var b = (this.day() + 7 - this.localeData()._week.dow) % 7;return null == a ? b : this.add(a - b, "d");
  }function Rb(a) {
    return null == a ? this.day() || 7 : this.day(this.day() % 7 ? a : a - 7);
  }function Sb(a, b) {
    H(a, 0, 0, function () {
      return this.localeData().meridiem(this.hours(), this.minutes(), b);
    });
  }function Tb(a, b) {
    return b._meridiemParse;
  }function Ub(a) {
    return "p" === (a + "").toLowerCase().charAt(0);
  }function Vb(a, b, c) {
    return a > 11 ? c ? "pm" : "PM" : c ? "am" : "AM";
  }function Wb(a, b) {
    b[ld] = q(1e3 * ("0." + a));
  }function Xb() {
    return this._isUTC ? "UTC" : "";
  }function Yb() {
    return this._isUTC ? "Coordinated Universal Time" : "";
  }function Zb(a) {
    return Da(1e3 * a);
  }function $b() {
    return Da.apply(null, arguments).parseZone();
  }function _b(a, b, c) {
    var d = this._calendar[a];return "function" == typeof d ? d.call(b, c) : d;
  }function ac(a) {
    var b = this._longDateFormat[a],
        c = this._longDateFormat[a.toUpperCase()];return b || !c ? b : (this._longDateFormat[a] = c.replace(/MMMM|MM|DD|dddd/g, function (a) {
      return a.slice(1);
    }), this._longDateFormat[a]);
  }function bc() {
    return this._invalidDate;
  }function cc(a) {
    return this._ordinal.replace("%d", a);
  }function dc(a) {
    return a;
  }function ec(a, b, c, d) {
    var e = this._relativeTime[c];return "function" == typeof e ? e(a, b, c, d) : e.replace(/%d/i, a);
  }function fc(a, b) {
    var c = this._relativeTime[a > 0 ? "future" : "past"];return "function" == typeof c ? c(b) : c.replace(/%s/i, b);
  }function gc(a) {
    var b, c;for (c in a) {
      b = a[c], "function" == typeof b ? this[c] = b : this["_" + c] = b;
    }this._ordinalParseLenient = new RegExp(this._ordinalParse.source + "|" + /\d{1,2}/.source);
  }function hc(a, b, c, d) {
    var e = y(),
        f = h().set(d, b);return e[c](f, a);
  }function ic(a, b, c, d, e) {
    if ("number" == typeof a && (b = a, a = void 0), a = a || "", null != b) return hc(a, b, c, e);var f,
        g = [];for (f = 0; d > f; f++) {
      g[f] = hc(a, f, c, e);
    }return g;
  }function jc(a, b) {
    return ic(a, b, "months", 12, "month");
  }function kc(a, b) {
    return ic(a, b, "monthsShort", 12, "month");
  }function lc(a, b) {
    return ic(a, b, "weekdays", 7, "day");
  }function mc(a, b) {
    return ic(a, b, "weekdaysShort", 7, "day");
  }function nc(a, b) {
    return ic(a, b, "weekdaysMin", 7, "day");
  }function oc() {
    var a = this._data;return this._milliseconds = Wd(this._milliseconds), this._days = Wd(this._days), this._months = Wd(this._months), a.milliseconds = Wd(a.milliseconds), a.seconds = Wd(a.seconds), a.minutes = Wd(a.minutes), a.hours = Wd(a.hours), a.months = Wd(a.months), a.years = Wd(a.years), this;
  }function pc(a, b, c, d) {
    var e = Ya(b, c);return a._milliseconds += d * e._milliseconds, a._days += d * e._days, a._months += d * e._months, a._bubble();
  }function qc(a, b) {
    return pc(this, a, b, 1);
  }function rc(a, b) {
    return pc(this, a, b, -1);
  }function sc(a) {
    return 0 > a ? Math.floor(a) : Math.ceil(a);
  }function tc() {
    var a,
        b,
        c,
        d,
        e,
        f = this._milliseconds,
        g = this._days,
        h = this._months,
        i = this._data;return f >= 0 && g >= 0 && h >= 0 || 0 >= f && 0 >= g && 0 >= h || (f += 864e5 * sc(vc(h) + g), g = 0, h = 0), i.milliseconds = f % 1e3, a = p(f / 1e3), i.seconds = a % 60, b = p(a / 60), i.minutes = b % 60, c = p(b / 60), i.hours = c % 24, g += p(c / 24), e = p(uc(g)), h += e, g -= sc(vc(e)), d = p(h / 12), h %= 12, i.days = g, i.months = h, i.years = d, this;
  }function uc(a) {
    return 4800 * a / 146097;
  }function vc(a) {
    return 146097 * a / 4800;
  }function wc(a) {
    var b,
        c,
        d = this._milliseconds;if (a = A(a), "month" === a || "year" === a) return b = this._days + d / 864e5, c = this._months + uc(b), "month" === a ? c : c / 12;switch (b = this._days + Math.round(vc(this._months)), a) {case "week":
        return b / 7 + d / 6048e5;case "day":
        return b + d / 864e5;case "hour":
        return 24 * b + d / 36e5;case "minute":
        return 1440 * b + d / 6e4;case "second":
        return 86400 * b + d / 1e3;case "millisecond":
        return Math.floor(864e5 * b) + d;default:
        throw new Error("Unknown unit " + a);}
  }function xc() {
    return this._milliseconds + 864e5 * this._days + this._months % 12 * 2592e6 + 31536e6 * q(this._months / 12);
  }function yc(a) {
    return function () {
      return this.as(a);
    };
  }function zc(a) {
    return a = A(a), this[a + "s"]();
  }function Ac(a) {
    return function () {
      return this._data[a];
    };
  }function Bc() {
    return p(this.days() / 7);
  }function Cc(a, b, c, d, e) {
    return e.relativeTime(b || 1, !!c, a, d);
  }function Dc(a, b, c) {
    var d = Ya(a).abs(),
        e = ke(d.as("s")),
        f = ke(d.as("m")),
        g = ke(d.as("h")),
        h = ke(d.as("d")),
        i = ke(d.as("M")),
        j = ke(d.as("y")),
        k = e < le.s && ["s", e] || 1 === f && ["m"] || f < le.m && ["mm", f] || 1 === g && ["h"] || g < le.h && ["hh", g] || 1 === h && ["d"] || h < le.d && ["dd", h] || 1 === i && ["M"] || i < le.M && ["MM", i] || 1 === j && ["y"] || ["yy", j];return k[2] = b, k[3] = +a > 0, k[4] = c, Cc.apply(null, k);
  }function Ec(a, b) {
    return void 0 === le[a] ? !1 : void 0 === b ? le[a] : (le[a] = b, !0);
  }function Fc(a) {
    var b = this.localeData(),
        c = Dc(this, !a, b);return a && (c = b.pastFuture(+this, c)), b.postformat(c);
  }function Gc() {
    var a,
        b,
        c,
        d = me(this._milliseconds) / 1e3,
        e = me(this._days),
        f = me(this._months);a = p(d / 60), b = p(a / 60), d %= 60, a %= 60, c = p(f / 12), f %= 12;var g = c,
        h = f,
        i = e,
        j = b,
        k = a,
        l = d,
        m = this.asSeconds();return m ? (0 > m ? "-" : "") + "P" + (g ? g + "Y" : "") + (h ? h + "M" : "") + (i ? i + "D" : "") + (j || k || l ? "T" : "") + (j ? j + "H" : "") + (k ? k + "M" : "") + (l ? l + "S" : "") : "P0D";
  }var Hc,
      Ic,
      Jc = a.momentProperties = [],
      Kc = !1,
      Lc = {},
      Mc = {},
      Nc = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,
      Oc = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,
      Pc = {},
      Qc = {},
      Rc = /\d/,
      Sc = /\d\d/,
      Tc = /\d{3}/,
      Uc = /\d{4}/,
      Vc = /[+-]?\d{6}/,
      Wc = /\d\d?/,
      Xc = /\d{1,3}/,
      Yc = /\d{1,4}/,
      Zc = /[+-]?\d{1,6}/,
      $c = /\d+/,
      _c = /[+-]?\d+/,
      ad = /Z|[+-]\d\d:?\d\d/gi,
      bd = /[+-]?\d+(\.\d{1,3})?/,
      cd = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,
      dd = {},
      ed = {},
      fd = 0,
      gd = 1,
      hd = 2,
      id = 3,
      jd = 4,
      kd = 5,
      ld = 6;H("M", ["MM", 2], "Mo", function () {
    return this.month() + 1;
  }), H("MMM", 0, 0, function (a) {
    return this.localeData().monthsShort(this, a);
  }), H("MMMM", 0, 0, function (a) {
    return this.localeData().months(this, a);
  }), z("month", "M"), N("M", Wc), N("MM", Wc, Sc), N("MMM", cd), N("MMMM", cd), Q(["M", "MM"], function (a, b) {
    b[gd] = q(a) - 1;
  }), Q(["MMM", "MMMM"], function (a, b, c, d) {
    var e = c._locale.monthsParse(a, d, c._strict);null != e ? b[gd] = e : j(c).invalidMonth = a;
  });var md = "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
      nd = "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
      od = {};a.suppressDeprecationWarnings = !1;var pd = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,
      qd = [["YYYYYY-MM-DD", /[+-]\d{6}-\d{2}-\d{2}/], ["YYYY-MM-DD", /\d{4}-\d{2}-\d{2}/], ["GGGG-[W]WW-E", /\d{4}-W\d{2}-\d/], ["GGGG-[W]WW", /\d{4}-W\d{2}/], ["YYYY-DDD", /\d{4}-\d{3}/]],
      rd = [["HH:mm:ss.SSSS", /(T| )\d\d:\d\d:\d\d\.\d+/], ["HH:mm:ss", /(T| )\d\d:\d\d:\d\d/], ["HH:mm", /(T| )\d\d:\d\d/], ["HH", /(T| )\d\d/]],
      sd = /^\/?Date\((\-?\d+)/i;a.createFromInputFallback = aa("moment construction falls back to js Date. This is discouraged and will be removed in upcoming major release. Please refer to https://github.com/moment/moment/issues/1407 for more info.", function (a) {
    a._d = new Date(a._i + (a._useUTC ? " UTC" : ""));
  }), H(0, ["YY", 2], 0, function () {
    return this.year() % 100;
  }), H(0, ["YYYY", 4], 0, "year"), H(0, ["YYYYY", 5], 0, "year"), H(0, ["YYYYYY", 6, !0], 0, "year"), z("year", "y"), N("Y", _c), N("YY", Wc, Sc), N("YYYY", Yc, Uc), N("YYYYY", Zc, Vc), N("YYYYYY", Zc, Vc), Q(["YYYYY", "YYYYYY"], fd), Q("YYYY", function (b, c) {
    c[fd] = 2 === b.length ? a.parseTwoDigitYear(b) : q(b);
  }), Q("YY", function (b, c) {
    c[fd] = a.parseTwoDigitYear(b);
  }), a.parseTwoDigitYear = function (a) {
    return q(a) + (q(a) > 68 ? 1900 : 2e3);
  };var td = C("FullYear", !1);H("w", ["ww", 2], "wo", "week"), H("W", ["WW", 2], "Wo", "isoWeek"), z("week", "w"), z("isoWeek", "W"), N("w", Wc), N("ww", Wc, Sc), N("W", Wc), N("WW", Wc, Sc), R(["w", "ww", "W", "WW"], function (a, b, c, d) {
    b[d.substr(0, 1)] = q(a);
  });var ud = { dow: 0, doy: 6 };H("DDD", ["DDDD", 3], "DDDo", "dayOfYear"), z("dayOfYear", "DDD"), N("DDD", Xc), N("DDDD", Tc), Q(["DDD", "DDDD"], function (a, b, c) {
    c._dayOfYear = q(a);
  }), a.ISO_8601 = function () {};var vd = aa("moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548", function () {
    var a = Da.apply(null, arguments);return this > a ? this : a;
  }),
      wd = aa("moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548", function () {
    var a = Da.apply(null, arguments);return a > this ? this : a;
  });Ja("Z", ":"), Ja("ZZ", ""), N("Z", ad), N("ZZ", ad), Q(["Z", "ZZ"], function (a, b, c) {
    c._useUTC = !0, c._tzm = Ka(a);
  });var xd = /([\+\-]|\d\d)/gi;a.updateOffset = function () {};var yd = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,
      zd = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/;Ya.fn = Ha.prototype;var Ad = ab(1, "add"),
      Bd = ab(-1, "subtract");a.defaultFormat = "YYYY-MM-DDTHH:mm:ssZ";var Cd = aa("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.", function (a) {
    return void 0 === a ? this.localeData() : this.locale(a);
  });H(0, ["gg", 2], 0, function () {
    return this.weekYear() % 100;
  }), H(0, ["GG", 2], 0, function () {
    return this.isoWeekYear() % 100;
  }), Db("gggg", "weekYear"), Db("ggggg", "weekYear"), Db("GGGG", "isoWeekYear"), Db("GGGGG", "isoWeekYear"), z("weekYear", "gg"), z("isoWeekYear", "GG"), N("G", _c), N("g", _c), N("GG", Wc, Sc), N("gg", Wc, Sc), N("GGGG", Yc, Uc), N("gggg", Yc, Uc), N("GGGGG", Zc, Vc), N("ggggg", Zc, Vc), R(["gggg", "ggggg", "GGGG", "GGGGG"], function (a, b, c, d) {
    b[d.substr(0, 2)] = q(a);
  }), R(["gg", "GG"], function (b, c, d, e) {
    c[e] = a.parseTwoDigitYear(b);
  }), H("Q", 0, 0, "quarter"), z("quarter", "Q"), N("Q", Rc), Q("Q", function (a, b) {
    b[gd] = 3 * (q(a) - 1);
  }), H("D", ["DD", 2], "Do", "date"), z("date", "D"), N("D", Wc), N("DD", Wc, Sc), N("Do", function (a, b) {
    return a ? b._ordinalParse : b._ordinalParseLenient;
  }), Q(["D", "DD"], hd), Q("Do", function (a, b) {
    b[hd] = q(a.match(Wc)[0], 10);
  });var Dd = C("Date", !0);H("d", 0, "do", "day"), H("dd", 0, 0, function (a) {
    return this.localeData().weekdaysMin(this, a);
  }), H("ddd", 0, 0, function (a) {
    return this.localeData().weekdaysShort(this, a);
  }), H("dddd", 0, 0, function (a) {
    return this.localeData().weekdays(this, a);
  }), H("e", 0, 0, "weekday"), H("E", 0, 0, "isoWeekday"), z("day", "d"), z("weekday", "e"), z("isoWeekday", "E"), N("d", Wc), N("e", Wc), N("E", Wc), N("dd", cd), N("ddd", cd), N("dddd", cd), R(["dd", "ddd", "dddd"], function (a, b, c) {
    var d = c._locale.weekdaysParse(a);null != d ? b.d = d : j(c).invalidWeekday = a;
  }), R(["d", "e", "E"], function (a, b, c, d) {
    b[d] = q(a);
  });var Ed = "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
      Fd = "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
      Gd = "Su_Mo_Tu_We_Th_Fr_Sa".split("_");H("H", ["HH", 2], 0, "hour"), H("h", ["hh", 2], 0, function () {
    return this.hours() % 12 || 12;
  }), Sb("a", !0), Sb("A", !1), z("hour", "h"), N("a", Tb), N("A", Tb), N("H", Wc), N("h", Wc), N("HH", Wc, Sc), N("hh", Wc, Sc), Q(["H", "HH"], id), Q(["a", "A"], function (a, b, c) {
    c._isPm = c._locale.isPM(a), c._meridiem = a;
  }), Q(["h", "hh"], function (a, b, c) {
    b[id] = q(a), j(c).bigHour = !0;
  });var Hd = /[ap]\.?m?\.?/i,
      Id = C("Hours", !0);H("m", ["mm", 2], 0, "minute"), z("minute", "m"), N("m", Wc), N("mm", Wc, Sc), Q(["m", "mm"], jd);var Jd = C("Minutes", !1);H("s", ["ss", 2], 0, "second"), z("second", "s"), N("s", Wc), N("ss", Wc, Sc), Q(["s", "ss"], kd);var Kd = C("Seconds", !1);H("S", 0, 0, function () {
    return ~~(this.millisecond() / 100);
  }), H(0, ["SS", 2], 0, function () {
    return ~~(this.millisecond() / 10);
  }), H(0, ["SSS", 3], 0, "millisecond"), H(0, ["SSSS", 4], 0, function () {
    return 10 * this.millisecond();
  }), H(0, ["SSSSS", 5], 0, function () {
    return 100 * this.millisecond();
  }), H(0, ["SSSSSS", 6], 0, function () {
    return 1e3 * this.millisecond();
  }), H(0, ["SSSSSSS", 7], 0, function () {
    return 1e4 * this.millisecond();
  }), H(0, ["SSSSSSSS", 8], 0, function () {
    return 1e5 * this.millisecond();
  }), H(0, ["SSSSSSSSS", 9], 0, function () {
    return 1e6 * this.millisecond();
  }), z("millisecond", "ms"), N("S", Xc, Rc), N("SS", Xc, Sc), N("SSS", Xc, Tc);var Ld;for (Ld = "SSSS"; Ld.length <= 9; Ld += "S") {
    N(Ld, $c);
  }for (Ld = "S"; Ld.length <= 9; Ld += "S") {
    Q(Ld, Wb);
  }var Md = C("Milliseconds", !1);H("z", 0, 0, "zoneAbbr"), H("zz", 0, 0, "zoneName");var Nd = n.prototype;Nd.add = Ad, Nd.calendar = cb, Nd.clone = db, Nd.diff = ib, Nd.endOf = ub, Nd.format = mb, Nd.from = nb, Nd.fromNow = ob, Nd.to = pb, Nd.toNow = qb, Nd.get = F, Nd.invalidAt = Cb, Nd.isAfter = eb, Nd.isBefore = fb, Nd.isBetween = gb, Nd.isSame = hb, Nd.isValid = Ab, Nd.lang = Cd, Nd.locale = rb, Nd.localeData = sb, Nd.max = wd, Nd.min = vd, Nd.parsingFlags = Bb, Nd.set = F, Nd.startOf = tb, Nd.subtract = Bd, Nd.toArray = yb, Nd.toObject = zb, Nd.toDate = xb, Nd.toISOString = lb, Nd.toJSON = lb, Nd.toString = kb, Nd.unix = wb, Nd.valueOf = vb, Nd.year = td, Nd.isLeapYear = ia, Nd.weekYear = Fb, Nd.isoWeekYear = Gb, Nd.quarter = Nd.quarters = Jb, Nd.month = Y, Nd.daysInMonth = Z, Nd.week = Nd.weeks = na, Nd.isoWeek = Nd.isoWeeks = oa, Nd.weeksInYear = Ib, Nd.isoWeeksInYear = Hb, Nd.date = Dd, Nd.day = Nd.days = Pb, Nd.weekday = Qb, Nd.isoWeekday = Rb, Nd.dayOfYear = qa, Nd.hour = Nd.hours = Id, Nd.minute = Nd.minutes = Jd, Nd.second = Nd.seconds = Kd, Nd.millisecond = Nd.milliseconds = Md, Nd.utcOffset = Na, Nd.utc = Pa, Nd.local = Qa, Nd.parseZone = Ra, Nd.hasAlignedHourOffset = Sa, Nd.isDST = Ta, Nd.isDSTShifted = Ua, Nd.isLocal = Va, Nd.isUtcOffset = Wa, Nd.isUtc = Xa, Nd.isUTC = Xa, Nd.zoneAbbr = Xb, Nd.zoneName = Yb, Nd.dates = aa("dates accessor is deprecated. Use date instead.", Dd), Nd.months = aa("months accessor is deprecated. Use month instead", Y), Nd.years = aa("years accessor is deprecated. Use year instead", td), Nd.zone = aa("moment().zone is deprecated, use moment().utcOffset instead. https://github.com/moment/moment/issues/1779", Oa);var Od = Nd,
      Pd = { sameDay: "[Today at] LT", nextDay: "[Tomorrow at] LT", nextWeek: "dddd [at] LT", lastDay: "[Yesterday at] LT", lastWeek: "[Last] dddd [at] LT", sameElse: "L" },
      Qd = { LTS: "h:mm:ss A", LT: "h:mm A", L: "MM/DD/YYYY", LL: "MMMM D, YYYY", LLL: "MMMM D, YYYY h:mm A", LLLL: "dddd, MMMM D, YYYY h:mm A" },
      Rd = "Invalid date",
      Sd = "%d",
      Td = /\d{1,2}/,
      Ud = { future: "in %s", past: "%s ago", s: "a few seconds", m: "a minute", mm: "%d minutes", h: "an hour", hh: "%d hours", d: "a day", dd: "%d days", M: "a month", MM: "%d months", y: "a year", yy: "%d years" },
      Vd = s.prototype;Vd._calendar = Pd, Vd.calendar = _b, Vd._longDateFormat = Qd, Vd.longDateFormat = ac, Vd._invalidDate = Rd, Vd.invalidDate = bc, Vd._ordinal = Sd, Vd.ordinal = cc, Vd._ordinalParse = Td, Vd.preparse = dc, Vd.postformat = dc, Vd._relativeTime = Ud, Vd.relativeTime = ec, Vd.pastFuture = fc, Vd.set = gc, Vd.months = U, Vd._months = md, Vd.monthsShort = V, Vd._monthsShort = nd, Vd.monthsParse = W, Vd.week = ka, Vd._week = ud, Vd.firstDayOfYear = ma, Vd.firstDayOfWeek = la, Vd.weekdays = Lb, Vd._weekdays = Ed, Vd.weekdaysMin = Nb, Vd._weekdaysMin = Gd, Vd.weekdaysShort = Mb, Vd._weekdaysShort = Fd, Vd.weekdaysParse = Ob, Vd.isPM = Ub, Vd._meridiemParse = Hd, Vd.meridiem = Vb, w("en", { ordinalParse: /\d{1,2}(th|st|nd|rd)/, ordinal: function ordinal(a) {
      var b = a % 10,
          c = 1 === q(a % 100 / 10) ? "th" : 1 === b ? "st" : 2 === b ? "nd" : 3 === b ? "rd" : "th";return a + c;
    } }), a.lang = aa("moment.lang is deprecated. Use moment.locale instead.", w), a.langData = aa("moment.langData is deprecated. Use moment.localeData instead.", y);var Wd = Math.abs,
      Xd = yc("ms"),
      Yd = yc("s"),
      Zd = yc("m"),
      $d = yc("h"),
      _d = yc("d"),
      ae = yc("w"),
      be = yc("M"),
      ce = yc("y"),
      de = Ac("milliseconds"),
      ee = Ac("seconds"),
      fe = Ac("minutes"),
      ge = Ac("hours"),
      he = Ac("days"),
      ie = Ac("months"),
      je = Ac("years"),
      ke = Math.round,
      le = { s: 45, m: 45, h: 22, d: 26, M: 11 },
      me = Math.abs,
      ne = Ha.prototype;ne.abs = oc, ne.add = qc, ne.subtract = rc, ne.as = wc, ne.asMilliseconds = Xd, ne.asSeconds = Yd, ne.asMinutes = Zd, ne.asHours = $d, ne.asDays = _d, ne.asWeeks = ae, ne.asMonths = be, ne.asYears = ce, ne.valueOf = xc, ne._bubble = tc, ne.get = zc, ne.milliseconds = de, ne.seconds = ee, ne.minutes = fe, ne.hours = ge, ne.days = he, ne.weeks = Bc, ne.months = ie, ne.years = je, ne.humanize = Fc, ne.toISOString = Gc, ne.toString = Gc, ne.toJSON = Gc, ne.locale = rb, ne.localeData = sb, ne.toIsoString = aa("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)", Gc), ne.lang = Cd, H("X", 0, 0, "unix"), H("x", 0, 0, "valueOf"), N("x", _c), N("X", bd), Q("X", function (a, b, c) {
    c._d = new Date(1e3 * parseFloat(a, 10));
  }), Q("x", function (a, b, c) {
    c._d = new Date(q(a));
  }), a.version = "2.10.6", b(Da), a.fn = Od, a.min = Fa, a.max = Ga, a.utc = h, a.unix = Zb, a.months = jc, a.isDate = d, a.locale = w, a.invalid = l, a.duration = Ya, a.isMoment = o, a.weekdays = lc, a.parseZone = $b, a.localeData = y, a.isDuration = Ia, a.monthsShort = kc, a.weekdaysMin = nc, a.defineLocale = x, a.weekdaysShort = mc, a.normalizeUnits = A, a.relativeTimeThreshold = Ec;var oe = a;return oe;
});
/* <<< file end: js/node_modules/moment/min/moment.min.js */

//# map link was there [moment.min.js.map]
/* >>> file start: js/facebookMigration/migration.js */
//= require js/core/angular/api.js
//= require js/node_modules/moment/min/moment.min.js

Site.page.template['Widgets/facebook_migration.tmpl'] = '<div\n    class=\"modal-wrapper\"\n    ng-if=\"!migration.hidden\"\n    >\n    <div\n        class=\"\n            modal\n            fbmerge\n            fbmerge--step{{migration.step}}\n            fbmerge--hide-sharing\n        \"\n        ng-class=\"{\n            \'fbmerge--need-action\': migration.step >= 2 && migration.step <= 4,\n            \'fbmerge--loading\': migration.loading,\n            }\"\n        >\n\n        <!-- header -->\n        <header class=\"fbmerge__descr\">\n            <!-- steps: 1 -->\n            <div class=\"fbmerge__elem\n                        fbmerge__elem--step1\">\n                <h1 class=\"fbmerge__title\" lj-ml=\"fbmerging.step1.description.title\"></h1>\n\n                <div class=\"fbmerge__choice-buttons\">\n                    <button\n                        type=\"button\"\n                        class=\"\n                            fbmerge__flatbutton\n                            fbmerge__flatbutton--inverse\n                            fbmerge__choice-button\n                            fbmerge__choice-button--import\n                            flatbutton\n                            flatbutton--small\n                            \"\n                        ng-click=\"migration.importStep()\"\n                        lj-ml=\"fbmerging.step1.description.agreement\"\n                        ></button>\n                    <button\n                        type=\"button\"\n                        class=\"\n                            fbmerge__choice-button\n                            fbmerge__choice-button--no-border\n                            \"\n                        ng-click=\"migration.hide()\"\n                        lj-ml=\"fbmerging.step1.description.refusing\"\n                        ></button>\n                </div>\n            </div>\n\n            <!-- steps: 2 -->\n            <div class=\"fbmerge__elem\n                        fbmerge__elem--step2\">\n                <h1 class=\"fbmerge__title\" lj-ml=\"fbmerging.step2.description.title\"></h1>\n            </div>\n\n            <!-- steps: 3 -->\n            <div class=\"fbmerge__elem\n                        fbmerge__elem--step3\">\n                <h1\n                    class=\"fbmerge__title\"\n                    lj-ml=\"fbmerging.step3.description.title\"\n                    ng-if=\"migration.addr\"></h1>\n                <h1\n                    class=\"fbmerge__title\"\n                    lj-ml=\"fbmerging.step3.description.title2\"\n                    ng-if=\"!migration.addr\"></h1>\n            </div>\n\n            <!-- steps: 4 -->\n            <div class=\"fbmerge__elem\n                        fbmerge__elem--step4\">\n                <h1 class=\"fbmerge__title\" lj-ml=\"fbmerging.step4.description.title\"></h1>\n            </div>\n\n            <!-- steps: 5 -->\n            <div class=\"fbmerge__elem\n                        fbmerge__elem--step5\">\n                <h1\n                    class=\"fbmerge__title\"\n                    lj-ml=\"fbmerging.step5.description.title\"\n                    ></h1>\n                <p\n                    class=\"fbmerge__text fbmerge__text--step5\"\n                    lj-ml=\"fbmerging.step5.description.text\"\n                    ></p>\n                <p\n                    class=\"fbmerge__text fbmerge__text--step5\"\n                    ng-if=\"migration.needEmailConfirm\"\n                    >\n                    Confirm your email <a href=\"/register.bml\" target=\"_blank\">here</a>\n                    </p>\n\n            </div>\n            \n            <!-- steps: 6 -->\n            <div class=\"fbmerge__elem\n                        fbmerge__elem--step6\">\n                <h1 class=\"fbmerge__title\" lj-ml=\"fbmerging.step6.description.title\"></h1>\n            </div>\n            \n            <!-- steps: 7 -->\n            <div class=\"fbmerge__elem\n                        fbmerge__elem--step7\">\n                <h1 class=\"fbmerge__title\" lj-ml=\"fbmerging.step7.description.title\"></h1>\n                <form\n                    class=\"fbmerge__choice-buttons\"\n                    action=\"{{migration.sendMailAction}}\"\n                    method=\"post\"\n                    >\n                    <button\n                        class=\"\n                            fbmerge__flatbutton\n                            fbmerge__flatbutton--inverse\n                            fbmerge__choice-button\n                            fbmerge__choice-button--sendmail\n                            flatbutton \n                            flatbutton--small\n                            \"\n                        name=\"action:send\"\n                        value=\"1\"\n                        type=\"submit\"\n                        lj-ml=\"fbmerging.step7.description.sendmail\"\n                        ></button>\n                    <input type=\"hidden\" name=\"authas\" value=\"{{migration.authAs}}\">\n                    <a\n                        class=\"\n                            fbmerge__choice-button\n                            fbmerge__choice-button--no-border\n                            \"\n                        ng-href=\"{{migration.siteRoot}}/manage/settings/?cat=account\"\n                        lj-ml=\"fbmerging.step7.description.options\"\n                        ></a>\n                </form>\n            </div>\n        </header>\n        <!-- /header -->\n\n        <!-- sharing -->\n        <ul class=\"fbmerge__sharing\">\n            <li class=\"fbmerge__sharing-item\">\n                <span class=\"fbmerge__sharing-text\" lj-ml=\"fbmerging.sharing.title\"></span>\n            </li>\n            <li class=\"fbmerge__sharing-item\">\n                <a href=\"#\" class=\"fbmerge__sharing-link\" ng-click=\"migration.share(\'livejournal\')\">\n                    <svg class=\"fbmerge__sharing-img\" width=\"21px\" height=\"21px\" viewBox=\"0 0 21 21\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <path d=\"M12.79894,15.85731 C13.36944,14.53641 14.42504,13.47381 15.74244,12.89701 L16.51314,16.62521 L12.79894,15.85731 Z M11.10284,1.43661 C9.72244,1.43661 8.41064,1.72501 7.21994,2.23881 L5.07164,0.09331 L5.06674,0.09331 C2.79874,1.08661 0.98084,2.91361 0.00014,5.19001 L2.15124,7.33831 C3.13124,5.06191 4.94844,3.23631 7.21784,2.24231 L7.22134,2.24301 L15.17404,10.18451 L15.17264,10.18451 C12.90534,11.17781 11.08604,13.00551 10.10604,15.28051 L2.15054,7.34041 L2.15054,7.34111 C1.63114,8.53461 1.32174,9.83381 1.32174,11.21841 C1.32174,16.62171 5.70024,21.00021 11.10284,21.00021 C16.50334,21.00021 20.88324,16.62031 20.88324,11.21841 C20.88324,5.81651 16.50404,1.43661 11.10284,1.43661 L11.10284,1.43661 Z\" fill=\"#FFFFFF\"></path>\n                    </svg>\n                </a>\n            </li>\n            <li class=\"fbmerge__sharing-item\">\n                <a href=\"#\" class=\"fbmerge__sharing-link\" ng-click=\"migration.share(\'facebook\')\">\n                    <svg class=\"fbmerge__sharing-img\" width=\"11px\" height=\"21px\" viewBox=\"0 0 11 21\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <path d=\"M13.3242729,19.6465026 L13.3242729,16.0030329 L16.4703384,16.0030329 L16.4703384,13.3161097 C16.4703384,10.1979039 18.3747478,8.5 21.1563758,8.5 C22.4887569,8.5 23.6339895,8.59922756 23.9677631,8.64354981 L23.9677631,11.90223 L22.038479,11.9031345 C20.5257336,11.9031345 20.2327545,12.621969 20.2327545,13.6768385 L20.2327545,16.0030329 L23.8406759,16.0030329 L23.3708601,19.6465026 L20.2327545,19.6465026 L20.2327545,28.5930839 L16.4703384,28.5930839 L16.4703384,19.6465026 L13.3242729,19.6465026 Z\" fill=\"#FFFFFF\" transform=\"translate(-13.000000, -8.000000)\"></path>\n                    </svg>\n                </a>\n            </li>\n            <li class=\"fbmerge__sharing-item\">\n                <a href=\"#\" class=\"fbmerge__sharing-link\" ng-click=\"migration.share(\'twitter\')\">\n                    <svg class=\"fbmerge__sharing-img\" width=\"18px\" height=\"14px\" viewBox=\"0 0 18 14\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                        <path d=\"M17.9599007,1.70276413 C17.2990905,1.98282691 16.5890102,2.1721722 15.8435869,2.25723946 C16.6043825,1.82148161 17.1886599,1.13133812 17.4637182,0.309104933 C16.7517985,0.712656502 15.9632803,1.00565202 15.1239153,1.16360717 C14.4518058,0.479239462 13.4941927,0.0515802691 12.4344263,0.0515802691 C10.3993752,0.0515802691 8.74961606,1.62824395 8.74961606,3.5728 C8.74961606,3.84884484 8.7822,4.11754439 8.84500292,4.3752574 C5.78270365,4.22841435 3.06765985,2.82653094 1.25031679,0.696145291 C0.933148905,1.21621704 0.751440876,1.82110493 0.751440876,2.46642332 C0.751440876,3.68806457 1.40193723,4.76587623 2.39062336,5.39738296 C1.78663796,5.3791139 1.21845547,5.2206565 0.721681752,4.95691659 C0.721418978,4.97160717 0.721353285,4.98636054 0.721353285,5.00117668 C0.721353285,6.70729327 1.99147007,8.13052197 3.67709781,8.4540287 C3.36787883,8.53445022 3.04236788,8.57745471 2.70634599,8.57745471 C2.46886423,8.57745471 2.23808321,8.55541883 2.01308321,8.51429776 C2.48200292,9.91329327 3.84277664,10.9313381 5.4551562,10.9598404 C4.19403942,11.9042439 2.60530949,12.4671318 0.878951825,12.4671318 C0.581557664,12.4671318 0.288236496,12.4504951 -2.6277372e-05,12.4179749 C1.63068175,13.4170601 3.56745547,13.9999749 5.64829489,13.9999749 C12.4258204,13.9999749 16.131981,8.63439641 16.131981,3.98112287 C16.131981,3.82844126 16.1283679,3.67657578 16.1213387,3.52558924 C16.8412073,3.02912287 17.4658861,2.40891659 17.9599007,1.70276413\"  fill=\"#FFFFFF\"></path>\n                    </svg>\n                </a>\n            </li>\n            <li>\n                <input\n                    type=\"hidden\"\n                    name=\"returnto\"\n                    value=\"{{migration.returnTo}}\"\n                    >\n            </li>\n        </ul>\n        <!-- /sharing -->\n\n        <!-- statuses -->\n        <div class=\"fbmerge__statuses\">\n            <div class=\"fbmerge__status fbmerge__status--fb\">\n                <svg \n                    class=\"fbmerge__status-img fbmerge__status-img--fb\" \n                    width=\"41px\" height=\"77px\" \n                    viewBox=\"0 0 41 77\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                    <path d=\"M501.307329,250.375956 L501.307329,236.589854 L513.189472,236.589854 L513.189472,226.423118 C513.189472,214.624501 520.382096,208.2 530.887822,208.2 C535.919994,208.2 540.245339,208.575456 541.505944,208.743161 L541.505944,221.073303 L534.219373,221.076725 C528.505996,221.076725 527.399465,223.79664 527.399465,227.788038 L527.399465,236.589854 L541.025958,236.589854 L539.251545,250.375956 L527.399465,250.375956 L527.399465,284.227885 L513.189472,284.227885 L513.189472,250.375956 L501.307329,250.375956 Z\" fill=\"#ffffff\" transform=\"translate(-501.000000, -208.000000)\"></path>\n                </svg>\n            </div>\n            <div class=\"fbmerge__status fbmerge__status--lj\">\n                <svg \n                    class=\"fbmerge__status-img fbmerge__status-img--lj\" \n                    width=\"82px\" height=\"84px\" \n                    viewBox=\"0 0 82 84\" version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n                    <ellipse fill=\"#00B2ED\" cx=\"40.8747045\" cy=\"41.65\" rx=\"36.6824271\" ry=\"36.75\"></ellipse>\n                    <path d=\"M47.640062,58.94042 L61.6681208,61.84612 L58.7572829,47.73902 C53.7817484,49.92162 49.7948926,53.94242 47.640062,58.94042\" fill=\"#981658\"></path>\n                    <path d=\"M47.640062,58.94042 C49.7948926,53.94242 53.7817484,49.92162 58.7572829,47.73902 L61.6681208,61.84612 L47.640062,58.94042 Z\" fill=\"#00344B\"></path>\n                    <path d=\"M27.2679695,8.1179 L19.1545154,0 L19.1356501,0 C10.5701287,3.7583 3.70387707,10.6715 0,19.2843 L8.12463357,27.4134 C11.8257158,18.7999 18.6891726,11.8923 27.2602837,8.1312 L27.2735592,8.134 L27.2679695,8.1179 Z\" fill=\"#00B2ED\"></path>\n                    <path d=\"M7.68584187,26.9927 L7.68584187,26.9899 L37.7325926,57.0339 C41.4336748,48.4253 48.3048174,41.51 56.8682427,37.7517 L56.8731337,37.7517 L26.8375624,7.7028 L26.8242868,7.7 C18.2531757,11.4611 11.3897189,18.3687 7.68863672,26.9822 L7.68584187,26.9927 Z\" fill=\"#00344B\"></path>\n                    <path d=\"M58.9700287,47.5838092 C57.8019856,42.0097299 56.7485289,36.9790123 56.7485289,36.9790123 L56.7374399,36.9827087 C47.8810114,40.8675611 40.7729513,48.0014956 36.9398476,56.8985838 L47.4670214,59.1496543 C49.6996103,54.0043503 53.8358137,49.8311834 58.9700287,47.5838092\" fill=\"#FFFFFF\"></path>\n                </svg>\n            </div>\n        </div>\n        <!-- /statuses -->\n\n        <!-- steps: 2 -->\n        <form\n            class=\"fbmerge__container\n                fbmerge__elem\n                fbmerge__elem--step2\"\n            action=\"{{migration.loginLink}}\"\n            method=\"post\"\n            >\n            <ul class=\"fbmerge__inputs-list\">\n                <li class=\"fbmerge__inputs-item\">\n                    <label\n                        class=\"fbmerge__text-label\"\n                        for=\"fbmerge__login-username\"\n                        lj-ml=\"fbmerging.step2.form.login\"></label>\n                    <div class=\"fbmerge__input-wrapper\">\n                        <input\n                            class=\"fbmerge__text-input\"\n                            id=\"fbmerge__login-username\"\n                            name=\"user\"\n                            type=\"text\"\n                            ng-model=\"migration.step2.login\"\n                            >\n                        <span\n                            class=\"fbmerge__input-tooltip\"\n                            lj_ml=\"createaccount.error.username.inuse\"\n                            ></span>\n                    </div>\n                </li>\n                <li class=\"fbmerge__inputs-item\">\n                    <label\n                        class=\"fbmerge__text-label\"\n                        for=\"fbmerge__login-pass\"\n                        lj-ml=\"fbmerging.step2.form.password\"></label>\n                    <div class=\"fbmerge__input-wrapper\">\n                        <input\n                            class=\"fbmerge__text-input\"\n                            id=\"fbmerge__login-pass\"\n                            name=\"password\"\n                            type=\"password\"\n                            ng-model=\"migration.step2.password\"\n                            >\n                        <span\n                            class=\"fbmerge__input-tooltip\"\n                            lj_ml=\"createaccount.error.password.digits_only\"\n                            ></span>\n                    </div>\n                </li>\n            </ul>\n            \n            <div class=\"fbmerge__flatbutton-wrapper\">\n                <button\n                    class=\"\n                        fbmerge__flatbutton\n                        flatbutton\n                        flatbutton--small\n                        \"\n                    ng-class=\"{\'flatbutton--active\': migration.step2.login && migration.step2.password}\"\n                    lj-ml=\"fbmerging.step2.form.entry\"\n                    ng-disabled=\"!migration.step2.login && !migration.step2.password\"\n                    ></button>\n            </div>\n\n            <small\n                class=\"fbmerge__notice fbmerge__notice--step2\"\n                lj-ml=\"fbmerging.step2.form.notice\"\n                ></small>\n\n            <a\n                class=\"\n                    fbmerge__flatbutton\n                    fbmerge__flatbutton--fb\n                    flatbutton\n                    flatbutton--small\n                    \"\n                ng-attr-title=\"{{migration.fbLoginTitle}}\"\n                ng-href=\"{{migration.facebookLink}}\"\n                >\n                <span\n                    class=\"\n                        fbmerge__flatbutton-icon\n                        fbmerge__flatbutton-icon--fb\n                        \"\n                    lj-svg-icon=\"flaticon--facebook\"></span>\n                <span\n                    class=\"\n                        fbmerge__flatbutton-text\n                        fbmerge__flatbutton-text--fb\">\n                    Facebook\n                </span>\n                </a>\n        </form>\n        <!-- /steps: 2 -->\n\n        <!-- steps: 3 -->\n        <div class=\"fbmerge__container\n                    fbmerge__elem\n                    fbmerge__elem--step3\">\n\n            <div ng-if=\"migration.addr\">\n                <p\n                    class=\"fbmerge__text fbmerge__text--step3\"\n                    lj-ml=\"fbmerging.step3.form.text\"\n                    ></p>\n                <a\n                    class=\"\n                        fbmerge__flatbutton\n                        flatbutton\n                        flatbutton--small\n                        \"\n                    ng-href=\"{{migration.addr}}\"\n                    lj-ml=\"fbmerging.step3.form.allow\"\n                    ></a>\n            </div>\n            <div ng-if=\"!migration.addr\">\n                <ul class=\"fbmerge__inputs-list\">\n                    <li class=\"fbmerge__inputs-item\">\n                        <label\n                            class=\"fbmerge__text-label\"\n                            for=\"fbmerge__create-username\"\n                            lj-ml=\"fbmerging.step2.form.login\"\n                            ></label>\n                        <div class=\"fbmerge__input-wrapper\">\n                            <input\n                                class=\"fbmerge__text-input\"\n                                id=\"fbmerge__create-username\"\n                                name=\"user\"\n                                type=\"text\"\n                                ng-model=\"migration.username\"\n                                ng-class=\"{\'fbmerge__text-input--error\': migration.step3Errors.username.unchecked}\"\n                                >\n                            <span\n                                class=\"fbmerge__input-tooltip\"\n                                ng-style=\"{\'display\': migration.step3Errors.username.text ? \'block\' : \'none\'}\"\n                                ng-bind-html=\"migration.step3Errors.username.text\"\n                                ></span>\n                        </div>\n                        <small\n                            class=\"fbmerge__notice fbmerge__notice--step3\"\n                            lj-ml=\"createaccount.tip.username\"\n                            ></small>\n                    </li>\n                    <li class=\"fbmerge__inputs-item\">\n                        <label\n                            class=\"fbmerge__text-label\"\n                            for=\"fbmerge__create-email\"\n                            lj-ml=\"fbmerging.step3.form.mail\"\n                            ></label>\n                        <div class=\"fbmerge__input-wrapper\">\n                            <input\n                                class=\"fbmerge__text-input\"\n                                id=\"fbmerge__create-email\"\n                                name=\"email\"\n                                type=\"text\"\n                                ng-model=\"migration.email\"\n                                ng-class=\"{\'fbmerge__text-input--error\': migration.step3Errors.email.unchecked}\"\n                                >\n                            <span\n                                class=\"fbmerge__input-tooltip\"\n                                ng-style=\"{\'display\': migration.step3Errors.email.text ? \'block\' : \'none\'}\"\n                                ng-bind-html=\"migration.step3Errors.email.text\"\n                                ></span>\n                            <small\n                                class=\"fbmerge__notice fbmerge__notice--step3\"\n                                lj-ml=\"createaccount.tip.email\"\n                                ></small>\n                        </div>\n                    </li>\n                    <li class=\"fbmerge__inputs-item\">\n                        <label\n                            class=\"fbmerge__text-label\"\n                            for=\"fbmerge__create-pass\"\n                            lj-ml=\"fbmerging.step2.form.password\"\n                            ></label>\n                        <div class=\"fbmerge__input-wrapper\">\n                            <input\n                                class=\"fbmerge__text-input\"\n                                id=\"fbmerge__create-pass\"\n                                name=\"password\"\n                                type=\"password\"\n                                ng-model=\"migration.password\"\n                                ng-class=\"{\'fbmerge__text-input--error\': migration.step3Errors.password.unchecked}\"\n                                >\n                            <span\n                                class=\"fbmerge__input-tooltip\"\n                                ng-style=\"{\'display\': migration.step3Errors.password.text ? \'block\' : \'none\'}\"\n                                ng-bind-html=\"migration.step3Errors.password.text\"\n                                ></span>\n                        </div>\n                        <small\n                            class=\"fbmerge__notice fbmerge__notice--step3\"\n                            lj-ml=\"fbmerging.step3.form.user_password\"\n                            ></small>\n                    </li>\n                </ul>\n\n                <input\n                    name=\"gender\"\n                    type=\"hidden\"\n                    ng-model=\"migration.gender\"\n                    >\n\n                <div class=\"fbmerge__flatbutton-wrapper\">\n                    <a\n                    href=\"/identity/convert.bml\"\n                    target=\"_blank\"\n                    class=\"\n                        fbmerge__flatbutton\n                        flatbutton\n                        flatbutton--small\n                        \"\n                    ng-class=\"{\'flatbutton--active\': migration.convertationEnabled()}\"\n                    ng-click=\"migration.convertIdentity($event)\"\n                    lj-ml=\"fbmerging.step3.form.convert_but\"\n                    ng-disabled=\"!migration.convertationEnabled()\"\n                    ></a>\n                </div>\n                <small\n                    class=\"fbmerge__notice fbmerge__notice--step3\"\n                    lj-ml=\"fbmerging.step2.form.notice\"\n                    ></small>\n            </div>\n        </div>\n        <!-- /steps: 3 -->\n\n        <!-- steps: 4 -->\n        <form class=\"fbmerge__container\n                    fbmerge__elem\n                    fbmerge__elem--step4\">\n            <h3\n                class=\"fbmerge__subtitle\"\n                lj-ml=\"fbmerging.step4.form.title\"></h3>\n            <ul class=\"fbmerge__options\">\n                <li class=\"fbmerge__option\">\n                    <label class=\"fbmerge__option-label\">\n                        <input\n                            class=\"fbmerge__option-input\"\n                            type=\"radio\"\n                            name=\"period\"\n                            ng-model=\"migration.period\"\n                            ng-value=\"migration.week\"\n                            >\n                        <span\n                            class=\"fbmerge__option-text\"\n                            lj-ml=\"fbmerging.step4.form.week\"></span>\n                    </label>\n                </li>\n                <li class=\"fbmerge__option\">\n                    <label class=\"fbmerge__option-label\">\n                        <input\n                            class=\"fbmerge__option-input\"\n                            type=\"radio\"\n                            name=\"period\"\n                            ng-model=\"migration.period\"\n                            ng-value=\"migration.month\"\n                            checked\n                            >\n                        <span\n                            class=\"fbmerge__option-text\"\n                            lj-ml=\"fbmerging.step4.form.mounth\"></span>\n                    </label>\n                </li>\n                <li class=\"fbmerge__option\">\n                    <label class=\"fbmerge__option-label\">\n                        <input\n                            class=\"fbmerge__option-input\"\n                            type=\"radio\"\n                            name=\"period\"\n                            ng-model=\"migration.period\"\n                            ng-value=\"migration.halfYear\"\n                            >\n                        <span\n                            class=\"fbmerge__option-text\"\n                            lj-ml=\"fbmerging.step4.form.halfyear\"></span>\n                    </label>\n                </li>\n                <li class=\"fbmerge__option\">\n                    <label class=\"fbmerge__option-label\">\n                        <input\n                            class=\"fbmerge__option-input\"\n                            type=\"radio\"\n                            name=\"period\"\n                            ng-model=\"migration.period\"\n                            ng-value=\"0\"\n                            >\n                        <span\n                            class=\"fbmerge__option-text\"\n                            lj-ml=\"fbmerging.step4.form.all\"></span>\n                    </label>\n                </li>\n                <li class=\"fbmerge__option\">\n                    <label class=\"fbmerge__option-label\">\n                        <input\n                            class=\"fbmerge__option-input\"\n                            type=\"radio\"\n                            name=\"period\"\n                            ng-model=\"migration.period\"\n                            ng-value=\"1\"\n                            >\n                        <span\n                            class=\"fbmerge__option-text\"\n                            lj-ml=\"fbmerging.step4.form.nothing\"></span>\n                    </label>\n                </li>\n                <li class=\"fbmerge__option fbmerge__option--autoimport\">\n                    <label class=\"fbmerge__option-label\">\n                        <input\n                            class=\"fbmerge__option-input\"\n                            type=\"checkbox\"\n                            ng-model=\"migration.autoImport\"\n                            >\n                        <span\n                            class=\"fbmerge__option-text\"\n                            lj-ml=\"fbmerging.step4.form.autoimport\"></span>\n                    </label>\n                </li>\n            </ul>\n            <div class=\"fbmerge__flatbutton-wrapper\">\n                <button\n                    ng-click=\"migration.setPeriod()\"\n                    class=\"\n                        fbmerge__flatbutton\n                        flatbutton\n                        flatbutton--small\n                        \"\n                    lj-ml=\"fbmerging.step4.form.save\"\n                    ></button>\n            </div>\n        </form>\n        <!-- /steps: 4 -->\n\n        <!-- close button -->\n        <span\n            ng-click=\"migration.hide()\"\n            class=\"fbmerge__close modal__close\">\n            <span\n                class=\"fbmerge__close-icon\"\n                lj-svg-icon=\"flaticon--cross\"></span>\n        </span>\n        <!-- /close button -->\n    </div>\n</div>\n\n';

LJ.injectStyle('/* >>> file start: stc/widgets/facebookmigration.css */\n/* facebook integration modals */\n\n.fbmerge {\n    width: 820px;\n    min-height: 410px;\n    text-align: left;\n    font: 400 15px/1.4 \'ProximaNova\', Helvetica, sans-serif !important;\n    letter-spacing: .01em;\n    -webkit-font-smoothing: antialiased;\n    -moz-osx-font-smoothing: grayscale;\n    }\n\n.fbmerge__elem--step1,\n    .fbmerge__elem--step2,\n    .fbmerge__elem--step3,\n    .fbmerge__elem--step4,\n    .fbmerge__elem--step5,\n    .fbmerge__elem--step6,\n    .fbmerge__elem--step7 {\n        display: none;\n        }\n\n.fbmerge__title {\n        margin: 73px 0 0 !important;\n        width: 300px;\n        font-size: 28px;\n        line-height: 31px;\n        font-weight: bold;\n        -webkit-font-feature-settings: \"kern\" off;\n                font-feature-settings: \"kern\" off;\n        font-variant: none;\n        letter-spacing: inherit;\n        word-spacing: normal;\n        color: #FFF !important;\n        }\n\n.fbmerge__descr {\n        position: absolute;\n        box-sizing: border-box;\n        top: 0;\n        left: 0;\n        padding-left: 40px;\n        width: 50%;\n        min-height: 410px;\n        transition: opacity ease 1s;\n        color: #FFF !important;\n        z-index: 2;\n        }\n\n.fbmerge__descr::before,\n        .fbmerge__descr::after {\n            content: \'\';\n            display: table;\n            clear: both;\n            }\n\n.fbmerge__container {\n        position: relative;\n        box-sizing: border-box;\n        margin: 0 0 0 auto;\n        padding: 0 50px 0 40px;\n        width: 50%;\n        color: #4c4c4c !important;\n        }\n\n.fbmerge--step2 .fbmerge__container,\n        .fbmerge--step3 .fbmerge__container,\n        .fbmerge--step4 .fbmerge__container {\n            padding-top: 40px;\n            padding-bottom: 20px;\n            }\n\n.fbmerge__text {\n        padding: 0;\n        }\n\n/* choice buttons */\n\n.fbmerge__choice-buttons {\n        min-width: 174px;\n        display: -webkit-inline-flex;\n        display: -ms-inline-flexbox;\n        display: inline-flex;\n        -webkit-flex-direction: column;\n            -ms-flex-direction: column;\n                flex-direction: column;\n        }\n\n.fbmerge__choice-button {\n            margin-bottom: 10px;\n            }\n\n.fbmerge__choice-button:last-child {\n                margin-bottom: 0;\n                }\n\n.fbmerge__choice-button:hover {\n                -webkit-transform: translateY(-2px);\n                    -ms-transform: translateY(-2px);\n                        transform: translateY(-2px);\n                }\n\n.fbmerge__choice-button--no-border {\n                padding: 8px 20px;\n                background-color: transparent;\n                border: 0;\n                outline: 0;\n                text-align: center;\n                text-transform: uppercase;\n                font-size: 11px;\n                line-height: 12px;\n                color: #fff !important;\n                cursor: pointer;\n                }\n\n.fbmerge__choice-button--no-border:visited,\n                .fbmerge__choice-button--no-border:hover {\n                    color: #fff !important;\n                    }\n\n/* status icons */\n\n.fbmerge__statuses {\n        position: absolute;\n        top: 0;\n        bottom: 0;\n        left: 0;\n        width: 100%;\n        border-radius: 5px;\n        background-color: #1EB2EA;\n        transition: width ease .7s;\n        z-index: 1;\n        }\n\n.fbmerge__status--lj ,\n        .fbmerge__status--fb {\n            box-sizing: border-box;\n            position: absolute;\n            border: 3px solid #FFF;\n            width: 162px;\n            height: 162px;\n            bottom: 84px;\n            border-radius: 50%;\n\n            /* because inner elem not will be visible overflow */\n            overflow: hidden;\n            }\n\n.fbmerge__status--lj {\n            left: 564px;\n            background-color: #FFF;\n            box-shadow: 0 0 0 7px #00B1ED inset;\n            -webkit-transform: rotate(45deg);\n                -ms-transform: rotate(45deg);\n                    transform: rotate(45deg);\n            transition: ease 1s;\n            transition-property: border, bottom, left;\n            }\n\n.fbmerge__status-img--lj {\n                position: absolute;\n                top: 50%;\n                left: 50%;\n                -webkit-transform: translateX(-50%) translateY(-50%) rotate(-45deg);\n                    -ms-transform: translateX(-50%) translateY(-50%) rotate(-45deg);\n                        transform: translateX(-50%) translateY(-50%) rotate(-45deg);\n                transition: all ease .7s;\n                }\n\n.fbmerge__status--fb {\n            left: 441px;\n            transition: all ease .7s;\n            }\n\n.fbmerge__status-img--fb {\n                position: absolute;\n                top: 50%;\n                left: 50%;\n                -webkit-transform: translateX(-50%) translateY(-50%);\n                    -ms-transform: translateX(-50%) translateY(-50%);\n                        transform: translateX(-50%) translateY(-50%);\n                width: 40px;\n                height: 76px;\n                transition: all ease .7s;\n                }\n\n/* statuses while need action */\n\n.fbmerge--need-action .fbmerge__statuses {\n        width: 50%;\n        border-radius: 5px 0 0 5px;\n        }\n\n.fbmerge--need-action .fbmerge__status--lj {\n            left: 40px;\n            bottom: 48px;\n            }\n\n.fbmerge--need-action .fbmerge__status--fb {\n            width: 0;\n            height: 0;\n            border-width: 0;\n            }\n\n.fbmerge--need-action .fbmerge__status-img--fb {\n                width: 0;\n                height: 0;\n                }\n\n.fbmerge--need-action.fbmerge--loading .fbmerge__statuses {\n        width: 100%;\n        border-radius: 5px;\n        transition-duration: .5s;\n        }\n\n/* sharing */\n\n.fbmerge__sharing {\n        position: absolute;\n        left: 40px;\n        bottom: 56px;\n        margin: 0;\n        padding: 0;\n        line-height: 0;\n        list-style: none;\n        font-size: 0;\n        opacity: 0;\n        transition: opacity ease 1s;\n        z-index: 2;\n        }\n\n.fbmerge__sharing-item {\n            display: inline-block;\n            vertical-align: middle;\n            }\n\n.fbmerge__sharing-item + .fbmerge__sharing-item {\n            margin-left: 22px;\n            }\n\n.fbmerge__sharing-text {\n                display: inline-block;\n                width: 90px;\n                font-size: 16px;\n                line-height: 18px;\n                color: #FFF !important;\n                }\n\n.fbmerge__sharing-link {\n                position: relative;\n                display: inline-block;\n                width: 35px;\n                height: 35px;\n                border: 1px solid #FFF;\n                border-radius: 50%;\n                }\n\n.fbmerge__sharing-link:hover {\n                    -webkit-transform: translateY(-2px);\n                        -ms-transform: translateY(-2px);\n                            transform: translateY(-2px);\n                    }\n\n.fbmerge__sharing-img {\n                position: absolute;\n                top: 50%;\n                left: 50%;\n                -webkit-transform: translateX(-50%) translateY(-50%);\n                    -ms-transform: translateX(-50%) translateY(-50%);\n                        transform: translateX(-50%) translateY(-50%);\n                }\n\n.fbmerge--step5 .fbmerge__sharing,\n    .fbmerge--step6 .fbmerge__sharing {\n        opacity: 1;\n        }\n\n.fbmerge--hide-sharing .fbmerge__sharing {\n        display: none;\n        }\n\n/* notice */\n\n.fbmerge__notice {\n        display: block;\n        margin-top: 15px;\n        font-size: 11px;\n        line-height: 12px;\n        }\n\n/* flatbutton */\n\n.fbmerge__flatbutton-wrapper {\n        margin: 25px 0;\n        }\n\n.fbmerge__flatbutton {\n        min-width: 140px;\n        box-sizing: border-box;\n        padding-left: 20px;\n        padding-right: 20px;\n        border-width: 2px;\n        border-color: currentColor;\n        }\n\n.fbmerge__flatbutton[disabled] {\n            background-color: transparent;\n            color: #AAB7BB !important;\n            }\n\n.fbmerge__flatbutton:hover,\n        .fbmerge__flatbutton:active,\n        .fbmerge__flatbutton:focus {\n            background-color: transparent;\n            color: #00A2D9 !important;\n            }\n\n.fbmerge__flatbutton--inverse {\n            background-color: transparent;\n            border-color: currentColor;\n            color: #FFF !important;\n            }\n\n.fbmerge__flatbutton--inverse:hover,\n            .fbmerge__flatbutton--inverse:active,\n            .fbmerge__flatbutton--inverse:focus {\n                color: #FFF !important;\n                }\n\n.fbmerge__flatbutton--fb {\n            display: -webkit-flex;\n            display: -ms-flexbox;\n            display: flex;\n            -webkit-align-items: center;\n                -ms-flex-align: center;\n                    align-items: center;\n            margin: 37px 0 0;\n            padding: 0;\n            font-size: 16px;\n            }\n\n.fbmerge__flatbutton--fb,\n            .fbmerge__flatbutton--fb:link,\n            .fbmerge__flatbutton--fb:visited,\n            .fbmerge__flatbutton--fb:hover {\n                background: transparent;\n                border: 0;\n                color: #4c4c4c !important;\n                }\n\n.fbmerge__flatbutton--fb:hover,\n            .fbmerge__flatbutton--fb:focus {\n                -webkit-transform: translateY(-2px);\n                    -ms-transform: translateY(-2px);\n                        transform: translateY(-2px);\n                }\n\n.fbmerge__flatbutton--fb:focus::before {\n                    content: none;\n                    }\n\n.fbmerge__flatbutton-icon--fb {\n                width: 30px;\n                height: 30px;\n                display: -webkit-flex;\n                display: -ms-flexbox;\n                display: flex;\n                -webkit-justify-content: center;\n                    -ms-flex-pack: center;\n                        justify-content: center;\n                -webkit-align-items: center;\n                    -ms-flex-align: center;\n                        align-items: center;\n                vertical-align: middle;\n                margin-right: 5px;\n                margin-top: -2px;\n                border: 2px solid #00A2D9;\n                border-radius: 50%;\n                line-height: 32px;\n                box-sizing: border-box;\n                }\n\n.fbmerge__flatbutton-icon--fb .svgicon {\n                    height: 16px;\n                    fill: #00A2D9;\n                    }\n\n/* inputs */\n\n.fbmerge__inputs-list {\n        margin: 0;\n        padding: 0;\n        list-style: none;\n        }\n\n.fbmerge__inputs-item {\n        margin-bottom: 23px;\n        }\n\n.fbmerge__inputs-item:last-child {\n            margin-bottom: 0;\n            }\n\n.fbmerge__input-wrapper {\n        position: relative;\n        margin: 6px 0;\n        }\n\n.fbmerge__text-input {\n            display: block;\n            width: 100%;\n            box-sizing: border-box;\n            border-width: 0;\n            border-bottom: 1px solid #979797;\n            outline: 0;\n            font-size: 14px;\n            line-height: 1.4;\n            font-weight: bold;\n            background: transparent;\n            color: #00A2D9 !important;\n            }\n\n.fbmerge__text-input--error {\n            color: #d20922 !important;\n            }\n\n.fbmerge__text-input + .fbmerge__text-label {\n        margin-top: 25px;\n        }\n\n.fbmerge__text-label + .fbmerge__text-input {\n        margin-top: 5px;\n        }\n\n.fbmerge__input-tooltip {\n        display: none;\n        margin-top: 5px;\n        font-size: 11px;\n        line-height: 1.2;\n        color: #d0021b !important;\n        }\n\n.fbmerge__container input:-webkit-autofill,\n    .fbmerge__container input:-webkit-autofill:hover,\n    .fbmerge__container input:-webkit-autofill:focus {\n        -webkit-box-shadow: 0 0 0px 1000px white inset;\n        }\n\n.fbmerge__text-label,\n    .fbmerge__subtitle {\n        display: block;\n        margin: 0;\n        text-transform: uppercase;\n        font-size: 16px;\n        line-height: 18px;\n        font-weight: 600;\n        color: inherit !important;\n        }\n\n/* options */\n\n.fbmerge__options {\n        margin: 18px 0 0;\n        padding: 0;\n        list-style: none;\n        }\n\n.fbmerge__option {\n            margin-bottom: 15px;\n            }\n\n.fbmerge__option:last-child {\n                margin-bottom: 0;\n                }\n\n.fbmerge__option-input {\n                display: none;\n                }\n\n.fbmerge__option-text {\n                display: -webkit-flex;\n                display: -ms-flexbox;\n                display: flex;\n                -webkit-align-items: center;\n                    -ms-flex-align: center;\n                        align-items: center;\n                font-size: 14px;\n                line-height: 1.2;\n                cursor: pointer;\n                }\n\n.fbmerge__option-text::before {\n                    content: \'\';\n                    display: inline-block;\n                    -webkit-flex-shrink: 0;\n                        -ms-flex-negative: 0;\n                            flex-shrink: 0;\n                    width: 27px;\n                    height: 27px;\n                    margin-right: 15px;\n                    border: 2px solid #C3D3D9;\n                    border-radius: 50%;\n                    }\n\n.fbmerge__option-input:checked + .fbmerge__option-text::before {\n                    border-color: #00A2D9;\n                    background-image: url(\'data:image/svg+xml;charset=UTF-8, %3Csvg%20width%3D%2214px%22%20height%3D%2210px%22%20viewBox%3D%220%200%2014%2010%22%20version%3D%221.1%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%3E%3Cg%20id%3D%22Group-2%22%20transform%3D%22translate%28-469.000000%2C%20-152.000000%29%22%20fill%3D%22none%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%22471%20156.648053%20474.882762%20160%20480.961931%20154%22%20stroke%3D%22%2300B2ED%22%3E%3C/polyline%3E%3C/g%3E%3C/svg%3E\');\n                    background-position: 50% 50%;\n                    background-repeat: no-repeat;\n                    }\n\n.fbmerge__option-input[disabled] + .fbmerge__option-text {\n                pointer-events: none;\n                cursor: default;\n                }\n\n.fbmerge__option-input[disabled]:checked + .fbmerge__option-text::before {\n                    border-color: #C3D3D9 !important;\n                    background-image: url(\'data:image/svg+xml;charset=UTF-8, %3Csvg%20width%3D%2214px%22%20height%3D%2210px%22%20viewBox%3D%220%200%2014%2010%22%20version%3D%221.1%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%3E%3Cg%20id%3D%22Group-2%22%20transform%3D%22translate%28-469.000000%2C%20-152.000000%29%22%20fill%3D%22none%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%22471%20156.648053%20474.882762%20160%20480.961931%20154%22%20stroke%3D%22%23C3D3D9%22%3E%3C/polyline%3E%3C/g%3E%3C/svg%3E\');\n                    background-position: 50% 50%;\n                    background-repeat: no-repeat;\n                    }\n\n.fbmerge__option--autoimport {\n            margin-top: 30px;\n            }\n\n/* close button*/\n\n.fbmerge__close::before,\n    .fbmerge__close::after {\n        content: none;\n        }\n\n.fbmerge .flaticon--cross {\n        width: 20px;\n        height: 20px;\n        fill: #FFF !important;\n        }\n\n.fbmerge--need-action .flaticon--cross {\n            fill: #00A2D9 !important;;\n            }\n\n/* steps: 1 */\n\n.fbmerge--step1:not(.fbmerge--loading) .fbmerge__elem--step1 {\n        display: block;\n        }\n\n.fbmerge--step1 .fbmerge__title {\n        margin-bottom: 60px !important;\n        }\n\n/* hide status icons for show next animation */\n\n.fbmerge--loading.fbmerge--step1 .fbmerge__status--fb ,\n    .fbmerge--loading.fbmerge--step1 .fbmerge__status--lj {\n        width: 0;\n        height: 0;\n        border-width: 0;\n        }\n\n.fbmerge--step1 .fbmerge__status--lj {\n        transition: ease .7s;\n        transition-property: border, bottom, left, width, height;\n        }\n\n.fbmerge--step1 .fbmerge__status--fb {\n        transition-delay: .3s;\n        }\n\n/* steps: 2 */\n\n.fbmerge--step2:not(.fbmerge--loading) .fbmerge__elem--step2 {\n        display: block;\n        }\n\n.fbmerge--step2 .fbmerge__status--lj {\n        border-right-color: #008CC1;\n        border-bottom-color: #008CC1;\n        border-left-color: #008CC1;\n        }\n\n.fbmerge--step2 .fbmerge__flatbutton {\n        min-width: 140px;\n        }\n\n/* steps: 3 */\n\n.fbmerge--step3:not(.fbmerge--loading) .fbmerge__elem--step3 {\n        display: block;\n        }\n\n.fbmerge--step3 .fbmerge__status--lj {\n        border-bottom-color: #008CC1;\n        border-left-color: #008CC1;\n        }\n\n.fbmerge__text--step3 {\n        margin: 0 0 30px;\n        font-size: 14px;\n        line-height: 17px;\n        font-weight: bold;\n        }\n\n.fbmerge--step3 .fbmerge__input-wrapper {\n        margin-bottom: 0;\n        }\n\n/* steps: 4 */\n\n.fbmerge--step4:not(.fbmerge--loading) .fbmerge__elem--step4 {\n        display: block;\n        }\n\n.fbmerge--step4 .fbmerge__status--lj {\n        border-left-color: #008CC1;\n        }\n\n/* steps: 5 */\n\n.fbmerge--step5:not(.fbmerge--loading) .fbmerge__elem--step5 {\n        display: block;\n        }\n\n.fbmerge--step5 .fbmerge__status--fb {\n        background-color: #FFF;\n        box-shadow: 0 0 0 7px #00B1ED inset;\n        }\n\n.modal.fbmerge--step5 .fbmerge__status-img--fb path {\n            fill: #00B1ED !important;\n            }\n\n.fbmerge__text--step5 {\n        margin: 13px 0 0;\n        font-size: 16px;\n        line-height: 18px;\n        }\n\n/* steps: 6 */\n\n.fbmerge--step6:not(.fbmerge--loading) .fbmerge__elem--step6 {\n        display: block;\n        }\n\n.fbmerge--step6 .fbmerge__status--fb {\n        display: none;\n        }\n\n.fbmerge--step6 .fbmerge__status--lj {\n        left: 465px;\n        bottom: 60px;\n        width: 224px;\n        height: 224px;\n        box-shadow: 0 0 0 8px #00B1ED inset, 0 0 0 11px #fff inset, 0 0 0 21px #00B1ED inset;\n        transition: ease .5s;\n        transition-property: left, bottom, width, height;\n        }\n\n.fbmerge--step6 .fbmerge__status-img--lj {\n            width: 100px;\n            height: 100px;\n            transition: ease .5s;\n            transition-property: width, height, top, left;\n            }\n\n/* steps: 7 */\n\n.fbmerge--step7:not(.fbmerge--loading) .fbmerge__elem--step7 {\n        display: block;\n        }\n\n.fbmerge--step7 .fbmerge__title {\n            margin-bottom: 60px !important;\n            }\n\n@media (max-width: 850px) {\n    .fbmerge {\n        width: 660px;\n        }\n        .fbmerge__status--fb {\n            left: 320px;\n            }\n        .fbmerge__status--lj {\n            left: 441px;\n            }\n        .fbmerge__title {\n            margin: 36px 0 0 !important;\n            width: 270px;\n            }\n        .fbmerge__sharing-item {\n            margin-right: 15px;\n            }\n        .fbmerge__sharing-item:last-child {\n            margin-right: 0;\n            }\n            .fbmerge__sharing-item + .fbmerge__sharing-item {\n                margin-left: 0;\n                }\n        .fbmerge--step6 .fbmerge__status--lj {\n            left: 400px;\n            }\n}\n\n@media (max-width: 680px) {\n    .body--fbmerge-opened {\n        overflow: hidden;\n        max-height: 100%;\n        }\n\n    .fbmerge {\n        width: 90%;\n        height: auto;\n        min-height: 0;\n        max-height: 95%;\n        overflow: auto;\n        }\n    .fbmerge__statuses {\n        display: none;\n        }\n    .fbmerge__descr {\n        position: relative;\n        width: 100%;\n        min-height: 0;\n        padding: 0 35px 0 20px;\n        background-color: #00b1ed;\n        }\n    .fbmerge__title {\n        width: auto;\n        margin-top: 30px !important;\n        margin-bottom: 30px !important;\n        padding: 15px 0;\n        font-size: 25px;\n        line-height: 28px;\n        text-align: left;\n        }\n        .fbmerge--need-action .fbmerge__title {\n            margin: 0 !important;\n            font-size: 18px;\n            line-height: 22px;\n            }\n    .fbmerge__container,\n    .fbmerge--need-action .fbmerge__container {\n        width: 100%;\n        padding: 25px;\n        }\n\n    .fbmerge__notice {\n        margin-top: 10px;\n        }\n\n    /* close button */\n    .fbmerge__close {\n        z-index: 100;\n        top: 15px;\n        right: 10px;\n        }\n        .fbmerge--need-action .flaticon--cross {\n            fill: #FFF !important;\n            }\n\n    /* choice buttons */\n    .fbmerge__choice-buttons {\n        display: block;\n        width: 100%;\n        padding-bottom: 30px;\n        }\n        .fbmerge__choice-button {\n            display: inline-block;\n            width: auto;\n            }\n\n    /* inputs */\n    .fbmerge__inputs-item {\n        margin-bottom: 20px;\n        }\n        .fbmerge__text-label {\n            margin-bottom: 5px;\n            font-size: 14px;\n            line-height: 1;\n            }\n        .fbmerge__input-wrapper {\n            margin: 0;\n            }\n\n    /* flatbuttons */\n    .fbmerge__flatbutton-wrapper {\n        margin: 20px 0;\n        text-align: center;\n        }\n        .fbmerge__flatbutton-wrapper:last-child {\n            margin-bottom: 0;\n            }\n    .fbmerge__flatbutton--fb {\n        margin-top: 20px;\n        }\n\n    /* options */\n    .fbmerge__option {\n        margin-bottom: 8px;\n        }\n    .fbmerge__option--autoimport {\n        margin-top: 20px;\n        }\n\n    /* sharing */\n    .fbmerge__sharing {\n        display: none;\n        position: relative;\n        left: auto;\n        bottom: auto;\n        padding: 0 20px;\n        }\n        .fbmerge__sharing-text {\n            width: auto;\n            }\n    .fbmerge--step6 .fbmerge__sharing {\n        display: block;\n        }\n    .fbmerge--hide-sharing .fbmerge__sharing {\n        display: none;\n        }\n\n    /* steps: 1 */\n    .fbmerge__elem--step1 {\n        text-align: center;\n        }\n\n    /* steps: 5 */\n    .fbmerge--step5 {\n        padding-bottom: 30px;\n        background: #00b1ed;\n        }\n    .fbmerge__text--step5 {\n        margin-bottom: 20px;\n    }\n\n    /* steps: 6 */\n    .fbmerge--step6 {\n        padding-bottom: 50px;\n        background: #00b1ed;\n        }\n}\n\n/* <<< file end: stc/widgets/facebookmigration.css */\n\n/*# sourceMappingURL=facebookmigration.css.map */\n');

//= require_ml fbmerging.step1.description.title
//= require_ml fbmerging.step1.description.agreement
//= require_ml fbmerging.step1.description.refusing
//= require_ml fbmerging.step2.description.title
//= require_ml fbmerging.step3.description.title
//= require_ml fbmerging.step3.description.title2
//= require_ml fbmerging.step4.description.title
//= require_ml fbmerging.step5.description.title
//= require_ml fbmerging.step5.description.text
//= require_ml fbmerging.step6.description.title
//= require_ml fbmerging.sharing.title
//= require_ml fbmerging.step2.form.login
//= require_ml fbmerging.step2.form.password
//= require_ml fbmerging.step2.form.entry
//= require_ml /login.bml.connect.facebook
//= require_ml fbmerging.step2.form.notice
//= require_ml fbmerging.step3.form.text
//= require_ml fbmerging.step3.form.allow
//= require_ml fbmerging.step2.form.login
//= require_ml fbmerging.step3.form.mail
//= require_ml fbmerging.step3.form.convert_but
//= require_ml fbmerging.step3.form.user_password
//= require_ml fbmerging.step4.form.title
//= require_ml fbmerging.step4.form.week
//= require_ml fbmerging.step4.form.mounth
//= require_ml fbmerging.step4.form.halfyear
//= require_ml fbmerging.step4.form.all
//= require_ml fbmerging.step4.form.nothing
//= require_ml fbmerging.step4.form.autoimport
//= require_ml fbmerging.step4.form.save
//= require_ml fbmerging.step5.sharing.title
//= require_ml fbmerging.step5.sharing.text
//= require_ml createaccount.tip.username
//= require_ml createaccount.tip.email
//= require_ml createaccount.error.username.inuse
//= require_ml createaccount.error.password.digits_only
//= require_ml fbmerging.step7.description.title
//= require_ml fbmerging.step7.description.sendmail
//= require_ml fbmerging.step7.description.options

/* globals moment */

(function (a) {
  return a;
})();

(function () {
  'use strict';

  shareService.$inject = ['$window', '$location', 'Api'];
  migrationFacebookDirective.$inject = ['$compile', '$templateCache', '$document'];
  migrationController.$inject = ['$scope', '$timeout', '$sce', '$window', 'Api', 'shareService'];
  angular.module('Migration.Facebook', ['LJ.Api']);

  // eslint-disable-next-line angular/controller-name
  angular.module('Migration.Facebook').config(['$locationProvider', function ($locationProvider) {
    // Disable frantic window.location change leading to page freeze
    $locationProvider.html5Mode({
      enabled: true,
      // Avoid errors if some module deps use $location
      // https://docs.angularjs.org/error/$location/nobase
      requireBase: false
    });
  }]).factory('shareService', shareService).directive('facebookMigration', migrationFacebookDirective).controller('migrationController', migrationController);

  var MIGRATION_STORAGE_NAME = 'facebookMigrationStatus',
      MIGRATION_STORAGE_PERIOD = 14;


  function shareService($window, $location, Api) {
    var services,
        service = {},
        timezone = moment().format('ZZ');

    service.share = share;

    var enc = $window.encodeURIComponent.bind($window),
        // alias
    screen = $window.screen || { width: 1e3, height: 1e3 };

    // this list is compiled from https://github.com/enjoyiacm/goodshare.js/blob/master/goodshare.js
    services = {
      facebook: function facebook(_ref) {
        var text = _ref.text,
            title = _ref.title,
            link = _ref.link;
        return 'https://www.facebook.com/sharer.php?u=' + enc(link) + '&description=' + enc(text) + '&title=' + enc(title);
      },
      livejournal: function livejournal(_ref2) {
        var text = _ref2.text,
            title = _ref2.title,
            link = _ref2.link;
        return 'https://livejournal.com/update.bml?subject=' + enc(title) + '&event=' + enc('<a href="' + link + '">' + title + '</a> ' + text);
      },
      twitter: function twitter(_ref3) {
        var link = _ref3.link,
            title = _ref3.title;
        return 'https://twitter.com/share?text=' + enc(title) + '&via=livejournalru&url=' + enc(link);
      }
    };

    return service;

    function utm(link, services) {
      var source = {
        facebook: 'fbsharing',
        twitter: 'twsharing'
      };
      if (!source[services]) {
        return link;
      }
      return link + '?utm_source=' + source[services] + '&utm_medium=social';
    }

    function share(service) {
      var title = LJ.ml('fbmerging.step5.sharing.title'),
          text = LJ.ml('fbmerging.step5.sharing.text', { journal_url: Site.remote.journal_url }),
          link = Site.remote.journal_url;

      if (service === 'livejournal') {
        $window.open('/update.bml?event=' + enc(text) + '&subject=' + enc(title));
        return;
      }

      var url = services[service]({ title: title, text: text, link: utm(link, service) });
      popup(url);

      return;
    }

    function popup(url) {
      var prop = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1],
          allowScrollbars = prop.allowScrollbars || false,
          scrollbarsWindowParameter = allowScrollbars ? 1 : 0;

      $window.open(url, '', 'left=' + (screen.width - 630) / 2 + ',top=' + (screen.height - 440) / 2 + ',toolbar=0,status=0,scrollbars=' + scrollbarsWindowParameter + ',menubar=0,location=0,width=630,height=440');
    }
  }

  function isSet(param) {
    return param !== '' && angular.isDefined(param);
  }

  function getStatus() {
    var cookie = LJ.Cookie.get(MIGRATION_STORAGE_NAME);
    try {
      return angular.fromJson(cookie);
    } catch (e) {
      return null;
    }
  }
  function setStatus(status) {
    LJ.Cookie.setGlobal(MIGRATION_STORAGE_NAME, angular.toJson(status), { expires: MIGRATION_STORAGE_PERIOD });
  }

  function migrationController($scope, $timeout, $sce, $window, Api, shareService) {
    var vm = this,
        justConverted = false,
        setForReload = false,
        reloadOnClose = false;

    vm.hidden = true;

    var migration_status = getStatus() || {};
    vm.step = migration_status.agreed || $scope.step > 4 ? $scope.step : 1;
    // logic for redirecting to confirm step
    if ($scope.needEmailConfirm && vm.step === 6) {
      vm.step = 7;
    }

    vm.stepAfterSignIn = $scope.step;
    vm.addr = $scope.addr;
    vm.username = $scope.user;
    vm.password;
    vm.email = $scope.mail;
    vm.gender = $scope.gender;
    vm.needEmailConfirm = $scope.needEmailConfirm;
    vm.loginLink = $sce.trustAsResourceUrl($scope.loginLink);
    vm.facebookLink = $scope.facebookLink;
    vm.step2 = {};
    vm.share = shareService.share;
    vm.step3Errors = {
      username: '',
      email: '',
      password: ''
    };
    vm.returnTo = $scope.returnTo;
    vm.siteRoot = LJ.get('siteroot');
    vm.sendMailAction = $sce.trustAsResourceUrl(vm.siteRoot + '/register.bml');

    vm.fbLoginTitle = LJ.ml('/login.bml.connect.facebook');

    vm.autoImport = true;
    vm.week = 7 * 24 * 3600;
    vm.month = 30 * 24 * 3600;
    vm.halfYear = 180 * 24 * 3600;
    vm.period = vm.month;

    vm.authAs = LJ.get('remoteUser');

    function watchField(field) {
      $scope.$watch(function () {
        return vm[field];
      }, function (nv, ov) {
        if (nv !== ov && vm.step3Errors[field]) {
          vm.step3Errors[field].unchecked = false;
        }
      });
    }

    watchField('username');
    watchField('email');
    watchField('password');

    vm.show = function (step) {
      if (step) {
        vm.step = step;
        setForReload = true;
        vm.autoImport = !isSet($scope.noMigration);
      }
      angular.element('body').addClass('p-fader').addClass('body--fbmerge-opened');
      vm.hidden = false;
    };

    vm.hide = function () {
      var migration_status = getStatus() || {};
      migration_status.closed = true;
      setStatus(migration_status);
      if (reloadOnClose) {
        $window.location.reload();
      }

      vm.hidden = true;
      angular.element('body').removeClass('p-fader').removeClass('body--fbmerge-opened');
    };

    vm.importStep = function () {
      vm.loading = true;
      $timeout(function () {
        setStatus({ agreed: true, closed: false });
        if (Site.remote) {
          vm.step = vm.stepAfterSignIn;
        } else {
          vm.step = 2;
        }
        vm.loading = false;
      }, 700);
    };

    vm.setPeriod = function () {
      vm.loading = true;
      Api.call('settings.set_fb_digest_status', {
        period: vm.period,
        disable_auto_migration: !vm.autoImport,
        silent: true
      }).then(function (result) {
        if (result.status === 'ok') {
          if (setForReload) {
            reloadOnClose = true;
          }
          // logic for redirecting to confirm step
          if ($scope.needEmailConfirm || justConverted) {
            if (vm.username) {
              vm.authAs = vm.username;
            }
            vm.step = 7;
          } else {
            vm.step++;
          }
          vm.loading = false;
        }
      });
    };

    vm.convertIdentity = function ($event) {
      $event.preventDefault();
      vm.loading = true;
      Api.call('signup.convert_identity_lite', {
        create: 1,
        username: vm.username,
        password: vm.password,
        passwordconfirm: vm.password,
        email: vm.email,
        gender: 'U',
        silent: true
      }).then(function (result) {
        if (result.status === 'ok') {
          justConverted = true;
          vm.step++;
          vm.loading = false;
        }
        if (result.status === 'error') {
          Object.keys(vm.step3Errors).forEach(function (key) {
            if (result[key]) {
              vm.step3Errors[key] = {
                text: $sce.trustAsHtml(result[key]),
                unchecked: true
              };
              return;
            }
            vm.step3Errors[key] = '';
          });
          vm.loading = false;
        }
      });
    };

    vm.convertationEnabled = function () {
      return vm.username && vm.email && vm.password;
    };
  }

  function migrationFacebookDirective($compile, $templateCache, $document) {
    return {
      scope: {
        step: '=facebookMigrationStep',
        addr: '@facebookMigrationAddr',
        user: '@facebookMigrationUser',
        mail: '@facebookMigrationMail',
        gender: '@facebookMigrationGender',
        needEmailConfirm: '=facebookMigrationNeedEmailConfirm',
        loginLink: '@facebookMigrationLoginLink',
        facebookLink: '@facebookMigrationFacebookLink',
        returnTo: '@facebookMigrationReturnTo',
        showLater: '@facebookMigrationShowLater',
        noMigration: '@facebookMigrationDisableAutoMigration'
      },
      controllerAs: 'migration',
      controller: migrationController,
      link: link
    };

    function link(scope, element, attr, ctrl) {
      var shouldShowLater = isSet(scope.showLater),
          migrationStatus = getStatus() || {},
          urlReq = LiveJournal.parseGetArgs().fbmn,
          ref = $document[0].referrer,
          fbRef = ref && ref.match(/^https?:\/\/([^\/]+\.)?facebook\.com(\/|$)/i),
          needShow = urlReq || fbRef && !migrationStatus.closed && !shouldShowLater;


      if (!needShow && !shouldShowLater) {
        element.remove();
        return;
      }

      element.html($compile($templateCache.get('facebook_migration.tmpl'))(scope));

      if (shouldShowLater) {
        angular.element('.js-popup-shower').click(function () {
          ctrl.show(4);
          scope.$apply();
        });
      }

      if (needShow) {
        ctrl.show();
      }
    }
  }

  angular.element(document).ready(function () {
    var element = angular.element('[facebook-migration]');
    if (!element.length) {
      return;
    }
    var bootstrappedAlready = element.eq(0).scope();
    if (bootstrappedAlready) {
      return;
    }
    angular.bootstrap('[facebook-migration]', ['Migration.Facebook']);
  });
})();
/* <<< file end: js/facebookMigration/migration.js */

//# map link was there [migration.js.map]
/* >>> file start: js/ljwidget.js */
// @TODO: remove HTTPReq dependency, move to $.ajax

LJWidget = new Class(Object, {
    // replace the widget contents with an ajax call to render with params
    updateContent: function updateContent(params) {
        if (!params) params = {};
        this._show_frame = params["showFrame"];

        if (params["method"]) method = params["method"];
        params["_widget_update"] = 1;

        if (this.doAjaxRequest(params)) {
            // hilight the widget to show that its updating
            this.hilightFrame();
        }
    },

    // returns the widget element
    getWidget: function getWidget() {
        return $(this.widgetId);
    },

    // do a simple post to the widget
    doPost: function doPost(params) {
        if (!params) params = {};
        this._show_frame = params["showFrame"];
        var postParams = {},
            classPrefix = this.widgetClass;

        classPrefix = "Widget[" + classPrefix.replace(/::/g, "_") + "]_";

        for (var k in params) {
            var class_k = k;
            if (!k.match(/^Widget\[/) && k != 'lj_form_auth' && !k.match(/^_widget/)) {
                class_k = classPrefix + k;
            }

            postParams[class_k] = params[k];
        }

        postParams["_widget_post"] = 1;

        this.doAjaxRequest(postParams);
    },

    doPostAndUpdateContent: function doPostAndUpdateContent(params) {
        if (!params) params = {};

        params["_widget_update"] = 1;

        this.doPost(params);
    },

    // do an ajax post of the form passed in
    postForm: function postForm(formElement) {
        if (!formElement) return false;

        var params = {};

        for (var i = 0; i < formElement.elements.length; i++) {
            var element = formElement.elements[i],
                name = element.name,
                value = element.value;


            params[name] = value;
        }

        this.doPost(params);
    },

    ///////////////// PRIVATE METHODS ////////////////////

    init: function init(id, widgetClass, authToken) {
        LJWidget.superClass.init.apply(this, arguments);
        this.widgetId = id;
        this.widgetClass = widgetClass;
        this.authToken = authToken;
    },

    hilightFrame: function hilightFrame() {
        if (this._show_frame != 1) return;
        if (this._frame) return;

        var widgetEle = this.getWidget();
        if (!widgetEle) return;

        var widgetParent = widgetEle.parentNode;
        if (!widgetParent) return;

        var enclosure = document.createElement("fieldset");
        enclosure.style.borderColor = "red";
        var title = document.createElement("legend");
        title.innerHTML = "Updating...";
        enclosure.appendChild(title);

        widgetParent.appendChild(enclosure);
        enclosure.appendChild(widgetEle);

        this._frame = enclosure;
    },

    removeHilightFrame: function removeHilightFrame() {
        if (this._show_frame != 1) return;

        var widgetEle = this.getWidget();
        if (!widgetEle) return;

        if (!this._frame) return;

        var par = this._frame.parentNode;
        if (!par) return;

        par.appendChild(widgetEle);
        par.removeChild(this._frame);

        this._frame = null;
    },

    method: "POST",
    endpoint: "widget",
    requestParams: {},

    doAjaxRequest: function doAjaxRequest(params) {
        if (!params) params = {};

        if (this._ajax_updating) return false;
        this._ajax_updating = true;

        params["_widget_id"] = this.widgetId;
        params["_widget_class"] = this.widgetClass;

        params["auth_token"] = this.authToken;

        if ($('_widget_authas')) {
            params["authas"] = $('_widget_authas').value;
        }

        var reqOpts = {
            method: this.method,
            data: HTTPReq.formEncoded(params),
            url: LiveJournal.getAjaxUrl(this.endpoint),
            onData: this.ajaxDone.bind(this),
            onError: this.ajaxError.bind(this)
        };

        for (var k in params) {
            reqOpts[k] = params[k];
        }

        HTTPReq.getJSON(reqOpts);

        return true;
    },

    ajaxDone: function ajaxDone(data) {
        this._ajax_updating = false;
        this.removeHilightFrame();

        if (data["_widget_body"]) {
            if (data["_widget_body"].match(/ajax:.[^"]+/)) {
                this.authToken = data["_widget_body"].match(/ajax:.[^"]+/)[0];
            }
        }

        if (data.auth_token) {
            this.authToken = data.auth_token;
        }

        if (data.errors && data.errors != '') {
            return this.ajaxError(data.errors);
        }

        if (data.error) {
            return this.ajaxError(data.error);
        }

        // call callback if one exists
        if (this.onData) {
            this.onData(data);
        }

        if (data["_widget_body"]) {
            // did an update request, got the new body back
            var widgetEle = this.getWidget();
            if (!widgetEle) {
                // widget is gone, ignore
                return;
            }

            widgetEle.innerHTML = data["_widget_body"];

            if (this.onRefresh) {
                this.onRefresh();
            }
        }
    },

    ajaxError: function ajaxError(err) {
        this._ajax_updating = false;

        if (this.skipError) {
            // leaving page, do nothing
            return;
        } else if (this.onError) {
            // use class error handler
            this.onError(err);
        } else {
            // use generic error handler
            LiveJournal.ajaxError(err);
        }
    }
});

LJWidget.widgets = [];
/* <<< file end: js/ljwidget.js */

//# map link was there [ljwidget.js.map]
/* >>> file start: js/deprecated/dom.js */
/**
 * All deprecated manipulations with the DOM will be here
 */

// handy utilities to create elements with just text in them
function _textSpan() {
    return _textElements('span', arguments);
}
function _textDiv() {
    return _textElements('div', arguments);
}

function _textElements(eleType, txts) {
    var ele = [];
    for (var i = 0; i < txts.length; i++) {
        var node = document.createElement(eleType);
        node.innerHTML = txts[i];
        ele.push(node);
    }

    return ele.length == 1 ? ele[0] : ele;
}
/* <<< file end: js/deprecated/dom.js */

//# map link was there [dom.js.map]
/* >>> file start: js/ippu.js */
/*
  IPPU methods:
     init([innerHTML]) -- takes innerHTML as optional argument
     show() -- shows the popup
     hide() -- hides popup
     cancel() -- hides and calls cancel callback

  Content setters:
     setContent(innerHTML) -- set innerHTML
     setContentElement(element) -- adds element as a child of the popup

   Accessors:
     getElement() -- returns popup DIV element
     visible() -- returns whether the popup is visible or not

   Titlebar:
     setTitlebar(show) -- true: show titlebar / false: no titlebar
     setTitle(title) -- sets the titlebar text
     getTitlebarElement() -- returns the titlebar element
     setTitlebarClass(className) -- set the class of the titlebar

   Styling:
     setOverflow(overflow) -- sets ele.style.overflow to overflow
     addClass(className) -- adds class to popup
     removeClass(className) -- removes class to popup

   Browser Hacks:
     setAutoHideSelects(autohide) -- when the popup is shown should it find all the selects
                                on the page and hide them (and show them again) (for IE)

   Positioning/Sizing:
     setLocation(left, top) -- set popup location: will be pixels if units not specified
     setLeft(left) -- set left location
     setTop(top)   -- set top location
     setDimensions(width, height) -- set popup dimensions: will be pixels if units not specified
     setAutoCenter(x, y) -- what dimensions to auto-center
     center() -- centers popup on screen
     centerX() -- centers popup horizontally
     centerY() -- centers popup vertically
     setFixedPosition(fixed) -- should the popup stay fixed on the page when it scrolls?
     centerOnWidget(widget) -- center popup on this widget
     setAutoCenterCallback(callback) -- calls callback with this IPPU instance as a parameter
                                        for auto-centering. Some common built-in class methods
                                        you can use as callbacks are:
                                        IPPU.center
                                        IPPU.centerX
                                        IPPU.centerY

     moveForward(amount) -- increases the zIndex by one or amount if specified
     moveBackward(amount) -- decreases the zIndex by one or amount if specified

   Modality:
     setClickToClose(clickToClose) -- if clickToClose is true, clicking outside of the popup
                                      will close it
     setModal(modality) -- If modality is true, then popup will capture all mouse events
                     and optionally gray out the rest of the page. (overrides clickToClose)
     setOverlayVisible(visible) -- If visible is true, when this popup is on the page it
                                   will gray out the rest of the page if this is modal

   Callbacks:
     setCancelledCallback(callback) -- call this when the dialog is closed through clicking
                                       outside, titlebar close button, etc...
     setHiddenCallback(callback) -- called when the dialog is closed in any fashion

   Fading:
     setFadeIn(fadeIn) -- set whether or not to automatically fade the ippu in
     setFadeOut(fadeOut) -- set whether or not to automatically fade the ippu out
     setFadeSpeed(secs) -- sets fade speed

  Class Methods:
   Handy callbacks:
     IPPU.center
     IPPU.centerX
     IPPU.centerY
   Browser testing:
     IPPU.isIE() -- is the browser internet exploder?
     IPPU.ieSafari() -- is this safari?

////////////////////


ippu.setModalDenialCallback(IPPU.cssBorderFlash);


   private:
    Properties:
     ele -- DOM node of div
     shown -- boolean; if element is in DOM
     autoCenterX -- boolean; auto-center horiz
     autoCenterY -- boolean; auto-center vertical
     fixedPosition -- boolean; stay in fixed position when browser scrolls?
     titlebar -- titlebar element
     title -- string; text to go in titlebar
     showTitlebar -- boolean; whether or not to show titlebar
     content -- DIV containing user's specified content
     clickToClose -- boolean; clicking outside popup will close it
     clickHandlerSetup -- boolean; have we set up the click handlers?
     docOverlay -- DIV that overlays the document for capturing clicks
     modal -- boolean; capture all events and prevent user from doing anything
                       until dialog is dismissed
     visibleOverlay -- boolean; make overlay slightly opaque
     clickHandlerFunc -- function; function to handle document clicks
     resizeHandlerFunc -- function; function to handle document resizing
     autoCenterCallback -- function; what callback to call for auto-centering
     cancelledCallback -- function; called when dialog is cancelled
     setAutoHideSelects -- boolean; autohide all SELECT elements on the page when popup is visible
     hiddenSelects -- array; SELECT elements that have been hidden
     hiddenCallback -- funciton; called when dialog is hidden
     fadeIn, fadeOut, fadeSpeed -- fading settings
     fadeMode -- current fading mode (in, out) if there is fading going on

    Methods:
     updateTitlebar() -- create titlebar if it doesn't exist,
                         hide it if titlebar == false,
                         update titlebar text
     updateContent() -- makes sure all currently specified properties are applied
     setupClickCapture() -- if modal, create document-sized div overlay to capture click events
                            otherwise install document onclick handler
     removeClickHandlers() -- remove overlay, event handlers
     clickHandler() -- event handler for clicks
     updateOverlay() -- if we have an overlay, make sure it's where it should be and (in)visible
                        if it should be
     autoCenter() -- centers popup on screen according to autoCenterX and autoCenterY
     hideSelects() -- hide all select element on page
     showSelects() -- show all selects
     _hide () -- actually hides everything, called by hide(), which does fading if necessary
*/

// this belongs somewhere else:
function changeOpac(id, opacity) {
  var e = $(id);
  if (e && e.style) {
    var object = e.style;
    if (object) {
      //reduce flicker
      if (IPPU.isSafari() && opacity >= 100) opacity = 99.99;

      // IE
      if (object.filters) object.filters.alpha.opacity = opacity * 100;

      object.opacity = opacity;
    }
  }
}

IPPU = new Class(Object, {
  setFixedPosition: function setFixedPosition(fixed) {
    // no fixed position for IE
    if (IPPU.isIE()) return;

    this.fixedPosition = fixed;
    this.updateContent();
  },

  clickHandler: function clickHandler(evt) {
    if (!this.clickToClose) return;
    if (!this.visible()) return;

    evt = Event.prep(evt);
    var target = evt.target;
    // don't do anything if inside the popup
    if (DOM.getAncestorsByClassName(target, "ippu", true).length > 0) return;
    this.cancel();
  },

  setCancelledCallback: function setCancelledCallback(callback) {
    this.cancelledCallback = callback;
  },

  cancel: function cancel() {
    if (this.cancelledCallback) this.cancelledCallback();
    this.hide();
  },

  setHiddenCallback: function setHiddenCallback(callback) {
    this.hiddenCallback = callback;
  },

  setupClickCapture: function setupClickCapture() {
    if (!this.visible() || this.clickHandlerSetup) {
      return;
    }
    if (!this.clickToClose && !this.modal) {
      return;
    }

    this.clickHandlerFunc = this.clickHandler.bindEventListener(this);

    if (this.modal) {
      // create document-sized div to capture events
      if (this.overlay) return; // wtf? shouldn't exist yet
      this.overlay = document.createElement("div");
      this.overlay.style.left = "0px";
      this.overlay.style.top = "0px";
      this.overlay.style.margin = "0px";
      this.overlay.style.padding = "0px";

      this.overlay.style.backgroundColor = "#000000";
      this.overlay.style.zIndex = "900";
      if (IPPU.isIE()) {
        this.overlay.style.filter = "progid:DXImageTransform.Microsoft.Alpha(opacity=50)";
        this.overlay.style.position = "absolute";
        this.overlay.style.width = document.body.scrollWidth;
        this.overlay.style.height = document.body.scrollHeight;
      } else {
        this.overlay.style.position = "fixed";
      }

      this.ele.parentNode.insertBefore(this.overlay, this.ele);
      this.updateOverlay();

      DOM.addEventListener(this.overlay, "click", this.clickHandlerFunc);
    } else {
      // simple document onclick handler
      DOM.addEventListener(document, "click", this.clickHandlerFunc);
    }

    this.clickHandlerSetup = true;
  },

  updateOverlay: function updateOverlay() {
    if (this.overlay) {
      var cd = DOM.getClientDimensions();
      this.overlay.style.width = cd.x - 1 + "px";
      if (!IPPU.isIE()) {
        this.overlay.style.height = cd.y - 1 + "px";
      }
      if (this.visibleOverlay) {
        this.overlay.backgroundColor = "#000000";
        changeOpac(this.overlay, 0.50);
      } else {
        this.overlay.backgroundColor = "#FFFFFF";
        changeOpac(this.overlay, 0.0);
      }
    }
  },

  resizeHandler: function resizeHandler(evt) {
    this.updateContent();
  },

  removeClickHandlers: function removeClickHandlers() {
    if (!this.clickHandlerSetup) return;

    var myself = this,
        handlerFunc = function handlerFunc(evt) {
      myself.clickHandler(evt);
    };


    DOM.removeEventListener(document, "click", this.clickHandlerFunc, false);

    if (this.overlay) {
      DOM.removeEventListener(this.overlay, "click", this.clickHandlerFunc, true);
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = undefined;
    }

    this.clickHandlerFunc = undefined;
    this.clickHandlerSetup = false;
  },

  setClickToClose: function setClickToClose(clickToClose) {
    this.clickToClose = clickToClose;

    if (!this.clickHandlerSetup && clickToClose && this.visible()) {
      // popup is already visible, need to set up click handler
      var setupClickCaptureCallback = this.setupClickCapture.bind(this);
      window.setTimeout(setupClickCaptureCallback, 100);
    } else if (!clickToClose && this.clickHandlerSetup) {
      this.removeClickHandlers();
    }

    this.updateContent();
  },

  setModal: function setModal(modal) {
    var changed = this.modal == modal;

    // if it's modal, we don't want click-to-close
    if (modal) this.setClickToClose(false);

    this.modal = modal;
    if (changed) {
      this.removeClickHandlers();
      this.updateContent();
    }
  },

  setOverlayVisible: function setOverlayVisible(vis) {
    this.visibleOverlay = vis;
    this.updateContent();
  },

  updateContent: function updateContent() {
    this.autoCenter();
    this.updateTitlebar();
    this.updateOverlay();
    if (this.titlebar) this.setTitlebarClass(this.titlebar.className);

    var setupClickCaptureCallback = this.setupClickCapture.bind(this);
    window.setTimeout(setupClickCaptureCallback, 100);

    if (this.fixedPosition && this.ele.style.position != "fixed") this.ele.style.position = "fixed";else if (!this.fixedPosition && this.ele.style.position == "fixed") this.ele.style.position = "absolute";
  },

  getTitlebarElement: function getTitlebarElement() {
    return this.titlebar;
  },

  setTitlebarClass: function setTitlebarClass(className) {
    if (this.titlebar) this.titlebar.className = className;
  },

  setOverflow: function setOverflow(overflow) {
    if (this.ele) this.ele.style.overflow = overflow;
  },

  visible: function visible() {
    return this.shown;
  },

  setTitlebar: function setTitlebar(show) {
    this.showTitlebar = show;

    if (show) {
      if (!this.titlebar) {
        // titlebar hasn't been created. Create it.
        var tbar = document.createElement("div");
        if (!tbar) return;
        tbar.style.width = "100%";

        if (this.title) tbar.innerHTML = this.title;
        this.ele.insertBefore(tbar, this.content);
        this.titlebar = tbar;
      }
    } else if (this.titlebar) {
      this.ele.removeChild(this.titlebar);
      this.titlebar = false;
    }
  },

  setTitle: function setTitle(title) {
    this.title = title;
    this.updateTitlebar();
  },

  updateTitlebar: function updateTitlebar() {
    if (this.showTitlebar && this.titlebar && this.title != this.titlebar.innerHTML) {
      this.titlebar.innerHTML = this.title;
    }
  },

  addClass: function addClass(className) {
    DOM.addClassName(this.ele, className);
  },

  removeClass: function removeClass(className) {
    DOM.removeClassName(this.ele, className);
  },

  setAutoCenterCallback: function setAutoCenterCallback(callback) {
    this.autoCenterCallback = callback;
  },

  autoCenter: function autoCenter() {
    if (!this.visible || !this.visible()) return;

    if (this.autoCenterCallback) {
      this.autoCenterCallback(this);
      return;
    }

    if (this.autoCenterX) this.centerX();

    if (this.autoCenterY) this.centerY();
  },

  center: function center() {
    this.centerX();
    this.centerY();
  },

  centerOnWidget: function centerOnWidget(widget, offsetTop, offsetLeft) {
    offsetTop = offsetTop || 0;
    offsetLeft = offsetLeft || 0;
    this.setAutoCenter(false, false);
    this.setAutoCenterCallback(null);
    var wd = DOM.getAbsoluteDimensions(widget),
        ed = DOM.getAbsoluteDimensions(this.ele),
        newleft = wd.absoluteRight - wd.offsetWidth / 2 - ed.offsetWidth / 2 + offsetLeft,
        newtop = wd.absoluteBottom - wd.offsetHeight / 2 - ed.offsetHeight / 2 + offsetTop;


    newleft = newleft < 0 ? 0 : newleft;
    newtop = newtop < 0 ? 0 : newtop;
    DOM.setLeft(this.ele, newleft);
    DOM.setTop(this.ele, newtop);
  },

  centerX: function centerX() {
    if (!this.visible || !this.visible()) return;

    var cd = DOM.getClientDimensions(),
        newleft = cd.x / 2 - this.ele.offsetWidth / 2;


    // If not fixed position, center relative to the left of the page
    if (!this.fixedPosition) {
      var wd = DOM.getWindowScroll();
      newleft += wd.left;
    }

    DOM.setLeft(this.ele, newleft);
  },

  centerY: function centerY() {
    if (!this.visible || !this.visible()) return;

    var cd = DOM.getClientDimensions(),
        newtop = cd.y / 2 - this.ele.offsetHeight / 2;


    // If not fixed position, center relative to the top of the page
    if (!this.fixedPosition) {
      var wd = DOM.getWindowScroll();
      newtop += wd.top;
    }

    DOM.setTop(this.ele, newtop);
  },

  setAutoCenter: function setAutoCenter(autoCenterX, autoCenterY) {
    this.autoCenterX = autoCenterX || false;
    this.autoCenterY = autoCenterY || false;

    if (!autoCenterX && !autoCenterY) {
      this.setAutoCenterCallback(null);
      return;
    }

    this.autoCenter();
  },

  setDimensions: function setDimensions(width, height) {
    width = width + "";
    height = height + "";
    if (width.match(/^\d+$/)) width += "px";
    if (height.match(/^\d+$/)) height += "px";

    this.ele.style.width = width;
    this.ele.style.height = height;
  },

  moveForward: function moveForward(howMuch) {
    if (!howMuch) howMuch = 1;
    if (!this.ele) return;

    this.ele.style.zIndex += howMuch;
  },

  moveBackward: function moveBackward(howMuch) {
    if (!howMuch) howMuch = 1;
    if (!this.ele) return;

    this.ele.style.zIndex -= howMuch;
  },

  setLocation: function setLocation(left, top) {
    this.setLeft(left);
    this.setTop(top);
  },

  setTop: function setTop(top) {
    if (typeof top != 'string') top += 'px';
    this.ele.style.top = top;
  },

  setLeft: function setLeft(left) {
    if (typeof left != 'string') left += 'px';
    this.ele.style.left = left;
  },

  getElement: function getElement() {
    return this.ele;
  },

  setContent: function setContent(html) {
    this.content.innerHTML = html;
  },

  setContentElement: function setContentElement(element) {
    // remove child nodes
    while (this.content.firstChild) {
      this.content.removeChild(this.content.firstChild);
    }
    (function (a) {
      return a;
    })();

    this.content.appendChild(element);
  },

  setFadeIn: function setFadeIn(fadeIn) {
    this.fadeIn = fadeIn;
  },

  setFadeOut: function setFadeOut(fadeOut) {
    this.fadeOut = fadeOut;
  },

  setFadeSpeed: function setFadeSpeed(fadeSpeed) {
    this.fadeSpeed = fadeSpeed;
  },

  show: function show() {
    this.shown = true;

    if (this.fadeIn) {
      var opp = 0.01;

      changeOpac(this.ele, opp);
    }

    document.body.appendChild(this.ele);
    this.ele.style.position = "absolute";
    if (this.autoCenterX || this.autoCenterY) this.center();

    this.updateContent();

    if (!this.resizeHandlerFunc) {
      this.resizeHandlerFunc = this.resizeHandler.bindEventListener(this);
      DOM.addEventListener(window, "resize", this.resizeHandlerFunc, false);
    }

    if (this.fadeIn) this.fade("in");

    this.hideSelects();
  },

  fade: function fade(mode, callback) {
    var opp,
        delta,
        steps = 10.0;


    if (mode == "in") {
      delta = 1 / steps;
      opp = 0.1;
    } else {
      if (this.ele.style.opacity) {
        var parsed = parseFloat(this.ele.style.opacity);
        opp = isFinite(parsed) ? parsed : 0;
      } else {
        opp = 0.99;
      }

      delta = -1 / steps;
    }

    var fadeSpeed = this.fadeSpeed;
    if (!fadeSpeed) fadeSpeed = 1;

    var fadeInterval = steps / fadeSpeed * 5;

    this.fadeMode = mode;

    var self = this,
        fade = function fade() {
      opp += delta;

      // did someone start a fade in the other direction? if so,
      // cancel this fade
      if (self.fadeMode && self.fadeMode != mode) {
        if (callback) callback.call(self, []);

        return;
      }

      if (opp <= 0.1) {
        if (callback) callback.call(self, []);

        self.fadeMode = null;

        return;
      } else if (opp >= 1.0) {
        if (callback) callback.call(self, []);

        self.fadeMode = null;

        return;
      } else {
        changeOpac(self.ele, opp);
        window.setTimeout(fade, fadeInterval);
      }
    };


    fade();
  },

  hide: function hide() {
    if (!this.visible()) return;

    if (this.fadeOut && this.ele) {
      this.fade("out", this._hide.bind(this));
    } else {
      this._hide();
    }
  },

  _hide: function _hide() {
    if (this.hiddenCallback) this.hiddenCallback();

    this.shown = false;
    this.removeClickHandlers();

    if (this.ele) document.body.removeChild(this.ele);

    if (this.resizeHandlerFunc) DOM.removeEventListener(window, "resize", this.resizeHandlerFunc);

    this.showSelects();
  },

  // you probably want this for IE being dumb
  // (IE thinks select elements are cool and puts them in front of every element on the page)
  setAutoHideSelects: function setAutoHideSelects(autohide) {
    this.autoHideSelects = autohide;
    this.updateContent();
  },

  hideSelects: function hideSelects() {
    if (!this.autoHideSelects || !IPPU.isIE()) return;
    var sels = document.getElementsByTagName("select"),
        ele;

    for (var i = 0; i < sels.length; i++) {
      ele = sels[i];
      if (!ele) continue;

      // if this element is inside the ippu, skip it
      if (DOM.getAncestorsByClassName(ele, "ippu", true).length > 0) continue;

      if (ele.style.visibility != 'hidden') {
        ele.style.visibility = 'hidden';
        this.hiddenSelects.push(ele);
      }
    }
  },

  showSelects: function showSelects() {
    if (!this.autoHideSelects) return;
    var ele;
    while (ele = this.hiddenSelects.pop()) {
      ele.style.visibility = '';
    }
  },

  init: function init(html) {
    var ele = document.createElement("div");
    this.ele = ele;
    this.shown = false;
    this.autoCenterX = false;
    this.autoCenterY = false;
    this.titlebar = null;
    this.title = "";
    this.showTitlebar = false;
    this.clickToClose = false;
    this.modal = false;
    this.clickHandlerSetup = false;
    this.docOverlay = false;
    this.visibleOverlay = false;
    this.clickHandlerFunc = false;
    this.resizeHandlerFunc = false;
    this.fixedPosition = false;
    this.autoCenterCallback = null;
    this.cancelledCallback = null;
    this.autoHideSelects = false;
    this.hiddenCallback = null;
    this.fadeOut = false;
    this.fadeIn = false;
    this.hiddenSelects = [];
    this.fadeMode = null;

    ele.style.position = "absolute";
    ele.style.top = 0;
    ele.style.zIndex = "1000";

    // plz don't remove thx
    DOM.addClassName(ele, "ippu");

    // create DIV to hold user's content
    this.content = document.createElement("div");

    this.content.innerHTML = html;

    this.ele.appendChild(this.content);
  }
});

// class methods
IPPU.center = function (obj) {
  obj.centerX();
  obj.centerY();
};

IPPU.centerX = function (obj) {
  obj.centerX();
};

IPPU.centerY = function (obj) {
  obj.centerY();
};

IPPU.isIE = function () {
  var UA = navigator.userAgent.toLowerCase();
  if (UA.indexOf('msie') != -1) return true;
  return false;
};

IPPU.isSafari = function () {
  var UA = navigator.userAgent.toLowerCase();
  if (UA.indexOf('safari') != -1) return true;
  return false;
};
/* <<< file end: js/ippu.js */

//# map link was there [ippu.js.map]
/* >>> file start: js/lj_ippu.js */
//= require js/deprecated/dom.js
//= require js/ippu.js

LJ_IPPU = new Class(IPPU, {
    init: function init(title) {
        if (!title) title = "";

        LJ_IPPU.superClass.init.apply(this, []);

        this.uniqId = this.generateUniqId();
        this.cancelThisFunc = this.cancel.bind(this);

        this.setTitle(title);
        this.setTitlebar(true);
        this.setTitlebarClass("lj_ippu_titlebar");

        this.addClass("lj_ippu");
        this.setAutoCenterCallback(IPPU.center);
        this.setDimensions(514, "auto");
        //this.setOverflow("hidden");

        this.setFixedPosition(true);
        this.setClickToClose(true);
        this.setAutoHideSelects(true);
    },

    setTitle: function setTitle(title) {
        var titlebarContent = "\
      <div style='float:right; padding-right: 8px'>" + "<img src='" + Site.imgprefix + "/CloseButton.gif?v=7618' width='15' height='15' id='" + this.uniqId + "_cancel' /></div>" + title;

        LJ_IPPU.superClass.setTitle.apply(this, [titlebarContent]);
    },

    generateUniqId: function generateUniqId() {
        var theDate = new Date();
        return "lj_ippu_" + theDate.getHours() + theDate.getMinutes() + theDate.getMilliseconds();
    },

    show: function show() {
        LJ_IPPU.superClass.show.apply(this);
        var setupCallback = this.setup_lj_ippu.bind(this);
        this.timerSetup = window.setTimeout(setupCallback, 300);
    },

    setup_lj_ippu: function setup_lj_ippu(evt) {
        var cancelCallback = this.cancelThisFunc;
        $(this.uniqId + "_cancel").onclick = function () {
            cancelCallback();
        };
    },

    hide: function hide() {
        clearInterval(this.timerSetup);
        LJ_IPPU.superClass.hide.apply(this);
    }
});

// Class method to show a popup to show a note to the user
// note = message to show
// underele = element to display the note underneath
LJ_IPPU.showNote = function (note, underele, timeout, style) {
    var noteElement = document.createElement("div");
    noteElement.innerHTML = note;

    return LJ_IPPU.showNoteElement(noteElement, underele, timeout, style);
};

LJ_IPPU.showErrorNote = function (note, underele, timeout) {
    return LJ_IPPU.showNote(note, underele, timeout, "ErrorNote");
};

LJ_IPPU.showNoteElement = function (noteEle, underele, timeout, style) {
    var notePopup = new IPPU();
    notePopup.init();

    var inner = document.createElement("div");
    DOM.addClassName(inner, "Inner");
    inner.appendChild(noteEle);
    notePopup.setContentElement(inner);

    notePopup.setTitlebar(false);
    notePopup.setFadeIn(true);
    notePopup.setFadeOut(true);
    notePopup.setFadeSpeed(4);
    notePopup.setDimensions("auto", "auto");
    if (!style) style = "Note";
    notePopup.addClass(style);

    var dim;
    if (underele) {
        // pop up the box right under the element
        dim = DOM.getAbsoluteDimensions(underele);
        if (!dim) return;
    }

    var bounds = DOM.getClientDimensions();
    if (!bounds) return;

    if (!dim) {
        // no element specified to pop up on, show in the middle
        // notePopup.setModal(true);
        // notePopup.setOverlayVisible(true);
        notePopup.setAutoCenter(true, true);
        notePopup.show();
    } else {
        // default is to auto-center, don't want that
        notePopup.setAutoCenter(false, false);
        notePopup.setLocation(dim.absoluteLeft, dim.absoluteBottom + 4);
        notePopup.show();

        var popupBounds = DOM.getAbsoluteDimensions(notePopup.getElement());
        if (popupBounds.absoluteRight > bounds.x) {
            notePopup.setLocation(bounds.x - popupBounds.offsetWidth - 30, dim.absoluteBottom + 4);
        }
    }

    notePopup.setClickToClose(true);
    notePopup.moveForward();

    if (timeout === undefined) {
        timeout = 5000;
    }

    if (timeout) {
        window.setTimeout(function () {
            if (notePopup) notePopup.hide();
        }, timeout);
    }

    return notePopup;
};

LJ_IPPU.textPrompt = function (title, prompt, callback, options) {
    options = options || {};

    title += '';
    var notePopup = new LJ_IPPU(title),
        inner = document.createElement("div");

    DOM.addClassName(inner, "ljippu_textprompt");

    // label
    if (prompt) inner.appendChild(_textDiv(prompt));

    // text field
    var field = document.createElement("textarea");
    DOM.addClassName(field, "htmlfield");
    field.cols = 40;
    field.rows = 5;
    inner.appendChild(field);

    // submit btn
    var btncont = document.createElement("div");
    DOM.addClassName(btncont, "submitbtncontainer");
    var btn = document.createElement("input");
    DOM.addClassName(btn, "submitbtn");
    btn.type = "button";
    btn.value = "Insert";
    btncont.appendChild(btn);
    inner.appendChild(btncont);

    notePopup.setContentElement(inner);

    notePopup.setAutoCenter(true, true);
    notePopup.setDimensions(options.width || "60%", "auto");
    notePopup.show();
    field.focus();

    DOM.addEventListener(btn, "click", function (e) {
        notePopup.hide();
        if (callback) callback.apply(null, [field.value]);
    });
};
/* <<< file end: js/lj_ippu.js */

//# map link was there [lj_ippu.js.map]
/* >>> file start: js/ljwidget_ippu.js */
//= require js/ljwidget.js
//= require js/lj_ippu.js

LJWidgetIPPU = new Class(LJWidget, {
    init: function init(opts, reqParams) {
        var title = opts.title,
            widgetClass = opts.widgetClass,
            authToken = opts.authToken,
            nearEle = opts.nearElement,
            not_view_close = opts.not_view_close;


        if (!reqParams) reqParams = {};
        this.reqParams = reqParams;

        // construct a container ippu for this widget
        var ippu = new LJ_IPPU(title, nearEle);
        this.ippu = ippu;
        var c = document.createElement("div");
        c.id = "LJWidgetIPPU_" + Unique.id();
        ippu.setContentElement(c);

        if (opts.width && opts.height) ippu.setDimensions(opts.width, opts.height);

        if (opts.overlay) {
            if (IPPU.isIE()) {
                this.ippu.setModal(true);
                this.ippu.setOverlayVisible(true);
                this.ippu.setClickToClose(false);
            } else {
                this.ippu.setModal(true);
                this.ippu.setOverlayVisible(true);
            }
        }

        if (opts.center) ippu.center();
        ippu.show();
        if (not_view_close) ippu.titlebar.getElementsByTagName('img')[0].style.display = 'none';

        var loadingText = document.createElement("div");
        loadingText.style.fontSize = '1.5em';
        loadingText.style.fontWeight = 'bold';
        loadingText.style.margin = '5px';
        loadingText.style.textAlign = 'center';

        loadingText.innerHTML = "Loading...";

        this.loadingText = loadingText;

        c.appendChild(loadingText);

        // id, widgetClass, authToken
        var widgetArgs = [c.id, widgetClass, authToken];
        LJWidgetIPPU.superClass.init.apply(this, widgetArgs);

        var self = this;
        ippu.setCancelledCallback(function () {
            if (self.cancel) {
                self.cancel();
            }
        });

        if (!widgetClass) return null;

        this.widgetClass = widgetClass;
        this.authToken = authToken;
        this.title = title;
        this.nearEle = nearEle;

        window.setInterval(this.animateLoading.bind(this), 20);

        this.loaded = false;

        // start request for this widget now
        this.loadContent();
        return this;
    },

    animateCount: 0,

    animateLoading: function animateLoading(i) {
        var ele = this.loadingText;

        if (this.loaded || !ele) {
            window.clearInterval(i);
            return;
        }

        this.animateCount += 0.05;
        var intensity = (Math.sin(this.animateCount) + 1) / 2 * 255,
            hexColor = Math.round(intensity).toString(16);


        if (hexColor.length == 1) hexColor = "0" + hexColor;
        hexColor += hexColor + hexColor;

        ele.style.color = "#" + hexColor;
        this.ippu.center();
    },

    // override doAjaxRequest to add _widget_ippu = 1
    doAjaxRequest: function doAjaxRequest(params) {
        if (!params) params = {};
        params['_widget_ippu'] = 1;
        if (document.getElementById("LJ__Setting__InvisibilityGuests_invisibleguests_self")) {
            params['Widget[IPPU_SettingProd]_LJ__Setting__InvisibilityGuests_invisibleguests'] = document.getElementById("LJ__Setting__InvisibilityGuests_invisibleguests_self").checked == true ? 1 : document.getElementById("LJ__Setting__InvisibilityGuests_invisibleguests_anon").checked == true ? 2 : 0;
        }
        LJWidgetIPPU.superClass.doAjaxRequest.apply(this, [params]);
    },

    close: function close() {
        this.ippu.hide();
    },

    loadContent: function loadContent() {
        var reqOpts = this.reqParams;
        this.updateContent(reqOpts);
    },

    method: "POST",

    // request finished
    onData: function onData(data) {
        this.loaded = true;
    },

    render: function render(params) {}
});
/* <<< file end: js/ljwidget_ippu.js */

//# map link was there [ljwidget_ippu.js.map]
/* >>> file start: js/jquery/jquery.center.js */
/**
 * @author Valeriy Vasin (valeriy.vasin@sup.com)
 * @description Simple plugin for centrizing of content
 * @example
 *	$('.modal').center();	// place element with class 'modal' into the window center
 */

(function (a) {
	return a;
})();

(function ($) {
	$.fn.center = function () {
		var $win = $(window),
		    win = {
			width: $win.width(),
			height: $win.height()
		},
		    $el = this.first(),
		    el = {
			width: $el.outerWidth(),
			height: $el.outerHeight()
		};

		$el.css({
			position: 'fixed',
			left: '50%',
			top: '50%',
			marginTop: -(el.height / 2),
			marginLeft: -(el.width / 2)
		});

		return this;
	};
})(jQuery);
/* <<< file end: js/jquery/jquery.center.js */

//# map link was there [jquery.center.js.map]
/* >>> file start: js/jquery/dialogs.js */
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

//= require js/jquery/jquery.center.js

LJ.UI.registerTemplate('templates-Widgets-dialogs', "<div class=\"b-popup\"> <div class=\"b-popup-outer\"> <div class=\"b-popup-inner\"> <div class=\"b-dialog\"> {{if $data.title}} <div class=\"b-dialog-header\"> {{html $data.title}} </div> {{/if}} {{if ($data.type == \'prompt\' || $data.text)}} <div class=\"b-dialog-body\"> {{if $data.text}} {{html $data.text}} {{/if}} {{if ($data.type == \'prompt\')}} <div class=\"b-dialog-prompt-wrap\"> <input type=\"text\" name=\"dialog-prompt\" class=\"b-dialog-prompt\" value=\"\" {{if $data.placeholder}}placeholder=\"{{html $data.placeholder}}\"{{/if}} /> </div> {{/if}} </div> {{/if}} <div class=\"b-dialog-footer\"> {{if $data.is_mac}} {{if $data.type != \'alert\'}} <button type=\"button\" name=\"dialog-cancel\" class=\" b-dialog-btn b-dialog-cancel b-flatbutton b-flatbutton-neutral \" > {{html $data.no.text}} </button> {{/if}} <button type=\"button\" name=\"dialog-ok\" class=\" b-dialog-btn b-dialog-ok b-flatbutton \" > {{html $data.yes.text}} </button> {{else}} <button type=\"button\" name=\"dialog-ok\" class=\" b-dialog-btn b-dialog-ok b-flatbutton \" > {{html $data.yes.text}} </button> {{if $data.type != \'alert\'}} <button type=\"button\" name=\"dialog-cancel\" class=\" b-dialog-btn b-dialog-cancel b-flatbutton b-flatbutton-neutral \" > {{html $data.no.text}} </button> {{/if}} {{/if}} </div> </div> <i class=\"i-popup-close\"></i> </div> </div> </div> ", 'JQuery.stat');

/**
 * @author Valeriy Vasin (valeriy.vasin@sup.com)
 *
 * @description Implementation of custom dialogs for LiveJournal,
 * it will replace all system dialogs later (alert, prompt and confirm)
 *
 * Available dialogs:
 *  - LJ.dialogs.alert(text, options)
 *  - LJ.dialogs.confirm(text, options)
 *  - LJ.dialogs.prompt(text, options)
 *
 * Return value:
 * hash with 'yes' and 'no' methods to confirm or cancel dialog (look examples below)
 * Also all callbacks will be executed
 *
 * <text> is only necessary param. It could be a string or jQuery node
 *
 * Available options:
 *  - title: dialog title
 *  - fade: use fade layer or not. Default: true
 *  - show: show callback
 *  - hide: hide callback
 *  - defaultButton: yes/no/others
 *    Default button to be focused when dialog will be showed.
 *    If you set value that is not equal 'yes', 'no' button will be focused for 'confirm'
 *    and 'input' will be focused for 'prompt' dialog.
 *    Notice: if dialog is 'prompt' and 'defaultButton' differs from 'yes' or 'no'
 *        prompt input will be focused
 *  - yes: { text, action } text that will replace button standard and action for the button click.
 *      Also it's possible to set only action/text for 'yes' button (provide function/string instead of object)
 *  - no: { text, action } (or only action/text, if function/string has been provided instead of object)
 *      Button is available for confirm/prompt dialogs only
 *
 *  - value: specific value to be initially set for prompt dialog input
 *
 * Callbacks:
 *  - show: callback is fired when dialog shows
 *  - hide: callback is fired when dialog hides (no matter what button has been clicked)
 *  - yes.action / no.action: callbacks for actions
 *
 * Context for all callbacks is equal to dialog node (jQuery)
 *
 * @example
 * // simple form of alert dialog
 * LJ.dialogs.alert('Something happens!');
 *
 * // text param as jQuery node
 * var node = jQuery('<div />', { text: 'hello world', css: { color: 'blue' } })
 * LJ.dialogs.alert( node );
 *
 * // complex alert dialog, with reassigned values for yes/no buttons text
 * // and changed title
 * LJ.dialogs.alert('Something happens!', {
 *    title: 'hello world',
 *    yes: {
 *      text: 'Yes',
 *      action: function () { ... }
 *    },
 *    no: {
 *      text: 'No',
 *      action: function () { ... }
 *    }
 * });
 *
 * // using yes/no options with direct callback
 * LJ.dialogs.confirm('Something happens!', {
 *    yes: function () { ... },
 *    no: function () { ... }
 * });
 *
 * // using yes/no options with custom text
 * LJ.dialogs.alert('Something happens!', {
 *    yes: 'Yes, do it!',
 *    no: function () { ... }
 * });
 *
 * // prompt dialog with default value
 * LJ.dialogs.prompt('Provide your age, please', {
 *    value: '21',
 *    yes: function (value) {
 *      // value will contain string provided by user
 *    }
 * });
 *
 * // confirm dialog
 * LJ.dialogs.confirm('Are you sure?', {
 *    title: 'Confirm order removing',
 *    yes: function (state) {
 *      // state will be always 'true' for yes button click action
 *    },
 *    no: function (state) {
 *      // state will be always 'false' for no button click action
 *    }
 * });
 *
 * // using of returned methods
 * var dialog = LJ.dialogs.alert('Hello');
 * dialog.yes();
 *
 * // also it's possible to submit prompt() dialog and confirm()
 * var dialog = LJ.dialog.confirm('Are you sure?');
 * dialog.yes(); // => emulate pressing 'yes' button
 * dialog.no(); // => emulate pressing 'no' button
 *
 * // more complex example: form variable contains form node
 * // on which submit we should confirm whole dialog
 * // Also on form submit 'yes' action will be performed too
 * var dialog = LJ.dialog.confirm(form, {
 *   yes: {
 *     text: 'OK',
 *     action: function () {
 *       console.log('submit done!');
 *     }
 *   },
 *   show: function () {
 *     form.on('submit', function (e) {
 *       e.preventDefault();
 *       dialog.yes();
 *     });
 *   }
 * });
 *
 * @requires  $.fn.center plugin
 */

(function (a) {
  return a;
})();

(function ($) {
  'use strict';

  LJ.dialogs = {
    defaults: {

      alert: {
        // dialog title
        title: '',
        // use fading layer (true) or not (false)
        fade: true,
        // callback that is called when dialog appears
        show: $.noop,
        // callback that is called when dialog hides (no matter what button yes/no or even close link)
        // has been clicked
        hide: $.noop,
        // button that will be in focus, possible values: 'yes' or 'no'
        defaultButton: 'yes',
        // if function provided instead of hash - it will be applied as action
        yes: {
          text: LJ.ml('dialogs.yes'),
          action: $.noop
        }
      },

      confirm: {
        title: '',
        fade: true,
        show: $.noop,
        hide: $.noop,
        defaultButton: 'yes',
        yes: {
          text: LJ.ml('dialogs.yes'),
          action: $.noop
        },
        no: {
          text: LJ.ml('dialogs.no'),
          action: $.noop
        }
      },

      prompt: {
        title: '',
        fade: true,
        show: $.noop,
        hide: $.noop,
        // 'input' value have some reason, it should not be equal 'yes' or 'no' (prompt only)
        defaultButton: 'input',
        // default value that will be inside of input (prompt only)
        value: '',
        yes: {
          text: LJ.ml('dialogs.yes'),
          action: $.noop
        },
        no: {
          text: LJ.ml('dialogs.no'),
          action: $.noop
        }
      }
    }
  };

  var dialogs = function ($) {
    var alert,
        confirm,
        prompt,

    // dialog node
    dialog = null,

    // fade node
    fade = null,

    // options of current dialog
    currentOptions = null,
        tabOrderCollection = null,
        classNames = {
      'yesButton': '.b-dialog-ok',
      'noButton': '.b-dialog-cancel',
      'closeButton': '.i-popup-close',
      'promptInput': '.b-dialog-prompt',
      'header': '.b-dialog-header',
      'dialog': '.b-dialog',
      'body': '.b-dialog-body'
    };

    if (!LJ.Support.isMobile()) {
      $(document).on('keydown', function (e) {
        if (!dialog) {
          return;
        }

        switch (e.which) {
          case 27:
            // escape
            dialog.find(classNames.closeButton).trigger('click');
            break;
          case 9:
            // tab
            moveFocus(e.shiftKey ? -1 : 1);
            e.preventDefault();
            break;
        }
      });
    }

    /**
     * Focus control:
     * moves focus to the next button / input inside of the active dialog
     * @param {Number} step movement step: +1 / -1
     */
    function moveFocus(step) {
      var type = currentOptions.type,
          focused = null,
          inputs;

      // create tab order collection
      if (!tabOrderCollection) {
        tabOrderCollection = [];
        tabOrderCollection.push(dialog.find(classNames.yesButton));
        if (type === 'prompt') {
          tabOrderCollection.push(dialog.find(classNames.promptInput));
        }
        if (type === 'prompt' || type === 'confirm') {
          tabOrderCollection.push(dialog.find(classNames.noButton));
        }

        // add elements that could be focused and are inside of dialog body
        inputs = dialog.find(classNames.body).find('a,select,input,button').not(classNames.yesButton).not(classNames.noButton).not(classNames.promptInput);

        if (inputs.length) {
          tabOrderCollection = tabOrderCollection.concat(inputs.toArray().map($));
        }
      }

      tabOrderCollection.some(function (element, index) {
        var condition = element.is(':focus');

        if (condition) {
          focused = index;
        }
        return condition;
      });

      if (focused === null) {
        focused = 0;
      } else {
        focused += step;
        if (focused > tabOrderCollection.length - 1) {
          focused = 0;
        } else if (focused < 0) {
          focused = tabOrderCollection.length - 1;
        }
      }
      tabOrderCollection[focused].focus();
    }

    /**
     * Create fade element
     */
    function createFade() {
      fade = $('<div />', {
        'class': 'b-fader'
      }).prependTo(document.body);
    }

    function show(options) {
      var isBodyJqueryNode = _typeof(options.text) === 'object',
          // it could be only jquery (previously checked)
      node = null,
          header = null;

      currentOptions = options;

      if (isBodyJqueryNode) {
        node = $('<div class="b-dialog-body" />').append(options.text);
        options.text = '';
      }

      dialog = LJ.UI.template('templates-Widgets-dialogs', options);

      if (isBodyJqueryNode) {
        header = dialog.find(classNames.header);
        if (header.length) {
          header.after(node);
        } else {
          dialog.find(classNames.dialog).prepend(node);
        }
      }

      dialog.prependTo(document.body).center();

      // show fade (and create if not exist, but only once)
      if (options.fade) {
        fade = $('.b-fader');

        if (!fade.length) {
          createFade();
        } else {
          fade.show();
        }
      }

      // close action: hide dialog, nothing more
      dialog.on('click', classNames.closeButton, hide);

      // set focus on the default button
      if (options.defaultButton === 'no' && options.type !== 'alert') {
        dialog.find(classNames.noButton).focus();
      } else if (options.type === 'prompt' && options.defaultButton !== 'yes') {
        dialog.find(classNames.promptInput).focus();
      } else {
        dialog.find(classNames.yesButton).focus();
      }

      // show callback
      options.show.call(dialog, options);
    }

    function hide() {
      if (fade) {
        fade.hide();
      }

      // reset tab collection order
      tabOrderCollection = null;

      // hide callback
      currentOptions.hide.call(dialog, currentOptions);

      // remove dialog node and reset variable
      dialog.remove();
      dialog = null;
    }

    /**
     * Check dialog params and throws errors, if they are incorrect
     * Also do options preprocessing (check for yes/no direct callbacks)
     * @param  {String|jQuery} text  Dialog text (text or jQuery node to insert)
     * @param  {Object} options Dialog options
     */
    function processParams(text, options) {

      // it should acceat string or jQuery node
      if (!(typeof text === 'string' && text.length !== 0 || (typeof text === 'undefined' ? 'undefined' : _typeof(text)) === 'object' && text.jquery)) {
        throw new Error('You should provide text or node as `text` param for the dialog');
      }
      if (options && (typeof options === 'undefined' ? 'undefined' : _typeof(options)) !== 'object') {
        throw new Error('Dialog options should be an object');
      }
      if (dialog) {
        throw new Error('You are not able to create multiple dialogs at the time');
      }

      // Check if yes/no options has been provided as direct callback/text
      if (options && options.yes) {
        if (typeof options.yes === 'function') {
          options.yes = { action: options.yes };
        } else if (typeof options.yes === 'string') {
          options.yes = { text: options.yes };
        }
      }

      if (options && options.no) {
        if (typeof options.no === 'function') {
          options.no = { action: options.no };
        } else if (typeof options.no === 'string') {
          options.no = { text: options.no };
        }
      }
    }

    /**
     * Alert dialog
     * @param  {String} text  Text to show in the body
     * @param  {Object} options Dialog options
     */
    alert = function alert(text, options) {
      processParams(text, options);

      // extend options with defaults
      options = $.extend(true, {}, LJ.dialogs.defaults.alert, { type: 'alert', text: text }, options || {});
      show(options);

      dialog.on('click', classNames.yesButton, function () {
        if (options.yes.action.call(dialog, hide) === undefined) {
          hide();
        }
      });
    };

    /**
     * Confirm dialog
     * @param  {String} text  Text to show in the body
     * @param  {Object} options Dialog options
     */
    confirm = function confirm(text, options) {
      processParams(text, options);

      // extend options with defaults
      options = $.extend(true, {}, LJ.dialogs.defaults.confirm, { type: 'confirm', text: text }, options || {});
      show(options);

      // yes button click handler
      dialog.on('click', classNames.yesButton, function () {
        if (options.yes.action.call(dialog, true, hide) === undefined) {
          hide();
        }
      });

      // no button click handler
      dialog.on('click', classNames.noButton, function () {
        options.no.action.call(dialog, false);
        hide();
      });
    };

    /**
     * Prompt dialog
     * @param  {String} text  Text to show in the body
     * @param  {Object} options Dialog options
     */
    prompt = function prompt(text, options) {
      processParams(text, options);

      // extend options with defaults
      options = $.extend(true, {}, LJ.dialogs.defaults.prompt, { type: 'prompt', text: text }, options || {});
      show(options);

      // set default value
      if (options.value) {
        dialog.find(classNames.promptInput).val(options.value);
      }

      // yes button click handler
      dialog.on('click', classNames.yesButton, function () {
        if (options.yes.action.call(dialog, dialog.find(classNames.promptInput).val()) === undefined) {
          hide();
        }
      });

      // no button click handler
      dialog.find(classNames.noButton).on('click', function () {
        options.no.action.call(dialog);
        hide();
      });

      if (!LJ.Support.isMobile()) {

        // enter click on prompt input should confirm dialog (click 'yes')
        dialog.find(classNames.promptInput).on('keyup', function (e) {
          if (e.which === 13) {
            dialog.find(classNames.yesButton).trigger('click');
          }
        });
      }
    };

    /**
     * Emulate yes click
     */
    function yes() {
      dialog.find(classNames.yesButton).trigger('click');
    }

    /**
     * Emulate no click
     */
    function no() {
      dialog.find(classNames.noButton).trigger('click');
    }

    /**
     * Safe function call: catch all inner exceptions and print error message
     * @param  {Function} fn Function to be called
     * @return {Function}  Safe function
     */
    function safe(fn) {
      return function () {
        try {
          fn.apply(this, arguments);
          return {
            yes: yes,
            no: no
          };
        } catch (e) {
          console.error(e.message);
        }
      };
    }

    return {
      alert: safe(alert),
      confirm: safe(confirm),
      prompt: safe(prompt)
    };
  }($);

  $.extend(true, LJ.dialogs, dialogs);
})(jQuery);
/* <<< file end: js/jquery/dialogs.js */

//# map link was there [dialogs.js.map]
/* >>> file start: js/scheme/schemius/controlstrip.js */
// By "Schemius' controlstrip" we mean noticeable dark strip with various buttons under the header.

//= require js/ljwidget_ippu.js
//= require js/jquery/dialogs.js

/* eslint-disable angular/definedundefined */
/* eslint-disable angular/angularelement */
/* eslint-disable angular/document-service */

/* global LJ_IPPU */

(function (a) {
  return a;
})();

(function () {
  LJ.define('LJ.Schemius.controlstrip');
  LJ.Schemius.controlstrip.init = function (params) {
    var $ = params.jQuery,
        $schemiusControlstrip = $('.js--controlstrip');

    if (!$schemiusControlstrip.length) {
      return;
    }
    var $userStatus = $schemiusControlstrip.find('.js--user_status'),
        $userStatusDash = $schemiusControlstrip.find('.js--user_status_dash'),
        $addFriend = $schemiusControlstrip.find('.js--item-friending.js--add'),
        $modifyFriend = $schemiusControlstrip.find('.js--item-friending.js--modify'),
        $subscribeItem = $schemiusControlstrip.find('.js--item-subscribe.js--add'),
        $modifySubscription = $schemiusControlstrip.find('.js--item-subscribe.js--modify'),
        $subscriptionOff = $schemiusControlstrip.find('.js--item-subscribe.js--disabled'),
        journalUsername = LJ.get('current_journal.username'),
        isMobile = LJ.Support.isMobile(),
        state = {
      subscriptions: {
        remote: {},
        journal: {}
      },
      friendLists: {
        remote: {},
        journal: {}
      },
      friendingStatus: $userStatus.html(),
      friendingBlocker: null,
      subscriptionBlocker: null
    };

    if (state.friendingStatus) {
      state.friendingStatus = state.friendingStatus.trim();
    }

    var refreshFriendingItems = function refreshFriendingItems() {
      if (state.friendLists.remote.journal) {
        $addFriend.hide();
        $modifyFriend.show();
      } else {
        $addFriend.show();
        if (state.friendingBlocker && !isMobile) {
          $addFriend.find('a').addClass('js--disabled');
        } else {
          $addFriend.find('a').removeClass('js--disabled');
        }
        $modifyFriend.hide();
      }
    },
        refreshSubscribeButtons = function refreshSubscribeButtons() {
      if (state.friendLists.remote.journal) {
        $subscribeItem.hide();
        $modifySubscription.hide();
        $subscriptionOff.show();
        return;
      }

      $subscriptionOff.hide();
      if (state.subscriptions.remote.journal) {
        $subscribeItem.hide();
        $modifySubscription.show();
      } else {
        $subscribeItem.show();
        if (state.subscriptionBlocker && !isMobile) {
          $subscribeItem.find('a').addClass('js--disabled');
        } else {
          $subscribeItem.find('a').removeClass('js--disabled');
        }
        $modifySubscription.hide();
      }
    },
        updateView = function updateView() {
      refreshFriendingItems();
      refreshSubscribeButtons();
      $userStatus.html(state.friendingStatus);
      $userStatus.attr('title', state.friendingStatus);
      if (state.friendingStatus) {
        $userStatus.show();
        $userStatusDash.show();
      } else {
        $userStatus.hide();
        $userStatusDash.hide();
      }
    },
        onUserRelationChange = function onUserRelationChange(eventData) {
      if (!eventData) {
        return;
      }
      var data = eventData.data;

      if (!data) {
        return;
      }
      state.friendLists.remote.journal = data.is_friend;
      state.subscriptions.remote.journal = data.is_subscriber;
      state.friendingStatus = data.controlstrip_status;
      updateView(data);
    },
        showWarningNote = function showWarningNote(target, message) {
      if (!message) {
        return;
      }
      LJ_IPPU.showNote(message, target);
    },
        showWarningPopup = function showWarningPopup(message) {
      if (!message) {
        return;
      }
      LJ.dialogs.alert(message, {
        yes: {
          text: 'OK'
        }
      });
    },
        refreshBlockerData = function refreshBlockerData() {
      if (!LJ.get('remote')) {
        return Promise.resolve();
      }
      return Promise.all([LJ.Api.call('relations.can_add_friends', { target: journalUsername }), LJ.Api.call('relations.can_add_subscribers', { target: journalUsername })]).then(function (allResponse) {
        if (!allResponse[0] || !allResponse[1]) {
          return;
        }
        if (allResponse[0].can_add_friends) {
          state.friendingBlocker = null;
        } else {
          state.friendingBlocker = {
            message: allResponse[0].add_friends_error
          };
        }
        if (allResponse[1].can_add_subscribers) {
          state.subscriptionBlocker = null;
        } else {
          state.subscriptionBlocker = {
            message: allResponse[1].add_subscribers_error
          };
        }
      });
    };

    LJ.Event.on('relations.changed', function (eventData) {
      // Make a rough UI update immediately
      onUserRelationChange(eventData);
      // Now we have full data. Do an accurate UI update
      refreshBlockerData().then(updateView);
    });
    $addFriend.on('click', function (e) {
      if (state.friendLists.remote.journal) {
        return;
      }
      e.preventDefault();
      var blocker = state.friendingBlocker;
      if (blocker) {
        if (isMobile) {
          showWarningPopup(blocker.message);
        } else {
          showWarningNote($addFriend[0], blocker.message);
        }
        return;
      }
      LJ.Api.call('relations.addfriend', {
        target: journalUsername
      }).then(function (response) {
        return LJ.Event.trigger('relations.changed', {
          action: 'addFriend',
          username: journalUsername,
          data: response
        });
      });
    });
    $subscribeItem.on('click', function (e) {
      if (state.subscriptions.remote.journal) {
        return;
      }
      e.preventDefault();
      var blocker = state.subscriptionBlocker;
      if (blocker) {
        if (isMobile) {
          showWarningPopup(blocker.message);
        } else {
          showWarningNote($subscribeItem[0], blocker.message);
        }
        return;
      }
      LJ.Api.call('relations.addfriend', {
        target: journalUsername,
        // eslint-disable-next-line camelcase
        is_subscriber: 1 // we pass this as we want to subscribe, not to add to friend list
      }).then(function (response) {
        return LJ.Event.trigger('relations.changed', {
          action: 'addFriend',
          username: journalUsername,
          data: response
        });
      });
    });

    if ($schemiusControlstrip.attr('data-remote-friends-journal')) {
      state.friendLists.remote.journal = true;
    }
    if ($schemiusControlstrip.attr('data-remote-subscribed-to-journal')) {
      state.subscriptions.remote.journal = true;
    }

    refreshBlockerData().then(updateView);
  };
})();
/* <<< file end: js/scheme/schemius/controlstrip.js */

//# map link was there [controlstrip.js.map]
/* >>> file start: js/scheme/schemius.js */
//= require js/core/angular/api.js
//= require js/lib/jquery.selectric.min.js
//= require js/captcha.js
//= require js/scheme/schemius/feedback.js
//= require js/notifications/main.js
//= require js/facebookMigration/migration.js
//= require js/scheme/schemius/controlstrip.js

/* eslint-disable angular/definedundefined */
/* eslint-disable angular/angularelement */
/* eslint-disable angular/document-service */

(function (a) {
  return a;
})();

(function ($) {
  // wait for load if controlsrip does not exist - LJSUP-21958 (event trigger controlstrip.js)
  $(function () {
    if ($('.s-header').length === 0) {
      $('html').on('controlstrip-initialized', controlstripHandler);
    } else {
      controlstripHandler();
    }
  });

  function controlstripHandler() {

    function isSpecialKey(event) {

      // return false if ctrl/cmd pushed
      return !!(event.ctrlKey || event.metaKey && LJ.Support.isMac);
    }

    function closeLoginForm(event) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      _body.removeClass(splashLoginFormClass);
      _body.removeClass(userMenuOpenedClass);
      $htmlElement.removeClass(splashLoginFormClass);
      $htmlElement.removeClass(userMenuOpenedClass);
    }

    function showLoginForm(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      closeNavMenus();
      //close sticky on menu open LJSUP-23643
      LJ.Event.trigger('Messages:closeByMenus');
      $htmlElement.addClass(userMenuOpenedClass);
      _body.addClass(splashLoginFormClass);
      setTimeout(function () {
        $('#user').focus();
      }, 300);
    }

    function toggleLoginForm() {
      if ($htmlElement.hasClass(userMenuOpenedClass)) {
        closeLoginForm();
      } else {
        showLoginForm();
      }
    }

    /**
     *  Search Box pageTop toggle.
     */
    var showanswer_block,
        groups_block,
        $message,
        closeNavMenus,
        $htmlElement,
        $sBody,
        $commonMenuBtn,
        $userMenuBtn,
        $externalLogin,
        commonMenuOpenedClass,
        userMenuOpenedClass,
        timer,
        bubbles,
        dropMenus,
        openMenuClass,
        isMobileView,
        isMenuOpen,
        externalLoginShownClass,
        mediusSchemius = LJ.Flags.isEnabled('medius_schemius'),
        _body = $(document.body),
        header = $('.s-header'),
        searchField = $(mediusSchemius ? '.js-header-search-input' : '.s-inline-search-input'),
        searchButton = $(mediusSchemius ? '.js-header-search-button' : '.s-do-item-search-btn'),
        searchClass = 'p-show-search',
        preventClose = false,
        splashLoginFormClass = 'p-loginform',
        langBox = $(mediusSchemius ? '.js-header-nav-lang' : '.s-nav-item-lang'),
        langBoxClass = 's-nav-item-lang-open',
        onSearchBtnClick = function onSearchBtnClick(event) {
      // do nothing if ctrl/cmd
      if (isSpecialKey(event)) {
        return;
      }

      // search opened and not empty
      if (header.hasClass(searchClass) && searchField.val()) {
        searchButton.prop('type', 'submit');
      }

      header.toggleClass(searchClass);

      if (header.hasClass(searchClass)) {
        preventClose = true;

        setTimeout(function () {
          searchField.focus();
        }, 500);
      }
    },
        $searchForm = $('.s-header-search__form');

    $searchForm.on('submit', function () {
      var query = searchField.val(),
          words = query.split(' ').filter(function (a) {
        return a;
      }),
          tagQuery = words.every(function (word) {
        return word.length > 1 && word.indexOf('#') === 0;
      });
      // Filtering out '' elements standing for whitespaces

      searchField.attr('name', tagQuery ? 'tags' : 'q');
    });

    if (LJ && LJ.Util && LJ.Util.Action) {
      LJ.Util.Action.login = showLoginForm;
    }

    searchButton.on('click', onSearchBtnClick);

    searchButton.on('blur', function () {
      // if user went to serp, return search to previous state
      if (searchButton.prop('type') === 'submit') {
        searchButton.prop('type', 'button');
        searchField.val('');
      }
    });

    searchField.on('click', function () {
      preventClose = true;
    });

    _body.on('click', function () {
      if (!preventClose) {
        header.removeClass(searchClass);
        langBox.removeClass(langBoxClass);
      }
      preventClose = false;
    });

    // don't allow iOS user to pinch while side menu is opened
    _body.on('gesturestart', function (event) {
      if ($('html').hasClass('p-nav-common-menu-open') || $('html').hasClass('p-nav-user-menu-open')) {
        event.preventDefault();
      }
    });

    // add class for IE 11
    if (!!(navigator.userAgent.match(/Trident/) && navigator.userAgent.match(/rv[ :]11/))) {
      $('html').addClass('html-ie11');
    }

    // add class for IE 10
    if (!!navigator.appVersion.match(/MSIE\s10/)) {
      $('html').addClass('html-ie10');
    }

    /**
     * @bug LJSUP-22377
     * Since we don't have a reliable device detection algorythm, let's trust browser's User-Agent string.
     * UA strings look something like this (copied from Chrome device emulator):
     * Mozilla/5.0 (iPad; CPU OS 7_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53
     * Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_2_1 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8C148 Safari/6533.18.5
     * Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 520)
     * Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2307.2 Safari/537.36
     */
    $htmlElement = $('html');
    $htmlElement.addClass(LJ.Support.isMobile() ? 'html-mobile' : 'html-desktop');
    // add class for fix android default browser pinching bug - LJSUP-21392
    if (~navigator.userAgent.toLowerCase().indexOf('android')) {
      $htmlElement.addClass('html-android');
    } else if (~navigator.userAgent.toLowerCase().indexOf('iphone') || ~navigator.userAgent.toLowerCase().indexOf('ipad')) {
      $htmlElement.addClass('html-ios');
    } else if (~navigator.userAgent.toLowerCase().indexOf('windows phone')) {
      $htmlElement.addClass('html-wphone');
    }

    /**
     * Lang icon for unlogged users.
     */
    function langSwitch(langCode) {
      if (langCode) {
        LJ.Api.call('lang.set', { lang: langCode }, function () {
          location.reload();
        });
      }
    }

    $('[data-lang]').on('click', function () {
      langSwitch($(this).data('lang'));
    });

    langBox.on('click', function (event) {
      if (isSpecialKey(event)) {
        return;
      }

      event.preventDefault();
      langBox.toggleClass(langBoxClass);

      preventClose = langBox.hasClass(langBoxClass);
    });

    /**
     * Lang footer select
     */
    $('.s-lang-select').selectric({
      customClass: {
        prefix: 'b-selectus',
        postfixes: 'Input Items Open Disabled TempShow HideSelect Wrapper Hover Responsive Above Scroll',
        camelCase: false,
        overwrite: false
      }
    }).on('change', function () {
      langSwitch($(this).val());
    });

    /**
     * selectricus
     */
    $('.selectricus').selectric({
      customClass: {
        prefix: 'b-selectus',
        postfixes: 'Input Items Open Disabled TempShow HideSelect Wrapper Hover Responsive Above Scroll',
        camelCase: false,
        overwrite: false
      },
      expandToItemText: true,
      disableOnMobile: false
    });

    /**
     * Link to mobile site
     */
    $('.b-message-mobile-close').one('click', function () {
      $('.b-message-mobile').hide();
    });

    /**
     * Main Navigation
     */
    dropMenus = $(mediusSchemius ? '.js-header-nav-drop-master' : '.s-drop-master');
    openMenuClass = mediusSchemius ? 's-header-nav-drop--open' : 's-drop-open';
    isMobileView = LJ.Support.isMobile();
    isMenuOpen = false;

    if (!isMobileView) {
      bubbles = $(':lj-bubble');

      dropMenus.on('mouseenter', function () {
        var currentMenu = $(this),
            delay = 300;

        // clear state if already open
        if (isMenuOpen) {
          clearTimeout(timer);
          delay = 0;
        }

        //drop menu with delay
        timer = setTimeout(function () {

          //close all other menus
          dropMenus.removeClass(openMenuClass);

          //open current menu
          currentMenu.addClass(openMenuClass);
          isMenuOpen = true;

          //close bubbles on menu open LJSUP-18463
          bubbles.bubble('hide');
        }, delay);
      }).on('mouseleave', function () {
        var currentMenu = $(this);

        // close menu with delay
        if (isMenuOpen) {

          timer = setTimeout(function () {
            currentMenu.removeClass(openMenuClass);
            isMenuOpen = false;
          }, 500);

          return;
        }

        // remove opening timer
        clearTimeout(timer);
        currentMenu.removeClass(openMenuClass);
      });
    }

    // mobile version prevent
    // doesn't prevent for schemius v4 on mobile devices with screen larger than 650px
    // remove width check (window.innerWidth >= 650) for fix LJSUP-21780
    if (isMobileView) {
      // menu accordion
      dropMenus.on('click', function (event) {
        var currentMenu = $(this),
            hasSubItems = currentMenu.find('li').length !== 0,
            iconClick = $(event.target).closest('span').is('.s-header-extra-menu-item-link-icon');

        // not prevent clicks input in menus.
        if (event.target.tagName.toLowerCase() === 'input') {
          return;
        }

        if (!currentMenu.hasClass(openMenuClass) && hasSubItems && !iconClick) {
          event.preventDefault();
        }

        if (!currentMenu.hasClass(openMenuClass) && !iconClick) {
          isMenuOpen = true;
          dropMenus.removeClass(openMenuClass);
          event.stopPropagation();
          $(':lj-bubble').bubble('hide');
        }

        currentMenu.toggleClass(openMenuClass);
      });

      // close drop-down menu in journal (LJSUP-22111)
      _body.on('click', function (event) {
        var isNotDrop = $(event.target).closest(dropMenus).length === 0,
            isOutBubble = $(event.target).is('.b-popup');

        if (isOutBubble) {
          event.stopPropagation();
          $(':lj-bubble').bubble('hide');
        }

        if (isMenuOpen && isNotDrop) {
          isMenuOpen = false;
          dropMenus.removeClass(openMenuClass);
          event.preventDefault();
        }
      });

      //iphone safari crash on css transition+calc
      if (LJ.Support.isMobile && LJ.Support.browser.safari) {
        _body.addClass('iphone');
      }

      // prevent tap on active item (in categories/filters menu) to allow collapse it.
      $('.l-flatslide-menu-active, .l-flatslide-menu-expander').click(function (event) {
        event.preventDefault();
        $(this).closest('.l-flatslide-menu').toggleClass('l-flatslide-menu-expanded');
      });

      // form with target="_blank" won't submit on mobile devices (LJSUP-22249)
      $('.s-header-search, .s-header-item-search__form').removeAttr('target');
    }

    /**
     * Open/close common and user navigation menu for page width less than 650px
     */

    $htmlElement = $('html');
    $sBody = $('.s-body');
    $commonMenuBtn = $(mediusSchemius ? '.js-header-menu-button' : '.s-nav-control-common');
    $userMenuBtn = $(mediusSchemius ? '.js-header-login' : '.s-nav-control-user, .s-nav-control-login');
    commonMenuOpenedClass = 'p-nav-common-menu-open';
    userMenuOpenedClass = 'p-nav-user-menu-open';

    $commonMenuBtn.on('click', function () {
      //close sticky on menu open LJSUP-23643
      LJ.Event.trigger('Messages:closeByMenus');
      $htmlElement.toggleClass(commonMenuOpenedClass);
      closeLoginForm();
    });

    $userMenuBtn.on('click', toggleLoginForm);

    closeNavMenus = function closeNavMenus() {
      $htmlElement.removeClass(commonMenuOpenedClass);
      $htmlElement.removeClass(userMenuOpenedClass);
    };

    $sBody.on('click', function () {
      closeNavMenus();
      closeLoginForm();
    });

    $('.s-header-menu-head__drop').click(function () {
      var $submenuContainer = $(this).closest('.s-header-menu-drop'),
          $itemsList = $submenuContainer.find('.s-header-menu-list-sub'),
          menuOpenClass = 's-header-menu-drop--open';

      if ($submenuContainer.is('.' + menuOpenClass)) {
        $itemsList.css('max-height', '');
      } else {
        var totalListItemsHeight = $itemsList.children().toArray().reduce(function (acc, ent) {
          return acc + $(ent).height();
        }, 0);
        $itemsList.css('max-height', totalListItemsHeight);
      }

      $submenuContainer.toggleClass(menuOpenClass);
    });

    /**
     * Login Form popup
     */
    $(mediusSchemius ? '.js-header-login' : '.s-nav-item-login').on('click', showLoginForm);
    $('.js-loginform-close').on('click', closeLoginForm);

    $(document).on('keyup', function (event) {
      if (event.key === 'Escape' || event.keyCode === 27) {
        closeLoginForm(event);
      }
    });

    $('.b-fader').on('click', closeLoginForm);

    $externalLogin = $('.b-loginform-body > .b-loginform-field');
    externalLoginShownClass = 'active';

    function toggleExternalLogin(show) {
      $externalLogin.toggleClass(externalLoginShownClass, show);
      if (show) {
        $('.b-loginform-click-trap').removeClass('b-loginform-click-trap--show');
      } else {
        $('.b-loginform-click-trap').addClass('b-loginform-click-trap--show');
        $('.b-loginform').removeClass('openid-auth-state');
      }
    }

    if (mediusSchemius) {

      $('.lj-openid-auth-button').on('click', function (event) {
        event.preventDefault();
        toggleExternalLogin(false);
        $('.b-loginform').addClass('openid-auth-state');
      });
    } else {

      $('.lj-openid-auth-button').on('click', function (event) {
        event.preventDefault();
        $('.b-loginform').toggleClass('openid-auth-state');
        if ($('.b-loginform').hasClass('openid-auth-state')) {
          $('#openid').focus();
        } else {
          $('#user').focus();
        }
      });
    }

    if (mediusSchemius) {
      $('.js-login-close').on('click', function (event) {
        toggleExternalLogin(false);
        closeLoginForm(event);
      });
      $('.b-loginform-click-trap').on('click', function () {
        return toggleExternalLogin(true);
      });
      $('.b-loginform-toggle-link').on('click', function () {
        return toggleExternalLogin(false);
      });

      if (LJ.Flags.isEnabled('notification_center')) {
        angular.bootstrap(mediusSchemius ? '.js-header-notifications' : '.mds-do', ['Notifications']);
      }
    }

    /**
     * Change default userpic
     */
    LJ.Event.on('userpic.changed', function (newUserpicSrc) {
      $('.s-userpic').css('backgroundImage', 'url(' + newUserpicSrc + ')');
    });

    /**
     * LJ Video Popup for new user (through YouTube Api)
     * Sets cookie 'welcome_ljvideo'
     */
    if (LJ.Flags.isEnabled('ljwelcomevideo') && !isMobileView && !LJ.get('remote') && // not authorized
    !LJ.Cookie.get('welcome_ljvideo') && // no cookie set
    LJ.get('remote_is_sup') === 0 && // non cyrillic
    !$('.appwidget-login').length // no login widget on page
    ) {
        LJ.injectScript('https://www.youtube.com/player_api').then(function () {
          var video = $('.s-ljvideo'),
              player;

          _body.addClass('p-ljvideo');

          window.onYouTubePlayerAPIReady = function () {
            player = new window.YT.Player('s-ljvideo-player', {
              width: '640',
              height: '360',
              videoId: 'wq0YmQ4xIeU',
              playerVars: {
                rel: 0
              },
              events: {
                'onStateChange': onPlayerStateChange
              }
            });
          };

          $('.b-fader, .s-ljvideo-close').on('click', function () {
            if (_body.hasClass('p-ljvideo')) {
              _body.removeClass('p-ljvideo');
              player.destroy();
              LJ.Cookie.setGlobal('welcome_ljvideo', 1, { expires: 14 });
            }
          });

          // when video ends
          function onPlayerStateChange(event) {

            // 0 - video ends
            // 2 - video paused
            if (event.data === 0 || event.data === 2) {
              video.addClass('s-ljvideo-end');
            }

            // 1 - play video
            if (event.data === 1) {
              video.removeClass('s-ljvideo-end');
            }
          }
        });
      }

    $message = $('.s-header .i-supus-new, .s-header-messages-count');

    LJ.Event.on('message:count:change', function (count) {
      if (count > 0) {
        $message.html(count);
        $message.removeClass('s-header-messages-count-empty');
      } else {
        $message.addClass('s-header-messages-count-empty');
      }
    });

    /**
     * LJSUP-19628: Non-js version for answer and suggest forms
     * url: https://www.livejournal.com/writersblock/answer?qid=1234567890
     */

    groups_block = $('.flatquestion-nojs-friendsgroups');
    showanswer_block = $('.flatquestion-popup-field-showanswer');

    $('.flatquestion-popup-select').on('change', function () {
      if ($(this).val() === 'custom') {
        groups_block.show();
      } else {
        groups_block.hide();
      }

      if ($(this).val() === 'public') {
        showanswer_block.show();
      } else {
        showanswer_block.hide();
      }
    });

    LJ.Schemius.controlstrip.init({
      jQuery: $
    });
  }
})(jQuery);
/* <<< file end: js/scheme/schemius.js */

//# map link was there [schemius.js.map]
