'use strict';

/**
 * @ngdoc function
 * @name frontendApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the frontendApp
 */
angular.module('splain-app')
  .controller('MainCtrl', function ($scope, solrSearchSvc, fieldSpecSvc, normalDocsSvc, settingsStoreSvc) {
    $scope.main = {};
    $scope.main.searcher = null;
    $scope.main.docs = [];
    $scope.main.NO_SEARCH = 0;
    $scope.main.DID_SEARCH = 1;
    $scope.main.WAITING_FOR_SEARCH = 2;
    $scope.main.IN_ERROR = 3;
    $scope.main.state = $scope.main.NO_SEARCH;
    $scope.main.linkUrl = '#';
    $scope.main.numFound = 0;

    
    var solrSettings = settingsStoreSvc.get();

    $scope.main.search = function() {
      var promise = Promise.create($scope.main.search);
      var fieldSpec = fieldSpecSvc.createFieldSpec(solrSettings.fieldSpecStr);
      var parsedArgs = solrSearchSvc.parseSolrArgs(solrSettings.solrArgsStr);
      $scope.main.solrSearcher = solrSearchSvc.createSearcher(fieldSpec.fieldList(),
                                                              solrSettings.solrUrl, parsedArgs, '');
      $scope.main.state = $scope.main.WAITING_FOR_SEARCH;
      $scope.main.solrSearcher.search()
      .then(function() {
        $scope.main.linkUrl = $scope.main.solrSearcher.linkUrl;
        $scope.main.numFound = $scope.main.solrSearcher.numFound;
        if ($scope.main.solrSearcher.inError) {
          $scope.main.state = $scope.main.IN_ERROR;
          return;
        }

        $scope.main.docs.length = 0;
        var maxScore = null;
        angular.forEach($scope.main.solrSearcher.docs, function(doc) {
          var normalDoc = normalDocsSvc.createNormalDoc(fieldSpec, doc);
          if (maxScore === null) {
            maxScore = 0.0 + normalDoc.score;
          }
          normalDoc.hots = {outOf: maxScore, matches: []};
          var hotMatches = normalDoc.explain().vectorize();
          var i = 0;
          angular.forEach(hotMatches.vecObj, function(contribution, description) {
            normalDoc.hots.matches[i] = {label: description, percentage: ((contribution / maxScore) * 100.0)};
            i++;
          });
          $scope.main.docs.push(normalDoc);
        });
        $scope.main.state = $scope.main.DID_SEARCH;
        promise.complete();
      });
      return promise;
    };
  });
