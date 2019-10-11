import _ from "lodash";
import { ScrutinizerJSON, Handledata} from "./reportData";
import { reportTypes, reportDirection, displayOptions } from "./reportTypes";

let makescrutJSON = new ScrutinizerJSON();
let dataHandler = new Handledata();

export class GenericDatasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
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
    this.exporterList = this.exporterList();
  }

  query(options) {
    
    //store number of queries being run, make sure to run a Scrutinizer request for each query made.
    let numberOfQueries = 0;

    //data sent up into this list, it's returned at end.
    let datatoGraph = [];

    //only run a report if all options are populated, only matter when there are not adhoc filters.
    this.runReport = false;

    //takes the query and stores it to a variable
    var query = this.buildQueryParameters(options);

    //save the query to this, so it can be accessed by other methods.
    this.liveQuery = query;

    query.targets = query.targets.filter(t => !t.hide);

    
    if (query.targets.length <= 0) {
      return this.q.when({ data: [] });
    }

    //add adhoc filters to the query.
    if (this.templateSrv.getAdhocFilters) {
      query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    } else {
      query.adhocFilters = [];
    }

    let checkStart = query.targets.length - 1;
    //counter is used to keep track of number of exporters. This matters for creating the filter ojects
    let numberofExporters = 0;
    let filterTypes = ["Source IP Filter","Add Port Filter", "Destination IP Filter" ]
    if (query.adhocFilters.length > 0) {
      query.adhocFilters.forEach(filter => {
        if (!filterTypes.includes(filter["key"])) {
          numberofExporters++;
        }
      });

      //start the process of gathering data from scrutinizer. 
      return new Promise((resolve, reject) => {
        //filter object used to store data about addtional data about filters needed for Scrutinizer to return data. 
        let filterObject = {
          sourceIp: [],
          exporterDetails: [],
          ports:[],
          destIp:[]
        };
        
        //this exporter count is compared to the number of exporters to verify we have loops threw everything before returning.
        let exporterCount = 0;


        query.adhocFilters.forEach(filter => {
          console.log(filter['key'])
          if (filter["key"] === "Source IP Filter") {
            //source IPs are pushed up as an array, will add other filter methods later.
            filterObject.sourceIp.push(filter["value"]);
          } else if(filter["key"] === "Add Port Filter") {
            
            filterObject.ports.push(filter["value"])
            
          }else if(filter["key"] === "Destination IP Filter") {
            
            filterObject.destIp.push(filter["value"])
            
          }else {
            //in some cases we will be passed the DNS/SNMP name of an exporter, here we convert it to an IP address needed for final filter. 
            let adhocParams = makescrutJSON.findExporter(
              this.scrutInfo,
              filter["key"]
            );

            this.doRequest(adhocParams).then(exporter_details => {
              let exporterIpFound = exporter_details.data.results[0].exporter_ip;

              //need to find the interface ID for the interface passed to Scrutinizer.
              let interfaceParams = makescrutJSON.interfaceJSON(
                this.scrutInfo,
                exporterIpFound
              );
              this.doRequest(interfaceParams).then(interfaceDetails => {
                let interfaceList = interfaceDetails["data"]["rows"];
                //for each interface that belongs to a device, we want to compare it against the one selected in grafana. If it matched we can add it to the filters
                interfaceList.forEach(exporterInterface => {
                  let interfaceID = exporterInterface[5].filterDrag.searchStr;
                  let interfaceName = exporterInterface[5]["label"];
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

                exporterCount++;
                console.log(exporterCount)
                console.log(numberofExporters)
                console.log(exporterCount === numberofExporters)
                //we have now looped through all the exporters in the filters.
                if (exporterCount === numberofExporters) {
                  //created the filters we need to pass into each gadget on the dashboard.
                  let reportFilter = this.createFilters(filterObject);
                  console.log(reportFilter)
                  //run a query for each gadget on the dashboard.
                  query.targets.forEach(eachQuery => {
                    let scrutParams = makescrutJSON.createFilters(
                      this.scrutInfo,
                      options,
                      reportFilter,
                      eachQuery
                    );

                    let params = makescrutJSON.findtimeJSON(
                      this.scrutInfo,
                      scrutParams
                    );
                    //find out what interval the data is in, we need to use this later to normalize the graphs.
                    this.doRequest(params).then(response => {
                      let selectedInterval =
                        response.data["report_object"].dataGranularity.used;
                      //set up JSON to go to Scrutinizer API
                      let params = makescrutJSON.reportJSON(
                        this.scrutInfo,
                        scrutParams
                      );
                      //request for report data made to scrutinizer
                      this.doRequest(params).then(response => {
                        //data organized into how Grafana expects it.
                        let formatedData = dataHandler.formatData(
                          response.data,
                          scrutParams,
                          selectedInterval
                        );

                        datatoGraph.push(formatedData);
                        datatoGraph = [].concat.apply([], datatoGraph);
                        numberOfQueries++;
                        //make sure we have gone through each query in a gadget.
                        if (numberOfQueries === query.targets.length) {
                          return resolve({ data: datatoGraph });
                        }
                      });
                    });
                  });
                }
              });
            });
          }
        });
      });
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

    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  //function from simplejsondatasource, used to take values from drop downs and add to query.
  //When adding a new dropdown you need to update this function.
  buildQueryParameters(options) {


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

  //used to figure out which interfaces to show for a paritcular exporter.
  HandleAdhocFilters(resolve, options) {
    let exporterParams = makescrutJSON.findExporter(
      this.scrutInfo,
      options.key
    );
    let interfaces = [];

    this.doRequest(exporterParams).then(exporterResults => {
      let exporterIp = exporterResults["data"]["results"][0]["exporter_ip"];
      let interfaceParams = makescrutJSON.interfaceJSON(
        this.scrutInfo,
        exporterIp
      );

      this.doRequest(interfaceParams).then(interfaceDetails => {
        let interfaceList = interfaceDetails["data"]["rows"];

        for (let k = 0; k < interfaceList.length; k++) {
          let interfaceID = interfaceList[k][5].filterDrag.searchStr;
          let interfaceName = interfaceList[k][5]["label"];
          interfaces.push({
            text: interfaceName
          });
        }
        return resolve(interfaces);
      });
    });
  }

  createFilters(filterObject) {
    console.log("running create filters");

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

      reportFilters[
        filterCount
      ] = `in_${exporterIp}_${exporterIp}-${interfaceId}`;
    });
    console.log(reportFilters)

    return reportFilters;
  }

  addInterfaces(exporterName) {
    //if key is exporter there is no AND, we know we are looking for interfaces on that exporter.
    let interfaces = [];
    let exporterToSearch = exporterName;
    let adhocParams = makescrutJSON.findExporter(
      this.scrutInfo,
      exporterToSearch
    );
    this.doRequest(adhocParams).then(exporter_details => {
      let exporterIpFound = exporter_details.data.results[0].exporter_ip;
      let interfacesToSearch = makescrutJSON.interfaceJSON(
        this.scrutInfo,
        exporterIpFound
      );
      this.doRequest(interfacesToSearch).then(interfaceDetails => {
        let i = 0;
        let interfaceJson = interfaceDetails.data;

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
  presentOptions(resolve) {
    let params = makescrutJSON.exporterJSON(this.scrutInfo);
    return this.doRequest(params).then(response => {
      let exporterList = [
        { text: "All Exporters" },
        { text: "Device Group" },
        { text: "Source IP Filter" },
        { text: "Add Port Filter"}, 
        { text: "Destination IP Filter" },
      ];
      for (let i = 0; i < response.data.length; i++) {
        exporterList.push({
          text: response.data[i]["name"],
          value: response.data[i]["ip"]
        });
      }
      
      this.exporters = exporterList;
      return resolve(exporterList);
    });
  }

  getTagKeys(options) {
    return new Promise((resolve, reject) => {
      this.presentOptions(resolve);
    });
  }

  getTagValues(options) {
    console.log("getting tag values");

    switch (options.key) {
      case "Source IP Filter":
        return new Promise((resolve, reject) => {
          resolve();
        });
      default:
        return new Promise((resolve, reject) => {
          this.HandleAdhocFilters(resolve, options);
        });
    }
  }
}
