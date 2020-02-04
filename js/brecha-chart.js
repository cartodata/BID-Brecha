
(function (window) {
	// This function will contain all our code
	function brechaChartLib() {
		var _bch = {
			bdp: null,	// brecha data provider
			_updatePending: false
		};
		

		_bch.showChart = function() {
			$("#brecha-chart-wrapper").addClass("active");
			_bch.updatePending();
		};	

		_bch.hideChart = function() {
			$("#brecha-chart-wrapper").removeClass("active");
		};

		_bch.isVisible = function() {
			return $("#brecha-chart-wrapper").hasClass("active");
		};

		_bch.updateIfVisible = function(bdp) {
			
			_bch.bdp = bdp;
			_bch._updatePending = true;

			if(this.isVisible()) {
				this.update();
			}
		};

		_bch.updatePending = function() {
			if(_bch._updatePending) {
				_bch.update();
			}
		}

		_bch.update = function(bdp) {
			_bch._updatePending = false;

			if(bdp)
				_bch.bdp = bdp;
			else
			{
				if(!_bch.bdp) {
					_bch.destroy();
					return;
				}
			}
			
			_bch._buildChart();
			
		};

		
		_bch._buildChart = function() {
			var selectedChart = $("#chart-stat-dropdown").val();
			var selectedDs = $("#chart-stat-ds-dropdown").val();

			if(_bch.onBuildingChart)
				_bch.onBuildingChart();

			if(selectedDs === "diff")
				_bch._buildZonaDifChart(selectedChart);
			else
				_bch._buildZonaChart(selectedChart, selectedDs);
		};

		_bch._buildZonaDifChart = function(selectedChart){
			_bch._closeCharts();

			
			var self = this;
			var zonaPoints = _bch.bdp.zonaPoints;

			var difDis = $.map(zonaPoints, function(value) {
				var props = value.zonaFeature.properties;
				
				var stat;
				if(selectedChart == "avg")
					stat = props.dif_prom;
				else
				if(selectedChart == "median")
					stat = props.dif_median;
				else
				if(selectedChart == "min")
					stat = props.dif_min;
				else
				if(selectedChart == "max")
					stat = props.dif_max;
				else
				if(selectedChart == "std")
					stat = props.dif_desv;
				else
					throw new Error(selectedChart+" chart type not implemented");

				var res = {
					id: props.id,
					_internal_id: value._internal_id,
					x: value._internal_id,
					y: self._round(stat)
				}
				if(res.y == null)
					return;
				return res;
			});
			
			var selectedChartText = $("#chart-stat-dropdown").text();
			var selectedChartVal = $("#chart-stat-dropdown").val();
			var bkColor;
			var borderColor;
			if(selectedChartVal == "avg") { bkColor = 'rgba(255, 99, 132, 0.5)'; borderColor = 'rgba(255, 99, 132, 1)';	}
			else if(selectedChartVal == "median") { bkColor = 'rgba(54, 162, 235, 0.5)'; borderColor = 'rgba(54, 162, 235, 1)'; }
			else if(selectedChartVal == "min") { bkColor = 'rgba(255, 206, 86, 0.5)'; borderColor = 'rgba(255, 206, 86, 1)'; }
			else if(selectedChartVal == "max") { bkColor = 'rgba(75, 192, 192, 0.5)'; borderColor = 'rgba(75, 192, 192, 1)'; }
			else if(selectedChartVal == "std") { bkColor = 'rgba(255, 159, 64, 0.5)'; borderColor = 'rgba(255, 159, 64, 1)'; }
			else {
				throw new Error("selectedChartVal not implemented.");
			}

		
			var ctx = $("#brecha-chart");
			this._statChart = new Chart(ctx, {
				type: 'scatter',
				data: {
					datasets: [{
						label: 'Dif. '+selectedChartText.toLowerCase()+' $m²',
						data: difDis,
						backgroundColor: bkColor,
						borderColor: borderColor,
						borderWidth: 1
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					onClick: function(e) {
						var fp = this.getElementAtEvent(e)[0];

						if (fp) {
							var data = this.data.datasets[fp._datasetIndex].data[fp._index];
							if(data._internal_id) {
								var zona = self.bdp.getZonaByInternalId(data._internal_id);
								if(zona) {
									zsb.show(zona, true);
								}
							}
						}
					},
					tooltips: {
						callbacks: {
							label: function(tooltipItem, data) {
								var label = data.datasets[tooltipItem.datasetIndex].label || '';

								if (label) {
									label += ': ';
								}
								var id = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].id;
								label += "id: "+id+" / $"+self._formatFloat(tooltipItem.yLabel);
								return label;
							}
						}
					},
					scales: {
						xAxes: [{
							ticks: {
								display: false,
								stepSize: 10
							},
							display: false,
							type: 'linear',
							position: 'bottom',
						}],
						yAxes: [{
							id: 'y-axis-0',
							ticks: {
								// Include a dollar sign in the ticks
								callback: function(value) {
									return '$' + _bch._formatFloat(value);
								}
							}
						}]
					}
				}
			});
		};

		_bch._buildZonaChart = function(selectedChart, selectedDs) {
			
			_bch._closeCharts();

			
			var self = this;
			var zonaPoints = _bch.bdp.zonaPoints;
			var comeDs, cataDs;
			var datasets = [];

			if(selectedDs == "comb" || selectedDs == "come")
			{
				comeDs = $.map(zonaPoints, function(value) {
					var props = value.zonaFeature.properties;
					
					var stat;
					if(selectedChart == "avg")
						stat = props.com_prom;
					else
					if(selectedChart == "median")
						stat = props.com_median;
					else
					if(selectedChart == "min")
						stat = props.com_min;
					else
					if(selectedChart == "max")
						stat = props.com_max;
					else
					if(selectedChart == "std")
						stat = props.com_desv;
					else
						throw new Error(selectedChart+" chart type not implemented");

					var res = {
						id: props.id,
						_internal_id: value._internal_id,
						x: value._internal_id,
						y: self._round(stat)
						
					}
					if(res.y == null)
						return;
					return res;
				});

				datasets.push({
					label: 'Comercial $m²',
					data: comeDs,
					backgroundColor: '#2cf9f3',
					borderColor: '#22b1ad',
					borderWidth: 1
				});
			}

			if(selectedDs == "comb" || selectedDs == "cata") {
				cataDs = $.map(zonaPoints, function(value) {
					var props = value.zonaFeature.properties;

					var stat;
					if(selectedChart == "avg")
						stat = props.cat_prom;
					else
					if(selectedChart == "median")
						stat = props.cat_median;
					else
					if(selectedChart == "min")
						stat = props.cat_min;
					else
					if(selectedChart == "max")
						stat = props.cat_max;
					else
					if(selectedChart == "std")
						stat = props.cat_desv;
					else
						throw new Error(selectedChart+" chart type not implemented");

					var res = {
						id: props.id,
						_internal_id: value._internal_id,
						x: value._internal_id,
						y: self._round(stat)
					}
					if(res.y == null)
						return;
					return res;
				});

				datasets.push({
					label: 'Catastral $m²',
					data: cataDs,
					backgroundColor: '#fba804',
					borderColor: '#bb7d00',
					borderWidth: 1
				});
			}

			

		
			var ctx = $("#brecha-chart");
			this._statChart = new Chart(ctx, {
				type: 'scatter',
				data: {
					datasets: datasets
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					onClick: function(e) {
						var fp = this.getElementAtEvent(e)[0];

						if (fp) {
							var data = this.data.datasets[fp._datasetIndex].data[fp._index];
							if(data._internal_id) {
								var zona = self.bdp.getZonaByInternalId(data._internal_id);
								if(zona) {
									zsb.show(zona, true);
								}
							}
						}
					},
					/*annotation: {
						drawTime: 'afterDatasetsDraw',
						annotations: [{
							drawTime: 'afterDraw', // overrides annotation.drawTime if set
							id: 'a-line-come', // optional
							type: 'line',
							mode: 'horizontal',
							scaleID: 'y-axis-0',
							value: comeThreshold,
							borderColor: '#2cf9f3',
							borderWidth: 2,
							opacity: 1
						},
						{
							drawTime: 'afterDraw', // overrides annotation.drawTime if set
							id: 'a-line-cata', // optional
							type: 'line',
							mode: 'horizontal',
							scaleID: 'y-axis-0',
							value: cataThreshold,
							borderColor: '#fba804',
							borderWidth: 2,
							opacity: 1
						}]
					},*/
					tooltips: {
						callbacks: {
							label: function(tooltipItem, data) {
								var label = data.datasets[tooltipItem.datasetIndex].label || '';

								if (label) {
									label += ': ';
								}
								var id = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].id;
								label += "id: "+id+" / $"+self._formatFloat(tooltipItem.yLabel);
								return label;
							}
						}
					},
					scales: {
						xAxes: [{
							ticks: {
								display: false,
								stepSize: 10
							},
							display: false,
							type: 'linear',
							position: 'bottom',
						}],
						yAxes: [{
							id: 'y-axis-0',
							ticks: {
								// Include a dollar sign in the ticks
								callback: function(value) {
									return '$' + _bch._formatFloat(value);
								}
							}
						}]
					}
				}
			});
		}

		_bch.destroy = function() {
			_bch._closeCharts();
		};

		_bch._closeCharts = function() {

			if(this._statChart) {
				this._statChart.destroy();
			}
			this._statChart = null;
			
		};

		_bch._round = function(val) {
			if(val == null || val === 'undefined')
				return null;
			return (Math.round(val * 100) / 100);
		};
		
		_bch._formatFloat = function(val) {
			if(val == null || val === "undefined")
				return val;
			var r =  this._round(val);
			return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		};
		
		return _bch;
	}

	// We need that our library is globally accesible, then we save in the window
	if (typeof (window.bch) === 'undefined') {
        window.bch = brechaChartLib();
    }
})(window);