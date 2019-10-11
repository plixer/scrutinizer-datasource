"use strict";

System.register(["lodash", "./reportData", "./reportTypes"], function (_export, _context) {
  "use strict";

  var _, ScrutinizerJSON, Handledata, reportTypes, reportDirection, displayOptions, _createClass, makescrutJSON, dataHandler, GenericDatasource;

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
          this.exporterList = this.exporterList();
        }

        _createClass(GenericDatasource, [{
          key: "query",
          value: function query(options) {
            var _this = this;

            //store number of queries being run, make sure to run a Scrutinizer request for each query made.
            var numberOfQueries = 0;

            //data sent up into this list, it's returned at end.
            var datatoGraph = [];

            //only run a report if all options are populated, only matter when there are not adhoc filters.
            this.runReport = false;

            //takes the query and stores it to a variable
            var query = this.buildQueryParameters(options);

            //save the query to this, so it can be accessed by other methods.
            this.liveQuery = query;

            query.targets = query.targets.filter(function (t) {
              return !t.hide;
            });

            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            //add adhoc filters to the query.
            if (this.templateSrv.getAdhocFilters) {
              query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
            } else {
              query.adhocFilters = [];
            }

            var checkStart = query.targets.length - 1;
            //counter is used to keep track of number of exporters. This matters for creating the filter ojects
            var numberofExporters = 0;
            var filterTypes = ["Source IP Filter", "Add Port Filter", "Destination IP Filter"];
            if (query.adhocFilters.length > 0) {
              query.adhocFilters.forEach(function (filter) {
                if (!filterTypes.includes(filter["key"])) {
                  numberofExporters++;
                }
              });

              //start the process of gathering data from scrutinizer. 
              return new Promise(function (resolve, reject) {
                //filter object used to store data about addtional data about filters needed for Scrutinizer to return data. 
                var filterObject = {
                  sourceIp: [],
                  exporterDetails: [],
                  ports: [],
                  destIp: []
                };

                //this exporter count is compared to the number of exporters to verify we have loops threw everything before returning.
                var exporterCount = 0;

                query.adhocFilters.forEach(function (filter) {
                  console.log(filter['key']);
                  if (filter["key"] === "Source IP Filter") {
                    //source IPs are pushed up as an array, will add other filter methods later.
                    filterObject.sourceIp.push(filter["value"]);
                  } else if (filter["key"] === "Add Port Filter") {

                    filterObject.ports.push(filter["value"]);
                  } else if (filter["key"] === "Destination IP Filter") {

                    filterObject.destIp.push(filter["value"]);
                  } else {
                    //in some cases we will be passed the DNS/SNMP name of an exporter, here we convert it to an IP address needed for final filter. 
                    var adhocParams = makescrutJSON.findExporter(_this.scrutInfo, filter["key"]);

                    _this.doRequest(adhocParams).then(function (exporter_details) {
                      var exporterIpFound = exporter_details.data.results[0].exporter_ip;

                      //need to find the interface ID for the interface passed to Scrutinizer.
                      var interfaceParams = makescrutJSON.interfaceJSON(_this.scrutInfo, exporterIpFound);
                      _this.doRequest(interfaceParams).then(function (interfaceDetails) {
                        var interfaceList = interfaceDetails["data"]["rows"];
                        //for each interface that belongs to a device, we want to compare it against the one selected in grafana. If it matched we can add it to the filters
                        interfaceList.forEach(function (exporterInterface) {
                          var interfaceID = exporterInterface[5].filterDrag.searchStr;
                          var interfaceName = exporterInterface[5]["label"];
                          //if selected interface matches and interface in the list, add it to object
                          if (filter["value"] === interfaceName) {
                            filterObject.exporterDetails.push({
                              exporterName: filter["key"],
                              exporterIp: exporterIpFound,
                              interfaceName: filter["value"],
                              interfaceId: interfaceID
                            });
                          }
                        });

                        exporterCount++;
                        console.log(exporterCount);
                        console.log(numberofExporters);
                        console.log(exporterCount === numberofExporters);
                        //we have now looped through all the exporters in the filters.
                        if (exporterCount === numberofExporters) {
                          //created the filters we need to pass into each gadget on the dashboard.
                          var reportFilter = _this.createFilters(filterObject);
                          console.log(reportFilter);
                          //run a query for each gadget on the dashboard.
                          query.targets.forEach(function (eachQuery) {
                            var scrutParams = makescrutJSON.createFilters(_this.scrutInfo, options, reportFilter, eachQuery);

                            var params = makescrutJSON.findtimeJSON(_this.scrutInfo, scrutParams);
                            //find out what interval the data is in, we need to use this later to normalize the graphs.
                            _this.doRequest(params).then(function (response) {
                              var selectedInterval = response.data["report_object"].dataGranularity.used;
                              //set up JSON to go to Scrutinizer API
                              var params = makescrutJSON.reportJSON(_this.scrutInfo, scrutParams);
                              //request for report data made to scrutinizer
                              _this.doRequest(params).then(function (response) {
                                //data organized into how Grafana expects it.
                                var formatedData = dataHandler.formatData(response.data, scrutParams, selectedInterval);

                                datatoGraph.push(formatedData);
                                datatoGraph = [].concat.apply([], datatoGraph);
                                numberOfQueries++;
                                //make sure we have gone through each query in a gadget.
                                if (numberOfQueries === query.targets.length) {
                                  return resolve({ data: datatoGraph });
                                }
                              });
                            });
                          });
                        }
                      });
                    });
                  }
                });
              });
            } else {
              if ((query.targets[checkStart].target !== undefined || "Select Exporter") && query.targets[checkStart].reportInterface !== "Select Interface" && query.targets[checkStart].reportDirection !== "Select Direction" && query.targets[checkStart].reportType !== "Select Report") {
                this.runReport = true;
              }

              //once all drop downs are selected, run the report.
              if (this.runReport == true) {
                return new Promise(function (resolve, reject) {
                  var _loop = function _loop(j) {
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
                    _loop(j);
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

            options.withCredentials = this.withCredentials;
            options.headers = this.headers;

            return this.backendSrv.datasourceRequest(options);
          }
        }, {
          key: "buildQueryParameters",
          value: function buildQueryParameters(options) {
            var _this3 = this;

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
          key: "HandleAdhocFilters",
          value: function HandleAdhocFilters(resolve, options) {
            var _this4 = this;

            var exporterParams = makescrutJSON.findExporter(this.scrutInfo, options.key);
            var interfaces = [];

            this.doRequest(exporterParams).then(function (exporterResults) {
              var exporterIp = exporterResults["data"]["results"][0]["exporter_ip"];
              var interfaceParams = makescrutJSON.interfaceJSON(_this4.scrutInfo, exporterIp);

              _this4.doRequest(interfaceParams).then(function (interfaceDetails) {
                var interfaceList = interfaceDetails["data"]["rows"];

                for (var k = 0; k < interfaceList.length; k++) {
                  var interfaceID = interfaceList[k][5].filterDrag.searchStr;
                  var interfaceName = interfaceList[k][5]["label"];
                  interfaces.push({
                    text: interfaceName
                  });
                }
                return resolve(interfaces);
              });
            });
          }
        }, {
          key: "createFilters",
          value: function createFilters(filterObject) {
            console.log("running create filters");

            var reportFilters = {};

            //if there are ip addres filters, add them
            if (filterObject.sourceIp.length > 0) {
              filterObject.sourceIp.forEach(function (element, index) {
                var filerCount = "sdfIps_" + index;
                reportFilters[filerCount] = "in_" + element + "_src";
              });
            }

            if (filterObject.destIp.length > 0) {
              filterObject.destIp.forEach(function (element, index) {
                var filerCount = "sdfIps_" + index;
                reportFilters[filerCount] = "in_" + element + "_dst";
              });
            }

            if (filterObject.ports.length > 0) {
              filterObject.ports.forEach(function (element, index) {
                var filerCount = "sdfSdPorts_" + index;
                reportFilters[filerCount] = "in_" + element + "_both";
              });
            }
            //there will always be exporter filters, add them.
            filterObject.exporterDetails.forEach(function (element, index) {
              var exporterIp = element.exporterIp,
                  interfaceId = element.interfaceId;

              var filterCount = "sdfDips_" + index;

              reportFilters[filterCount] = "in_" + exporterIp + "_" + exporterIp + "-" + interfaceId;
            });
            console.log(reportFilters);

            return reportFilters;
          }
        }, {
          key: "addInterfaces",
          value: function addInterfaces(exporterName) {
            var _this5 = this;

            //if key is exporter there is no AND, we know we are looking for interfaces on that exporter.
            var interfaces = [];
            var exporterToSearch = exporterName;
            var adhocParams = makescrutJSON.findExporter(this.scrutInfo, exporterToSearch);
            this.doRequest(adhocParams).then(function (exporter_details) {
              var exporterIpFound = exporter_details.data.results[0].exporter_ip;
              var interfacesToSearch = makescrutJSON.interfaceJSON(_this5.scrutInfo, exporterIpFound);
              _this5.doRequest(interfacesToSearch).then(function (interfaceDetails) {
                var i = 0;
                var interfaceJson = interfaceDetails.data;

                if (interfaces.length > 0) {
                  interfaces = [];
                }
                for (i = 0; i < interfaceJson.rows.length; i++) {
                  //add interfaces to the interface filter options
                  interfaces.push(interfaceJson.rows[i][5].label);
                }

                return resolve(interfaces);
              });
            });
          }
        }, {
          key: "presentOptions",
          value: function presentOptions(resolve) {
            var _this6 = this;

            var params = makescrutJSON.exporterJSON(this.scrutInfo);
            return this.doRequest(params).then(function (response) {
              var exporterList = [{ text: "All Exporters" }, { text: "Device Group" }, { text: "Source IP Filter" }, { text: "Add Port Filter" }, { text: "Destination IP Filter" }];
              for (var i = 0; i < response.data.length; i++) {
                exporterList.push({
                  text: response.data[i]["name"],
                  value: response.data[i]["ip"]
                });
              }

              _this6.exporters = exporterList;
              return resolve(exporterList);
            });
          }
        }, {
          key: "getTagKeys",
          value: function getTagKeys(options) {
            var _this7 = this;

            return new Promise(function (resolve, reject) {
              _this7.presentOptions(resolve);
            });
          }
        }, {
          key: "getTagValues",
          value: function getTagValues(options) {
            var _this8 = this;

            console.log("getting tag values");

            switch (options.key) {
              case "Source IP Filter":
                return new Promise(function (resolve, reject) {
                  resolve();
                });
              default:
                return new Promise(function (resolve, reject) {
                  _this8.HandleAdhocFilters(resolve, options);
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
