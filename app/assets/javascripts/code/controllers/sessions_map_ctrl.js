function SessionsMapCtrl($scope, params, heat, map, sensors, expandables, storage, sessions, versioner,
                         storageEvents, singleSession, functionBlocker, $window, $location,
                         rectangles, infoWindow) {
  $scope.setDefaults = function() {
    $scope.versioner = versioner;
    $scope.params = params;
    $scope.storage = storage;
    $scope.storageEvents = storageEvents;
    $scope.sensors = sensors;
    $scope.expandables = expandables;
    $scope.singleSession = singleSession;
    $scope.$window = $window;

    functionBlocker.block("selectedId", !!params.get('data').sensorId);
    functionBlocker.block("sessionHeat", !!params.get('tmp').tmpSensorId && !_(params.get('sessionsIds')).isEmpty());

    rectangles.clear();
    infoWindow.hide();
    map.unregisterAll();

    $($window).resize(function() {
      $scope.$digest();
    });
    _.each(['sensor', 'location', 'usernames'], function(name) {
      $scope.expandables.show(name);
    });

    storage.updateDefaults({
      sensorId: "",
      location: {address: "", distance: "10", limit: false},
      tags: "",
      usernames: "",
      heat: {highest: 100, high: 80, mid: 70, low: 60, lowest: 20}
    });

    storage.updateFromDefaults();
  };

  //fix for json null parsing
  $scope.$watch("params.get('data').sensorId", function(newValue) {
    if(_(newValue).isNull()){
      params.update({data: {sensorId: ""}});
    }
  }, true);

  $scope.$watch("sensors.selectedId()", function(newValue, oldValue) {
    if(newValue == oldValue){
      return;
    }
    functionBlocker.use("selectedId", function(){
      params.update({sessionsIds: []});
    });
  }, true);

  $scope.heatUpdateCondition = function() {
    return {sensorId:  sensors.anySelectedId(), sessionId: singleSession.id()};
  };
  $scope.$watch("heatUpdateCondition()", function(newValue, oldValue) {
    if(newValue.sensorId && newValue.sessionId){
      functionBlocker.use("sessionHeat", function(){
        singleSession.updateHeat();
      });
    }
   }, true);


  $scope.setDefaults();

}
SessionsMapCtrl.$inject = ['$scope', 'params', 'heat',
   'map', 'sensors', 'expandables', 'storage', 'sessions', 'versioner',
  'storageEvents', 'singleSession', 'functionBlocker', '$window', "$location",
  "rectangles", "infoWindow"];
