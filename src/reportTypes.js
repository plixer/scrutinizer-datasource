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
    text: "Source IP Filter",
    value:"sourceIp"
  }, 
  {
    text: "Destination IP Filter",
    value:"destIp"
  }, 
  {
    text: "Add Port Filter",
    value:"ports"
  }
]



export const granularityOptions = [
  {
    text: "Auto",
    value: "auto"
  },
  {
    text: "1 Minute",
    value: "1"
  },
  {
    text: "5 Minute",
    value: "5"
  },
  {
    text: "30 Minute",
    value: "30"
  },
  {
    text: "2 Hour",
    value: "120"
  },
  {
    text: "12 Hour",
    value: "720"
  }
];



export const entityTypes = [
  {
    text: "Applications",
    value: "applications"
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
    text: "Autonomous Systems",
    value: "autonomous-systems"
  },
  {
    text: "IP Groups",
    value: "ipgroups"
  },
  {
    text: "Countries",
    value: "countries"
  },
  {
    text: "Protocols",
    value: "protocols"
  }
];


export const entityRowCount = [
  {
    text: "Top 10",
    value: "10"
  },
  {
    text: "Top 25",
    value: "25"
  },  
  {
    text: "Top 50",
    value: "50"
  },
  {
    text: "Top 100",
    value: "100"
  },

]