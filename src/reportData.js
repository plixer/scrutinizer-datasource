import _ from "lodash";

export class ScrutinizerJSON {
  constructor() {}

  createParams(
    authToken,
    reportType,
    startTime,
    endTime,
    ipAddress,
    reportDirection,
    expInterface,
    reportFilter,
    reportDisplay
  ) {
    let exporterInterface;
    let scrutFilters;
    let scrutDisplay;

    if (expInterface === "allInterfaces") {
      exporterInterface = "_ALL";
    } else {
      exporterInterface = expInterface;
    }

    //  if user wants all devices, then they are defualted to all interfaces
    if (ipAddress === "allExporters") {
      scrutFilters = {
        sdfDips_0: `in_GROUP_ALL`
      };
    } else if (ipAddress === "deviceGroup") {
      scrutFilters = {
        sdfDips_0: `in_GROUP_${exporterInterface}`
      };
    } else {
      // if user wants a specific device, they can either have ALL interfaces, or a specific interface
      if (exporterInterface === "_ALL") {
        scrutFilters = {
          sdfDips_0: `in_${ipAddress}_ALL`
        };
      } else {
        scrutFilters = {
          sdfDips_0: `in_${ipAddress}_${ipAddress}-${exporterInterface}`
        };
      }
    }
    //if user is adding filters to the report.
    if (reportFilter !== "No Filter") {
      let filterJson = JSON.parse(reportFilter);
      for (var key in filterJson) {
        if (filterJson.hasOwnProperty(key)) {
          if (key != "sdfDips_0") {
            scrutFilters[key] = filterJson[key];
          }
        }
      }
    }
    //percent vs bits check, these are passed into to the JSON for scrutinizer.
    if (reportDisplay === "percent") {
      scrutDisplay = { display: "custom_interfacepercent" };
    } else {
      scrutDisplay = { display: "sum_octetdeltacount" };
    }

    return {
      authToken,
      reportType,
      startTime,
      endTime,
      ipAddress,
      reportDirection,
      expInterface: exporterInterface,
      scrutFilters,
      scrutDisplay
    };
  }

  reportJSON(scrutParams) {
    //returning report params to be passed into request
    return {
      rm: "report_api",
      action: "get",
      authToken: scrutParams.authToken,
      rpt_json: JSON.stringify({
        reportTypeLang: scrutParams.reportType,
        reportDirections: {
          selected: scrutParams.reportDirection
        },
        times: {
          dateRange: "Custom",
          start: `${scrutParams.startTime}`,
          end: `${scrutParams.endTime}`
        },
        orderBy: scrutParams.scrutDisplay["display"],
        filters: scrutParams.scrutFilters,
        dataGranularity: {
          selected: "auto"
        }
      }),

      data_requested: {
        [scrutParams.reportDirection]: {
          graph: "all",
          table: {
            query_limit: {
              offset: 0,
              max_num_rows: 10
            }
          }
        }
      }
    };
  }

  interfaceJSON(url, authToken, ipAddress) {
    //params to figure out which interfaces exist for a device
    return {
      url,
      method: "get",
      params: {
        rm: "status",
        action: "get",
        view: "topInterfaces",
        authToken: authToken,
        session_state: {
          client_time_zone: "America/New_York",
          order_by: [],
          search: [
            {
              column: "exporter_search",
              value: `${ipAddress}`,
              comparison: "like",
              data: { filterType: "multi_string" },
              _key: `exporter_search_like_${ipAddress}`
            }
          ],
          query_limit: { offset: 0, max_num_rows: 50 },
          hostDisplayType: "dns"
        }
      }
    };
  }

  findtimeJSON(scrutParams) {
    //params to figure out which interval your in based on data you are requesting
    return {
      rm: "report_start",
      authToken: scrutParams.authToken,
      report_data: {
        parse: true,
        reportDirections: { selected: `${scrutParams.reportDirection}` },
        reportTypeLang: `${scrutParams.reportType}`,
        times: {
          dateRange: "Custom",
          start: `${scrutParams.startTime}`,
          end: `${scrutParams.endTime}`,
          clientTimezone: "America/New_York"
        },
        filters: scrutParams.scrutFilters,
        dataGranularity: { selected: "auto" },
        oneCollectorRequest: false
      }
    };
  }

