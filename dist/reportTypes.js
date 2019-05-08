"use strict";

System.register([], function (_export, _context) {
  "use strict";

  var reportTypes, reportDirection, displayOptions;
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
    }
  };
});
//# sourceMappingURL=reportTypes.js.map
