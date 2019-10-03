"use strict";

System.register(["lodash", "./reportData", "./reportTypes"], function (_export, _context) {
  "use strict";

  var _, ScrutinizerJSON, Handledata, HandleAdhoc, reportTypes, reportDirection, displayOptions, _createClass, makescrutJSON, dataHandler, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_reportData) {
      ScrutinizerJSON = _reportData.ScrutinizerJSON;
      Handledata = _reportData.Handledata;
      HandleAdhoc = _reportData.HandleAdhoc;
    }, function (_reportTypes) {
      reportTypes = _reportTypes.reportTypes;
      reportDirection = _reportTypes.reportDirection;
      displayOptions = _reportTypes.displayOptions;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      makescrutJSON = new ScrutinizerJSON();
      dataHandler = new Handledata();

      _export("GenericDatasource", GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, GenericDatasource);

          console.log("running Constructor");
          this.type = instanceSettings.type;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.reportOptions = reportTypes;
          this.reportDirections = reportDirection;
          this.displayOptions = displayOptions;
          this.withCredentials = instanceSettings.withCredentials;
          this.liveQuery = "";
          this.headers = { "Content-Type": "application/json" };
          if (typeof instanceSettings.basicAuth === "string" && instanceSettings.basicAuth.length > 0) {
            this.headers["Authorization"] = instanceSettings.basicAuth;
          }
          this.runReport = false;

          this.exporters = [];

          this.filters = "";

          this.scrutInfo = {
            url: instanceSettings.url + "/fcgi/scrut_fcgi.fcgi",
            authToken: instanceSettings.jsonData["scrutinizerKey"]
          };
          this.interfaces = [];
          this.exporterList = this.exporterList();
        }

        _createClass(GenericDatasource, [{
          key: "query",
          value: function query(options) {
            var _this = this;

            console.log("running query");
            //store number of queries being run, make sure to run a Scrutinizer request for each query made.
            var numberOfQueries = 0;
            var datatoGraph = [];

            //only run a report if all options are populated
            this.runReport = false;

            var query = this.buildQueryParameters(options);

            //save the query to this, so it can be accessed by other methods.
            this.liveQuery = query;

            query.targets = query.targets.filter(function (t) {
              return !t.hide;
            });

            //add adhoc filters to the query.
            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            if (this.templateSrv.getAdhocFilters) {
              query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
            } else {
              query.adhocFilters = [];
            }

            var checkStart = query.targets.length - 1;

            //check if there are ad-hoc filters added.
            if (query.adhocFilters.length > 0) {
              //store the exporter that was selected
              var exporterName = query.adhocFilters[0]["value"];
              //store the interface that was selected
              var interfaceName = query.adhocFilters[1]["value"];
              //create params to find the exporter details
              var adhocParams = makescrutJSON.findExporter(this.scrutInfo, exporterName);
              //object needed to make request for Scrutinizer data.
              var exporterObject = {
                exporterIp: "",
                interfaceId: ""
              };
              if (adhocParams) {
                return new Promise(function (resolve, reject) {
                  _this.doRequest(adhocParams).then(function (exporter_details) {
                    //set IP addres for the exporter
                    exporterObject.exporterIp = exporter_details.data.results[0].exporter_ip;
                    //find interfaces for that exporter.
                    var interfaceParams = makescrutJSON.interfaceJSON(_this.scrutInfo, exporterObject.exporterIp);
                    _this.doRequest(interfaceParams).then(function (interfaceDetails) {
                      var i = 0;
                      var interfaceJson = interfaceDetails.data;
                      console.log(interfaceJson);
                      console.log(exporterObject["interfaceId"]);
                      console.log(interfaceName);

                      if (_this.interfaces.length > 0) {
                        _this.interfaces = [];
                      }
                      for (i = 0; i < interfaceJson.rows.length; i++) {
                        console.log(interfaceJson.rows[i][5].label);
                        //add interfaces to the interface filter options
                        _this.interfaces.push({ text: interfaceJson.rows[i][5].label });

                        if (interfaceName === interfaceJson.rows[i][5].label) {
                          exporterObject.interfaceId = interfaceJson.rows[i][5].filterDrag.searchStr;
                        }
                      }

                      var _loop = function _loop(j) {
                        //grab the parameters to from the query.
                        var scrutParams = makescrutJSON.createParams(_this.scrutInfo["authToken"], query.targets[j].reportType, //report type
                        options["range"]["from"].unix(), //start time
                        options["range"]["to"].unix(), //end time
                        exporterObject["exporterIp"], //ip address
                        query.targets[j].reportDirection, //report direction
                        exporterObject["interfaceId"], // exporter Interface
                        query.targets[j].reportFilters, // filerts
                        query.targets[j].reportDisplay // bits or percent
                        );
                        //figure out the intervale time.
                        var params = makescrutJSON.findtimeJSON(_this.scrutInfo, scrutParams);

                        _this.doRequest(params).then(function (response) {
                          //store interval here.
                          var selectedInterval = response.data["report_object"].dataGranularity.used;
                          //set up JSON to go to Scrutinizer API
                          var params = makescrutJSON.reportJSON(_this.scrutInfo, scrutParams);
                          _this.doRequest(params).then(function (response) {
                            var formatedData = dataHandler.formatData(response.data, scrutParams, selectedInterval);

                            datatoGraph.push(formatedData);
                            datatoGraph = [].concat.apply([], datatoGraph);

                            numberOfQueries++;

                            //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                            if (numberOfQueries === query.targets.length) {
                              return resolve({ data: datatoGraph });
                            }
                          });
                        });
                      };

                      for (var j = 0; j < query.targets.length; j++) {
                        _loop(j);
                      }
                    });
                  });
                });
              }
            } else {
              if ((query.targets[checkStart].target !== undefined || "Select Exporter") && query.targets[checkStart].reportInterface !== "Select Interface" && query.targets[checkStart].reportDirection !== "Select Direction" && query.targets[checkStart].reportType !== "Select Report") {
                this.runReport = true;
              }

              //once all drop downs are selected, run the report.
              if (this.runReport == true) {
                return new Promise(function (resolve, reject) {
                  var _loop2 = function _loop2(j) {
                    //grab the parameters to from the query.
                    var scrutParams = makescrutJSON.createParams(_this.scrutInfo["authToken"], query.targets[j].reportType, //report type
                    options["range"]["from"].unix(), //start time
                    options["range"]["to"].unix(), //end time
                    query.targets[j].target, //ip address
                    query.targets[j].reportDirection, //report direction
                    query.targets[j].reportInterface, // exporter Interface
                    query.targets[j].reportFilters, // filerts
                    query.targets[j].reportDisplay // bits or percent
                    );
                    //figure out the intervale time.
                    var params = makescrutJSON.findtimeJSON(_this.scrutInfo, scrutParams);

                    _this.doRequest(params).then(function (response) {
                      //store interval here.
                      var selectedInterval = response.data["report_object"].dataGranularity.used;
                      //set up JSON to go to Scrutinizer API
                      var params = makescrutJSON.reportJSON(_this.scrutInfo, scrutParams);
                      _this.doRequest(params).then(function (response) {
                        var formatedData = dataHandler.formatData(response.data, scrutParams, selectedInterval);

                        datatoGraph.push(formatedData);
                        datatoGraph = [].concat.apply([], datatoGraph);

                        numberOfQueries++;
                        //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                        if (numberOfQueries === query.targets.length) {
                          return resolve({ data: datatoGraph });
                        }
                      });
                    });
                  };

                  for (var j = 0; j < query.targets.length; j++) {
                    _loop2(j);
                  }
                });
              }
            }
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {
            console.log("Running Test");
            var params = makescrutJSON.authJson(this.scrutInfo);
            console.log(params);
            return this.doRequest(params).then(function (response) {
              if (response.status === 200) {
                if (response.data.details == "invalidToken") {
                  //alert if authToken is expired or invalid
                  return {
                    status: "failed",
                    message: "Check your API key, recevied back: " + response.data.err,
                    title: "Api Key Failure"
                  };
                } else {
                  //success if everything works.
                  return {
                    status: "success",
                    message: "Data source is working",
                    title: "Success"
                  };
                }
              }
            });
          }
        }, {
          key: "findInterfaces",
          value: function findInterfaces(options, scope) {
            console.log("running find interfaces");
            var query = this.liveQuery;

            if (query) console.log(query);
            if (query.targets) {
              //determines which select you have clicked on.
              var selectedIP = scope.ctrl.target.target;

              if (selectedIP === "deviceGroup") {
                var params = makescrutJSON.groupJSON(this.url, this.scrutInfo["authToken"]);
                //if user selects Device Group we return a list of all groups available.
                return this.doRequest(params).then(function (response) {
                  var i = 0;

                  var jsonData = response.data;
                  var data = [];
                  for (i = 0; i < jsonData.length; i++) {
                    data.push({
                      value: jsonData[i]["id"].toString(),
                      text: jsonData[i]["name"]
                    });
                  }

                  return data;
                });
              } else {
                //otherwise we figre out what interfaces are available for selected device.
                var interfaceThings = makescrutJSON.interfaceJSON(this.scrutInfo, selectedIP);
                console.log(interfaceThings);

                return this.doRequest(interfaceThings).then(function (response) {
                  var data = [{ text: "All Interfaces", value: "allInterfaces" }];
                  var i = 0;
                  var jsonData = response.data;

                  for (i = 0; i < jsonData.rows.length; i++) {
                    data.push({
                      value: jsonData.rows[i][5].filterDrag.searchStr,
                      text: jsonData.rows[i][5].label
                    });
                  }

                  return data;
                });
              }
            }
          }
        }, {
          key: "applyFilter",
          value: function applyFilter(scope, refresh) {
            console.log("running apply filters");
            this.filters = scope.ctrl.target.filters;
            refresh.refresh();
          }
        }, {
          key: "getExporters",
          value: function getExporters() {
            console.log("running get exporters");
            return this.exporters;
          }
        }, {
          key: "exporterList",
          value: function exporterList() {
            var _this2 = this;

            console.log("running exporterlist");

            var params = makescrutJSON.exporterJSON(this.scrutInfo);
            return this.doRequest(params).then(function (response) {
              var exporterList = [{ text: "All Exporters", value: "allExporters" }, { text: "Device Group", value: "deviceGroup" }];
              for (var i = 0; i < response.data.length; i++) {
                exporterList.push({
                  text: response.data[i]["name"],
                  value: response.data[i]["ip"]
                });
              }

              _this2.exporters = exporterList;
              return exporterList;
            });
          }
        }, {
          key: "doRequest",
          value: function doRequest(options) {
            console.log("running do request");
            options.withCredentials = this.withCredentials;
            options.headers = this.headers;

            return this.backendSrv.datasourceRequest(options);
          }
        }, {
          key: "buildQueryParameters",
          value: function buildQueryParameters(options) {
            var _this3 = this;

            console.log("running build query");
            options.targets = _.filter(options.targets, function (target) {
              return target.target !== "select metric";
            });

            var targets = _.map(options.targets, function (target) {
              return {
                target: _this3.templateSrv.replace(target.target, options.scopedVars, "regex"),
                refId: target.refId,
                hide: target.hide,
                type: target.type || "timeserie",

                reportType: _this3.templateSrv.replace(target.report, options.scopedVars, "regex"),

                reportDirection: _this3.templateSrv.replace(target.direction, options.scopedVars, "regex"),

                reportInterface: _this3.templateSrv.replace(target.interface || "Select Interface", options.scopedVars, "regex"),

                reportFilters: _this3.templateSrv.replace(target.filters || "No Filter", options.scopedVars, "regex"),

                reportDisplay: _this3.templateSrv.replace(target.display || "No Display", options.scopedVars, "regex")
              };
            });

            options.targets = targets;

            return options;
          }
        }, {
          key: "getTagKeys",
          value: function getTagKeys(options) {
            console.log("running get tag eys");
            return new Promise(function (resolve, reject) {
              return resolve([{ text: "Exporter" }, { text: "Interface" }]);
            });
          }
        }, {
          key: "getTagValues",
          value: function getTagValues(options) {
            var _this4 = this;

            console.log(options);
            if (options.key === "Exporter") {
              return new Promise(function (resolve, reject) {
                return resolve(_this4.exporterList);
              });
            } else if (options.key === "Interface") {
              return new Promise(function (resolve, reject) {
                console.log(_this4.interfaces);
                resolve(_this4.interfaces);
              });
            }
          }
        }]);

        return GenericDatasource;
      }());

      _export("GenericDatasource", GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
