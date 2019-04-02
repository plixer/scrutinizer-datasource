"use strict";

System.register(["lodash", "./reportData", "./reportTypes"], function (_export, _context) {
  "use strict";

  var _, ScrutinizerJSON, Handledata, reportTypes, reportDirection, _createClass, makescrutJSON, dataHandler, GenericDatasource;

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
          this.url = instanceSettings.url + "/fcgi/scrut_fcgi.fcgi";
          this.authToken = instanceSettings.jsonData["scrutinizerKey"];
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.reportOptions = reportTypes;
          this.reportDirections = reportDirection;
          this.withCredentials = instanceSettings.withCredentials;
          this.liveQuery = "";
          this.headers = { "Content-Type": "application/json" };
          if (typeof instanceSettings.basicAuth === "string" && instanceSettings.basicAuth.length > 0) {
            this.headers["Authorization"] = instanceSettings.basicAuth;
          }
          this.runReport = false;

          this.exporters = [];

          this.filters = "";
        }

        _createClass(GenericDatasource, [{
          key: "query",
          value: function query(options) {
            var _this = this;

            var k = 0;
            var datatoGraph = [];

            this.runReport = false;

            var query = this.buildQueryParameters(options);
            //save the query to this, so it can be accessed by other methods.
            this.liveQuery = query;
            query.targets = query.targets.filter(function (t) {
              return !t.hide;
            });

            if (query.targets[0].target === undefined) {
              return this.q.when({ data: [] });
            }

            if (this.templateSrv.getAdhocFilters) {
              query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
            } else {
              query.adhocFilters = [];
            }

            var checkStart = query.targets.length - 1;
            //make sure use has selected all of drop downs before running report
            if ((query.targets[checkStart].target !== undefined || "Select Exporter") && query.targets[checkStart].reportInterface !== "Select Interface" && query.targets[checkStart].reportDirection !== "Select Direction" && query.targets[checkStart].reportType !== "Select Report") {
              this.runReport = true;
            }
            //once all drop downs are selected, run the report.
            if (this.runReport == true) {
              return new Promise(function (resolve, reject) {
                var _loop = function _loop(j) {
                  //grab the parameters to from the query.
                  var scrutParams = makescrutJSON.createParams(_this.authToken, query.targets[j].reportType, //report type
                  options["range"]["from"].unix(), //start time
                  options["range"]["to"].unix(), //end time
                  query.targets[j].target, //ip address
                  query.targets[j].reportDirection, //report direction
                  query.targets[j].reportInterface, // exporter Interface
                  query.targets[j].reportFilters // filerts
                  );
                  //figure out the intervale time.
                  var intervalTime = makescrutJSON.findtimeJSON(scrutParams);

                  _this.doRequest({
                    url: "" + _this.url,
                    method: "GET",
                    params: intervalTime
                  }).then(function (response) {
                    //store interval here.
                    var selectedInterval = response.data["report_object"].dataGranularity.used;
                    //set up JSON to go to Scrutinizer API
                    var scrutinizerJSON = makescrutJSON.reportJSON(scrutParams);

                    // let scrutDirection = query.targets[j].reportDirection;

                    _this.doRequest({
                      url: "" + _this.url,
                      method: "GET",
                      params: scrutinizerJSON
                    }).then(function (response) {
                      var formatedData = dataHandler.formatData(response.data, scrutParams.reportDirection, selectedInterval);

                      datatoGraph.push(formatedData);
                      datatoGraph = [].concat.apply([], datatoGraph);

                      k++;
                      //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                      if (k === query.targets.length) {
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
        }, {
          key: "testDatasource",
          value: function testDatasource() {
            return this.doRequest({
              url: "" + this.url,
              method: "GET",
              params: {
                rm: "licensing",
                authToken: "" + this.authToken
              }
            }).then(function (response) {
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

            if (query.targets[0].target != undefined) {
              //determines which select you have clicked on.
              var selectedIP = scope.ctrl.target.target;

              var params = makescrutJSON.interfaceJSON(this.url, this.authToken, selectedIP);

              return this.doRequest(params).then(function (response) {
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
        }, {
          key: "applyFilter",
          value: function applyFilter(scope, refresh) {
            this.filters = scope.ctrl.target.filters;
            refresh.refresh();
          }
        }, {
          key: "getExporters",
          value: function getExporters(query, scope) {
            var _this2 = this;

            if (scope.ctrl.target.refId === "A" && query === "") {
              var params = makescrutJSON.exporterJSON(this.url, this.authToken);

              return this.doRequest(params).then(function (response) {
                var exporterList = [{ text: "All Exporters", value: "allExporters" }];
                for (var i = 0; i < response.data.length; i++) {
                  exporterList.push({
                    text: response.data[i]["name"],
                    value: response.data[i]["ip"]
                  });
                }

                _this2.exporters = exporterList;
                return exporterList;
              });
            } else {
              return this.exporters;
            }
          }
        }, {
          key: "mapToTextValue",
          value: function mapToTextValue(result) {
            return _.map(result.data, function (d, i) {
              if (d && d.text && d.value) {
                return { text: d.text, value: d.value };
              } else if (_.isObject(d)) {
                return { text: d, value: i };
              }

              return { text: d, value: d };
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

                reportFilters: _this3.templateSrv.replace(target.filters || "No Filter", options.scopedVars, "regex")
              };
            });

            options.targets = targets;

            return options;
          }
        }]);

        return GenericDatasource;
      }());

      _export("GenericDatasource", GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
