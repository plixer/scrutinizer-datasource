"use strict";

System.register([], function (_export, _context) {
  "use strict";

  var reportTypes, reportDirection, displayOptions, filterTypes, granularityOptions, entityTypes, entityRowCount;
  return {
    setters: [],
    execute: function () {
      _export("reportTypes", reportTypes = [{
        text: "Conversations",
        value: "conversations"
      }, {
        text: "Applications",
        value: "applications"
      }, {
        text: "Type of Service",
        value: "tos"
      }, {
        text: "Source Hosts",
        value: "srcHosts"
      }, {
        text: "Destination Hosts",
        value: "dstHosts"
      }, {
        text: "Interface Utilization",
        value: "interfaces"
      }]);

      _export("reportTypes", reportTypes);

      _export("reportDirection", reportDirection = [{
        text: "Inbound",
        value: "inbound"
      }, {
        text: "Outbound",
        value: "outbound"
      }]);

      _export("reportDirection", reportDirection);

      _export("displayOptions", displayOptions = [{
        text: "Bits Per Second",
        value: "bits"
      }, {
        text: "Percent Utilized",
        value: "percent"
      }]);

      _export("displayOptions", displayOptions);

      _export("filterTypes", filterTypes = [{
        text: "Source IP Filter",
        value: "sourceIp"
      }, {
        text: "Destination IP Filter",
        value: "destIp"
      }, {
        text: "Add Port Filter",
        value: "ports"
      }]);

      _export("filterTypes", filterTypes);

      _export("granularityOptions", granularityOptions = [{
        text: "Auto",
        value: "auto"
      }, {
        text: "1 Minute",
        value: "1"
      }, {
        text: "5 Minute",
        value: "5"
      }, {
        text: "30 Minute",
        value: "30"
      }, {
        text: "2 Hour",
        value: "120"
      }, {
        text: "12 Hour",
        value: "720"
      }]);

      _export("granularityOptions", granularityOptions);

      _export("entityTypes", entityTypes = [{
        text: "Applications",
        value: "applications"
      }, {
        text: "Source Hosts",
        value: "srcHosts"
      }, {
        text: "Destination Hosts",
        value: "dstHosts"
      }, {
        text: "Autonomous Systems",
        value: "autonomous-systems"
      }, {
        text: "IP Groups",
        value: "ipgroups"
      }, {
        text: "Countries",
        value: "countries"
      }, {
        text: "Protocols",
        value: "protocols"
      }]);

      _export("entityTypes", entityTypes);

      _export("entityRowCount", entityRowCount = [{
        text: "Top 10",
        value: "10"
      }, {
        text: "Top 25",
        value: "25"
      }, {
        text: "Top 50",
        value: "50"
      }, {
        text: "Top 100",
        value: "100"
      }]);

      _export("entityRowCount", entityRowCount);
    }
  };
});
//# sourceMappingURL=reportTypes.js.map
