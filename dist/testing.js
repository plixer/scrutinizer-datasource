"use strict";

System.register([], function (_export, _context) {
  "use strict";

  var _createClass, scrutinizerJSON, scrutinizerRequest;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [],
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

      _export("scrutinizerJSON", scrutinizerJSON = function () {
        function scrutinizerJSON() {
          _classCallCheck(this, scrutinizerJSON);
        }

        _createClass(scrutinizerJSON, [{
          key: "reportJSON",
          value: function reportJSON(authToken, reportType, startTime, endTime, ipAddress) {
            var params = {
              rm: "report_api",
              action: "get",
              authToken: authToken,
              rpt_json: JSON.stringify({
                reportTypeLang: reportType,
                reportDirections: {
                  selected: "inbound"
                },
                times: {
                  dateRange: "Custom",
                  start: "" + startTime,
                  end: "" + endTime,
                  clientTimezone: "America/New_York"
                },
                filters: {
                  sdfDips_0: "in_" + ipAddress + "_" + ipAddress + "_ALL"
                },
                dataGranularity: {
                  selected: "auto"
                }
              }),

              data_requested: JSON.stringify({
                inbound: {
                  graph: "all",
                  table: {
                    query_limit: {
                      offset: 0,
                      max_num_rows: 10
                    }
                  }
                }
              })
            };

            return params;
          }
        }]);

        return scrutinizerJSON;
      }());

      _export("scrutinizerJSON", scrutinizerJSON);

      _export("scrutinizerRequest", scrutinizerRequest = function () {
        function scrutinizerRequest() {
          _classCallCheck(this, scrutinizerRequest);

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

        //used to get all the parameted into the request.


        _createClass(scrutinizerRequest, [{
          key: "formatParams",
          value: function formatParams(params) {
            return "?" + Object.keys(params).map(function (key) {
              return key + "=" + encodeURIComponent(params[key]);
            }).join("&");
          }
        }, {
          key: "formatData",
          value: function formatData(scrutData) {
            var datatoGraph = [];
            var graphingData = JSON.parse(scrutData.responseText);
            var i = void 0,
                j = 0;
            var graphData = graphingData["report"]["graph"]["pie"]["inbound"];
            var tableData = graphingData["report"]["graph"]["timeseries"]["inbound"];
            for (i = 0; i < tableData.length; i++) {
              for (j = 0; j < tableData[i].length; j++) {
                tableData[i][j][0] = tableData[i][j][0] * 1000;

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
        }, {
          key: "makeRequest",
          value: function makeRequest(scrutUrl, scrutParams) {
            var request = new XMLHttpRequest();
            var url = scrutUrl + scrutParams;
            return new Promise(function (resolve, reject) {
              request.onreadystatechange = function () {
                // Only run if the request is complete
                if (request.readyState !== 4) return;

                // Process the response
                if (request.status >= 200 && request.status < 300) {
                  // If successful
                  console.log(request);

                  resolve(request);
                } else {
                  // If failed
                  reject({
                    status: request.status,
                    statusText: request.statusText
                  });
                }
              };

              // Setup our HTTP request
              request.open("GET", url, true);

              // Send the request
              request.send();
            });
          }
        }]);

        return scrutinizerRequest;
      }());

      _export("scrutinizerRequest", scrutinizerRequest);

      ;
    }
  };
});
//# sourceMappingURL=testing.js.map
