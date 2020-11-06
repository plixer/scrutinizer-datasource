"use strict";

System.register(["lodash", "./reportData", "./reportTypes"], function (_export, _context) {
  "use strict";

  var _, filter, ScrutinizerJSON, Handledata, AdhocHandler, reportTypes, reportDirection, displayOptions, filterTypes, granularityOptions, resolveDNS, _extends, _createClass, makescrutJSON, dataHandler, adhocHandler, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
      filter = _lodash.filter;
    }, function (_reportData) {
      ScrutinizerJSON = _reportData.ScrutinizerJSON;
      Handledata = _reportData.Handledata;
      AdhocHandler = _reportData.AdhocHandler;
    }, function (_reportTypes) {
      reportTypes = _reportTypes.reportTypes;
      reportDirection = _reportTypes.reportDirection;
      displayOptions = _reportTypes.displayOptions;
      filterTypes = _reportTypes.filterTypes;
      granularityOptions = _reportTypes.granularityOptions;
      resolveDNS = _reportTypes.resolveDNS;
    }],
    execute: function () {
      _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

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
      adhocHandler = new AdhocHandler();

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
          this.granularityOptions = granularityOptions;
          this.displayOptions = displayOptions;
          this.resolveDNS = resolveDNS;
          this.withCredentials = instanceSettings.withCredentials;
          this.liveQuery = "";
          this.headers = { "Content-Type": "application/json" };
          if (typeof instanceSettings.basicAuth === "string" && instanceSettings.basicAuth.length > 0) {
            this.headers["Authorization"] = instanceSettings.basicAuth;
          }
          this.runReport = false;

          this.exporters = [];
          this.filterTypes = filterTypes;

          this.filters = "";

          this.scrutInfo = {
            url: instanceSettings.url + "/fcgi/scrut_fcgi.fcgi",
            authToken: instanceSettings.jsonData["scrutinizerKey"]
          };
          this.exporterList = this.exporterList();

          this.others = false;
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
            var filterTypes = this.filterTypes.map(function (filter) {
              return filter["text"];
            });

            var filterObject = adhocHandler.createObject(query, filterTypes, this.filterTypes);

            query.resolveDNS = null;
            return new Promise(function (resolve, reject) {

              //this exporter count is compared to the number of exporters to verify we have loops threw everything before returning.
              var exporterCount = 0;
              var numberofExporters = 0;

              //all the ability to toggle DNS resolve for Adhoc Filters. 
              if (filterObject.resolve !== null) {
                query['resolveDNS'] = filterObject.resolve;
              }

              if (query.adhocFilters.length > 0) {

                query.adhocFilters.forEach(function (filter) {

                  //if there is an exporter passed in the adhoc filter
                  if (filterObject.exporters.length > 0 && !filterTypes.includes(filter["key"])) {

                    numberofExporters++;

                    //in some cases we will be passed the DNS/SNMP name of an exporter, here we convert it to an IP address needed for final filter.

                    var adhocParams = makescrutJSON.findExporter(_this.scrutInfo, filter["key"]);

                    _this.doRequest(adhocParams).then(function (exporter_details) {

                      var exporterIpFound = void 0;

                      if (exporter_details.data.results.length > 0) {
                        exporterIpFound = exporter_details.data.results[0].exporter_ip;
                      } else if (filter['key'] === "All Exporters") {
                        exporterIpFound = "GROUP";
                      } else if (filter['key'] === "Device Group") {
                        exporterIpFound = filter;
                      }

                      //need to find the interface ID for the interface passed to Scrutinizer.
                      var interfaceParams = makescrutJSON.interfaceJSON(_this.scrutInfo, exporterIpFound);

                      _this.doRequest(interfaceParams).then(function (interfaceDetails) {

                        var interfaceList = interfaceDetails["data"]["rows"];

                        //for each interface that belongs to a device, we want to compare it against the one selected in grafana. If it matched we can add it to the filters

                        if (filter["value"] === "All Interfaces") {
                          filterObject.exporterDetails.push({
                            exporterName: filter["key"],
                            exporterIp: exporterIpFound,
                            interfaceName: filter["value"],
                            interfaceId: "ALL"
                          });
                        } else if (filter["key"] === "Device Group") {

                          var chosenGroup = filter['value'];

                          interfaceList.forEach(function (individualGroup) {
                            var groupName = individualGroup[3]['label'];
                            var groupId = individualGroup[8]['id'];
                            if (chosenGroup === groupName) {
                              filterObject.exporterDetails.push({
                                exporterName: filter["key"],
                                exporterIp: "GROUP",
                                interfaceName: filter["value"],
                                interfaceId: groupId.toString()
                              });
                            }
                          });
                        } else {

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
                        }

                        exporterCount++;
                        //we have now looped through all the exporters in the filters.
                        if (exporterCount === numberofExporters) {

                          query.targets.forEach(function (singleQuery, index, array) {

                            _this.filters = makescrutJSON.createAdhocFilters(filterObject);

                            var scrutParams = makescrutJSON.createParams(_this.scrutInfo, options, singleQuery, _this.filters);

                            //figure out the intervale time.
                            var params = makescrutJSON.findtimeJSON(_this.scrutInfo, scrutParams, singleQuery, filterObject);
                            _this.doRequest(params).then(function (response) {

                              //store interval here.

                              var graphGranularity = response.data["report_object"].graphView.graphGranularity.seconds;

                              //set up JSON to go to Scrutinizer API


                              //add adhoc filters to exhisting filters.

                              var merged = _extends({}, _this.filters, scrutParams["scrutFilters"]);

                              scrutParams.scrutFilters = merged;
                              var params = makescrutJSON.reportJSON(_this.scrutInfo, scrutParams, filterObject);
                              _this.doRequest(params).then(function (response) {
                                var formatedData = dataHandler.formatData(response.data, scrutParams, graphGranularity, singleQuery, query);

                                var noOthers = void 0;

                                // this will override individual gadgets, assumes that adhoc filter is set for show others. 
                                if (filterObject.others === true) {
                                  singleQuery.hideOthers = false;
                                } else if (filterObject.others === false) {
                                  singleQuery.hideOthers = true;
                                }

                                //This is done on the individual gadget level, it assumes no adhoc filter for show others was passed. 
                                if (singleQuery.hideOthers) {
                                  noOthers = formatedData.filter(function (data) {
                                    return data['target'] != 'Other';
                                  });
                                  datatoGraph.push(noOthers);
                                } else {
                                  datatoGraph.push(formatedData);
                                }
                                datatoGraph = [].concat.apply([], datatoGraph);

                                numberOfQueries++;
                                //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                                if (numberOfQueries === array.length) {

                                  return resolve({ data: datatoGraph });
                                }
                              });
                            });
                          });
                        }
                      });
                    });
                  }
                  //if there is not an exporter or Group passed in the filter.
                  else if (filterObject.exporters.length === 0) {

                      query.targets.forEach(function (singleQuery, index, array) {

                        var scrutParams = makescrutJSON.createParams(_this.scrutInfo, options, singleQuery);
                        //figure out the intervale time.
                        var params = makescrutJSON.findtimeJSON(_this.scrutInfo, scrutParams, singleQuery, filterObject);
                        _this.doRequest(params).then(function (response) {

                          //store interval here.

                          var graphGranularity = response.data["report_object"].graphView.graphGranularity.seconds;

                          //set up JSON to go to Scrutinizer API
                          _this.filters = makescrutJSON.createAdhocFilters(filterObject);
                          //add adhoc filters to exhisting filters.
                          var merged = _extends({}, _this.filters, scrutParams["scrutFilters"]);

                          scrutParams.scrutFilters = merged;
                          var params = makescrutJSON.reportJSON(_this.scrutInfo, scrutParams, filterObject);
                          _this.doRequest(params).then(function (response) {
                            var formatedData = dataHandler.formatData(response.data, scrutParams, graphGranularity, singleQuery, query);

                            var noOthers = void 0;

                            // this will override individual gadgets, assumes that adhoc filter is set for show others. 
                            if (filterObject.others === true) {
                              singleQuery.hideOthers = false;
                            } else if (filterObject.others === false) {
                              singleQuery.hideOthers = true;
                            }

                            //This is done on the individual gadget level, it assumes no adhoc filter for show others was passed. 
                            if (singleQuery.hideOthers) {
                              noOthers = formatedData.filter(function (data) {
                                return data['target'] != 'Other';
                              });
                              datatoGraph.push(noOthers);
                            } else {
                              datatoGraph.push(formatedData);
                            }
                            datatoGraph = [].concat.apply([], datatoGraph);

                            numberOfQueries++;
                            //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                            if (numberOfQueries === array.length) {

                              return resolve({ data: datatoGraph });
                            }
                          });
                        });
                      });
                    }
                });
              } else {
                //else block meands you don't have any adhoc filters applied.
                if ((query.targets[checkStart].target !== undefined || "Select Exporter") && query.targets[checkStart].reportInterface !== "Select Interface" && query.targets[checkStart].reportDirection !== "Select Direction" && query.targets[checkStart].reportType !== "Select Report") {
                  _this.runReport = true;
                }

                //once all drop downs are selected, run the report.
                if (_this.runReport == true) {

                  query.targets.forEach(function (query, index, array) {
                    var scrutParams = makescrutJSON.createParams(_this.scrutInfo, options, query);
                    //figure out the intervale time.
                    var params = makescrutJSON.findtimeJSON(_this.scrutInfo, scrutParams, query);

                    _this.doRequest(params).then(function (response) {

                      var graphGranularity = response.data["report_object"].graphView.graphGranularity.seconds;

                      //set up JSON to go to Scrutinizer API
                      var params = makescrutJSON.reportJSON(_this.scrutInfo, scrutParams);
                      _this.doRequest(params).then(function (response) {

                        var formatedData = dataHandler.formatData(response.data, scrutParams, graphGranularity, query);

                        var noOthers = void 0;

                        //add ability to filter out other traffic if desired. 
                        if (query.hideOthers) {
                          noOthers = formatedData.filter(function (data) {
                            return data['target'] != 'Other';
                          });
                          datatoGraph.push(noOthers);
                        } else {
                          datatoGraph.push(formatedData);
                        }

                        datatoGraph = [].concat.apply([], datatoGraph);

                        numberOfQueries++;
                        //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                        if (numberOfQueries === array.length) {

                          return resolve({ data: datatoGraph });
                        }
                      });
                    });
                  });
                }
              }
            });
          }
        }, {
          key: "showOtherTraffic",
          value: function showOtherTraffic() {

            this.others = !this.others;
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {

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

            var query = this.liveQuery;

            if (query.targets) {

              //determines which select you have clicked on.
              var selectedIP = scope.ctrl.target.target;

              if (selectedIP === "deviceGroup") {
                var params = makescrutJSON.groupJSON(this.scrutInfo["url"], this.scrutInfo["authToken"]);

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

            this.filters = scope.ctrl.target.filters;
            refresh.refresh();
          }
        }, {
          key: "getExporters",
          value: function getExporters() {

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

                reportDisplay: _this3.templateSrv.replace(target.display || "No Display", options.scopedVars, "regex"),

                reportGranularity: _this3.templateSrv.replace(target.granularity || "Select Granularity", options.scopedVars, "regex"),

                reportDNS: target.dns,
                hideOthers: target.hideOthers
              };
            });

            options.targets = targets;

            return options;
          }
        }, {
          key: "HandleAdhocFilters",
          value: function HandleAdhocFilters(resolve, options) {
            var _this4 = this;

            if (options.key != "Device Group") {

              var exporterParams = makescrutJSON.findExporter(this.scrutInfo, options.key);
              var interfaces = [{ text: "All Interfaces" }];

              this.doRequest(exporterParams).then(function (exporterResults) {
                var exporterIp = exporterResults["data"]["results"][0]["exporter_ip"];
                var interfaceParams = makescrutJSON.interfaceJSON(_this4.scrutInfo, exporterIp);

                _this4.doRequest(interfaceParams).then(function (interfaceDetails) {
                  var interfaceList = interfaceDetails["data"]["rows"];

                  for (var k = 0; k < interfaceList.length; k++) {
                    var interfaceName = interfaceList[k][5]["label"];
                    interfaces.push({
                      text: interfaceName
                    });
                  }
                  return resolve(interfaces);
                });
              });
            } else {
              var params = makescrutJSON.groupJSON(this.scrutInfo['url'], this.scrutInfo["authToken"]);

              //if user selects Device Group we return a list of all groups available.
              this.doRequest(params).then(function (response) {
                var i = 0;

                var jsonData = response.data;
                var data = [];
                for (i = 0; i < jsonData.length; i++) {
                  data.push({
                    value: jsonData[i]["id"].toString(),
                    text: jsonData[i]["name"]
                  });
                }

                return resolve(data);
              });
            }
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
              var exporterList = [{ text: "All Exporters" }, { text: "Device Group" }, { text: "Source IP Filter" }, { text: "Add Port Filter" }, { text: "Destination IP Filter" }, { text: "Show Others" }, { text: "Select Granularity" }, { text: "Resolve DNS" }];
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

            switch (options.key) {
              case "Source IP Filter":
                return new Promise(function (resolve, reject) {
                  resolve();
                });
              case "Destination IP Filter":
                return new Promise(function (resolve, reject) {
                  resolve();
                });
              case "Add Port Filter":
                return new Promise(function (resolve, reject) {
                  resolve();
                });
              case "All Exporters":
                return new Promise(function (resolve, reject) {
                  resolve([{ 'text': 'All Interfaces',
                    'value': 'All Interfaces' }]);
                });
              case "Show Others":
                return new Promise(function (resolve, reject) {
                  resolve([{ 'text': 'Yes',
                    'value': true }, { 'text': 'No',
                    'value': false }]);
                });

              case "Select Granularity":
                return new Promise(function (resolve, reject) {
                  resolve(_this8.granularityOptions);
                });

              case "Resolve DNS":
                return new Promise(function (resolve, reject) {
                  resolve(_this8.resolveDNS);
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
