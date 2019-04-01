"use strict";

System.register(["lodash"], function (_export, _context) {
  "use strict";

  var _, _createClass, scrutinizerExporters, ScrutinizerJSON, Handledata;

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
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

      _export("scrutinizerExporters", scrutinizerExporters = function scrutinizerExporters() {
        _classCallCheck(this, scrutinizerExporters);

        this.params = {
          rm: "get_known_objects",
          type: "devices"
        };

        this.formatParams = function (params) {
          return "?" + Object.keys(params).map(function (key) {
            return key + "=" + encodeURIComponent(params[key]);
          }).join("&");
        };

        this.moveData = function (arr, old_index, new_index) {
          while (old_index < 0) {
            old_index += arr.length;
          }
          while (new_index < 0) {
            new_index += arr.length;
          }
          if (new_index >= arr.length) {
            var k = new_index - arr.length;

            while (k-- + 1) {
              arr.push(undefined);
            }
          }
          arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
          return arr;
        };
      });

      _export("scrutinizerExporters", scrutinizerExporters);

      _export("ScrutinizerJSON", ScrutinizerJSON = function () {
        function ScrutinizerJSON() {
          _classCallCheck(this, ScrutinizerJSON);
        }

        _createClass(ScrutinizerJSON, [{
          key: "reportJSON",
          value: function reportJSON(authToken, reportType, startTime, endTime, ipAddress, reportDirection, expinterface, reportfilter) {

            var exporterInterface = void 0;
            var scrutFilters = void 0;

            // if user wants all interface or specific interface
            if (expinterface === "allInterfaces") {
              exporterInterface = "_ALL";
            } else {
              exporterInterface = "-" + expinterface;
            }

            //  if user wants all devices, then they are defualted to all interfaces
            if (ipAddress === "allExporters") {
              scrutFilters = {
                sdfDips_0: "in_GROUP_ALL"
              };
            } else {
              // if user wants a specific device, they can either have ALL interfaces, or a specific interface
              if (exporterInterface === "_ALL") {
                scrutFilters = {
                  sdfDips_0: "in_" + ipAddress + "_ALL"
                };
              } else {
                scrutFilters = {
                  sdfDips_0: "in_" + ipAddress + "_" + ipAddress + exporterInterface
                };
              }
            }
            //if user is adding filters to the report.
            if (reportfilter !== "No Filter") {
              var filterJson = JSON.parse(reportfilter);
              for (var key in filterJson) {
                if (filterJson.hasOwnProperty(key)) {
                  //if use copies filter from Scrutinizer example, we want to ignore device filters, as they are set above.
                  if (key != "sdfDips_0") {
                    scrutFilters[key] = filterJson[key];
                  }
                }
              }
            }
            //returning report params to be passed into request
            var params = {
              rm: "report_api",
              action: "get",
              authToken: authToken,
              rpt_json: JSON.stringify({
                reportTypeLang: reportType,
                reportDirections: {
                  selected: reportDirection
                },
                times: {
                  dateRange: "Custom",
                  start: "" + startTime,
                  end: "" + endTime
                },
                filters: scrutFilters,
                dataGranularity: {
                  selected: "auto"
                }
              }),

              data_requested: _defineProperty({}, reportDirection, {
                graph: "all",
                table: {
                  query_limit: {
                    offset: 0,
                    max_num_rows: 10
                  }
                }
              })
            };

            return params;
          }
        }, {
          key: "interfaceJson",
          value: function interfaceJson(authToken, ipAddress) {
            var params = {
              rm: "status",
              action: "get",
              view: "topInterfaces",
              authToken: authToken,
              session_state: JSON.stringify({
                client_time_zone: "America/New_York",
                order_by: [],
                search: [{
                  column: "exporter_search",
                  value: "" + ipAddress,
                  comparison: "like",
                  data: { filterType: "multi_string" },
                  _key: "exporter_search_like_" + ipAddress
                }],
                query_limit: { offset: 0, max_num_rows: 50 },
                hostDisplayType: "dns"
              })
            };

            return params;
          }
        }, {
          key: "findtimeJSON",
          value: function findtimeJSON(authToken, reportType, startTime, endTime, ipAddress, reportDirection, expinterface, reportfilter) {
            var exporterInterface = void 0;
            var scrutFilters = void 0;

            if (expinterface === "allInterfaces") {
              exporterInterface = "_ALL";
            } else {
              exporterInterface = "-" + expinterface;
            }

            //  if user wants all devices, then they are defualted to all interfaces
            if (ipAddress === "allExporters") {
              scrutFilters = {
                sdfDips_0: "in_GROUP_ALL"
              };
            } else {
              // if user wants a specific device, they can either have ALL interfaces, or a specific interface
              if (exporterInterface === "_ALL") {
                scrutFilters = {
                  sdfDips_0: "in_" + ipAddress + "_ALL"
                };
              } else {
                scrutFilters = {
                  sdfDips_0: "in_" + ipAddress + "_" + ipAddress + exporterInterface
                };
              }
            }
            //if user is adding filters to the report.
            if (reportfilter !== "No Filter") {
              var filterJson = JSON.parse(reportfilter);
              for (var key in filterJson) {
                if (filterJson.hasOwnProperty(key)) {
                  if (key != "sdfDips_0") {
                    scrutFilters[key] = filterJson[key];
                  }
                }
              }
            }

            var params = {
              rm: "report_start",
              authToken: authToken,
              report_data: {
                parse: true,
                reportDirections: { selected: "" + reportDirection },
                reportTypeLang: "" + reportType,
                times: {
                  dateRange: "Custom",
                  start: "" + startTime,
                  end: "" + endTime,
                  clientTimezone: "America/New_York"
                },
                filters: scrutFilters,
                dataGranularity: { selected: "auto" },
                oneCollectorRequest: false
              }
            };

            return params;
          }
        }]);

        return ScrutinizerJSON;
      }());

      _export("ScrutinizerJSON", ScrutinizerJSON);

      _export("Handledata", Handledata = function () {
        function Handledata() {
          _classCallCheck(this, Handledata);

          //scrutinizer returns graph data opposite of how grafana wants it. So we flip it here.
          this.rearrangeData = function (arr, oldIndex, newIndex) {
            while (oldIndex < 0) {
              old_index += arr.length;
            }
            while (newIndex < 0) {
              new_index += arr.length;
            }
            if (newIndex >= arr.length) {
              var k = newIndex - arr.length;

              while (k-- + 1) {
                arr.push(undefined);
              }
            }
            arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
            return arr;
          };
        }

        //grafana wants time in millaseconds. so we multiple by 1000.
        //we also want to return data in bits, so we device by 8


        _createClass(Handledata, [{
          key: "formatData",
          value: function formatData(scrutData, reportDirection, intervalTime) {

            var datatoGraph = [];
            var graphingData = scrutData;
            var i = void 0,
                j = 0;
            var graphData = graphingData["report"]["graph"]["pie"][reportDirection];
            var tableData = graphingData["report"]["graph"]["timeseries"][reportDirection];
            for (i = 0; i < tableData.length; i++) {
              for (j = 0; j < tableData[i].length; j++) {
                tableData[i][j][0] = tableData[i][j][0] * 1000;
                tableData[i][j][1] = tableData[i][j][1] * 8 / (intervalTime * 60);
                this.rearrangeData(tableData[i][j], 0, 1);
              }
            }

            for (i = 0; i < graphData.length; i++) {
              datatoGraph.push({
                target: graphData[i]["label"],
                datapoints: tableData[i]
              });
            }

            return datatoGraph;
          }
        }]);

        return Handledata;
      }());

      _export("Handledata", Handledata);
    }
  };
});
//# sourceMappingURL=reportData.js.map
