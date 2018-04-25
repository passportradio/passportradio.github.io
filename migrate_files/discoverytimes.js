/* >>> file start: js/core/angular/radioGroup.js */
(function (a) {
  return a;
})();

(function () {
  'use strict';

  /**
   * @module LJ.RadioGroup
   */

  angular.module('LJ.RadioGroup', []);

  angular.module('LJ.RadioGroup').factory('radioGroup', radioGroup);

  /**
   * @service radioGroup
   * Allows to work with radio groups.
   * When model with some id is set to true, all others will be set to false.
   *
   * @return {Object}   factory
   * @return {Function} factory.get  RadioGroup getter
   *
   * @example
   *
   *    // get RadioGroup instance
   *    var editable = radioGroup('editable');
   *
   *    // transfer models to scope
   *    $scope.editable = editable.models();
   *
   *    editable.on(1); // turn on editable with ID #1
   *    editable.on(2); // turn on editable with ID #2,
   *                    // editable with ID #1 will be turned off automatically
   *
   *    editable.off(2);       // turn off editable with ID #2
   *    editable.set(1, true); // turn on  editable with ID #1
   */
  function radioGroup() {
    // radio groups cache
    var _cache = {};

    function RadioGroup() {
      this._models = {};
    }

    /**
     * Returns models
     * @return {Object} Models object
     */
    RadioGroup.prototype.models = function () {
      return this._models;
    };

    /**
     * Set all models to false state
     * @return {RadioGroup}  Self instance
     */
    RadioGroup.prototype.reset = function () {
      var models = this._models,
          id;

      for (id in models) {
        if (models.hasOwnProperty(id) && models[id]) {
          this._models[id] = false;
        }
      }

      return this;
    };

    /**
     * Set model value
     *
     * @param  {*} id          Identifier
     * @param  {Boolean} value Value to set
     * @return {RadioGroup}    Self instance
     */
    RadioGroup.prototype.set = function (id, value) {
      if (value) {
        this.reset()._models[id] = true;
      } else {
        this._models[id] = false;
      }

      return this;
    };

    /**
     * Set model with provided ID to true
     *
     * @param  {*} id       ID value
     * @return {RadioGroup} Self instance
     */
    RadioGroup.prototype.on = function (id) {
      return this.set(id, true);
    };

    /**
     * Set model with provided ID to false
     *
     * @param  {*} [id]     ID value. If not provided - turn off all
     * @return {RadioGroup} Self instance
     */
    RadioGroup.prototype.off = function (id) {
      if (typeof id === 'undefined') {
        this.reset();
      } else {
        this.set(id, false);
      }

      return this;
    };

    /**
     * Toggle model with provided ID
     * @param  {*} id          ID value.
     * @return {RadioGroup}    Self instance
     */
    RadioGroup.prototype.toggle = function (id) {
      if (this._models[id]) {
        this.off(id);
      } else {
        this.on(id);
      }
    };

    /**
     * Get instance of RadioGroup object
     *
     * @param  {String}     name RadioGroup identifier
     * @return {RadioGroup}      RadioGroup instance
     */
    function get(name) {
      if (_cache[name]) {
        return _cache[name];
      }

      _cache[name] = new RadioGroup();
      return _cache[name];
    }

    return get;
  }
})();
/* <<< file end: js/core/angular/radioGroup.js */

