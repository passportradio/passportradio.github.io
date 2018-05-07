/* >>> file start: js/widgets/angular/mediusSubscribe.js */
//!= require js/core/angular/messages.js

//= require_ml medius.subscribe.banner.title
//= require_ml medius.subscribe.banner.text
//= require_ml medius.subscribe.button.text
//= require_ml medius.subscribe.subscribed
//= require_ml medius.footer.newsletter

//= require_ml medius.main.subscription.text
//= require_ml medius.main.subscription.success
//= require_ml medius.main.subscription

//= require_ml schemius.medius.subscribe
//= require_ml schemius.medius.subscribetonews
//= require_ml schemius.medius.dailynewsletter
//= require_ml schemius.medius.youremail
//= require_ml schemius.medius.subscribed
//= require_ml schemius.medius.unsubscribe

Site.page.template['Widgets/Medius/subscribe.tmpl'] = '<!-- if subscribed -->\n\n<div class=\"subscription\">\n    <h4 class=\"mdsfooter-section__title\" lj-ml=\"medius.footer.newsletter\"></h4>\n    <header class=\"subscription__header\">\n        <h2 lj-ml=\"medius.subscribe.banner.title\" class=\"subscription__title\"></h2>\n        <p lj-ml=\"medius.subscribe.banner.text\" class=\"subscription__title subscription--subtitle\"></p>\n    </header>\n    <form class=\"subscription__aside\">\n        <button ng-click=\"subscribe.do($event)\" lj-ml=\"medius.subscribe.button.text\" class=\"flatbutton flatbutton--small\"></button>\n    </form>\n</div>\n';
Site.page.template['Widgets/Medius/subscribe137.tmpl'] = '<!-- if subscribed -->\n\n<div \n    class=\"stories__subscription-main story story--size-10by05\"\n    ng-class=\"{\n      \'stories__subscription-main--subscribed\': subscribe.subscribed,\n      \'stories__subscription-main--hide\': subscribe.hide\n    }\"\n    >\n    <div class=\"stories__subscription-main-inner\">\n        <span\n            class=\"stories__subscription-main-text\"\n            lj-ml=\"medius.main.subscription.text\"\n            >\n        </span>\n        <span\n            class=\"stories__subscription-main-success\"\n            lj-ml=\"medius.main.subscription.success\"\n            >\n        </span>\n        <button\n            class=\"flatbutton\"\n            lj-ml=\"medius.main.subscription\"\n            ng-click=\"subscribe.do($event)\" \n            >\n        </button>\n    </div>\n</div>\n';
Site.page.template['Widgets/Medius/schemius_header_subscribe.tmpl'] = '<header\n    class=\"\n        s-header-menu-head\n        s-header-menu-subscription__head\n        \"\n    >\n    <span\n        class=\"s-header-menu-head__title\"\n        ><!--\n        --><span\n            class=\"s-header-menu-head__title--long\"\n            lj-ml=\"schemius.medius.subscribetonews\"\n            ></span><!--\n        --><span\n            class=\"s-header-menu-head__title--short\"\n            lj-ml=\"schemius.medius.dailynewsletter\"\n            ></span><!--\n    --></span>\n</header>\n\n<div\n    class=\"s-header-menu-subscription__body\"\n    >\n\n    <div\n        class=\"\n            s-header-menu-subscription__unsubscribed\n            s-header-menu-subscription-unsubscribed\n            \"\n        >\n        <button\n            type=\"submit\"\n            class=\"s-header-menu-subscription-unsubscribed__button\"\n            ng-click=\"subscribe.do($event)\"\n            lj-ml=\"schemius.medius.subscribe\"\n            ></button>\n    </div>\n\n    <div\n        class=\"\n            s-header-menu-subscription__subscribed\n            s-header-menu-subscription-subscribed\n            \"\n        >\n        <span\n            class=\"s-header-menu-subscription-subscribed__icon\"\n            lj-svg-icon=\"flaticon--check\"\n            ></span>\n        <h3\n            class=\"s-header-menu-subscription-subscribed__title\"\n            lj-ml=\"schemius.medius.subscribed\"\n            ></h3>\n    </div>\n</div>\n';

