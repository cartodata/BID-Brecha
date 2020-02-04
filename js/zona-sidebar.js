
(function (window) {
    // You can enable the strict mode commenting the following line  
    // 'use strict';

    // This function will contain all our code
    function zonaSidebarLib() {
        var _zsb = {};

		_zsb.init = function(map) {
			this._map = map;
			this._sidebar = L.control.sidebar({
				autopan: false,       // whether to maintain the centered map point when opening the sidebar
				closeButton: true,    // whether t add a close button to the panes
				container: 'zona-sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
				position: 'right',     // left or right
			}).addTo(map);
			this._sidebar.open('home');	// open the side bar
		};

		_zsb.show = function(zona, fitToBounds) {
			this._zona = zona;		// set new zona

			this._clearLayers();	// clear previous layers
			$("#sidebar-zona-id").text(this._zona.zonaFeature.properties.id);
			$(this._sidebar._container).show();	// and show it
			
			this._showLayers(fitToBounds);	// show layers
			this.fillData();	// fill in sidebar data
		};

		_zsb.fillData = function() {
			
			this._loadDifChart();
			this._loadStats();
			this._loadZonaPointsDt();
			
		};

		_zsb._loadZonaPointsDt = function() {
			var self = this;

			/*************/			
			/* comercial */

			// map property data for datatables
			var comeDs = $.map(this._zona.comercialFc.features, function(value) {
				var coord = turf.getCoord(value);
				return $.extend({}, value.properties, {
					point: coord
				});
			});

			// Init datatable if not already initialized
			if(!this._comeDt) {
				this._comeDt = $('#zona-points-come').DataTable( {
					columns: [
						{ title: "Id", data: "id" },
						{ title: "Baldio", data: "baldio" },
						{ title: "Valor", data: "valor", className: "text-right", render: function(data) { return self._formatFloat(data); }  },
						{ title: "Superficie", data: "superficie", className: "text-right", render: function(data) { return self._formatFloat(data); } },
						{ title: "Valor m²", data: "valor_m2", className: "text-right", render: function(data) { return self._formatFloat(data); } }
					],
					order: [[ 0, "asc" ]],
					select: true,
					paging: false,
					ordering: true,
					info: false,
					searching: false,
					serverSide: false,
					responsive: true
				});

				this._comeDt.on('select', function(e, dt, type, indexes) {
					if(type === 'row') {

						var data = self._comeDt.rows( indexes ).data().pluck( 'point' );
						var latlng = L.latLng(data[0][1], data[0][0]);
												
						if(self._selectedComeMarker)
							self._map.removeLayer(self._selectedComeMarker);
						self._selectedComeMarker = L.shapeMarker(latlng, {
							shape: "diamond",
							radius: 6,
							fillColor: "white",
							color: "red",
							weight: 1,
							opacity: 1,
							fillOpacity: 1
						}).addTo(self._map);
					}
				});

				this._comeDt.on('deselect', function(e, dt, type) {
					if(type === 'row') {
						if(self._selectedComeMarker)
							self._map.removeLayer(self._selectedComeMarker); 
						self._selectedComeMarker = null;
					}
				});
			}
			this._comeDt.clear();
			this._comeDt.rows.add(comeDs);
			this._comeDt.draw();

			
			/*************/
			/* catastral */

			// map property data for datatables
			var cataDs = $.map(this._zona.catastroFc.features, function(value){
				var coord = turf.getCoord(value);
				return $.extend({}, value.properties, {
					point: coord
				});
			});
			if(!this._cataDt) {
				this._cataDt = $('#zona-points-cata').DataTable( {
					columns: [
						{ title: "Id", data: "id" },
						{ title: "Baldio", data: "baldio" },
						{ title: "Valor", data: "valor", className: "text-right", render: function(data) { return self._formatFloat(data); }  },
						{ title: "Superficie", data: "superficie", className: "text-right", render: function(data) { return self._formatFloat(data); } },
						{ title: "Valor m²", data: "valor_m2", className: "text-right", render: function(data) { return self._formatFloat(data); } }
					],
					order: [[ 0, "asc" ]],
					select: true,
					paging: false,
					ordering: true,
					info: false,
					searching: false,
					serverSide: false,
					responsive: true
				});	

				this._cataDt.on('select', function(e, dt, type, indexes) {
					if(type === 'row') {

						var data = self._cataDt.rows( indexes ).data().pluck( 'point' );
						var latlng = L.latLng(data[0][1], data[0][0]);
												
						if(self._selectedCataMarker)
							self._map.removeLayer(self._selectedCataMarker);
						self._selectedCataMarker = L.shapeMarker(latlng, {
							shape: "circle",
							radius: 8,
							fillColor: "white",
							color: "red",
							weight: 1,
							opacity: 1,
							fillOpacity: 1
						}).addTo(self._map);
					}
				});

				this._cataDt.on('deselect', function(e, dt, type) {
					if(type === 'row') {
						if(self._selectedCataMarker)
							self._map.removeLayer(self._selectedCataMarker); 
						self._selectedCataMarker = null;
					}
				});
			}
			this._cataDt.clear();
			this._cataDt.rows.add(cataDs);
			this._cataDt.draw();
		};

		_zsb._loadDifChart = function() {
			
			var self = this;
			
			var zp = this._zona.zonaFeature.properties;
			var difsDs = [zp.dif_prom, zp.dif_median, zp.dif_min, zp.dif_max, zp.dif_desv];
			
			this._closeDifChart();
			
			var ctx = $("#dif-chart");
			this._difChart = new Chart(ctx, {
				type: 'bar',
				data: {
					labels: ['Promedio', 'Mediana', 'Mínima', 'Máxima', 'Desviación'],
					datasets: [{
						label: 'Diferencia valor m²',
						data: difsDs,
						backgroundColor: [
							'rgba(255, 99, 132, 0.2)',
							'rgba(54, 162, 235, 0.2)',
							'rgba(255, 206, 86, 0.2)',
							'rgba(75, 192, 192, 0.2)',
							'rgba(255, 159, 64, 0.2)'
						],
						borderColor: [
							'rgba(255, 99, 132, 1)',
							'rgba(54, 162, 235, 1)',
							'rgba(255, 206, 86, 1)',
							'rgba(75, 192, 192, 1)',
							'rgba(255, 159, 64, 1)'
						],
						borderWidth: 1
					}]
				},
				options: {
					legend: {
						display: false
					},
					tooltips: {
						callbacks: {
							label: function(tooltipItem, data) {
								var label = data.datasets[tooltipItem.datasetIndex].label || '';

								if (label) {
									label += ': ';
								}
								label += "$"+self._formatFloat(tooltipItem.yLabel);
								return label;
							}
						}
					},
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero: true
							}
						}]
					}
				}
			});
			
		};

		_zsb._loadStats = function() {
			var self = this;

			var zp = this._zona.zonaFeature.properties;
			$("#tot-come").text(zp.com_totpnt);
			$("#tot-cata").text(zp.cat_totpnt);
			$("#tot-total").text(zp.total_pnts);


			var statsDs = [
				{
					id: "avg",
					stat: "Promedio",
					comercial: zp.com_prom,
					catastral: zp.cat_prom,
					diferencia: zp.dif_prom
				},
				{  
					id: "median",
					stat: "Mediana",
					comercial: zp.com_median,
					catastral: zp.cat_median,
					diferencia: zp.dif_median
				},
				{  
					id: "min",
					stat: "Mínima",
					comercial: zp.com_min,
					catastral: zp.cat_min,
					diferencia: zp.dif_min
				},
				{  
					id: "max",
					stat: "Máxima",
					comercial: zp.com_max,
					catastral: zp.cat_max,
					diferencia: zp.dif_max
				},
				{  
					id: "std",
					stat: "Desviación*",
					comercial: zp.com_desv,
					catastral: zp.cat_desv,
					diferencia: zp.dif_desv
				},
				/* Varianze is the same as (Standard Deviation)² and not expressed in the same units (in this case valor x m²)
				{  
					stat: "Varianza",
					comercial: zp.com_var,
					catastral: zp.cat_var,
					diferencia: zp.dif_var
				}*/
			];
			
			if(!this._statsDt) {
				this._statsDt = $('#zona-estadisticas').DataTable( {
					columns: [
						{ data: "id", visible: false },
						{ title: "Tipo", data: "stat" },
						{ title: "Valor comercial m²", data: "comercial", className: "text-right", render: function(data) { return self._formatFloat(data); }  },
						{ title: "Valor catastral m²", data: "catastral", className: "text-right", render: function(data) { return self._formatFloat(data); } },
						{ title: "Diferencia m²", data: "diferencia", className: "text-right", render: function(data) { return self._formatFloat(data); } }
					],
					select: true,
					paging: false,
					ordering: false,
					info: false,
					searching: false,
					serverSide: false,
					responsive: true
				});	

				this._statsDt.on('select', function(e, dt, type, indexes) {
					if(type === 'row') {
						var data = self._statsDt.rows( indexes ).data().pluck( 'id' );
						var id = data[0];
						self._loadStatChart(id);
					}
				});

				this._statsDt.on('deselect', function(e, dt, type) {
					if(type === 'row') {
						self._closeStatChart();
					}
				});
			}

			this._statsDt.clear();
			this._statsDt.rows.add(statsDs);
			this._statsDt.draw();

			// select default or last row
			if(!this._lastStatChartId)
				this._lastStatChartId = "std";	// default

			this._statsDt.rows().every(function(){
				if(this.data().id == self._lastStatChartId) {
					this.select();
				}
			});
		};

		_zsb._loadStatChart = function(type) {
			var self = this;
			this._closeStatChart();

			this._lastStatChartId = type;
			
			// map property data for datatables
			var cataDs = $.map(this._zona.catastroFc.features, function(value, index){
				return {
					id: value.properties.id,
					x: index,
					y: self._round(value.properties.valor_m2)
				};
			});

			var comeDs = $.map(this._zona.comercialFc.features, function(value, index) {
				return {
					id: value.properties.id,
					x: index,
					y: self._round(value.properties.valor_m2)
				};
			});

			
			var graphTitle = "Gráfica de ";
			var cataThreshold;
			var comeThreshold;

			if(type == "avg") {
				graphTitle += "promedio";
				comeThreshold = this._zona.zonaFeature.properties.com_prom;
				cataThreshold = this._zona.zonaFeature.properties.cat_prom;
			}
			else
			if(type == "median") {
				graphTitle += "mediana";
				comeThreshold = this._zona.zonaFeature.properties.com_median;
				cataThreshold = this._zona.zonaFeature.properties.cat_median;
			}
			else
			if(type == "min") {
				graphTitle += "mínima";
				comeThreshold = this._zona.zonaFeature.properties.com_min;
				cataThreshold = this._zona.zonaFeature.properties.cat_min;
			}
			else
			if(type == "max") {
				graphTitle += "máxima";
				comeThreshold = this._zona.zonaFeature.properties.com_max;
				cataThreshold = this._zona.zonaFeature.properties.cat_max;
			}
			else
			if(type == "std") {
				graphTitle += "desviación estandar";
				comeThreshold = this._zona.zonaFeature.properties.com_desv;
				cataThreshold = this._zona.zonaFeature.properties.cat_desv;
			}
			else
				alert("unimplemented graph type");
			
			$("#point-stat-chart-title").text(graphTitle);
			$("#point-stat-chart-section").show();

			var ctx = $("#point-stat-chart");
			this._statChart = new Chart(ctx, {
				type: 'scatter',
				data: {
					datasets: [{
						id: 'come',
						label: 'Comercial m²',
						data: comeDs,
						backgroundColor: '#2cf9f3',
						borderColor: '#22b1ad',
						borderWidth: 1
					},
					{
						id: 'cata',
						label: 'Catastral m²',
						backgroundColor: '#fba804',
						borderColor: '#bb7d00',
						borderWidth: 1,
						data: cataDs
					}]
				},
				options: {
					onClick: function(e) {
						var fp = this.getElementAtEvent(e)[0];

						if (fp) {
							var data = this.data.datasets[fp._datasetIndex].data[fp._index];
							
							if(this.data.datasets[fp._datasetIndex].id == "come")
							{
								self._comeDt.rows().deselect();
								self._comeDt.rows().every(function(){
									if(this.data().id == data.id) {
										this.select();
									}
								});
							}
							else
							if(this.data.datasets[fp._datasetIndex].id == "cata")
							{
								self._cataDt.rows().deselect();
								self._cataDt.rows().every(function(){
									if(this.data().id == data.id) {
										this.select();
									}
								});
							}
							
						}
					},
					annotation: {
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
					},
					tooltips: {
						callbacks: {
							label: function(tooltipItem, data) {
								var label = data.datasets[tooltipItem.datasetIndex].label || '';

								if (label) {
									label += ': ';
								}
								var id = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].id;
								label += id+" $"+self._formatFloat(tooltipItem.yLabel);
								return label;
							}
						}
					},
					scales: {
						xAxes: [{
							ticks: {
								display: false
							},
							display: false,
							type: 'linear',
							position: 'bottom',
						}],
						yAxes: [{
							id: 'y-axis-0'
						}]
					}
				}
			});

		};

		_zsb._closeStatChart = function() {

			if(this._statChart) {
				this._statChart.destroy();
			}
			this._statChart = null;
			$("#point-stat-chart-section").hide();
		};

		_zsb._closeDifChart = function() {

			if(this._difChart)
				this._difChart.destroy();

			this._difChart = null;
		}

		_zsb._round = function(val) {
			if(val == null || val === 'undefined')
				return null;
			return  (Math.round(val * 100) / 100);
		};
		
		_zsb._formatFloat = function(val) {
			if(val == null || val === "undefined")
				return val;
			var r =  this._round(val);
			return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		};

		_zsb._showLayers = function(_showLayers) {
			
			// show zona
			this._zonaLayer = L.geoJSON(this._zona.zonaFeature, {
				color: "#ffff00",
				fillOpacity: 0,
				interactive: false
			}).addTo(this._map);


			// Show puntos de zonas
			this._catastroLayer = L.geoJSON(this._zona.catastroFc, {
				interactive: false,
				pointToLayer: function(feature, latlng) {
					return L.shapeMarker(latlng, {
						shape: "circle",
						radius: 8,
						fillColor: "#fba804",
						color: "black",
						weight: 1,
						opacity: 1,
						fillOpacity: 1
					});
				}
			}).addTo(this._map);

			this._comercialLayer = L.geoJSON(this._zona.comercialFc, {
				interactive: false,
				pointToLayer: function(feature, latlng) {
					return L.shapeMarker(latlng, {
						shape: "diamond",
						radius: 6,
						fillColor: "#2cf9f3",
						color: "black",
						weight: 1,
						opacity: 1,
						fillOpacity: 1
					});
				}
			}).addTo(this._map);

			if(_showLayers === true) {
				this._map.panTo(this._zonaLayer.getBounds().getCenter(), {
					animate: false
				});
			}
				
		};

		_zsb._clearLayers = function() {
			if(this._selectedComeMarker) {
				this._map.removeLayer(this._selectedComeMarker); 
				this._selectedComeMarker = null;
			}

			if(this._selectedCataMarker) {
				this._map.removeLayer(this._selectedCataMarker); 
				this._selectedCataMarker = null;
			}

			if(this._catastroLayer) {
				this._map.removeLayer(this._catastroLayer);
				this._catastroLayer = null;
			}

			if(this._comercialLayer) {
				this._map.removeLayer(this._comercialLayer);
				this._comercialLayer = null;
			}

			if(this._zonaLayer) {
				this._map.removeLayer(this._zonaLayer);
				this._zonaLayer = null;
			}
		};

		_zsb._destroyCharts = function() {
			this._closeStatChart();
			this._closeDifChart();
		};

		_zsb.close = function() {
			$(this._sidebar._container).hide();
			this._clearLayers();	// clear previous layers
			this._destroyCharts();
		};

        
        return _zsb;
    }

    // We need that our library is globally accesible, then we save in the window
    if (typeof (window.zsb) === 'undefined') {
        window.zsb = zonaSidebarLib();
    }
})(window);