//# map link was there [radioGroup.js.map]
/* >>> file start: js/node_modules/angular-sanitize/angular-sanitize.js */
/**
 * @license AngularJS v1.5.8
 * (c) 2010-2016 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function (window, angular) {
  'use strict';

  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   *     Any commits to this file should be reviewed with security in mind.  *
   *   Changes to this file can potentially create security vulnerabilities. *
   *          An approval from 2 Core members with history of modifying      *
   *                         this file is required.                          *
   *                                                                         *
   *  Does the change somehow allow for arbitrary javascript to be executed? *
   *    Or allows for someone to change the prototype of built-in objects?   *
   *     Or gives undesired access to variables likes document or window?    *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  var $sanitizeMinErr = angular.$$minErr('$sanitize'),
      bind,
      extend,
      forEach,
      isDefined,
      lowercase,
      noop,
      htmlParser,
      htmlSanitizeWriter;


  /**
   * @ngdoc module
   * @name ngSanitize
   * @description
   *
   * # ngSanitize
   *
   * The `ngSanitize` module provides functionality to sanitize HTML.
   *
   *
   * <div doc-module-components="ngSanitize"></div>
   *
   * See {@link ngSanitize.$sanitize `$sanitize`} for usage.
   */

  /**
   * @ngdoc service
   * @name $sanitize
   * @kind function
   *
   * @description
   *   Sanitizes an html string by stripping all potentially dangerous tokens.
   *
   *   The input is sanitized by parsing the HTML into tokens. All safe tokens (from a whitelist) are
   *   then serialized back to properly escaped html string. This means that no unsafe input can make
   *   it into the returned string.
   *
   *   The whitelist for URL sanitization of attribute values is configured using the functions
   *   `aHrefSanitizationWhitelist` and `imgSrcSanitizationWhitelist` of {@link ng.$compileProvider
   *   `$compileProvider`}.
   *
   *   The input may also contain SVG markup if this is enabled via {@link $sanitizeProvider}.
   *
   * @param {string} html HTML input.
   * @returns {string} Sanitized HTML.
   *
   * @example
     <example module="sanitizeExample" deps="angular-sanitize.js">
     <file name="index.html">
       <script>
           angular.module('sanitizeExample', ['ngSanitize'])
             .controller('ExampleController', ['$scope', '$sce', function($scope, $sce) {
               $scope.snippet =
                 '<p style="color:blue">an html\n' +
                 '<em onmouseover="this.textContent=\'PWN3D!\'">click here</em>\n' +
                 'snippet</p>';
               $scope.deliberatelyTrustDangerousSnippet = function() {
                 return $sce.trustAsHtml($scope.snippet);
               };
             }]);
       </script>
       <div ng-controller="ExampleController">
          Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
         <table>
           <tr>
             <td>Directive</td>
             <td>How</td>
             <td>Source</td>
             <td>Rendered</td>
           </tr>
           <tr id="bind-html-with-sanitize">
             <td>ng-bind-html</td>
             <td>Automatically uses $sanitize</td>
             <td><pre>&lt;div ng-bind-html="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
             <td><div ng-bind-html="snippet"></div></td>
           </tr>
           <tr id="bind-html-with-trust">
             <td>ng-bind-html</td>
             <td>Bypass $sanitize by explicitly trusting the dangerous value</td>
             <td>
             <pre>&lt;div ng-bind-html="deliberatelyTrustDangerousSnippet()"&gt;
  &lt;/div&gt;</pre>
             </td>
             <td><div ng-bind-html="deliberatelyTrustDangerousSnippet()"></div></td>
           </tr>
           <tr id="bind-default">
             <td>ng-bind</td>
             <td>Automatically escapes</td>
             <td><pre>&lt;div ng-bind="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
             <td><div ng-bind="snippet"></div></td>
           </tr>
         </table>
         </div>
     </file>
     <file name="protractor.js" type="protractor">
       it('should sanitize the html snippet by default', function() {
         expect(element(by.css('#bind-html-with-sanitize div')).getInnerHtml()).
           toBe('<p>an html\n<em>click here</em>\nsnippet</p>');
       });
  
       it('should inline raw snippet if bound to a trusted value', function() {
         expect(element(by.css('#bind-html-with-trust div')).getInnerHtml()).
           toBe("<p style=\"color:blue\">an html\n" +
                "<em onmouseover=\"this.textContent='PWN3D!'\">click here</em>\n" +
                "snippet</p>");
       });
  
       it('should escape snippet without any filter', function() {
         expect(element(by.css('#bind-default div')).getInnerHtml()).
           toBe("&lt;p style=\"color:blue\"&gt;an html\n" +
                "&lt;em onmouseover=\"this.textContent='PWN3D!'\"&gt;click here&lt;/em&gt;\n" +
                "snippet&lt;/p&gt;");
       });
  
       it('should update', function() {
         element(by.model('snippet')).clear();
         element(by.model('snippet')).sendKeys('new <b onclick="alert(1)">text</b>');
         expect(element(by.css('#bind-html-with-sanitize div')).getInnerHtml()).
           toBe('new <b>text</b>');
         expect(element(by.css('#bind-html-with-trust div')).getInnerHtml()).toBe(
           'new <b onclick="alert(1)">text</b>');
         expect(element(by.css('#bind-default div')).getInnerHtml()).toBe(
           "new &lt;b onclick=\"alert(1)\"&gt;text&lt;/b&gt;");
       });
     </file>
     </example>
   */

  /**
   * @ngdoc provider
   * @name $sanitizeProvider
   *
   * @description
   * Creates and configures {@link $sanitize} instance.
   */
  function $SanitizeProvider() {
    var svgEnabled = false;

    this.$get = ['$$sanitizeUri', function ($$sanitizeUri) {
      if (svgEnabled) {
        extend(validElements, svgElements);
      }
      return function (html) {
        var buf = [];
        htmlParser(html, htmlSanitizeWriter(buf, function (uri, isImage) {
          return !/^unsafe:/.test($$sanitizeUri(uri, isImage));
        }));
        return buf.join('');
      };
    }];

    /**
     * @ngdoc method
     * @name $sanitizeProvider#enableSvg
     * @kind function
     *
     * @description
     * Enables a subset of svg to be supported by the sanitizer.
     *
     * <div class="alert alert-warning">
     *   <p>By enabling this setting without taking other precautions, you might expose your
     *   application to click-hijacking attacks. In these attacks, sanitized svg elements could be positioned
     *   outside of the containing element and be rendered over other elements on the page (e.g. a login
     *   link). Such behavior can then result in phishing incidents.</p>
     *
     *   <p>To protect against these, explicitly setup `overflow: hidden` css rule for all potential svg
     *   tags within the sanitized content:</p>
     *
     *   <br>
     *
     *   <pre><code>
     *   .rootOfTheIncludedContent svg {
     *     overflow: hidden !important;
     *   }
     *   </code></pre>
     * </div>
     *
     * @param {boolean=} flag Enable or disable SVG support in the sanitizer.
     * @returns {boolean|ng.$sanitizeProvider} Returns the currently configured value if called
     *    without an argument or self for chaining otherwise.
     */
    this.enableSvg = function (enableSvg) {
      if (isDefined(enableSvg)) {
        svgEnabled = enableSvg;
        return this;
      } else {
        return svgEnabled;
      }
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////
    // Private stuff
    //////////////////////////////////////////////////////////////////////////////////////////////////

    bind = angular.bind;
    extend = angular.extend;
    forEach = angular.forEach;
    isDefined = angular.isDefined;
    lowercase = angular.lowercase;
    noop = angular.noop;

    htmlParser = htmlParserImpl;
    htmlSanitizeWriter = htmlSanitizeWriterImpl;

    // Regular Expressions for parsing tags and attributes
    var SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,

    // Match everything outside of normal chars and " (quote character)
    NON_ALPHANUMERIC_REGEXP = /([^\#-~ |!])/g,
        voidElements = toMap("area,br,col,hr,img,wbr"),
        optionalEndTagBlockElements = toMap("colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr"),
        optionalEndTagInlineElements = toMap("rp,rt"),
        optionalEndTagElements = extend({}, optionalEndTagInlineElements, optionalEndTagBlockElements),
        blockElements = extend({}, optionalEndTagBlockElements, toMap("address,article," + "aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5," + "h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,section,table,ul")),
        inlineElements = extend({}, optionalEndTagInlineElements, toMap("a,abbr,acronym,b," + "bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s," + "samp,small,span,strike,strong,sub,sup,time,tt,u,var")),
        svgElements = toMap("circle,defs,desc,ellipse,font-face,font-face-name,font-face-src,g,glyph," + "hkern,image,linearGradient,line,marker,metadata,missing-glyph,mpath,path,polygon,polyline," + "radialGradient,rect,stop,svg,switch,text,title,tspan"),
        blockedElements = toMap("script,style"),
        validElements = extend({}, voidElements, blockElements, inlineElements, optionalEndTagElements),
        uriAttrs = toMap("background,cite,href,longdesc,src,xlink:href"),
        htmlAttrs = toMap('abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,' + 'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,' + 'ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,' + 'scope,scrolling,shape,size,span,start,summary,tabindex,target,title,type,' + 'valign,value,vspace,width'),
        svgAttrs = toMap('accent-height,accumulate,additive,alphabetic,arabic-form,ascent,' + 'baseProfile,bbox,begin,by,calcMode,cap-height,class,color,color-rendering,content,' + 'cx,cy,d,dx,dy,descent,display,dur,end,fill,fill-rule,font-family,font-size,font-stretch,' + 'font-style,font-variant,font-weight,from,fx,fy,g1,g2,glyph-name,gradientUnits,hanging,' + 'height,horiz-adv-x,horiz-origin-x,ideographic,k,keyPoints,keySplines,keyTimes,lang,' + 'marker-end,marker-mid,marker-start,markerHeight,markerUnits,markerWidth,mathematical,' + 'max,min,offset,opacity,orient,origin,overline-position,overline-thickness,panose-1,' + 'path,pathLength,points,preserveAspectRatio,r,refX,refY,repeatCount,repeatDur,' + 'requiredExtensions,requiredFeatures,restart,rotate,rx,ry,slope,stemh,stemv,stop-color,' + 'stop-opacity,strikethrough-position,strikethrough-thickness,stroke,stroke-dasharray,' + 'stroke-dashoffset,stroke-linecap,stroke-linejoin,stroke-miterlimit,stroke-opacity,' + 'stroke-width,systemLanguage,target,text-anchor,to,transform,type,u1,u2,underline-position,' + 'underline-thickness,unicode,unicode-range,units-per-em,values,version,viewBox,visibility,' + 'width,widths,x,x-height,x1,x2,xlink:actuate,xlink:arcrole,xlink:role,xlink:show,xlink:title,' + 'xlink:type,xml:base,xml:lang,xml:space,xmlns,xmlns:xlink,y,y1,y2,zoomAndPan', true),
        validAttrs = extend({}, uriAttrs, svgAttrs, htmlAttrs);

    // Good source of info about elements and attributes
    // http://dev.w3.org/html5/spec/Overview.html#semantics
    // http://simon.html5.org/html-elements

    // Safe Void Elements - HTML5
    // http://dev.w3.org/html5/spec/Overview.html#void-elements


    // Elements that you can, intentionally, leave open (and which close themselves)
    // http://dev.w3.org/html5/spec/Overview.html#optional-tags


    // Safe Block Elements - HTML5


    // Inline Elements - HTML5


    // SVG Elements
    // https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Elements
    // Note: the elements animate,animateColor,animateMotion,animateTransform,set are intentionally omitted.
    // They can potentially allow for arbitrary javascript to be executed. See #11290


    // Blocked Elements (will be stripped)


    //Attributes that have href and hence need to be sanitized


    // SVG attributes (without "id" and "name" attributes)
    // https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Attributes


    function toMap(str, lowercaseKeys) {
      var obj = {},
          items = str.split(','),
          i;
      for (i = 0; i < items.length; i++) {
        obj[lowercaseKeys ? lowercase(items[i]) : items[i]] = true;
      }
      return obj;
    }

    var inertBodyElement;
    (function (window) {
      var doc;
      if (window.document && window.document.implementation) {
        doc = window.document.implementation.createHTMLDocument("inert");
      } else {
        throw $sanitizeMinErr('noinert', "Can't create an inert html document");
      }
      var docElement = doc.documentElement || doc.getDocumentElement(),
          bodyElements = docElement.getElementsByTagName('body');


      // usually there should be only one body element in the document, but IE doesn't have any, so we need to create one
      if (bodyElements.length === 1) {
        inertBodyElement = bodyElements[0];
      } else {
        var html = doc.createElement('html');
        inertBodyElement = doc.createElement('body');
        html.appendChild(inertBodyElement);
        doc.appendChild(html);
      }
    })(window);

    /**
     * @example
     * htmlParser(htmlString, {
     *     start: function(tag, attrs) {},
     *     end: function(tag) {},
     *     chars: function(text) {},
     *     comment: function(text) {}
     * });
     *
     * @param {string} html string
     * @param {object} handler
     */
    function htmlParserImpl(html, handler) {
      if (html === null || html === undefined) {
        html = '';
      } else if (typeof html !== 'string') {
        html = '' + html;
      }
      inertBodyElement.innerHTML = html;

      //mXSS protection
      var mXSSAttempts = 5;
      do {
        if (mXSSAttempts === 0) {
          throw $sanitizeMinErr('uinput', "Failed to sanitize html because the input is unstable");
        }
        mXSSAttempts--;

        // strip custom-namespaced attributes on IE<=11
        if (window.document.documentMode) {
          stripCustomNsAttrs(inertBodyElement);
        }
        html = inertBodyElement.innerHTML; //trigger mXSS
        inertBodyElement.innerHTML = html;
      } while (html !== inertBodyElement.innerHTML);

      var node = inertBodyElement.firstChild;
      while (node) {
        switch (node.nodeType) {
          case 1:
            // ELEMENT_NODE
            handler.start(node.nodeName.toLowerCase(), attrToMap(node.attributes));
            break;
          case 3:
            // TEXT NODE
            handler.chars(node.textContent);
            break;
        }

        var nextNode;
        if (!(nextNode = node.firstChild)) {
          if (node.nodeType == 1) {
            handler.end(node.nodeName.toLowerCase());
          }
          nextNode = node.nextSibling;
          if (!nextNode) {
            while (nextNode == null) {
              node = node.parentNode;
              if (node === inertBodyElement) break;
              nextNode = node.nextSibling;
              if (node.nodeType == 1) {
                handler.end(node.nodeName.toLowerCase());
              }
            }
          }
        }
        node = nextNode;
      }

      while (node = inertBodyElement.firstChild) {
        inertBodyElement.removeChild(node);
      }
    }

    function attrToMap(attrs) {
      var map = {};
      for (var i = 0, ii = attrs.length; i < ii; i++) {
        var attr = attrs[i];
        map[attr.name] = attr.value;
      }
      return map;
    }

    /**
     * Escapes all potentially dangerous characters, so that the
     * resulting string can be safely inserted into attribute or
     * element text.
     * @param value
     * @returns {string} escaped text
     */
    function encodeEntities(value) {
      return value.replace(/&/g, '&amp;').replace(SURROGATE_PAIR_REGEXP, function (value) {
        var hi = value.charCodeAt(0),
            low = value.charCodeAt(1);

        return '&#' + ((hi - 0xD800) * 0x400 + (low - 0xDC00) + 0x10000) + ';';
      }).replace(NON_ALPHANUMERIC_REGEXP, function (value) {
        return '&#' + value.charCodeAt(0) + ';';
      }).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * create an HTML/XML writer which writes to buffer
     * @param {Array} buf use buf.join('') to get out sanitized html string
     * @returns {object} in the form of {
     *     start: function(tag, attrs) {},
     *     end: function(tag) {},
     *     chars: function(text) {},
     *     comment: function(text) {}
     * }
     */
    function htmlSanitizeWriterImpl(buf, uriValidator) {
      var ignoreCurrentElement = false,
          out = bind(buf, buf.push);

      return {
        start: function start(tag, attrs) {
          tag = lowercase(tag);
          if (!ignoreCurrentElement && blockedElements[tag]) {
            ignoreCurrentElement = tag;
          }
          if (!ignoreCurrentElement && validElements[tag] === true) {
            out('<');
            out(tag);
            forEach(attrs, function (value, key) {
              var lkey = lowercase(key),
                  isImage = tag === 'img' && lkey === 'src' || lkey === 'background';

              if (validAttrs[lkey] === true && (uriAttrs[lkey] !== true || uriValidator(value, isImage))) {
                out(' ');
                out(key);
                out('="');
                out(encodeEntities(value));
                out('"');
              }
            });
            out('>');
          }
        },
        end: function end(tag) {
          tag = lowercase(tag);
          if (!ignoreCurrentElement && validElements[tag] === true && voidElements[tag] !== true) {
            out('</');
            out(tag);
            out('>');
          }
          if (tag == ignoreCurrentElement) {
            ignoreCurrentElement = false;
          }
        },
        chars: function chars(_chars) {
          if (!ignoreCurrentElement) {
            out(encodeEntities(_chars));
          }
        }
      };
    }

    /**
     * When IE9-11 comes across an unknown namespaced attribute e.g. 'xlink:foo' it adds 'xmlns:ns1' attribute to declare
     * ns1 namespace and prefixes the attribute with 'ns1' (e.g. 'ns1:xlink:foo'). This is undesirable since we don't want
     * to allow any of these custom attributes. This method strips them all.
     *
     * @param node Root element to process
     */
    function stripCustomNsAttrs(node) {
      if (node.nodeType === window.Node.ELEMENT_NODE) {
        var attrs = node.attributes;
        for (var i = 0, l = attrs.length; i < l; i++) {
          var attrNode = attrs[i],
              attrName = attrNode.name.toLowerCase();

          if (attrName === 'xmlns:ns1' || attrName.lastIndexOf('ns1:', 0) === 0) {
            node.removeAttributeNode(attrNode);
            i--;
            l--;
          }
        }
      }

      var nextNode = node.firstChild;
      if (nextNode) {
        stripCustomNsAttrs(nextNode);
      }

      nextNode = node.nextSibling;
      if (nextNode) {
        stripCustomNsAttrs(nextNode);
      }
    }
  }

  function sanitizeText(chars) {
    var buf = [],
        writer = htmlSanitizeWriter(buf, noop);

    writer.chars(chars);
    return buf.join('');
  }

  // define ngSanitize module and register $sanitize service
  angular.module('ngSanitize', []).provider('$sanitize', $SanitizeProvider);

  /**
   * @ngdoc filter
   * @name linky
   * @kind function
   *
   * @description
   * Finds links in text input and turns them into html links. Supports `http/https/ftp/mailto` and
   * plain email address links.
   *
   * Requires the {@link ngSanitize `ngSanitize`} module to be installed.
   *
   * @param {string} text Input text.
   * @param {string} target Window (`_blank|_self|_parent|_top`) or named frame to open links in.
   * @param {object|function(url)} [attributes] Add custom attributes to the link element.
   *
   *    Can be one of:
   *
   *    - `object`: A map of attributes
   *    - `function`: Takes the url as a parameter and returns a map of attributes
   *
   *    If the map of attributes contains a value for `target`, it overrides the value of
   *    the target parameter.
   *
   *
   * @returns {string} Html-linkified and {@link $sanitize sanitized} text.
   *
   * @usage
     <span ng-bind-html="linky_expression | linky"></span>
   *
   * @example
     <example module="linkyExample" deps="angular-sanitize.js">
       <file name="index.html">
         <div ng-controller="ExampleController">
         Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
         <table>
           <tr>
             <th>Filter</th>
             <th>Source</th>
             <th>Rendered</th>
           </tr>
           <tr id="linky-filter">
             <td>linky filter</td>
             <td>
               <pre>&lt;div ng-bind-html="snippet | linky"&gt;<br>&lt;/div&gt;</pre>
             </td>
             <td>
               <div ng-bind-html="snippet | linky"></div>
             </td>
           </tr>
           <tr id="linky-target">
            <td>linky target</td>
            <td>
              <pre>&lt;div ng-bind-html="snippetWithSingleURL | linky:'_blank'"&gt;<br>&lt;/div&gt;</pre>
            </td>
            <td>
              <div ng-bind-html="snippetWithSingleURL | linky:'_blank'"></div>
            </td>
           </tr>
           <tr id="linky-custom-attributes">
            <td>linky custom attributes</td>
            <td>
              <pre>&lt;div ng-bind-html="snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}"&gt;<br>&lt;/div&gt;</pre>
            </td>
            <td>
              <div ng-bind-html="snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}"></div>
            </td>
           </tr>
           <tr id="escaped-html">
             <td>no filter</td>
             <td><pre>&lt;div ng-bind="snippet"&gt;<br>&lt;/div&gt;</pre></td>
             <td><div ng-bind="snippet"></div></td>
           </tr>
         </table>
       </file>
       <file name="script.js">
         angular.module('linkyExample', ['ngSanitize'])
           .controller('ExampleController', ['$scope', function($scope) {
             $scope.snippet =
               'Pretty text with some links:\n'+
               'http://angularjs.org/,\n'+
               'mailto:us@somewhere.org,\n'+
               'another@somewhere.org,\n'+
               'and one more: ftp://127.0.0.1/.';
             $scope.snippetWithSingleURL = 'http://angularjs.org/';
           }]);
       </file>
       <file name="protractor.js" type="protractor">
         it('should linkify the snippet with urls', function() {
           expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
               toBe('Pretty text with some links: http://angularjs.org/, us@somewhere.org, ' +
                    'another@somewhere.org, and one more: ftp://127.0.0.1/.');
           expect(element.all(by.css('#linky-filter a')).count()).toEqual(4);
         });
  
         it('should not linkify snippet without the linky filter', function() {
           expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText()).
               toBe('Pretty text with some links: http://angularjs.org/, mailto:us@somewhere.org, ' +
                    'another@somewhere.org, and one more: ftp://127.0.0.1/.');
           expect(element.all(by.css('#escaped-html a')).count()).toEqual(0);
         });
  
         it('should update', function() {
           element(by.model('snippet')).clear();
           element(by.model('snippet')).sendKeys('new http://link.');
           expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
               toBe('new http://link.');
           expect(element.all(by.css('#linky-filter a')).count()).toEqual(1);
           expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText())
               .toBe('new http://link.');
         });
  
         it('should work with the target property', function() {
          expect(element(by.id('linky-target')).
              element(by.binding("snippetWithSingleURL | linky:'_blank'")).getText()).
              toBe('http://angularjs.org/');
          expect(element(by.css('#linky-target a')).getAttribute('target')).toEqual('_blank');
         });
  
         it('should optionally add custom attributes', function() {
          expect(element(by.id('linky-custom-attributes')).
              element(by.binding("snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}")).getText()).
              toBe('http://angularjs.org/');
          expect(element(by.css('#linky-custom-attributes a')).getAttribute('rel')).toEqual('nofollow');
         });
       </file>
     </example>
   */
  angular.module('ngSanitize').filter('linky', ['$sanitize', function ($sanitize) {
    var LINKY_URL_REGEXP = /((ftp|https?):\/\/|(www\.)|(mailto:)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]/i,
        MAILTO_REGEXP = /^mailto:/i,
        linkyMinErr = angular.$$minErr('linky'),
        isDefined = angular.isDefined,
        isFunction = angular.isFunction,
        isObject = angular.isObject,
        isString = angular.isString;

    return function (text, target, attributes) {
      if (text == null || text === '') return text;
      if (!isString(text)) throw linkyMinErr('notstring', 'Expected string but received: {0}', text);

      var attributesFn = isFunction(attributes) ? attributes : isObject(attributes) ? function getAttributesObject() {
        return attributes;
      } : function getEmptyAttributesObject() {
        return {};
      },
          match,
          raw = text,
          html = [],
          url,
          i;

      while (match = raw.match(LINKY_URL_REGEXP)) {
        // We can not end in these as they are sometimes found at the end of the sentence
        url = match[0];
        // if we did not match ftp/http/www/mailto then assume mailto
        if (!match[2] && !match[4]) {
          url = (match[3] ? 'http://' : 'mailto:') + url;
        }
        i = match.index;
        addText(raw.substr(0, i));
        addLink(url, match[0].replace(MAILTO_REGEXP, ''));
        raw = raw.substring(i + match[0].length);
      }
      addText(raw);
      return $sanitize(html.join(''));

      function addText(text) {
        if (!text) {
          return;
        }
        html.push(sanitizeText(text));
      }

      function addLink(url, text) {
        var key,
            linkAttributes = attributesFn(url);
        html.push('<a ');

        for (key in linkAttributes) {
          html.push(key + '="' + linkAttributes[key] + '" ');
        }

        if (isDefined(target) && !('target' in linkAttributes)) {
          html.push('target="', target, '" ');
        }
        html.push('href="', url.replace(/"/g, '&quot;'), '">');
        addText(text);
        html.push('</a>');
      }
    };
  }]);
})(window, window.angular);
/* <<< file end: js/node_modules/angular-sanitize/angular-sanitize.js */

//# map link was there [angular-sanitize.js.map]
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
/* >>> file start: js/core/angular/options.js */
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * Base implementation for services options
 *
 * @example
 *
 * var options = Options.create({
 *   counter: 25
 * });
 * console.log(options.counter); // => 25
 *
 * options.set('counter', 15);
 * console.log( options.raw().counter ); // => 15
 *
 * options.set({ counter: 10 });
 * console.log( options.counter ); // => 10
 *
 */
angular.module('LJ.Options', []).factory('Options', [function () {
  return {
    create: function create(options) {
      if (typeof options === 'undefined') {
        options = {};
      }

      if ((typeof options === 'undefined' ? 'undefined' : _typeof(options)) !== 'object') {
        throw new TypeError('Options should be an object.');
      }

      /**
       * @name set
       * @description sets options value by key or merge opts object into options
       * @param {(string|number)|object} opts - key to extend by or extend object
       * @param {*} [value] - value to set in options
       */
      function set(opts, value) {
        if (typeof value === 'undefined') {
          angular.extend(options, opts);
        } else {
          options[opts] = value;
        }
      }

      /**
       * @name get
       * @description get value from options by given key
       * @param {string|number} key
       * @return {*} value from options object
       */
      function get(key) {
        return options[key];
      }

      /**
       * @name raw
       * @description get options object
       * @returns {object} options
       */
      function raw() {
        return options;
      }

      return {
        set: set,
        get: get,
        raw: raw
      };
    }
  };
}]);
/* <<< file end: js/core/angular/options.js */

//# map link was there [options.js.map]
/* >>> file start: js/core/angular/users.js */
//= require js/core/angular/api.js
//= require js/core/angular/options.js

(function (a) {
  return a;
})();

(function () {
  'use strict';

  angular.module('Users', ['LJ.Api', 'LJ.Options']) // eslint-disable-line angular/di

  // Relations wrapper. Currently works through js/relations/relations.js
  .factory('Relations', ['$q', '$timeout', 'UsersCache', function ($q, $timeout, UsersCache) {

    /**
     * // add friend without options. State will be changed immediately
     * Relations.toggleFriend('test', true);
     *
     * // unsubscribe, but don't change user props immediately
     * Relations.toggleSubscription('test', false, { immediate: false });
     */

    /**
     * Helper that helps to interact with exiting relations
     * @param {String}   username        Username of user we are changing relation
     * @param {String}   action          Action to perform
     * @param {Object}   [options]       Options
     * @param {Boolean}  [options.wait]  Wait for response before updating user props
     * @return {Promise} Promise that will be resolved after action is completed
     */
    function _action(username, action, options) {
      var defer = $q.defer(),


      // immediate update user props
      updateProps = {
        addFriend: { is_invite_sent: true },
        removeFriend: { is_friend: false },
        subscribe: { is_subscribedon: true },
        unsubscribe: { is_subscribedon: false },
        join: { is_invite_sent: true },
        leave: { is_member: false },
        setBan: { is_banned: true },
        setUnban: { is_banned: false }
      },


      // revert properties values if error happens
      revertProps = {
        addFriend: { is_invite_sent: false },
        removeFriend: { is_friend: true },
        subscribe: { is_subscribedon: false },
        unsubscribe: { is_subscribedon: true },
        join: { is_invite_sent: false },
        leave: { is_member: true },
        setBan: { is_banned: false },
        setUnban: { is_banned: true }
      },


      // save current props
      userProps = angular.copy(UsersCache.get(username) || {});

      if (angular.isUndefined(options)) {
        options = {};
      }

      if (!options.wait) {
        UsersCache.update(username, updateProps[action] || {});
      }

      LJ.Event.trigger('relations.change', {
        username: username,
        action: action,
        callback: function callback(data) {
          $timeout(function () {
            if (data.error) {

              // rollback props
              if (!options.wait) {
                UsersCache.update(username, angular.extend(revertProps[action], userProps));
              }

              defer.reject(data.error.message);
              return;
            }

            var props = LJ.Object.pick(data, 'is_banned', 'is_friend', 'is_member', 'is_subscriber', 'is_subscribedon', 'is_friend_of', 'is_invite_sent');

            // update user props
            UsersCache.update(username, props);
            defer.resolve(data);
          });
        }
      });

      return defer.promise;
    }

    /**
     * Toggles subscription status of a user with provided username
     *
     * @param {String}   username        Username
     * @param {Boolean}  state           State: subscribe (true) or unsubscribe (false)
     * @param {Object}   [options]       Options
     * @param {Boolean}  [options.wait]  Wait for response before updating user props
     * @return {Promise}                 Promise that will be resolved with data after
     *                                   subscription status will be changed
     */
    function toggleSubscription(username, state, options) {
      var promise = _action(username, state ? 'subscribe' : 'unsubscribe', options);

      // reset filter mask after unsubscribe
      if (!state) {
        promise.then(function () {
          UsersCache.update(username, { filtermask: 0 });
        });
      }

      return promise;
    }

    /**
     * Toggles friend status of a user with provided username
     *
     * @param {String}   username        Username
     * @param {Boolean}  state           State: add friend (true) or remove from friend (false)
     * @param {Object}   [options]       Options
     * @param {Boolean}  [options.wait]  Wait for response before updating user props
     * @return {Promise}                 Promise that will be resolved with data after
     *                                   friend status will be changed
     */
    function toggleFriend(username, state, options) {
      return _action(username, state ? 'addFriend' : 'removeFriend', options);
    }

    /**
     * Join/leave community
     *
     * @param {String}   username        Username
     * @param {Boolean}  state           State: add friend (true) or remove from friend (false)
     * @param {Object}   [options]       Options
     * @param {Boolean}  [options.wait]  Wait for response before updating user props
     * @return {Promise}                 Promise that will be resolved with data after action completeness
     */
    function toggleMember(username, state, options) {
      return _action(username, state ? 'join' : 'leave', options);
    }

    /**
     * Ban/unban usern
     *
     * @param {String}   username        Username
     * @param {Boolean}  state           State: ban (true) or unban user (false)
     * @param {Object}   [options]       Options
     * @param {Boolean}  [options.wait]  Wait for response before updating user props
     * @return {Promise}                 Promise that will be resolved with data after action is completed
     */
    function toggleBan(username, state, options) {
      return _action(username, state ? 'setBan' : 'setUnban', options);
    }

    /**
     * Ban/unban user everywhere
     *
     * @param {String}   username       Username
     * @param {Boolean}  state          State: ban (true) or unban user (false) everywhere
     * @param {Object}   [options]      Options
     * @param {Boolean}  [options.wait] Wait for response before updating user props
     * @return {Promise}                Promise that will be resolved with data after action is completed
     */
    function toggleBanEverywhere(username, state, options) {
      return _action(username, state ? 'banEverywhere' : 'unbanEverywhere', options);
    }

    return {
      toggleFriend: toggleFriend,
      toggleSubscription: toggleSubscription,
      toggleMember: toggleMember,
      toggleBan: toggleBan,
      toggleBanEverywhere: toggleBanEverywhere
    };
  }])

  // mask operations
  .factory('Mask', function () {
    var factory = {};

    /**
     * Notice: first bit of a mask is not used
     */

    /**
      * Notice:
      *   Our max filter id is equal 31: last bit (of 32) could be equal to 1
      *
      *   JavaScript bitwise operators converts numbers to signed integers:
      *   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#Signed_32-bit_integers
      *
      *   If max bit is equal to 1, it will be converted to negative number.
      *
      *   That is why we should manually interpret number as unsigned integer
      */
    function unsigned(number) {
      return number >>> 0;
    }

    /**
     * Change mask accroding to provided operations
     *
     * @param {Number}       mask             Mask field
     * @param {Object}       actions          Operations
     * @param {Number|Array} [actions.add]    Group id(s) to be added in
     * @param {Number|Array} [actions.remove] Group id(s) to be removed from
     *
     * @return {Number} Updated mask
     */
    factory.change = function (mask, actions) {
      var add = actions.add,
          remove = actions.remove;

      // add
      if (angular.isDefined(add)) {
        if (!angular.isArray(add)) {
          add = [add];
        }

        mask = add.reduce(function (mask, id) {
          return unsigned(mask | Math.pow(2, id));
        }, mask);
      }

      // remove
      if (angular.isDefined(remove)) {
        if (!angular.isArray(remove)) {
          remove = [remove];
        }

        mask = remove.reduce(function (mask, id) {
          var filterMask = Math.pow(2, 32) - 1 - Math.pow(2, id);

          return unsigned(mask & filterMask);
        }, mask);
      }

      return mask;
    };

    /**
     * Check mask for inclusion in group
     *
     * @param  {Number} mask    Mask
     * @param  {Number} groupId Group id
     * @return {Boolean}        Result of the check
     */
    factory.check = function (mask, groupId) {
      var groupMask = Math.pow(2, groupId);

      // convert to Boolean, because `&` returns number (group id)
      return Boolean(mask & groupMask);
    };

    return factory;
  })

  /**
   * Service is responsible for retrieving, caching and updating users
   *
   * // get by username
   * UsersCache.get('test');
   *
   * // get all available users
   * UsersCache.get();
   *
   * // get users that satisfy filtering function
   * UsersCache.get( LJ.Function.get('is_community') );
   */
  .factory('UsersCache', ['$q', '$cacheFactory', 'Options', function ($q, $cacheFactory, Options) {

    var _cache = $cacheFactory('users'),
        options = Options.create({
      journal: LJ.get('remoteUser')
    }),
        factory;

    /**
     * Add / update user(s) to cache
     * @param  {Array|Object} users Models to cache
     * @return {Array|Object}       Cached models
     */
    function add(users) {
      if (angular.isUndefined(users)) {
        return;
      }

      var hash = _cache.get(options.get('journal')) || {},
          result = users;

      if (!angular.isArray(users)) {
        users = [users];
      }

      users.forEach(function (user) {
        if (!user || !angular.isObject(user) || angular.isUndefined(user.username)) {
          return;
        }

        var name = user.display_username || user.username,
            existed = hash[name];


        hash[name] = existed ? angular.extend(existed, user) : user;
      });

      _cache.put(options.get('journal'), hash);

      return result;
    }

    /**
     * Check if user exists in cache
     *
     * @param {String}   username Username
     * @return {Boolean}          Checking result
     */
    function exists(username) {
      var cachedUsers = _cache.get(options.get('journal'));

      return Boolean(cachedUsers[username]);
    }

    /**
     * User(s) getter
     * @param  {String|Function} [username] Get users by username if string passed,
     *                                      apply filtering function for all users if function passed,
     *                                      return all users, if nothing has been passed
     * @return {Object|Array|NULL}          Result
     *
     * @example
     *
     *     // get by username
     *     get('test');
     *
     *     // get all communities
     *     get( LJ.Function.get('is_community') );
     *
     *     // get all users
     *     get();
     */
    function get(username) {
      var cache;

      if (angular.isString(username)) {
        cache = _cache.get(options.get('journal'));
        return cache && cache[username] ? cache[username] : null;
      }

      if (angular.isFunction(username)) {
        // get users with filter function
        return _users(username);
      }

      if (angular.isUndefined(username)) {
        // get all users
        return _users();
      }

      throw new TypeError('Incorrect argument passed.');
    }

    function getById(id) {
      var cache = _cache.get(options.get('journal'));
      if (!cache && !angular.isObject(cache)) {
        return null;
      }
      return Object.keys(cache).reduce(function (res, key) {
        return String(cache[key].id) === String(id) ? cache[key] : res;
      }, null);
    }

    /**
     * Getter helper
     * @param  {Function} [filter] Filter function
     * @return {Array}             List of users
     */
    function _users(filter) {
      var cachedUsers = _cache.get(options.get('journal')),
          result = [],
          username;

      for (username in cachedUsers) {
        if (cachedUsers.hasOwnProperty(username)) {

          // skip users that not satisfy filter function
          if (filter && !filter(cachedUsers[username])) {
            continue;
          }

          result.push(cachedUsers[username]);
        }
      }

      return result;
    }

    /**
     * Update user props
     *
     * @param  {String} username Username of user to update
     * @param  {Object} props    Props to update
     * @return {Object}          Updated user
     */
    function update(username, props) {
      var user = get(username) || { username: username };

      angular.extend(user, props);
      add(user);

      return user;
    }

    factory = {
      // cache users
      add: add,
      update: update,

      // work with options
      set: options.set,

      // work with users
      get: get,
      getById: getById,
      exists: exists
    };

    return factory;
  }]).factory('Users', ['$q', '$timeout', 'Api', 'Mask', 'UsersCache', 'Options', function ($q, $timeout, Api, Mask, UsersCache, Options) {

    var rpc = {
      friends: {
        read: 'relations.list_friends',
        readOne: 'relations.get_friend',
        update: 'groups.update_users'
      },

      subscriptions: {
        read: 'relations.list_subscriptions',
        readOne: 'relations.get_subscription',
        update: 'filters.update_users'
      }
    },
        options = Options.create({
      type: 'friends',
      journal: LJ.get('remoteUser')
    });

    function _rpc(rpcType) {
      return rpc[options.get('type')][rpcType];
    }

    /**
     * Check if user should be extracted from cache according friend/subscription status
     * @param  {Object}  user User model
     * @return {Boolean}      Result
     */
    function _isUserCorrect(user) {
      if (options.get('type') === 'subscriptions') {
        return Boolean(user.is_subscribedon);
      }

      // we are able to add any user to group, that is why any know user is correct for groups
      return true;
    }

    /**
     * Mask getter
     *
     * @param  {Object} user    User object
     * @param {Number}  [value] Mask value to set
     * @return {Number}         Mask
     */
    function mask(user, value) {
      if (angular.isUndefined(value)) {
        return user[maskField()] || 1;
      }

      user[maskField()] = value;
    }

    function maskField() {
      return options.get('type') === 'subscriptions' ? 'filtermask' : 'groupmask';
    }

    function fetchUser(username, fields, options) {
      return Api.call('user.get', { target: username, fields: fields }, options).then(function (response) {
        var user = response.user;

        UsersCache.add(user);
        return user;
      });
    }

    function fetchUserById(userid, fields, options) {
      return Api.call('user.get', { targetid: userid, fields: fields }, options).then(function (response) {
        var user = response.user;

        UsersCache.add(user);
        return user;
      });
    }

    /**
     * Fetch friends of current user
     * @param  {Object} [fields]      Fields to fetch,
     *                                e.g. { groupmask: 1, is_personal: 1, is_identity: 1 }
     * @param  {Object} [apiOptions]  Api options: {cache: true}
     * @return {Promise}              Promise that will be resolved with data
     */
    function fetchFriends(fields, apiOptions) {
      return Api.call('relations.list_friends', {
        journal: options.get('journal'),
        fields: fields
      }, apiOptions).then(_setFlagAndCache('is_friend'));
    }

    function fetchGroupUsers(fields) {
      return Api.call('groups.list_users', {
        journal: options.get('journal'),
        fields: fields
      }).then(function (response) {
        UsersCache.add(response.users);
        return response;
      });
    }

    function fetchSubscriptions(fields) {
      return Api.call('relations.list_subscriptions', {
        journal: options.get('journal'),
        fields: fields
      }).then(_setFlagAndCache('is_subscribedon'));
    }

    function fetchBanned(fields) {
      return Api.call('relations.list_banned', {
        journal: options.get('journal'),
        fields: fields
      }).then(_setFlagAndCache('is_banned'));
    }

    /**
     * Fetch helper method: set flag for fetched users, cache and return them
     * @return {Function} Function to use inside of .then()
     */
    function _setFlagAndCache(flag) {
      return function (response) {
        var users = response.users;

        users.forEach(LJ.Function.set(flag, true));

        UsersCache.add(users);
        return users;
      };
    }

    function fetchCount(type) {
      return Api.call('relations.' + type + '_count').then(function (response) {
        return response.count;
      });
    }

    /**
     * Sync user(s) model(s) with server
     *
     * @param  {Array|Object} users User model or collection of models
     * @return {Promise}            Promise that will be resolved after server response
     */
    function sync(users) {
      if (!angular.isArray(users)) {
        users = [users];
      }

      if (users.length === 0) {
        return $q.reject('You should provide users to sync.');
      }

      return Api.call(_rpc('update'), {
        users: users,
        journal: options.get('journal')
      }).then(function (response) {
        UsersCache.add(response.users);
        return response;
      });
    }

    /**
     * Check is user listed in group/filter with `id`
     *
     * @method  isUserInGroup
     *
     * @param  {String}  username Username
     * @param  {Number}  id       Filter/Group id (1..30)
     * @return {Boolean}          Result
     */
    function isUserInGroup(username, id) {
      var user = UsersCache.get(username);

      return user ? Mask.check(mask(user), id) : false;
    }

    /**
     * @todo Remove this method and replace it usage in controller
     *
     * Temp method for extracting only existing users by usernames
     *
     * @param  {Array}  usernames   Username(s)
     * @return {Array}              Array of existing users
     */
    function getExisting(usernames) {
      return usernames.filter(UsersCache.exists).map(UsersCache.get).filter(_isUserCorrect);
    }

    /**
      * Filter users that are in exact group
      *
      * @method fromGroup
      *
      * @param  {Object} options          Options for users filtering
      * @param  {Number} options.id       Group id: (1..31)
      * @param  {Number} [options.limit]  Limit of users to extract
      * @param  {String} [options.filter] Filter username string
      * @return {Array}                   Array of users that are in group
      */
    function fromGroup(options) {
      var filter = (options.filter || '').toLowerCase(),
          users = UsersCache.get(function (user) {

        // filter friends/subscription
        if (!_isUserCorrect(user)) {
          return false;
        }

        if (!Mask.check(mask(user), options.id)) {
          return false;
        }

        if (filter && user.display_username.toLowerCase().indexOf(filter) === -1) {
          return false;
        }

        return true;
      });

      if (options.limit) {
        users = users.slice(0, options.limit);
      }

      return users;
    }

    /**
      * Filter users that are out of exact group
      *
      * @method outOfGroup
      *
      * @param {Object} options           Options for users filtering
      * @param {Number} options.id        Group id: (1..30)
      * @param {Number} [options.limit]   Limit of users to extract
      * @param {String} [options.filter]  Filter username string
      * @return {Array}                   Array of users that are out of group
      */
    function outOfGroup(options) {
      var filter = (options.filter || '').toLowerCase(),
          users = UsersCache.get(function (user) {

        // filter friends/subscription
        if (!_isUserCorrect(user)) {
          return false;
        }

        if (Mask.check(mask(user), options.id)) {
          return false;
        }

        if (filter && user.display_username.toLowerCase().indexOf(filter) === -1) {
          return false;
        }

        return true;
      });

      if (options.limit) {
        users = users.slice(0, options.limit);
      }

      return users;
    }

    /**
     * Add users to group
     *
     * @method addToGroup
     *
     * @param  {Number}         id          Group id
     * @param  {String|Array}   usernames   Username(s) of users to add
     * @return {Promise}                    Promise that will be resolved
     *                                      with synced users
     */
    function addToGroup(id, usernames) {
      if (!angular.isArray(usernames)) {
        usernames = [usernames];
      }

      var users;

      if (options.get('type') === 'subscriptions') {
        // for subscriptions we should filter non-existed
        users = getExisting(usernames);
      } else {
        users = usernames.map(function (username) {
          return UsersCache.get(username) || { username: username };
        });
      }

      users.forEach(function (user) {
        mask(user, Mask.change(mask(user), { add: id }));
      });

      return sync(users);
    }

    /**
     * Remove users from group
     *
     * @method removeFromGroup
     *
     * @param {Number}        id                Group id
     * @param {String|Array}  usernames         Username(s) of users to remove
     * @param {Object}        [options]         Options
     * @param {Boolean}       [options.silent]  Remove users from group without sync
     *
     * @return {Promise|Undefined}        Promise that will be resolved
     *                                    with synced users or Undefined, if options.silent provided
     */
    function removeFromGroup(id, usernames, options) {
      if (!angular.isArray(usernames)) {
        usernames = [usernames];
      }

      var existing = getExisting(usernames);

      // update mask
      existing.forEach(function (user) {
        mask(user, Mask.change(mask(user), { remove: id }));
      });

      // return without sync if silent
      if (options && options.silent) {
        return;
      }

      return sync(existing);
    }

    /**
     * Set alias for user
     *
     * @param  {String}  username Username
     * @param  {String}  value    User alias
     * @return {Promise}          Promise that will be resolved with data when complete
     */
    function alias(username, value) {
      UsersCache.update(username, { alias: value });
      return Api.call('user.alias_set', { target: username, alias: value });
    }

    /**
     * Sort helper
     *
     * @param {String}   prop Property. Available: username or display_username
     * @return {Function}      Comparator function
     *
     * @example
     *
     *    users.sort( Users.comparator('username') );
     */
    function comparator(prop) {
      return function (a, b) {
        return a[prop].toLowerCase().localeCompare(b[prop].toLowerCase());
      };
    }

    /**
     * Patched version of options.set
     *
     * If we set journal for users it should also set journal for cache
     */
    function set() {
      var old = options.get('journal'),
          journal;

      options.set.apply(null, arguments);
      journal = options.get('journal');

      // update journal of cache if it changed
      if (journal !== old) {
        UsersCache.set('journal', journal);
      }
    }

    return {
      USERHEAD_FIELDS: {
        alias: 1,
        journal_url: 1,
        profile_url: 1,
        userhead_url: 1,
        is_invisible: 1,
        journaltype: 1
      },

      // options
      set: set,
      get: options.get,

      Cache: UsersCache,

      // work with server
      fetchUser: fetchUser,
      fetchUserById: fetchUserById,
      fetchBanned: fetchBanned,
      fetchFriends: fetchFriends,
      fetchGroupUsers: fetchGroupUsers,
      fetchSubscriptions: fetchSubscriptions,

      fetchCount: fetchCount,

      sync: sync,

      alias: alias,

      isUserInGroup: isUserInGroup,
      getExisting: getExisting,
      fromGroup: fromGroup,
      outOfGroup: outOfGroup,
      addToGroup: addToGroup,
      removeFromGroup: removeFromGroup,

      comparator: comparator
    };
  }]);
})();
/* <<< file end: js/core/angular/users.js */

//# map link was there [users.js.map]
/* >>> file start: js/core/angular/ljUser.js */
//= require js/core/angular/api.js
//= require js/core/angular/users.js
Site.page.template['angular/ljUser.ng.tmpl'] = '<span\n    class=\"\n        ljuser\n        i-ljuser\n        i-ljuser-type-{{user.journaltype}}\n        \"\n    ng-class=\"{\n        \'i-ljuser-deleted\': user.is_invisible,\n        \'i-ljuser-nopopup noctxpopup\': user.noctxpopup,\n        \'i-ljuser-withalias\': user.alias,\n        \'i-ljuser-showalias\': user.showalias\n    }\"\n    data-ljuser=\"{{user.username}}\"\n    lj:user=\"{{user.username}}\"\n    ><!--\n\n    Userhead\n    --><a\n        class=\"i-ljuser-profile\"\n        ng-href=\"{{user.profile_url}}\"\n        ng-attr-target=\"{{user.target ? user.target : \'_self\'}}\"\n        ><!--\n        --><img\n            class=\"i-ljuser-userhead\"\n            ng-src=\"{{user.userhead_url}}\"\n            ><!--\n    --></a><!--\n\n    Username\n    --><a\n        class=\"i-ljuser-username\"\n        ng-href=\"{{user.journal_url}}\"\n        ng-attr-title=\"{{user.display_username || user.alias}}\"\n        ng-attr-target=\"{{user.target ? user.target : \'_self\'}}\"\n        ><b ng-bind=\"user.display_name || user.display_username\"></b></a><!--\n\n    Alias\n    --><span\n        class=\"i-ljuser-alias\"\n        ng-bind=\"user.alias\"\n        ></span><!--\n\n--></span>\n';

(function () {
  'use strict';

  /**
   * @module LJ.User
   */

  ljUserStatic.$inject = ['$parse'];
  ljUserAvatarStatic.$inject = ['$parse', '$location'];
  angular.module('LJ.User', ['LJ.Api', 'LJ.Templates', 'Users']);

  angular.module('LJ.User').factory('ljUser', ljUser).directive('ljUserById', ljUserById).directive('ljUserDynamic', ljUserDynamic).directive('ljUserAvatarImg', ljUserAvatarImg).directive('ljUserStatic', ljUserStatic).directive('ljUserAvatarStatic', ljUserAvatarStatic);

  /**
   * Helper service that allow us to get lj-user html for user with username and options
   *
   * @example
   *
   *     // returns promise that will be resolved with html for user `good`
   *     ljUser.get('good', { noctxpopup: true });
   */
  ljUser.$inject = ['$rootScope', 'Api', '$q', '$templateCache', '$compile', '$timeout', 'Users'];
  function ljUser($rootScope, Api, $q, $templateCache, $compile, $timeout, Users) {

    // wrapper is needed because we have to get outerHTML
    var wrapper = angular.element('<div />'),
        tmpl = $templateCache.get('ljUser.ng.tmpl');

    /**
     * Prepare data for user, fetch if not ready
     *
     * @param  {String} username Username
     * @return {Promise}         Promise that will be resolved with user data
     */
    function prepare(username) {
      var defer = $q.defer(),
          user = Users.Cache.get(username);

      // do not fetch user data if it has been already fetched
      if (user && user.userhead_url) {
        defer.resolve(user);
        return defer.promise;
      }

      return Users.fetchUser(username, Users.USERHEAD_FIELDS, { cache: true, silent: true });
    }

    /**
     * Prepare data for user, fetch if not ready
     *
     * @param {String} UserId
     * @return {Promise} Promise that will be resolved with user data
     */
    function prepareById(id) {
      var defer = $q.defer(),
          user = Users.Cache.getById(id);

      // do not fetch user data if it has been already fetched
      if (user && user.userhead_url) {
        defer.resolve(user);
        return defer.promise;
      }

      return Users.fetchUserById(id, Users.USERHEAD_FIELDS, { cache: true, silent: true });
    }

    /**
     * Get user html by username
     * @param  {String} username  Username
     * @param  {Object} [options] User options
     * @return {Promise}          Promise that will be resolved with user data
     */
    function get(username, options) {
      var defer = $q.defer(),


      // create temporary scope for html compilation
      scope = $rootScope.$new();

      prepare(username).then(function () {
        var element;

        scope.user = angular.extend({}, Users.Cache.get(username), options || {});
        element = $compile(tmpl)(scope);

        // let angular apply all directives
        $timeout(function () {
          defer.resolve(
          // outerHTML
          wrapper.empty().append(element).html());

          scope.$destroy();
        });
      });

      return defer.promise;
    }

    /**
     * Get user html by id
     * @param  {number} id  userId
     * @param  {Object} [options] User options
     * @return {Promise}          Promise that will be resolved with user data
     */
    function getById(id, options) {
      var defer = $q.defer(),


      // create temporary scope for html compilation
      scope = $rootScope.$new();

      prepareById(id).then(function () {
        var element;

        scope.user = angular.extend({}, Users.Cache.getById(id), options || {});
        element = $compile(tmpl)(scope);

        // let angular apply all directives
        $timeout(function () {
          defer.resolve(
          // outerHTML
          wrapper.empty().append(element).html());

          scope.$destroy();
        });
      });

      return defer.promise;
    }

    return {
      prepare: prepare,
      prepareById: prepareById,
      getById: getById,
      get: get
    };
  }

  /**
   * lj-user-dynamic directive
   *
   * Available options:
   * - noctxpopup: disable contextual popup over the user
   *
   * @example
   *
   *     <span lj-user-dynamic="'good'" />
   *     <span lj-user-dynamic="username" />
   *     <span
   *       lj-user-dynamic="'good'"
   *       lj-user-dynamic-options="{ noctxpopup: true }"
   *       />
   */
  ljUserDynamic.$inject = ['$parse', 'Users', 'ljUser'];
  function ljUserDynamic($parse, Users, ljUser) {

    return {
      templateUrl: 'ljUser.ng.tmpl',
      replace: true,
      scope: true,
      compile: function compile(element, attrs) {
        var usernameGetter = $parse(attrs.ljUserDynamic),
            optionsGetter = $parse(attrs.ljUserDynamicOptions);

        return function link(scope) {
          var options = optionsGetter(scope);

          scope.$watch(function () {
            return usernameGetter(scope);
          }, function (value) {
            var username = value;

            scope.user = angular.extend({
              username: username,
              'display_username': username
            }, options || {});

            ljUser.prepare(username).then(function () {
              scope.$watch(function () {
                return Users.Cache.get(username);
              }, function (user) {
                angular.extend(scope.user, user);
              }, true);
            });
          });
        };
      }
    };
  }

  /**
   * lj-user-avatar directive
   *
   * @example
   *
   *     <span lj-user-avatar-img="username" />
   *     <span lj-user-avatar-img="userid" />
   *     <span
   *       lj-user-avatar-img="username"
   *       lj-user-avatar-img-options="{ class: 'one two three classes' }"
   *       />
   */
  ljUserAvatarImg.$inject = ['$parse', 'Users', 'ljUser'];
  function ljUserAvatarImg($parse, Users, ljUser) {
    return {
      template: '<img class="{{user.class}}" src="https://l-userpic.livejournal.net/default/{{user.id}}" alt="" />',
      // replace: true,
      scope: true,
      compile: function compile(element, attrs) {
        return function link(scope) {
          var user = $parse(attrs.ljUserAvatarImg)(scope),
              options = $parse(attrs.ljUserAvatarImgOptions)(scope),
              may_be_id = +user;

          if (may_be_id !== NaN && user.toString().length === may_be_id.toString().length) {
            scope.user = angular.extend({
              id: user
            }, options || {});

            return;
          }
          (function (a) {
            return a;
          })();

          scope.user = angular.extend({
            username: user
          }, options || {});

          ljUser.prepare(user).then(function (result) {
            scope.$watch(function () {
              return Users.Cache.get(user);
            }, function (user) {
              angular.extend(scope.user, user);
            }, true);
          });
        };
      }
    };
  }

  /**
   * lj-user-by-id directive
   *
   * Available options:
   * - noctxpopup: disable contextual popup over the user
   *
   * @example
   *
   *     <span lj-user-by-id="'123'" />
   *     <span lj-user-by-id="userid" />
   *     <span
   *       lj-user-by-id="'123'"
   *       lj-user-by-id-options="{ noctxpopup: true }"
   *       />
   */
  ljUserById.$inject = ['$parse', 'Users', 'ljUser'];
  function ljUserById($parse, Users, ljUser) {

    return {
      templateUrl: 'ljUser.ng.tmpl',
      replace: true,
      scope: true,
      compile: function compile(element, attrs) {
        return function link(scope) {
          var id = $parse(attrs.ljUserById)(scope),
              options = $parse(attrs.ljUserByIdOptions)(scope);

          scope.user = angular.extend({
            username: 'user-' + id,
            'display_username': 'user-' + id
          }, options || {});

          ljUser.prepareById(id).then(function () {
            scope.$watch(function () {
              return Users.Cache.getById(id);
            }, function (user) {
              angular.extend(scope.user, user);
            }, true);
          });
        };
      }
    };
  }

  /**
   * lj-user-static directive
   *
   * Available options:
   * - noctxpopup: disable contextual popup over the user
   *
   * @example
   *
   *     <span
   *       lj-user-static="'good'"
   *       lj-user-static-id="'123'"
   *       lj-user-static-options="{ noctxpopup: true }"
   *     />
   *
   */
  /* eslint-disable camelcase */
  function ljUserStatic($parse) {
    var protocol = 'https:';

    return {
      templateUrl: 'ljUser.ng.tmpl',
      replace: true,
      scope: true,
      compile: function compile(element, attrs) {
        var userGetter = $parse(attrs.ljUserStatic),
            idGetter = $parse(attrs.ljUserStaticId),
            optionsGetter = $parse(attrs.ljUserStaticOptions);


        return function link(scope) {
          var user = userGetter(scope),
              userid = idGetter(scope),
              options = optionsGetter(scope) || {},
              journal = options.journal_url || protocol + '//' + user + '.livejournal.com/',
              profileUrl = protocol + '//' + user + '.livejournal.com/profile';


          // for varlamov.ru
          if (user === 'zyalt') {
            profileUrl = journal + 'profile';
            user = 'varlamov.ru';
          }

          scope.user = {
            alias: '',
            display_name: options.display_name || user,
            display_username: options.display_username || user,
            id: userid,
            is_invisible: false,
            journal_url: journal,
            journaltype: 'P',
            profile_url: profileUrl,
            userhead_url: protocol + '//l-files.livejournal.net/userhead/default/' + userid,
            username: user,
            noctxpopup: options.noctxpopup
          };
        };
      }
    };
  }
  /* eslint-enable camelcase */

  /**
   * lj-user-avatar-static directive
   *
   * Available options:
   * - class: specific classname
   *
   * @example
   *
   *     <span
   *       lj-user-avatar-static
   *       lj-user-avatar-static-id="'123'"
   *       lj-user-avatar-static-options="{ class: 'one two three classes' }"
   *     />
   *
   */
  function ljUserAvatarStatic($parse, $location) {
    var protocol = 'https:';
    return {
      template: '\n        <img\n          class="{{user.class}}"\n          ng-src="' + protocol + '//l-userpic.livejournal.net/default/{{user.id}}"\n          alt=""\n        />',
      scope: true,
      compile: function compile(element, attrs) {
        var idGetter = $parse(attrs.ljUserAvatarStaticId),
            optionsGetter = $parse(attrs.ljUserAvatarStaticOptions);


        return function link(scope) {
          var userid = idGetter(scope),
              options = optionsGetter(scope);

          scope.user = {
            id: userid,
            class: options.class || ''
          };
        };
      }
    };
  }
})();
/* <<< file end: js/core/angular/ljUser.js */

//# map link was there [ljUser.js.map]
/* >>> file start: js/widgets/discoverytimes.js */
//= require js/core/angular/radioGroup.js
//= require js/node_modules/angular-sanitize/angular-sanitize.js
//= require js/core/angular/api.js
//= require js/core/angular/users.js
//= require js/core/angular/ljUser.js

/**
 * Template: templates/Widgets/discoverytimes.tmpl
 */

// jscs:disable jsDoc

(function () {
  'use strict';

  MediusTimesService.$inject = ['Api'];
  DiscoveryTimesService.$inject = ['Api'];
  DiscoveryTimesCtrl.$inject = ['$scope', '$interval', 'radioGroup', 'Users', 'DiscoveryTimesService', 'MediusTimesService'];
  angular.element('body').ready(bootstrap);

  angular.module('LJ.DiscoveryTimes', ['ngSanitize', 'LJ.Directives', 'LJ.RadioGroup', 'LJ.Api', 'LJ.User', 'Users']);

  angular.module('LJ.DiscoveryTimes').directive('ljDiscoveryTimes', ljDiscoveryTimes).factory('MediusTimesService', MediusTimesService).factory('DiscoveryTimesService', DiscoveryTimesService);

  function bootstrap() {
    var wrapper = angular.element('.b-discoverytimes-wrapper[lj-discovery-times]');

    if (!wrapper.injector()) {
      // avoid double bootstraping
      angular.bootstrap(wrapper, ['LJ.DiscoveryTimes']);
    }
  }

  /**
   * @directive ljDiscoveryTimes
   */
  function ljDiscoveryTimes() {
    return {
      scope: true,
      link: linkFunc,
      controller: DiscoveryTimesCtrl,
      controllerAs: 'times'
    };

    function linkFunc($scope, $element) {
      $element.removeAttr('lj-discovery-times');
    }
  }

  /**
   * @ngdoc controller DiscoveryTimesCtrl
   */
  function DiscoveryTimesCtrl($scope, $interval, radioGroup, Users, DiscoveryTimesService, MediusTimesService) {
    var vm = this,
        service = LJ.Flags.isEnabled('medius_ui') ? MediusTimesService : DiscoveryTimesService,
        active = radioGroup('active'),
        timeout = 5e3,
        slide = -1,
        timeoutId;

    vm.items = [];
    vm.active = active.reset().models();
    vm.isRecommend = false;
    vm.showRecommend = false;
    vm.showRandom = false;

    vm.close = function () {
      // sendMessage('ljlive close');
    };

    vm.recommend = function () {
      service.setRecommend().then(function () {
        vm.isRecommend = service.isRecommend;
      });
    };

    service.getRecommend().then(function () {
      vm.showRecommend = service.showRecommend;
      vm.showRandom = !vm.showRecommend;
      vm.isRecommend = service.isRecommend;
    });

    service.getFeed().then(function (data) {
      vm.items = data.items.filter(Boolean); // filter incorrect items which could come from server
      Users.Cache.add(vm.items.map(LJ.Function.get('user')));
    }).then(init);

    function nextSlide() {
      slide += 1;

      if (slide >= vm.items.length) {
        slide = 0;
      }

      active.on(vm.items[slide].itemid);
    }

    function init() {
      if (vm.items.length !== 0) {
        nextSlide();
        timeoutId = $interval(nextSlide, timeout);

        $scope.$on('$destroy', $interval.cancel.bind($interval, timeoutId));
      }
    }
  }

  /**
   * @ngdoc service MediusTimesService
   */
  function MediusTimesService(Api) {
    var options = {
      itemshow: 10
    },
        params = {
      entry: Boolean(LJ.get('entry')),
      remoteid: LJ.get('remote.id'),
      journalid: LJ.get('journal.id'),
      publicEntry: LJ.get('entry.is_public'),
      ditemid: LJ.get('entry.ditemid')
    },
        service = {
      getFeed: getFeed,
      isRecomend: false,
      getRecommend: getRecommend,
      setRecommend: setRecommend,
      showRecommend: false
    };

    return service;

    function getFeed() {
      options.limit = options.itemshow; // remap according to api doc
      options.is_published = true;
      return Api.call('medius.get_public_items', options).then(remapData);
    }

    function remapData(data) {
      data.items = data.items.filter(function (item) {
        return item.author;
      }).map(function (item) {
        item.itemid = item.jitem_id;
        item.url = item.link;
        item.subject = item.title;
        return item;
      });
      return data;
    }

    function getRecommend() {
      if (!service.showRecommend) {
        return Promise.resolve();
      }

      return Api.call('discovery.is_recommend', params).then(function (data) {
        if (data.status === 'ok') {
          service.isRecommend = data.is_recommend;
        }
      });
    }

    function setRecommend() {
      if (!service.showRecommend) {
        return Promise.resolve();
      }

      return Api.call('discovery.recommend', params).then(function (data) {
        if (data.status === 'ok') {
          service.isRecommend = true; // data.is_recommend;
        }
      });
    }
  }

  /**
   * @service DiscoveryTimesService
   */
  function DiscoveryTimesService(Api) {
    var options = {
      itemshow: 10
    },
        params = {
      entry: Boolean(LJ.get('entry')),
      remoteid: LJ.get('remote.id'),
      journalid: LJ.get('journal.id'),
      publicEntry: LJ.get('entry.is_public'),
      ditemid: LJ.get('entry.ditemid')
    },
        service = {
      getFeed: getFeed,
      isRecomend: false,
      getRecommend: getRecommend,
      setRecommend: setRecommend,
      showRecommend: params.entry && params.journalid && params.remoteid && params.publicEntry && params.journalid !== params.remoteid
    };

    return service;

    function getFeed() {
      return Api.call('discovery.get_feed', options);
    }

    function getRecommend() {
      if (!service.showRecommend) {
        return Promise.resolve();
      }

      return Api.call('discovery.is_recommend', params).then(function (data) {
        if (data.status === 'ok') {
          service.isRecommend = data.is_recommend;
        }
      });
    }

    function setRecommend() {
      if (!service.showRecommend) {
        return Promise.resolve();
      }

      return Api.call('discovery.recommend', params).then(function (data) {
        if (data.status === 'ok') {
          service.isRecommend = true; // data.is_recommend;
        }
      });
    }
  }
})();
/* <<< file end: js/widgets/discoverytimes.js */

//# map link was there [discoverytimes.js.map]
