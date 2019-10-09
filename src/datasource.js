import _ from "lodash";
import {QueryCtrl} from 'app/plugins/sdk';
import { ScrutinizerJSON, Handledata, HandleAdhoc } from "./reportData";
import { reportTypes, reportDirection, displayOptions } from "./reportTypes";

let makescrutJSON = new ScrutinizerJSON();
let dataHandler = new Handledata();

export class GenericDatasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {

    console.log("running Constructor");
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
    if (
      typeof instanceSettings.basicAuth === "string" &&
      instanceSettings.basicAuth.length > 0
    ) {
      this.headers["Authorization"] = instanceSettings.basicAuth;
    }
    this.runReport = false;

    this.exporters = [];

    this.filters = "";

    this.scrutInfo = {
      url: instanceSettings.url + "/fcgi/scrut_fcgi.fcgi",
      authToken: instanceSettings.jsonData["scrutinizerKey"]
    };
    this.interfaces = ["Find Interfaces"];
    this.exporterList = this.exporterList();
  }

  query(options) {
    console.log("running query");

    
    //store number of queries being run, make sure to run a Scrutinizer request for each query made.
    let numberOfQueries = 0;
    let datatoGraph = [];

    //only run a report if all options are populated
    this.runReport = false;
  
    var query = this.buildQueryParameters(options);

    //save the query to this, so it can be accessed by other methods.
    this.liveQuery = query;

    query.targets = query.targets.filter(t => !t.hide);

    //add adhoc filters to the query.
    if (query.targets.length <= 0) {
      return this.q.when({ data: [] });
    }

    if (this.templateSrv.getAdhocFilters) {
      query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
      // console.log(someExporters)
    } else {
      query.adhocFilters = [];
    }
    console.log('inside query')
  //  if(query.adhocFilters.length > 0){
  //    for(let i = 0; i < query.adhocFilters.length; i++ ){
       
  //      if(query.adhocFilters[i]['key'] === "Exporter") {
  //        return new Promise((resolve, reject)=>{
  //         let interfacesToAdd = this.addInterfaces (query.adhocFilters[i]['value'], resolve)
  //         console.log('resolved')
  //         query.adhocFilters[i]['interfaces'] = interfacesToAdd
  //        }
         
  //        )
         
         
  //      }
  //      console.log(query)
  //    }
  //  }
 

    let checkStart = query.targets.length - 1;

    //check if there are ad-hoc filters added.
    if (query.adhocFilters.length > 0) {
      //store the exporter that was selected
      const exporterName = query.adhocFilters[0]["value"];
      //store the interface that was selected
      // const interfaceName = query.adhocFilters[1]["value"];
      //create params to find the exporter details
      const adhocParams = makescrutJSON.findExporter(
        this.scrutInfo,
        exporterName
      );

      //object needed to make request for Scrutinizer data.
      const exporterObject = {
        exporterIp: "",
        interfaceId: ""
      };
      if (adhocParams) {
        return new Promise((resolve, reject) => {
          this.doRequest(adhocParams)
            .then(exporter_details => {
              //set IP addres for the exporter
              exporterObject.exporterIp = exporter_details.data.results[0].exporter_ip;
              //find interfaces for that exporter.
              let interfaceParams = makescrutJSON.interfaceJSON(this.scrutInfo,exporterObject.exporterIp);
                this.doRequest(interfaceParams)
                    .then(interfaceDetails => {
                      let i = 0;
                      let interfaceJson = interfaceDetails.data;
                      let interfaces = []

                      
                      if(interfaces.length >0){
                        interfaces = []
                      }
                      for (i = 0; i < interfaceJson.rows.length; i++) {

                        //add interfaces to the interface filter options
                        interfaces.push({ text: interfaceJson.rows[i][5].label });
                        query.adhocFilters[0]['interfaces'] = interfaces
                        const interfaceName = query.adhocFilters[1]["value"]
                        if (interfaceName === interfaceJson.rows[i][5].label) {
                          exporterObject.interfaceId =
                            interfaceJson.rows[i][5].filterDrag.searchStr;
                        }
                      }

                      for (let j = 0; j < query.targets.length; j++) {
                        //grab the parameters to from the query.
                        let scrutParams = makescrutJSON.createParams(
                          this.scrutInfo["authToken"],
                          query.targets[j].reportType, //report type
                          options["range"]["from"].unix(), //start time
                          options["range"]["to"].unix(), //end time
                          exporterObject["exporterIp"], //ip address
                          query.targets[j].reportDirection, //report direction
                          exporterObject["interfaceId"], // exporter Interface
                          query.targets[j].reportFilters, // filerts
                          query.targets[j].reportDisplay // bits or percent
                        );
                        console.log(scrutParams)
                        //figure out the intervale time.
                        let params = makescrutJSON.findtimeJSON(
                          this.scrutInfo,
                          scrutParams
                        );

                        this.doRequest(params).then(response => {
                          //store interval here.
                          let selectedInterval =
                            response.data["report_object"].dataGranularity.used;
                          //set up JSON to go to Scrutinizer API
                          let params = makescrutJSON.reportJSON(
                            this.scrutInfo,
                            scrutParams
                          );
                          this.doRequest(params).then(response => {
                            let formatedData = dataHandler.formatData(
                              response.data,
                              scrutParams,
                              selectedInterval
                            );

                            datatoGraph.push(formatedData);
                            datatoGraph = [].concat.apply([], datatoGraph);

                            numberOfQueries++;

                            //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                            if (numberOfQueries === query.targets.length) {
                              return resolve({ data: datatoGraph });
                            }
                          });
                        });
                      }
                    });
                  });
            });
          }
    } else {
      if (
        (query.targets[checkStart].target !== undefined || "Select Exporter") &&
        query.targets[checkStart].reportInterface !== "Select Interface" &&
        query.targets[checkStart].reportDirection !== "Select Direction" &&
        query.targets[checkStart].reportType !== "Select Report"
      ) {
        this.runReport = true;
      }

      //once all drop downs are selected, run the report.
      if (this.runReport == true) {
        return new Promise((resolve, reject) => {
          for (let j = 0; j < query.targets.length; j++) {
            //grab the parameters to from the query.
            let scrutParams = makescrutJSON.createParams(
              this.scrutInfo["authToken"],
              query.targets[j].reportType, //report type
              options["range"]["from"].unix(), //start time
              options["range"]["to"].unix(), //end time
              query.targets[j].target, //ip address
              query.targets[j].reportDirection, //report direction
              query.targets[j].reportInterface, // exporter Interface
              query.targets[j].reportFilters, // filerts
              query.targets[j].reportDisplay // bits or percent
            );
            //figure out the intervale time.
            let params = makescrutJSON.findtimeJSON(
              this.scrutInfo,
              scrutParams
            );

            this.doRequest(params).then(response => {
              //store interval here.
              let selectedInterval =
                response.data["report_object"].dataGranularity.used;
              //set up JSON to go to Scrutinizer API
              let params = makescrutJSON.reportJSON(
                this.scrutInfo,
                scrutParams
              );
              this.doRequest(params).then(response => {
                let formatedData = dataHandler.formatData(
                  response.data,
                  scrutParams,
                  selectedInterval
                );

                datatoGraph.push(formatedData);
                datatoGraph = [].concat.apply([], datatoGraph);

                numberOfQueries++;
                //incase user has multiple queries we want to make sure we have iterated through all of them before returning results.
                if (numberOfQueries === query.targets.length) {
                  return resolve({ data: datatoGraph });
                }
              });
            });
          }
        });
      }
    }
  }

  testDatasource() {
    console.log("Running Test");
    let params = makescrutJSON.authJson(this.scrutInfo);

    return this.doRequest(params).then(response => {
      if (response.status === 200) {
        if (response.data.details == "invalidToken") {
          //alert if authToken is expired or invalid
          return {
            status: "failed",
            message: `Check your API key, recevied back: ${response.data.err}`,
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

  findInterfaces(options, scope) {
    console.log("running find interfaces");
    let query = this.liveQuery;


    if (query.targets) {
      //determines which select you have clicked on.
      let selectedIP = scope.ctrl.target.target;

      if (selectedIP === "deviceGroup") {
        let params = makescrutJSON.groupJSON(
          this.url,
          this.scrutInfo["authToken"]
        );
        //if user selects Device Group we return a list of all groups available.
        return this.doRequest(params).then(response => {
          let i = 0;

          let jsonData = response.data;
          let data = [];
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
        let interfaceThings = makescrutJSON.interfaceJSON(
          this.scrutInfo,
          selectedIP
        );


        return this.doRequest(interfaceThings).then(response => {
          let data = [{ text: "All Interfaces", value: "allInterfaces" }];
          let i = 0;
          let jsonData = response.data;

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

  applyFilter(scope, refresh) {
    console.log("running apply filters");
    this.filters = scope.ctrl.target.filters;
    refresh.refresh();
  }

  //gets all exporters available. Will use DNS resolve by default and fail back to IP of exporter.
  getExporters() {
    console.log("running get exporters");
    return this.exporters;
  }

  exporterList() {
    console.log("running exporterlist");

    let params = makescrutJSON.exporterJSON(this.scrutInfo);
    return this.doRequest(params).then(response => {
      let exporterList = [
        { text: "All Exporters", value: "allExporters" },
        { text: "Device Group", value: "deviceGroup" }
      ];
      for (let i = 0; i < response.data.length; i++) {
        exporterList.push({
          text: response.data[i]["name"],
          value: response.data[i]["ip"]
        });
      }

      this.exporters = exporterList;
      return exporterList;
    });
  }

  doRequest(options) {
    console.log("running do request");
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;
 
    return this.backendSrv.datasourceRequest(options);
  }

  //function from simplejsondatasource, used to take values from drop downs and add to query.
  //When adding a new dropdown you need to update this function.
  buildQueryParameters(options) {
    console.log("running build query");
    console.log(options)


    options.targets = _.filter(options.targets, target => {
      return target.target !== "select metric";
    });

    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(
          target.target,
          options.scopedVars,
          "regex"
        ),
        refId: target.refId,
        hide: target.hide,
        type: target.type || "timeserie",

        reportType: this.templateSrv.replace(
          target.report,
          options.scopedVars,
          "regex"
        ),

        reportDirection: this.templateSrv.replace(
          target.direction,
          options.scopedVars,
          "regex"
        ),

        reportInterface: this.templateSrv.replace(
          target.interface || "Select Interface",
          options.scopedVars,
          "regex"
        ),

        reportFilters: this.templateSrv.replace(
          target.filters || "No Filter",
          options.scopedVars,
          "regex"
        ),

        reportDisplay: this.templateSrv.replace(
          target.display || "No Display",
          options.scopedVars,
          "regex"
        )
      };
    });

    options.targets = targets;

    return options;
  }

  HandleAdhocFilters(resolve){

    //if key is exporter there is no AND, we know we are looking for interfaces on that exporter. 
    var adhocQuery = this.buildQueryParameters({'targets':'none'})
    let interfaces = []
    if (this.templateSrv.getAdhocFilters) {
      adhocQuery.adhocFilters = this.templateSrv.getAdhocFilters(this.name);

    } else {
      adhocQuery.adhocFilters = [];
    }

    console.log(adhocQuery.adhocFilters)
    adhocQuery.adhocFilters[0]["interfaces"] = []
    const exporterName = adhocQuery.adhocFilters[0]["value"]
    const adhocParams = makescrutJSON.findExporter(
      this.scrutInfo,
      exporterName
    );
    this.doRequest(adhocParams).then((exporter_details)=>{

      const exporterIp = exporter_details.data.results[0].exporter_ip;
      let interfaceParams = makescrutJSON.interfaceJSON(this.scrutInfo,exporterIp);
      this.doRequest(interfaceParams)
      .then(interfaceDetails => {
        let i = 0;
        let interfaceJson = interfaceDetails.data;

        
        if(interfaces.length >0){
          interfaces = []
        }
        for (i = 0; i < interfaceJson.rows.length; i++) {

          //add interfaces to the interface filter options
          interfaces.push({ text: interfaceJson.rows[i][5].label});
          adhocQuery.adhocFilters[0]["interfaces"].push(interfaceJson.rows[i][5].label)
          // if (interfaceName === interfaceJson.rows[i][5].label) {
          //   exporterObject.interfaceId =
          //     interfaceJson.rows[i][5].filterDrag.searchStr;
          // }
        }

        resolve(interfaces)
      });
    })
   
  }


  addInterfaces(exporterName){

    //if key is exporter there is no AND, we know we are looking for interfaces on that exporter.
    let interfaces = []
    let exporterToSearch = exporterName
    let adhocParams = makescrutJSON.findExporter(
      this.scrutInfo,
      exporterToSearch
    );
    this.doRequest(adhocParams).then((exporter_details)=>{

      let exporterIpFound = exporter_details.data.results[0].exporter_ip;
      let interfacesToSearch = makescrutJSON.interfaceJSON(this.scrutInfo,exporterIpFound);
      this.doRequest(interfacesToSearch)
      .then(interfaceDetails => {
        let i = 0;
        let interfaceJson = interfaceDetails.data;

        
        if(interfaces.length >0){
          interfaces = []
        }
        for (i = 0; i < interfaceJson.rows.length; i++) {

          //add interfaces to the interface filter options
          interfaces.push(interfaceJson.rows[i][5].label);

        }
        console.log(interfaces)
        return resolve(interfaces)
      });
    })
   
  }

  getTagKeys(options) {
    console.log("getting tag keys");
    return new Promise((resolve, reject) => {
      return resolve([{ text: "Exporter" }, { text: "Interface" }]);
    });
  }

  getTagValues(options) {
    console.log("getting tag values")

    
    if (options.key === "Exporter") {
      return new Promise((resolve, reject) => {
        return resolve(this.exporterList);
      });
    } else if (options.key === "Interface") {
      return new Promise((resolve, reject) => {
        
        this.HandleAdhocFilters(resolve)
      });
    }
  }


}
