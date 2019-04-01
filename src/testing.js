export class scrutinizerJSON {
  constructor() {}

  reportJSON(authToken, reportType, startTime, endTime, ipAddress) {
    let params = {
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
          start: `${startTime}`,
          end: `${endTime}`,
          clientTimezone: "America/New_York"
        },
        filters: {
          sdfDips_0: `in_${ipAddress}_${ipAddress}_ALL`
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


}

export class scrutinizerRequest {
  constructor() {
 //scrutinizer returns graph data opposite of how grafana wants it. So we flip it here.
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

  //used to get all the parameted into the request.
  formatParams(params) {
    return (
      "?" +
      Object.keys(params)
        .map(function(key) {
          return key + "=" + encodeURIComponent(params[key]);
        })
        .join("&")
    );
  }


  //grafana wants time in millaseconds. so we multiple by 1000.
  formatData(scrutData){
    let datatoGraph = [];
    let graphingData = JSON.parse(scrutData.responseText);
    let i, j = 0;
    let graphData = graphingData["report"]["graph"]["pie"]["inbound"];
    let tableData = graphingData["report"]["graph"]["timeseries"]["inbound"];
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

      return datatoGraph
  }

  makeRequest(scrutUrl, scrutParams) {
    let request = new XMLHttpRequest();
    let url = scrutUrl + scrutParams;
    return new Promise((resolve, reject) => {
      request.onreadystatechange = function() {
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
          })
        }
      };

      // Setup our HTTP request
      request.open("GET", url, true);

      // Send the request
      request.send();
    });
  }
};


