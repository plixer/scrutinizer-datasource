"use strict";

System.register([], function (_export, _context) {
  "use strict";

  var reportTypes, reportDirection, displayOptions, filterTypes, displayDNS, displayOthers;
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

      _export("displayDNS", displayDNS = [{
        text: "yes",
        value: true
      }, {
        text: "no",
        value: false
      }]);

      _export("displayDNS", displayDNS);

      _export("displayOthers", displayOthers = [{
        text: "yes",
        value: true
      }, {
        text: "no",
        value: false
      }]);

      _export("displayOthers", displayOthers);
    }
  };
});
//# sourceMappingURL=reportTypes.js.map
