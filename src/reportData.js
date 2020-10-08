import _, { sum } from "lodash";
import moment from "moment";


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
  createParams (scrut, options, query) {
    let {authToken} = scrut;
    let {reportType, reportDirection,reportInterface, target, reportFilters, reportDisplay} = query
    let startTime = options["range"]["from"].unix()
    let endTime = options["range"]["to"].unix()
    let scrutFilters;
    let exporterInterface;
    let scrutDisplay;
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
        scrutDisplay
       
  
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

  findtimeJSON(scrutInfo,scrutParams) {
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
          dataGranularity: { selected: "auto" },
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
   
  

  reportJSON(scrutInfo, scrutParams) {
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
            selected: "auto"
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

  //function to gather forcast data. 

  forcastData(scrutInfo, forcastID) {
    return {
      url:scrutInfo['url'],
      method: "GET",
      params: {
        rm: "forecasting",
        view: "forecast_data",
        forecast_id: forcastID,
        authToken: scrutInfo['authToken']
      }
    };
  };


  forecastSummary(scrutInfo, forcastID) {
    return {
      url:scrutInfo['url'],
      method: "GET",
      params: {
        rm: "forecasting",
        view: "summary",
        forecast_id: forcastID,
        authToken: scrutInfo['authToken']
      }
    };
  };

  getForcasts(scrutInfo){
    return {
      url:scrutInfo['url'],
      method: "GET",
      params: {
        rm: "forecasting",
        view: "table",
        authToken: scrutInfo['authToken']
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

  formatData(scrutData, scrutParams, intervalTime, options) {

    //check if DNS resolve is on. 
    let dnsResolve = options.reportDNS


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

  formatForcasts(forcastData, forcastSummary){

              //summary data brought in from different request. 
              let summaryData = forcastSummary['data']['inbound_rows']

              let summaryDataArray = []

              summaryData.forEach((summaryRow)=>{
                summaryRow.forEach((itemInSummaryRow)=>{
                  let keyToCheck = Object.keys(itemInSummaryRow)
                  if(!["Rank","max_forecast_time", "upper_bound", "expected_value"].includes(keyToCheck[0])){
                    let rowLabel = itemInSummaryRow[keyToCheck[0]]['label'] 
                    let rankValue = summaryRow[0]['Rank']['label']+ '-inbound'
                    summaryDataArray.push({'rankValue':rankValue, 'rowLabel':rowLabel})

                  }
                })
              })
            
              //forcast results brought in, includes all time data needed. 
              let forcastResults = forcastData['data']['rows']


              let forcastItems = []
              forcastResults.forEach(row=>{forcastItems.push(row['target'])})
              //unique items conatins each row (inbound-0, inbound-1, etc)
              let uniqueItems = Array.from(new Set(forcastItems))


              //array to be returned, contains everything needed to graph in grafana. 
              let finalSummaryData = []
              let testData = []
 
              //for each unique item, create an object reporesenting upper and lower bounds, attach empty array to hold time series data to it. 
              uniqueItems.forEach((item)=>{

                finalSummaryData.push({target:item, datapoints:[]})
                finalSummaryData.push({target:item+' predicted', datapoints:[]})
                finalSummaryData.push({target:item +' upper bound', datapoints:[]})
                finalSummaryData.push({target:item +' lower bound', datapoints:[]})
              })
              

              finalSummaryData.forEach((item)=>{
                summaryDataArray.forEach((summaryItem)=>{
                  if(item['target'].includes(summaryItem['rankValue'])){
                    let replacedItem = item['target'].replace(summaryItem['rankValue'],summaryItem['rowLabel'] )

                    testData.push({target:replacedItem, datapoints:item['datapoints']})
                  }
                })
                try {
                  
      
                  
                }
                catch(e) {

                }
                

              })

              //add time datapoints to the empy arrays. 
              finalSummaryData.forEach((item)=>{
                forcastResults.forEach((forcestedItem)=>{
                  let epochTime = moment(forcestedItem['intervaltime']).valueOf()
                  let meanValue = parseInt(forcestedItem['mean'])
                  let upperValue = parseInt(forcestedItem['conf_upper'])
                  let lowerValue = parseInt(forcestedItem['conf_lower'])

                  try {
                    if(forcestedItem['target'] === item['target'] ){
                      item['datapoints'].push([(meanValue  * 8)/60, epochTime])
                      
                    }else if (forcestedItem['target'] + ' upper bound'=== item['target'] && forcestedItem['record_type'] === 'forecast' ){
                      item['datapoints'].push([(upperValue * 8)/60 , epochTime])
                      
                    } else if (forcestedItem['target'] + ' lower bound'=== item['target'] && forcestedItem['record_type'] === 'forecast' ){
                      item['datapoints'].push([(lowerValue * 8)/60, epochTime])
                    } else if (forcestedItem['target'] + ' predicted' === item['target'] && forcestedItem['record_type'] === 'forecast' ){
                      item['datapoints'].push([(meanValue  * 8)/60, epochTime])
                      
                      
                    }
                  }
                  catch(err){
                    console.log(err)
                  }

                })
              })
            


      




              return testData
 
              




  }


  formatForcastsTest(forcastData, forcastSummary){

    //store relevant data from API calls into variables for use later. 
    let summaryData = forcastSummary['data']['inbound_rows']
    let forcastResults = forcastData['data']['rows']
    
    //holds the LANG Key - > Forcast Regerence
    let summaryDataArray = []

    let finalSummaryData = []

    let testData = []

    //Holds all of forecast items, latter deduplicated.
    let forcastItems =Array.from(new Set([]))

        
        
    //created object with 1-inbound and the lang comparision (https)
    summaryData.forEach((summaryRow)=>{
      summaryRow.forEach((itemInSummaryRow)=>{
        let keyToCheck = Object.keys(itemInSummaryRow)
        if(!["Rank","max_forecast_time", "upper_bound", "expected_value"].includes(keyToCheck[0])){
          let rowLabel = itemInSummaryRow[keyToCheck[0]]['label'] 
          let rankValue = summaryRow[0]['Rank']['label']+ '-inbound'
          summaryDataArray.push({'rankValue':rankValue, 'rowLabel':rowLabel})

        }
      })
    })




    forcastResults.forEach(row=>{forcastItems.push(row['target'])})
    let uniqueItems = Array.from(new Set(forcastItems))



    uniqueItems.forEach((item)=>{

      finalSummaryData.push({target:item, datapoints:[]})

    })

    finalSummaryData.forEach((item)=>{
      summaryDataArray.forEach((summaryItem)=>{
        if(item['target'].includes(summaryItem['rankValue'])){
          let replacedItem = item['target'].replace(summaryItem['rankValue'],summaryItem['rowLabel'] )

          testData.push({target:replacedItem, datapoints:item['datapoints']})
        }
      })
      try {
        

        
      }
      catch(e) {

      }
      

    })

    finalSummaryData.forEach((item)=>{
      forcastResults.forEach((forcestedItem)=>{
        let epochTime = moment(forcestedItem['intervaltime']).valueOf()
        let meanValue = parseInt(forcestedItem['mean'])
        let upperValue = parseInt(forcestedItem['conf_upper'])
        let lowerValue = parseInt(forcestedItem['conf_lower'])
        

        if(forcestedItem['target'] ===item['target'] ){
          console.log('item', item)
          console.log('forcastedit', forcestedItem)
          if(forcestedItem['record_type']==="train"){
            item['datapoints'].push([(meanValue  * 8)/60, epochTime])
          } else if (forcestedItem['record_type']==="forecast"){
            item['datapoints'].push([(upperValue * 8)/60 , epochTime])
            item['datapoints'].push([(lowerValue * 8)/60, epochTime])
            item['datapoints'].push([(meanValue  * 8)/60, epochTime])
          }
          
    
        }
        // try {
        //   if(forcestedItem['target'] === item['target'] && forcestedItem['record_type'] === 'train' ){
        //     item['datapoints'].push([(meanValue  * 8)/60, epochTime])
            
        //   }else if (forcestedItem['target'] + ' upper bound'=== item['target']){
        //     item['datapoints'].push([(upperValue * 8)/60 , epochTime])
        //   } else if (forcestedItem['target'] + ' lower bound'=== item['target']){
        //     item['datapoints'].push([(lowerValue * 8)/60, epochTime])
        //   } else if (forcestedItem['target'] + ' predicted' === item['target'] && forcestedItem['record_type'] === 'forecast' ){
        //     item['datapoints'].push([(meanValue  * 8)/60, epochTime])
            
        //   }
        // }
        // catch(err){
        //   console.log(err)
        // }

      })
    })
  

      return testData
  }

  formatAllForecasts(forcastData){
      //store all forcast data into an array
      let forecasteData = forcastData['data']['rows']
      //final list to return, objects appended on each loop. 
      let allForcastList = []
 
      forecasteData.forEach((allForecasts)=>{

        //create object to store ID / Text relationship. 
        let forcastObject = 
        {
  
        }
        allForecasts.forEach((forecast)=>{

                  
           try {
              if(forecast['type']==='forecast_id'){
                
                let forecastId = forecast['title'].toString()

                forcastObject["value"] = forecastId

              }
            else if(forecast['type']==='description'){
              let forecastDescription = forecast['title']
              forcastObject["text"] = forecastDescription
              allForcastList.push(forcastObject)
            } else {
              ;
            }
           } catch(err){
              console.log(err)
           }

           


           
        })
      })

      return allForcastList
  }



}

