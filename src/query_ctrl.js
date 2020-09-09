import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {
  //creates the link between dropdowns and the datasource
  constructor($scope, $injector)  {
    super($scope, $injector);
    this.scope = $scope;
    this.target.target = this.target.target || 'Select Exporter';
    this.target.report = this.target.report || 'Select Report';
    this.target.display = this.target.display || 'Bits / Percent';
    this.target.direction = this.target.direction || 'Select Direction';
    this.target.interface = this.target.interface || 'Select Interface';
    this.target.forecast = this.target.forecast || 'Select Forecast';
    this.target.type = this.target.type || 'timeserie';
    this.target.filters = this.target.filters;
    this.target.dns = this.target.resolveDNS;
    this.target.hideOthers = this.target.showOthers;

  }
  //each drop down gets a function that is called by the datasource. 
  getOptions(query) {

    return this.datasource.getExporters(query || '', this.scope);
  }

  getInterfaces(query) {


    return this.datasource.findInterfaces(query || '', this.scope)
  }


  getForecasts(query) {

    return this.datasource.getForecasts(query || '', this.scope);
  }
  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }

  getReports() {

    return this.datasource.reportOptions
  }

  getDisplay() {

    return this.datasource.displayOptions
  }
  
  getDirection() {

    return this.datasource.reportDirections
  }



  applyFilter() {
    return this.datasource.applyFilter(this.scope, this.panelCtrl)
  }

  resolveDNS() {

    
    this.target.dns = !this.target.dns
    this.panelCtrl.refresh()


  }

  hideOthers() {

    this.target.hideOthers = !this.target.hideOthers;


    this.panelCtrl.refresh()



  }





}


GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

