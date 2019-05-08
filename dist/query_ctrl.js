'use strict';

System.register(['app/plugins/sdk', './css/query-editor.css!'], function (_export, _context) {
  "use strict";

  var QueryCtrl, _createClass, GenericDatasourceQueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      QueryCtrl = _appPluginsSdk.QueryCtrl;
    }, function (_cssQueryEditorCss) {}],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('GenericDatasourceQueryCtrl', GenericDatasourceQueryCtrl = function (_QueryCtrl) {
        _inherits(GenericDatasourceQueryCtrl, _QueryCtrl);

        function GenericDatasourceQueryCtrl($scope, $injector) {
          _classCallCheck(this, GenericDatasourceQueryCtrl);

          var _this = _possibleConstructorReturn(this, (GenericDatasourceQueryCtrl.__proto__ || Object.getPrototypeOf(GenericDatasourceQueryCtrl)).call(this, $scope, $injector));

          _this.scope = $scope;
          _this.target.target = _this.target.target || 'Select Exporter';
          _this.target.report = _this.target.report || 'Select Report';
          _this.target.display = _this.target.display || 'Bits / Percent';
          _this.target.direction = _this.target.direction || 'Select Direction';
          _this.target.interface = _this.target.interface || 'Select Interface';
          _this.target.type = _this.target.type || 'timeserie';
          _this.target.filters = _this.target.filters;

          return _this;
        }

        _createClass(GenericDatasourceQueryCtrl, [{
          key: 'getOptions',
          value: function getOptions(query) {

            return this.datasource.getExporters(query || '', this.scope);
          }
        }, {
          key: 'getInterfaces',
          value: function getInterfaces(query) {

            return this.datasource.findInterfaces(query || '', this.scope);
          }
        }, {
          key: 'toggleEditorMode',
          value: function toggleEditorMode() {
            this.target.rawQuery = !this.target.rawQuery;
          }
        }, {
          key: 'onChangeInternal',
          value: function onChangeInternal() {
            this.panelCtrl.refresh(); // Asks the panel to refresh data.
          }
        }, {
          key: 'getReports',
          value: function getReports(query) {

            return this.datasource.reportOptions;
          }
        }, {
          key: 'getDisplay',
          value: function getDisplay(query) {

            return this.datasource.displayOptions;
          }
        }, {
          key: 'getDirection',
          value: function getDirection(query) {

            return this.datasource.reportDirections;
          }
        }, {
          key: 'applyFilter',
          value: function applyFilter() {
            return this.datasource.applyFilter(this.scope, this.panelCtrl);
          }
        }]);

        return GenericDatasourceQueryCtrl;
      }(QueryCtrl));

      _export('GenericDatasourceQueryCtrl', GenericDatasourceQueryCtrl);

      GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
    }
  };
});
//# sourceMappingURL=query_ctrl.js.map
