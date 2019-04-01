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
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv, $http) {
          _classCallCheck(this, GenericDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url + "/fcgi/scrut_fcgi.fcgi";
          this.authToken = instanceSettings.jsonData["scrutinizerKey"];
          this.name = instanceSettings.name;
          this.q = $q;
          this.http = $http;
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

          this.filters = '';
        }

        _createClass(GenericDatasource, [{
          key: "query",
          value: function query(options) {
            var _this = this;

            var k = 0;
            var datatoGraph = [];

            this.runReport = false;

            var query = this.buildQueryParameters(options);

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

            if ((query.targets[checkStart].target !== undefined || "Select Exporter") && query.targets[checkStart].reportInterface !== "Select Interface" && query.targets[checkStart].reportDirection !== "Select Direction" && query.targets[checkStart].reportType !== "Select Report") {
              this.runReport = true;
            }

            if (this.runReport == true) {

              return new Promise(function (resolve, reject) {
                var _loop = function _loop(j) {

                  var intervalTime = makescrutJSON.findtimeJSON(_this.authToken, query.targets[j].reportType, //report type
                  options["range"]["from"].unix(), //start time
                  options["range"]["to"].unix(), //end time
                  query.targets[j].target, //ip address
                  query.targets[j].reportDirection, //report direction
                  query.targets[j].reportInterface, // exporter Interface
                  query.targets[j].reportFilters);

                  _this.doRequest({
                    url: "" + _this.url,
                    method: "GET",
                    params: intervalTime
                  }).then(function (response) {
                    var selectedInterval = response.data["report_object"].dataGranularity.used;

                    var scrutinizerJSON = makescrutJSON.reportJSON(_this.authToken, query.targets[j].reportType, //report type
                    options["range"]["from"].unix(), //start time
                    options["range"]["to"].unix(), //end time
                    query.targets[j].target, //ip address
                    query.targets[j].reportDirection, //report direction
                    query.targets[j].reportInterface, // exporter Interface
                    query.targets[j].reportFilters);

                    var scrutDirection = query.targets[j].reportDirection;

                    _this.doRequest({
                      url: "" + _this.url,
                      method: "GET",
                      params: scrutinizerJSON
                    }).then(function (response) {

                      var formatedData = dataHandler.formatData(response.data, scrutDirection, selectedInterval);

                      datatoGraph.push(formatedData);
                      datatoGraph = [].concat.apply([], datatoGraph);

                      k++;

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
                return {
                  status: "success",
                  message: "Data source is working",
                  title: "Success"
                };
              }
            });
          }
        }, {
          key: "findInterfaces",
          value: function findInterfaces(options, scope) {

            var query = this.liveQuery;

            if (query.targets[0].target != undefined) {
              //determins which select you have clicked on.
              var selectedIP = scope.ctrl.target.target;
              return this.doRequest({
                url: "" + this.url,
                method: "GET",
                params: {
                  rm: "status",
                  action: "get",
                  view: "topInterfaces",
                  authToken: "" + this.authToken,
                  session_state: {
                    client_time_zone: "America/New_York",
                    order_by: [],
                    search: [{
                      column: "exporter_search",
                      value: "" + selectedIP,
                      comparison: "like",
                      data: { filterType: "multi_string" },
                      _key: "exporter_search_like_" + selectedIP
                    }],
                    query_limit: { offset: 0, max_num_rows: 50 },
                    hostDisplayType: "dns"
                  }
                }
              }).then(function (response) {
                var data = [{ text: "All Interfaces", value: "allInterfaces" }];
                var l = 0;
                var jsonData = response.data;
                for (l = 0; l < jsonData.rows.length; l++) {
                  data.push({
                    value: jsonData.rows[l][5].filterDrag.searchStr,
                    text: jsonData.rows[l][5].label
                  });
                }

                return data;
              });
            }
          }
        }, {
          key: "applyFilter",
          value: function applyFilter(scope, refresh) {
            console.log(scope);
            this.filters = scope.ctrl.target.filters;
            refresh.refresh();
          }
        }, {
          key: "getExporters",
          value: function getExporters(query, scope) {
            var _this2 = this;

            console.log(scope);

            if (scope.ctrl.target.refId === "A" && query === '') {
              return this.doRequest({
                url: "" + this.url,
                method: "GET",
                params: {
                  rm: "get_known_objects",
                  type: "devices",
                  authToken: "" + this.authToken
                }
              }).then(function (response) {
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

            console.log(options);
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