(function () {
  'use strict';

  mediusSubscribeCtrl.$inject = ['Api', 'Messages'];
  mediusSubscribe137.$inject = ['$timeout'];
  mediusSchemiusHeaderSubscribe.$inject = ['$timeout'];
  angular.module('Medius.Subscribe', ['LJ.Messages', 'LJ.Api']);
  angular.module('Medius.Subscribe').controller('mediusSubscribeCtrl', mediusSubscribeCtrl).directive('mediusSubscribe', mediusSubscribe).directive('mediusSubscribe137', mediusSubscribe137).directive('mediusSchemiusHeaderSubscribe', mediusSchemiusHeaderSubscribe);

  if (LJ.Flags.isEnabled('medius_schemius')) {
    angular.element(window.document) // eslint-disable-line angular/document-service
    .ready(function () {
      // bootstrap directives
      angular.bootstrap('.s-header-menu-subscription', ['Medius.Subscribe']);
    });
  }

  function mediusSubscribeCtrl(Api, Messages) {
    var vm = this; // eslint-disable-line

    vm.do = subscribe; // eslint-disable-line

    function subscribe(event) {
      if (LJ.get('is_subscribed')) {
        return;
      }
      if (!LJ.get('remote')) {
        return LJ.Util.Action.login(event);
      }
      return Api.call('discovery.subscribe', null, { silent: true }).then(vm.hideWidget).catch(onError); // eslint-disable-line
    }

    function onError(_ref) {
      var message = _ref.message;

      if (message === 'Access Denied') {
        LJ.Util.Action.login();
      } else {
        Messages.add({ type: 'error', body: message });
      }
    }
  }

  function mediusSubscribe() {
    return {
      restrict: 'AE',
      templateUrl: 'subscribe.tmpl',
      controller: 'mediusSubscribeCtrl',
      controllerAs: 'subscribe',
      link: linkFn
    };

    function linkFn(scope, element, attributes, vm) {
      var isSubscribed = LJ.get('is_subscribed');
      vm.widget = element;
      vm.hideWidget = function (_ref2) {
        var status = _ref2.status;

        if (status === 'OK') {
          vm.widget.addClass('stories__subscription--hidden');
        }
      };

      if (isSubscribed || angular.isUndefined(isSubscribed)) {
        return vm.hideWidget({ status: 'OK' });
      }
    }
  }

  function mediusSubscribe137($timeout) {
    return {
      restrict: 'AE',
      templateUrl: 'subscribe137.tmpl',
      controller: 'mediusSubscribeCtrl',
      controllerAs: 'subscribe',
      link: linkFn
    };

    function linkFn(scope, element, attributes, vm) {
      var isSubscribed = LJ.get('is_subscribed');
      vm.widget = element;
      vm.hideWidget = function (_ref3) {
        var status = _ref3.status;

        if (status === 'OK') {
          vm.subscribed = true;
          $timeout(function () {
            vm.hide = true;
          }, 3000);
        }
      };

      if (isSubscribed || angular.isUndefined(isSubscribed)) {
        return vm.hideWidget({ status: 'OK' });
      }
    }
  }

  function mediusSchemiusHeaderSubscribe($timeout) {
    return {
      restrict: 'AE',
      templateUrl: 'schemius_header_subscribe.tmpl',
      controller: 'mediusSubscribeCtrl',
      controllerAs: 'subscribe',
      link: linkFn
    };

    function linkFn(scope, element, attributes, vm) {
      vm.widget = element;

      vm.subscribed = LJ.get('is_subscribed');

      vm.hideWidget = function (_ref4) {
        var status = _ref4.status;

        if (status === 'OK') {
          vm.subscribed = true;
        }
      };
    }
  }
})();
/* <<< file end: js/widgets/angular/mediusSubscribe.js */

//# map link was there [mediusSubscribe.js.map]
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
/* >>> file start: js/scheme/medius.js */
//= require js/widgets/angular/mediusSubscribe.js
//= require js/core/angular/api.js

(function () {
  'use strict';

  angular.element(document).ready(function () {
    if (angular.element('.mdsfooter').length === 0) {
      return;
    }

    var subscribe = angular.element('.mdsfooter').find('[medius-subscribe]');
    angular.bootstrap(subscribe, ['Medius.Subscribe']);
  });
})();
/* <<< file end: js/scheme/medius.js */

//# map link was there [medius.js.map]
