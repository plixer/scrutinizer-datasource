import _ from "lodash";


export class ScrutinizerJSON {
  constructor() {}
  createFilters (scrut, options, reportFilter,query){
    let {authToken} = scrut;
    let {reportType, reportDirection,reportDisplay } = query
    let scrutDisplay;
    if (reportDisplay === "percent") {
      scrutDisplay = { display: "custom_interfacepercent" };
    } else {
      scrutDisplay = { display: "sum_octetdeltacount" };
    }
    return {
      authToken,
      reportType,
      startTime: options["range"]["from"].unix(),
      endTime: options["range"]["to"].unix(),
      reportDirection,
      scrutDisplay,
      scrutFilters : reportFilter

    }

  }
// used for single query
  createParams (scrut, options, query, adhocFilters = null) {


    let selectedGranularity = query.reportGranularity

    if(!Number.isInteger(parseInt(selectedGranularity))) {
      selectedGranularity = 'auto'
    }
    
    let {authToken} = scrut;
    let {reportType, reportDirection,reportInterface, target, reportFilters, reportDisplay} = query
    let startTime = options["range"]["from"].unix()
    let endTime = options["range"]["to"].unix()
    let scrutFilters;
    let exporterInterface;
    let scrutDisplay;

    // if there are adhoc filters for a device group / exporter user it. Otherwise dont. 
    if (adhocFilters !== null) {
      scrutFilters = adhocFilters
    }else {
      if (reportInterface === "allInterfaces") {
        exporterInterface = "_ALL";
      } else {
        exporterInterface = reportInterface;
      }
  
      //  if user wants all devices, then they are defualted to all interfaces
      if (target === "allExporters") {
        scrutFilters = {
          sdfDips_0: `in_GROUP_ALL`
        };
      } else if (target === "deviceGroup") {
        scrutFilters = {
          sdfDips_0: `in_GROUP_${exporterInterface}`
        };
      } else {
        // if user wants a specific device, they can either have ALL interfaces, or a specific interface
        if (exporterInterface === "_ALL") {
          scrutFilters = {
            sdfDips_0: `in_${target}_ALL`
          };
        } else {
          scrutFilters = {
            sdfDips_0: `in_${target}_${target}-${exporterInterface}`
          };
        }
      }


    }



    
    if (reportFilters !== "No Filter") {
      let filterJson = JSON.parse(reportFilters);
      for (var key in filterJson) {
        if (filterJson.hasOwnProperty(key)) {
          if (key != "sdfDips_0") {
            scrutFilters[key] = filterJson[key];
          }
        }
      }
    }
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
        reportDirection,
        scrutFilters,
        scrutDisplay,
        selectedGranularity
       
  
      }
    
     


  }

