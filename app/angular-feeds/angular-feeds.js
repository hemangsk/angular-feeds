/**
 * angular-feeds - v0.0.1 - 2014-02-12 9:21 AM
 * https://github.com/siddii/angular-feeds
 *
 * Copyright (c) 2014 
 * Licensed MIT <https://github.com/siddii/angular-feeds/blob/master/LICENSE.txt>
 */
'use strict';

angular.module('feeds-directives', []).directive('feed', ['feedService', '$compile', '$templateCache', '$http', function (feedService, $compile, $templateCache, $http) {
  return  {
    restrict: 'E',
    scope: {
      summary: '=summary'
    },
    controller: ['$scope', '$element', '$attrs', '$timeout', function ($scope, $element, $attrs, $timeout) {
      $scope.$watch('finishedLoading', function (value){
        if ($attrs.postRender && value) {
          $timeout(function (){
            new Function($attrs.postRender)();
          });
        }
      });

      $scope.feeds = [];

      var spinner = $templateCache.get('feed-spinner.html');
      $element.append($compile(spinner)($scope));

      function pushFeeds(feedsObj) {
        for (var i = 0; i < feedsObj.length; i++) {
          $scope.feeds.push(feedsObj[i]);
        }
      }

      feedService.getFeeds($attrs.src, $attrs.count).then(function (feedsObj) {
        if (feedsObj.length > 0) {

          $element.find('.spinner').slideUp();
          if ($attrs.templateUrl) {
            $http.get($attrs.templateUrl, {cache: $templateCache}).success(function (templateHtml){
              $element.append($compile(templateHtml)($scope));
              pushFeeds(feedsObj);
            });
          }
          else {
            $element.append($compile($templateCache.get('feed-list.html'))($scope));
            pushFeeds(feedsObj)
          }
        }
      }, function (error) {
        $scope.error = error;
        console.error('Error loading feed ', error);
      }).finally(function (){
        $scope.$evalAsync('finishedLoading = true')
      });
    }]
  }
}]);

'use strict';

angular.module('feeds', ['feeds-services', 'feeds-directives']).config(function (){
    console.log('Loading Feeds module...');
});
'use strict';

angular.module('feeds-services', []).factory('feedService', ['$q', '$sce', 'feedStorage', function ($q, $sce, feedStorage) {

    function sanitizeFeedEntry(feedEntry) {
      feedEntry.title = $sce.trustAsHtml(feedEntry.title);
      feedEntry.contentSnippet = $sce.trustAsHtml(feedEntry.contentSnippet);
      feedEntry.content = $sce.trustAsHtml(feedEntry.content);
      return feedEntry;
    }

    var getFeeds = function (src, count) {
      var deferred = $q.defer();

      var feed = new google.feeds.Feed(src);
      if (count) {
        feed.includeHistoricalEntries();
        feed.setNumEntries(count);
      }

      feed.load(function (response) {
        if (response.error) {
          deferred.reject(response.error);
        }
        else {
          for (var i = 0; i < response.feed.entries.length; i++) {
            sanitizeFeedEntry(response.feed.entries[i]);
          }
          deferred.resolve(response.feed.entries);
        }
      });
      return deferred.promise;
    };

    return {
      getFeeds: getFeeds
    };
  }])
  .factory('feedStorage', function () {
    var CACHE_INTERVAL = 1000 * 60 * 15; //15 minutes

    function cacheTimes() {
      if ('CACHE_TIMES' in localStorage) {
        return angular.fromJson(localStorage['CACHE_TIMES']);
      }
      return {};
    }

    function hasCache(name) {
      var CACHE_TIMES = cacheTimes();
      return name in CACHE_TIMES && name in localStorage && new Date().getTime() - CACHE_TIMES[name] < CACHE_INTERVAL;
    }

    return {
      setValue: function (key, value) {
        if (window.Android) {
          window.Android.setValue(key, angular.toJson(value));
        }
        else {
          localStorage[key] = angular.toJson(value);
        }
      },
      getValue: function (key, defaultValue) {
        if (window.Android) {
          var value = window.Android.getValue(key, defaultValue);
          if (!value || value === 'undefined') {
            return defaultValue
          }
          return angular.fromJson(value);
        }
        else if (localStorage[key] != undefined) {
          return angular.fromJson(localStorage[key]);
        }
        return defaultValue ? defaultValue : null;
      },
      setCache: function (name, obj) {
        localStorage[name] = angular.toJson(obj);
        var CACHE_TIMES = cacheTimes();
        CACHE_TIMES[name] = new Date().getTime();
        localStorage['CACHE_TIMES'] = angular.toJson(CACHE_TIMES);
      },
      getCache: function (name) {
        if (hasCache(name)) {
          return angular.fromJson(localStorage[name]);
        }
        return null;
      },
      hasCache: hasCache
    };
  });
angular.module('feeds').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('feed-list.html',
    "<div>\n" +
    "    <div ng-if=\"!loading && error\" class=\"alert alert-danger\">\n" +
    "        <h4 class=\"text-center\">Oops... Something bad happened, please try later :(</h4>\n" +
    "    </div>\n" +
    "\n" +
    "    <div ng-if=\"feeds.length == 0\" class=\"alert alert-info\">\n" +
    "        <h4 class=\"text-center\">Nothing to show here... <br/> Please try later...</h4>\n" +
    "    </div>\n" +
    "\n" +
    "    <ul class=\"media-list\">\n" +
    "        <li ng-repeat=\"feed in feeds | orderBy: '-publishedDate'\" class=\"media\">\n" +
    "            <div class=\"media-body\">\n" +
    "                <h4 class=\"media-heading\"><a target=\"_new\" href=\"{{feed.link}}\" ng-bind-html=\"feed.title\"></a></h4>\n" +
    "                <p ng-bind-html=\"!summary ? feed.content : feed.contentSnippet\"></p>\n" +
    "            </div>\n" +
    "            <hr ng-if=\"!$last\"/>\n" +
    "        </li>\n" +
    "    </ul>\n" +
    "</div>"
  );


  $templateCache.put('feed-spinner.html',
    "<div class=\"spinner\">\n" +
    "    <div class=\"bar1\"></div>\n" +
    "    <div class=\"bar2\"></div>\n" +
    "    <div class=\"bar3\"></div>\n" +
    "    <div class=\"bar4\"></div>\n" +
    "    <div class=\"bar5\"></div>\n" +
    "    <div class=\"bar6\"></div>\n" +
    "    <div class=\"bar7\"></div>\n" +
    "    <div class=\"bar8\"></div>\n" +
    "</div>\n"
  );

}]);