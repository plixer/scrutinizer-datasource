import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {
  
  constructor($scope, $injector)  {
    super($scope, $injector);
    this.scope = $scope;
    this.target.target = this.target.target || 'Select Exporter';
    this.target.report = this.target.report || 'Select Report';
    this.target.direction = this.target.direction || 'Select Direction';
    this.target.interface = this.target.interface || 'Select Interface';
    this.target.type = this.target.type || 'timeserie';
    this.target.filters = this.target.filters 

  }

  getOptions(query) {

    return this.datasource.getExporters(query || '', this.scope);
  }

  getInterfaces(query) {
    
    return this.datasource.findInterfaces(query || '', this.scope)
  }
  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }

  getReports(query) {

    return this.datasource.reportOptions
  }
  
  getDirection(query) {

    return this.datasource.reportDirections
  }

  applyFilter() {
    return this.datasource.applyFilter(this.scope, this.panelCtrl)
  }


}


GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

