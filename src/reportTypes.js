//Update this list to add more report types. 
export const reportTypes = [
  {
    text: "Conversations",
    value: "conversations"
  },
  {
    text: "Applications",
    value: "applications"
  },
  {
    text: "Type of Service",
    value: "tos"
  },
  {
    text: "Source Hosts",
    value: "srcHosts"
  },
  {
    text: "Destination Hosts",
    value: "dstHosts"
  },
  {
    text: "Interface Utilization",
    value: "interfaces"
  }
];
//it's best not to use bi-direction, just build two queries in grafana.
export const reportDirection = [
  {
    text: "Inbound",
    value: "inbound"
  },
  {
    text: "Outbound",
    value: "outbound"
  }
];

//currenlty only used for interface reporting. Other reports the percent utilized it calculated in
//the front end, not sent back in the JSON. It's possible to do this later on, but for now defaulting
//to bits for anything that is not interfaces report. 
export const displayOptions = [
  {
    text: "Bits Per Second",
    value: "bits"
  },
  {
    text: "Percent Utilized",
    value: "percent"
  }
];


export const filterTypes = [
  {
    text: "Source IP Address",
    value:"source"
  }, 
  {
    text: "Destination IP Address",
    value:"destination"
  }, 
  {
    text: "Port Number",
    value:"port"
  }
]