// cused to create filter object for adhoc queries
createAdhocFilters(filterObject) {


  let reportFilters = {};

  //if there are ip addres filters, add them
  if (filterObject.sourceIp.length > 0) {
    filterObject.sourceIp.forEach((element, index) => {
      let filerCount = `sdfIps_${index}`;
      reportFilters[filerCount] = `in_${element}_src`;
    });
  }

  if (filterObject.destIp.length > 0) {
    filterObject.destIp.forEach((element, index) => {
      let filerCount = `sdfIps_${index}`;
      reportFilters[filerCount] = `in_${element}_dst`;
    });
  }

  if (filterObject.ports.length > 0) {
    filterObject.ports.forEach((element, index) => {
      let filerCount = `sdfSdPorts_${index}`;
      reportFilters[filerCount] = `in_${element}_both`;
    });
  }
  //there will always be exporter filters, add them.
  filterObject.exporterDetails.forEach((element, index) => {
    
    let { exporterIp, interfaceId } = element;

    let filterCount = `sdfDips_${index}`;
    if(exporterIp === "GROUP"){
      reportFilters[filterCount] = `in_${exporterIp}_${interfaceId}`
    }else if (exporterIp === "ALL"){
      reportFilters[filterCount] = `in_${exporterIp}_${interfaceId}`
    } else if (interfaceId != "ALL")
    {
      reportFilters[filterCount] = `in_${exporterIp}_${exporterIp}-${interfaceId}`;
    }else if (exporterIp != "ALL" && exporterIp != "GROUP"){
      reportFilters[filterCount] = `in_${exporterIp}_${interfaceId}`
    }
    
  });
 

  return reportFilters;
}


  
  authJson(scrutInfo){
    return {
      url: scrutInfo['url'],
      method: "GET",
      params:{
        rm: "licensing",
        authToken:scrutInfo['authToken']
      }
    }
  }


  exporterJSON(scrutInfo) {
    //params to figure out which exporters are available to pick from.
    return {
      url: scrutInfo['url'],
      method: "GET",
      params: {
        rm: "get_known_objects",
        type: "devices",
        authToken: scrutInfo['authToken']
      }
    };
  };

  findExporter(scrutInfo, exporter) {
    
    return {
      url: scrutInfo["url"],
      method: "GET",
      params: {
        rm: "loadMap",
        action: "search",
        str: exporter,
        authToken: scrutInfo["authToken"],
        defaultGroupOnTop: 1,
        statusTreeEnabled: 1,
        page: 1
      }
    };
  };

  findtimeJSON(scrutInfo,scrutParams,query, filterObject = null) {

    let selectedGranularity = query.reportGranularity
    if (filterObject){
      if (filterObject.granularity){
        selectedGranularity = filterObject.granularity
      }
      
    }

  
    if(!Number.isInteger(parseInt(selectedGranularity))) {
      selectedGranularity = 'auto'
    }
    

    //params to figure out which interval your in based on data you are requesting
    return {
      url:scrutInfo['url'],
      method:'get',
      params:{
        rm: "report_start",
        authToken: scrutInfo['authToken'],
        report_data: JSON.stringify({
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
          dataGranularity: { selected: selectedGranularity },
          oneCollectorRequest: false
        })
      },

    };
  };

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
  };

  interfaceJSON(scrutInfo, ipAddress) {

    if(ipAddress['key'] ==="Device Group"){
      let groupName = ipAddress['value']
      return {
        url: scrutInfo['url'],
        method:"get",
        

        params: {
          rm: "mappingConfiguration",
          view: "mapping_configuration",
          authToken: scrutInfo["authToken"],
          session_state:{
            "client_time_zone":"America/New_York","order_by":[],
            "search":[
              {
                "column":"name",
                "value":groupName,
                "comparison":"equal",
                "data":
                  {"filterType":"string"},"_key":"name_equal_Cisco"}
                ],
            "query_limit":{
              "offset":0,"max_num_rows":50},"hostDisplayType":"dns"}
          }
        }
    } else {
      let exporterName
      if (ipAddress['value']) {
        exporterName = ipAddress['value']
      } else {
        exporterName = ipAddress
      }
      
   
      return {
        url: scrutInfo["url"],
        method: "get",
        params: {
          rm: "status",
          action: "get",
          view: "topInterfaces",
          authToken: scrutInfo["authToken"],
          session_state: JSON.stringify({
            client_time_zone: "America/New_York",
            order_by: [],
            search: [
              {
                column: "exporter_search",
                value: ` ${exporterName} `,
                comparison: "like",
                data: { },
                _key: `exporter_search_like_ ${exporterName} `
              }
            ],
            query_limit: { offset: 0, max_num_rows: 50 },
            hostDisplayType: "ip"
          })
        }
      };
    }
    

    };
    
    //params to figure out which interfaces exist for a device
   
  

  reportJSON(scrutInfo, scrutParams, filterObject = null) {

    
    
    let selectedGranularity = scrutParams.selectedGranularity
 
    if (filterObject){
      if (filterObject.granularity !== null){
        selectedGranularity = filterObject.granularity
      }
      
    }
 

    //returning report params to be passed into request
    return {
      url:scrutInfo['url'],
      'method':'get',
      params:{
        rm: "report_api",
        action: "get",
        authToken: scrutInfo['authToken'],
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
            selected: selectedGranularity
          },
          showOthers: 0
        }),
  
        data_requested: JSON.stringify({
          [scrutParams.reportDirection]: {
            graph: "all",
            table: {
              query_limit: {
                offset: 0,
                max_num_rows: 10
              }
            }
          }
        })
      }

    };
  }  

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

  formatData(scrutData, scrutParams, graphGranularity, options, query=null) {

    let granularityChosen = graphGranularity
    //check if DNS resolve is on. 


    let dnsResolve = options.reportDNS

    if(query !== null){
     
    
      if(query.resolveDNS !== null ){
      
        dnsResolve = query.resolveDNS
      }
    }

   
    let graphRes = parseInt(granularityChosen) / 60

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
          tableData[i][j][1] = (tableData[i][j][1] * 8) / (graphRes * 60);
          this.rearrangeData(tableData[i][j], 0, 1);
        }
      }
    } else {
      //since interface reporting uses the total tables, we dont need to math it.
      for (i = 0; i < tableData.length; i++) {
        for (j = 0; j < tableData[i].length; j++) {
          tableData[i][j][0] = tableData[i][j][0] * 1000;
          tableData[i][j][1] = Math.round(tableData[i][j][1]);
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
          //check to make sure there is utilization data for interfaces.
          if(tableData[i]){
            datatoGraph.push({
              target:
                interfaceDesc + "--" + graphData[i]["tooltip"][1][interfaceId],
              datapoints: tableData[i]
            });
          }

          
        }
      } else {

        if(!dnsResolve) {
          datatoGraph.push({
            target: graphData[i]["label"],
            datapoints: tableData[i]
          });
        } else {
          datatoGraph.push({
            target: graphData[i]["label_dns"],
            datapoints: tableData[i]
          });
        }



      }
    }

    return datatoGraph
    
  }

  formatOthers(formatedData){


  }

}


export class AdhocHandler {


  createObject(query, filterTypes, filters) {




    let filterObject = {
      sourceIp: [],
      exporterDetails: [],
      exporters: [],
      ports: [],
      destIp: [],
      others:null,
      granularity:null,
      resolve:null
    };
    
    
    query.adhocFilters.forEach(filter => {
      if (!filterTypes.includes(filter["key"])) {filterObject.exporters.push(filter["key"]);} 
      else if (filter["key"] === "Select Granularity"){
          let granularyValue = this.granularityTransform(filter['value'])
          filterObject.granularity = granularyValue} 
      else if (filter["key"] === "Show Others"){
          let showOthers = this.othersTransform(filter['value'])
          filterObject.others = showOthers
        }
      else if (filter["key"] === "Resolve DNS"){
        let resolveDNS = this.othersTransform(filter['value'])
        filterObject.resolve = resolveDNS
      }
      else{
        filters.forEach(filterType => {
          if (filterType["text"] === filter["key"]) {
            let filterKey = filterType["value"];
            let filterValue = filter["value"];
            filterObject[filterKey].push(filterValue);
          }
         });
       }
    });


  return filterObject
  }

granularityTransform(granularity){

  switch (granularity) {
    case "Auto":
      return "auto"
    case "1 Minute":
      return "1"
    case "5 Minute":
      return "5"
    case "30 Minute":
      return "30"
    case "2 Hour":
      return "120"
    case "12 Hour":
      return "720"
  }
}


othersTransform(showValue) {
  switch (showValue) {
    case "No":
      return false
    case "Yes":
      return true
    }

  }


}