  exporterJSON(url, authToken) {
    //params to figure out which exporters are available to pick from.
    return {
      url,
      method: "GET",
      params: {
        rm: "get_known_objects",
        type: "devices",
        authToken
      }
    };
  }

  groupJSON(url, authToken) {
    return {
      url,
      method: "GET",
      params: {
        rm: "get_known_objects",
        type: "deviceGroups",
        authToken
      }
    };
  }


  findExporter(url, authToken, exporter) {
    console.log(exporter)
    return {
      url, 
      method:"GET",
      params: {
        rm:"loadMap",
        action:"search",
        str:exporter,
        authToken,
        defaultGroupOnTop: 1,
        statusTreeEnabled: 1,
        page: 1,
      }
    };
  };
}
export class Handledata {
  //scrutinizer returns graph data opposite of how grafana wants it. So we flip it here.
  constructor() {
    this.rearrangeData = (arr, oldIndex, newIndex) => {
      while (oldIndex < 0) {
        old_index += arr.length;
      }
      while (newIndex < 0) {
        new_index += arr.length;
      }
      if (newIndex >= arr.length) {
        let k = newIndex - arr.length;

        while (k-- + 1) {
          arr.push(undefined);
        }
      }
      arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
      return arr;
    };
  }

  formatData(scrutData, scrutParams, intervalTime) {
    let displayValue;

    if (scrutParams.scrutDisplay["display"] === "custom_interfacepercent") {
      displayValue = "percent";
    } else {
      displayValue = "bits";
    }

    let reportDirection = scrutParams.reportDirection;
    //grafana wants time in millaseconds. so we multiple by 1000.
    //we also want to return data in bits, so we device by 8
    let datatoGraph = [];
    let graphingData = scrutData;
    let i,
      j = 0;
    let graphData = graphingData["report"]["graph"]["pie"][reportDirection];
    let tableData =
      graphingData["report"]["graph"]["timeseries"][reportDirection];
    //if user is selecting bits, we need to multiple by 8, we also need to use the interval time.
    if (displayValue === "bits") {
      for (i = 0; i < tableData.length; i++) {
        for (j = 0; j < tableData[i].length; j++) {
          tableData[i][j][0] = tableData[i][j][0] * 1000;
          tableData[i][j][1] = (tableData[i][j][1] * 8) / (intervalTime * 60);
          this.rearrangeData(tableData[i][j], 0, 1);
        }
      }
    } else {
      //since interface reporting uses the total tables, we dont need to math it.
      for (i = 0; i < tableData.length; i++) {
        for (j = 0; j < tableData[i].length; j++) {
          tableData[i][j][0] = tableData[i][j][0] * 1000;
          tableData[i][j][1] = Math.round(tableData[i][j][1])         
          this.rearrangeData(tableData[i][j], 0, 1);
        }
      }
    }

    for (i = 0; i < graphData.length; i++) {
      let interfaceId;
      let interfaceDesc;

      if (scrutParams["reportType"] === "interfaces") {
        if (scrutParams["reportDirection"] === "inbound") {
          interfaceId = "Inbound Interface";
          interfaceDesc = "Inbound";
        } else {
          interfaceId = "Outbound Interface";
          interfaceDesc = "Outbound";
        }
        //scrutinizer returns a small amout of "other traffic" for interface reporting
        //this has to do with the relationship between totals and conversations. 
        //we don't need this data, so we toss it out. It makes it do we can use SingleStat 
        //and Guage visualizations for interfaces, which is nice. 
        if (graphData[i]["label"] != "Other") {
          datatoGraph.push({
            target:
              interfaceDesc + "--" + graphData[i]["tooltip"][1][interfaceId],
            datapoints: tableData[i]
          });
        }
      } else {
        datatoGraph.push({
          target: graphData[i]["label"],
          datapoints: tableData[i]
        });
      }
    }

    return datatoGraph;
  }
}
