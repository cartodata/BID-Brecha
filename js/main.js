/* global BrechaData */
var bdp = new BrechaData();

$(function(){
	var map = initMainMap();
	initDataProcessingModals(map);
	initBrechaChart(map);

	
});

function initBrechaChart(map) {
	$(".dropdown-menu.selectable a").click(function(){
		$(this).parents(".dropdown").find('.btn').html($(this).text());
		$(this).parents(".dropdown").find('.btn').val($(this).data('value'));
	});

	$(".chart-stat-dropdown-menu.dropdown-menu.selectable a").click(function(){ 
		bch.updateIfVisible(bdp);
	});

	
	

	bch.onBuildingChart = function() {
		var selectedChartText = $("#chart-stat-dropdown").text();
		var selectedChart = $("#chart-stat-dropdown").val();
		var selectedDs = $("#chart-stat-ds-dropdown").val();
		var legendTitle;

		var classType;
		if(selectedDs == "diff") {
			legendTitle = "Diferencia "+selectedChartText.toLowerCase()+" $m²";
			switch(selectedChart) {
				case "avg":
					classType = "dif_prom";
					break;
				case "median":
					classType = "dif_median";
					break;
				case "min":
					classType = "dif_min";
					break;
				case "max":
					classType = "dif_max";
					break;
				case "std":
					classType = "dif_desv";
					break;
			}
		}
		else {
			if(selectedDs == "come") {
				legendTitle = "Comercial "+selectedChartText.toLowerCase()+" $m²";
				switch(selectedChart) {
					case "avg":
						classType = "com_prom";
						break;
					case "median":
						classType = "com_median";
						break;
					case "min":
						classType = "com_min";
						break;
					case "max":
						classType = "com_max";
						break;
					case "std":
						classType = "com_desv";
						break;
				}	
			}
			else
			if(selectedDs == "cata") {
				legendTitle = "Catastral "+selectedChartText.toLowerCase() +" $m²";
				switch(selectedChart) {
					case "avg":
						classType = "cat_prom";
						break;
					case "median":
						classType = "cat_median";
						break;
					case "min":
						classType = "cat_min";
						break;
					case "max":
						classType = "cat_max";
						break;
					case "std":
						classType = "cat_desv";
						break;
				}
			}
		}
		
		var classData = classifyMap(map, classType);

		if(classData) {
			// create legend
			classData.legendTitle = legendTitle;
			classData.classType = classType;
			showLegend(map, classData);
		}
	};
}

function removeLegend(map) {
	if(map._legend) {
		map.removeControl(map._legend);
		map._legend = null;
	}
}

function showLegend(map, options) {
	
	if(map._legend) {
		if(map._legend._classType == options.classType)	// already rendered.
			return;
		removeLegend(map);
		if(!options.bins)	// no bins
			return;
	}

	map._legend = L.control({ position: 'bottomleft' });
	map._legend.onAdd = function() {
		var container = L.DomUtil.create("div", "legend-container");
		var titleDom = L.DomUtil.create("h6", "legend-title", container);
		titleDom.innerHTML = options.legendTitle;

		for(var i=1; i < options.bins.length; i++) {
			var leftVal = options.bins[i-1];
			var rightVal = options.bins[i];

			// First bin is for negative values.
			if(i-1 == 0) {
				// If this is first bin and most negative number == 0 then there are no negative values. Do not show legend item.
				if(options.bins[i-1] == 0)
					continue;
				// If we have negative value, manually set legend item values
				leftVal = options.bins[i-1];	// our max negative
				rightVal = 0;					// up to zero
			}
			var binDom = L.DomUtil.create("div", "legend-bin", container);
			L.DomUtil.create("span", "legend-icon", binDom).style.backgroundColor = options.colorRamp[i-1];
			L.DomUtil.create("span", "legend-range", binDom).innerHTML = "$"+zsb._formatFloat(leftVal) + " - $" + zsb._formatFloat(rightVal);
		}

		L.DomEvent.disableClickPropagation(container);
		L.DomEvent.preventDefault(container);
		
		return container;
	};

	map._legend._classType = options.classType;

	map._legend.addTo(map);
	
}




/* Called when all data processing is finished. */
function onDataReady(map) {
	showChart(map);
	//classifyMap(map, "dif_prom");
}

function classifyMap(map, classType) {
	
	var bins;
	// default color ramp for all stats
	// NOTE: First color of color ramp is for any value < 0
	var colorRamp = ['#c60ee8', '#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026' ];
	if(classType == null || classType === "undefined")
		classType = "none";
	
	if(map._zonaLayer) {
		
		// check if already has this classification
		if(map._zonaLayer._classType === classType)
			return;
		map.removeLayer(map._zonaLayer);
	}

	if(classType == "none") {
		map._zonaLayer = L.geoJSON(bdp.zonaFc, {
			color: "#F00",
			weight: 1,
			fillOpacity: 0,
			interactive: false
		}).addTo(map);
	}
	else{
		bins = classifyZonaFeatures(map, colorRamp, classType);
	}
		
	map._zonaLayer._classType = classType;

	return {
		bins: bins,
		colorRamp: colorRamp
	};
}

function classifyZonaFeatures(map, colorRamp, dsField) {
	debugger;
	// Return all values except < 0. We will calculate our own bin for values < 0.
	var minVal = 0;	// get most negative value so we can create our own single bin for negative values
	var ds = $.map(bdp.zonaFc.features, function(value) {
		var val = value.properties[dsField];
		if(val < 0) {
			if(val < minVal)
				minVal = val;
			return null;
		}
		return val;
	});

	
	var bins = [];

	if(ds.length == 1)
	{
		bins = [ds[0], ds[0]];
		bins.unshift(minVal);
	}
	else
	if(ds.length >= 2)
	{
		var series = new geostats();
		series.setSerie(ds);
		
		// color ramp determines number of classes
		// colorRamp.length-1 because first color in ramp is used only for values < 0
		// should not be included in classJenks
		
		bins = series.getClassJenks(ds.length <= colorRamp.length-1?ds.length-1:colorRamp.length-1);
		bins.unshift(minVal);
	}
	
	map._zonaLayer = L.geoJSON(bdp.zonaFc, {
		fillOpacity: 0,
		interactive: false,
		style: function(feature) {
			var style = {
				color: "#888",
				fillColor: "#bbb",
				fillOpacity: 0.5,
				weight: 1
			};
			var zval = feature.properties[dsField];
			if(zval != null && zval !== "undefined")
			{
				if(zval < 0) {
					style.fillColor = colorRamp[0];
				}
				else {
					for(var i=2; i < bins.length; i++) {
						if(zval <= bins[i]) {
							style.fillColor = colorRamp[i-1];
							break;
						}
					}
				}
			}

			return style;
		}
	}).addTo(map);

	return bins;
}

function initMainMap() {
	var map = L.map('main-map').setView([22.3907, -101.6894], 5);
	
	
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);
	

	// Create toolbar action buttons
	var SelectZonaAction = L.Toolbar2.ClickMapAction.extend({
		options: {
			toolbarIcon: {
				className: 'fa fa-crosshairs',
				tooltip: "Zona"
			},
			onClick: selectZona,
			onActionRemoved: selectZonaRemoved
		},
	});

	var ProcessarDatosAction = L.Toolbar2.SimpleAction.extend({
		options: {
			toolbarIcon: {
				className: 'fa fa-bolt',
				tooltip: "Procesar datos"
			},
			callback: function() {
				$('#dataProcessOptionsModal').modal();
			}
		},
	});

	var ShowDatasetChartAction = L.Toolbar2.NonActiveAction.extend({
		options: {
			toolbarIcon: {
				className: 'fa fa-bar-chart',
				tooltip: "Mostrar gráficas"
			},
			callback: toggleDatasetChart
		},
	});

	var ExportZonasFcAction = L.Toolbar2.NonActiveAction.extend({
		options: {
			toolbarIcon: {
				className: 'fa fa-save',
				tooltip: "Guardar zonas"
			},
			callback: exportZonaFc
		},
	});

	var DownloadTemplateAction = L.Toolbar2.NonActiveAction.extend({
		options: {
			toolbarIcon: {
				className: 'fa fa-download',
				tooltip: "Descargar plantilla"
			},
			callback: function() {
				document.location.href = "data/plantilla.zip";
			}
		},
	});

	// Create toolbar
	new L.Toolbar2.Control({
		position: 'topleft',
		actions: [DownloadTemplateAction, ProcessarDatosAction, ShowDatasetChartAction, ExportZonasFcAction, SelectZonaAction]
	}).addTo(map);

	
	// initialize zona sidebar
	zsb.init(map);

	
	return map;
}

function base64toBlob(data, mimeType) {
	
	// convert base64/URLEncoded data component to raw binary data held in a string
	var byteString = atob(data);
	
	// write the bytes of the string to a typed array
	var ia = new Uint8Array(byteString.length);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
  
	return new Blob([ia], {type:mimeType});
  }

function exportZonaFc() {
	if(bdp.zonaFc == null) {
		showAlert("No hay existen zonas procesadas.");
		return;
	}

	bootbox.prompt({
		title: "Exportar estadísticas de zonas",
		message: '<p>Seleccione el formato a exportar</p>',
		inputType: 'radio',
		inputOptions: [
		{
			text: 'GeoJson',
			value: '1',
		},
		{
			text: 'Shape',
			value: '2',
		}
		],
		callback: function (result) {
			// use setTimeout so that modal closes inmediatly to avoid double clicks
			if(result == '1') {
				setTimeout(function(){
					var fileType = "application/geo+json";
					var strfc = JSON.stringify(bdp.zonaFc);
					var blob = new Blob([strfc], { type: fileType });
					downloadBlob(blob, "zona_est.geojson", fileType);
				}, 25);
			}
			else
			if(result == '2') {
				setTimeout(function(){
					var bff = shpwrite.zip(bdp.zonaFc, {
						folder: 'zonas',
						types: {
							point: 'zona_est',
							polygon: 'zona_est',
							line: 'zona_est'
						}
					});
					bff.then(function(res){
						var fileType = "application/zip";
						var blob = base64toBlob(res, fileType);
						downloadBlob(blob, "zona_est.zip", fileType);
					});
				}, 25);
			}
		}
	});

}

function downloadBlob(blob, filename, fileType) {

	var a = document.createElement('a');
	a.download = filename;
	a.href = URL.createObjectURL(blob);
	a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}

function showChart(map) {
	$("#main-map").addClass("brecha-chart-active");
		bch.showChart(bdp);
		setTimeout(function(){
			map.invalidateSize(false);
		}, 0);
}

function toggleDatasetChart(map) {
	var bc = $("#brecha-chart-wrapper");
	if ( bc.css('display') == 'none' || bc.css("visibility") == "hidden"){
		// element is hidden, toggle (show it)
		showChart(map);
	}
	else {
		bch.hideChart();
		$("#main-map").removeClass("brecha-chart-active");
		setTimeout(function(){
			map.invalidateSize(false);
		}, 0);
	}
}



function selectZona(map, e) {
	var zona = bdp.getZonaByLatLng(e.latlng);
	if(zona != null) {
		zsb.show(zona);
	}
}

function selectZonaRemoved() {
	zsb.close();
}

function enableProcessButtons(enable) {
	// allows any events to bubble before enabling or disabling
	setTimeout(function() {
		$("#startProcessLoadedButton").prop( "disabled", !enable);
		$("#startProcessPreLoadedButton").prop( "disabled", !enable);
	}, 1);
}

function initDataProcessingModals(map) {
	var processDataOptions = {
		soloBaldios: false,
		municipioFc: null,
		zonaFc: null,
		vCatastralFc: null,
		vComercialFc: null
	};

	new FileLoader("loadMuncContainer", {
		html: "<i class='fu-status fa fa-fw fa-upload'></i> Cargar archivo de municipios",
		onGeoJsonReady: function(content) {
			if(!bdp.validateMunicipioFc(content))
			{
				content = null;
				showAlert("No puede haber mas de 1,000 geometrias en el archivo de municipios.");
			}
			setUploadFileloaderStatus("loadMuncContainer", content != null?"ok":"error");
			processDataOptions.municipioFc = content;
			enableProcessButtons(true);
		},
		onLoading: function() {
			enableProcessButtons(false);
			setUploadFileloaderStatus("loadMuncContainer", "progress");
		},
		onLoadError: function() {
			setUploadFileloaderStatus("loadMuncContainer", "error");
			enableProcessButtons(true);
		}
	});

	new FileLoader("loadZonasContainer", {
		html: "<i class='fu-status fa fa-fw fa-upload'></i> Cargar archivo de zonas",
		onGeoJsonReady: function(content) {
			if(!bdp.validateZonaFc(content))
			{
				content = null;
				showAlert("Todas las geometrías de zonas deben ser de tipo polígono y debe haber al menos 2.");
			}
			setUploadFileloaderStatus("loadZonasContainer", content != null?"ok":"error");
			processDataOptions.zonaFc = content;
			enableProcessButtons(true);
		},
		onLoading: function() {
			enableProcessButtons(false);
			setUploadFileloaderStatus("loadZonasContainer", "progress");
		},
		onLoadError: function() {
			setUploadFileloaderStatus("loadZonasContainer", "error");
			enableProcessButtons(true);
		}
	});

	new FileLoader("loadCatastroContainer", {
		html: "<i class='fu-status fa fa-fw fa-upload'></i> Cargar archivo de valores catastrales",
		onGeoJsonReady: function(content) {
			if(!bdp.validateCatastroFc(content))
			{
				content = null;
				showAlert("Todas las geometrías de valores catastrales deben ser de tipo punto.");
			}
			setUploadFileloaderStatus("loadCatastroContainer", content != null?"ok":"error");
			processDataOptions.vCatastralFc = content;
			enableProcessButtons(true);
		},
		onLoading: function() {
			enableProcessButtons(false);
			setUploadFileloaderStatus("loadCatastroContainer", "progress");
		},
		onLoadError: function() {
			setUploadFileloaderStatus("loadCatastroContainer", "error");
			enableProcessButtons(true);
		}

	});

	new FileLoader("loadComercialContainer", {
		html: "<i class='fu-status fa fa-fw fa-upload'></i> Cargar archivo de valores comerciales",
		onGeoJsonReady: function(content) {
			if(!bdp.validateComercialFc(content))
			{
				content = null;
				showAlert("Todas las geometrías de valores comerciales deben ser de tipo punto.");
			}
			setUploadFileloaderStatus("loadComercialContainer", content != null?"ok":"error");
			processDataOptions.vComercialFc = content;
			enableProcessButtons(true);
		},
		onLoading: function() {
			enableProcessButtons(false);
			setUploadFileloaderStatus("loadComercialContainer", "progress");
		},
		onLoadError: function() {
			setUploadFileloaderStatus("loadComercialContainer", "error");
			enableProcessButtons(true);
		}
	});

	
	

	// Reset options on showing process options
	$("#dataProcessOptionsModal").on('show.bs.modal', function() {
		//$("#processOnlyBaldios").prop('checked', false);
		$(".loadFilesGroup .fu-status").removeClass("fa-check").removeClass("fa-times").addClass("fa-upload");
	});

	/* data processing options */
	$("#startProcessPreLoadedButton").click(function(){
		
		processDataOptions.soloBaldios = $("#processOnlyBaldios").prop('checked');
		processDataOptions.localFiles = false;
		processData(map, processDataOptions);

		// clear data just in case
		processDataOptions.municipioFc = null;
		processDataOptions.zonaFc = null;
		processDataOptions.vCatastralFc = null;
		processDataOptions.vComercialFc = null;
	});

	/* data processing options */
	$("#startProcessLoadedButton").click(function(){

		processDataOptions.soloBaldios = $("#processOnlyBaldios").prop('checked');
		processDataOptions.localFiles = true;

		// make sure all files have been loaded
		if(!processDataOptions.municipioFc || !processDataOptions.zonaFc ||
			!processDataOptions.vCatastralFc || !processDataOptions.vComercialFc) {
			showAlert("Faltan archivos por cargar.");
			return;
		}

		$('#dataProcessOptionsModal').modal('hide');
		
		setTimeout(function() {
			processData(map, processDataOptions);

			// clear data
			processDataOptions.municipioFc = null;
			processDataOptions.zonaFc = null;
			processDataOptions.vCatastralFc = null;
			processDataOptions.vComercialFc = null;
		}, 25);
		
	});


	/* Data download progress modal */
	$('#processDataModal').on('show.bs.modal', function () {
		$("#processDataButton").text("Cancelar").removeClass("btn-primary").addClass("btn-danger");
		// Reset all on showing modal
		$("#processDataModal .progress-bar")
			.css("width", "0%")
			.addClass("progress-bar-animated")
			.text("");
	});
}

function setUploadFileloaderStatus(element, status) {
	
	var elem = $("#"+element+" .fu-status");

	elem.removeClass("fa-upload");
	elem.removeClass("fa-check");
	elem.removeClass("fa-times");
	elem.removeClass("fa-spinner");
	elem.removeClass("fa-spin");
	
	if(status=="ok") {
		elem.addClass("fa-check");
	}
	else
	if(status=="error") {
		elem.addClass("fa-times");
	}
	else
	if(status=="progress") {
		elem.addClass("fa-spinner fa-spin");
	}
}


function processData(map, processDataOptions) {
	hideProcessingLog();

	var loadDataOptions = {};

	/* Create progress callbacks if not processing local files */
	if(processDataOptions.localFiles !== true) {
		loadDataOptions.municipoPgCb = function(computable, perc) {
			return updateProgressBar("municipioPg", computable, perc);
		},
		loadDataOptions.catastroPgCb = function(computable, perc) {
			return updateProgressBar("catastroPg", computable, perc);
		},
		loadDataOptions.comercialPgCb = function(computable, perc) {
			return updateProgressBar("comercialPg", computable, perc);
		},
		loadDataOptions.zonaPgCb = function(computable, perc) {
			return updateProgressBar("zonaPg", computable, perc);
		}
	}
	

	if(processDataOptions.soloBaldios) {
		loadDataOptions.filterCatastroFeatures = function(feature) {
			return feature.properties.baldio == "SI";
		};

		loadDataOptions.filterComercialFeatures = function(feature) {
			return feature.properties.baldio == "SI";
		};
	}

	stopDownloadProgressAnimation();
	
	$('#processDataModal').modal();
	
	$(".progress-area").addClass("working");

	/* process user uploaded files */
	if(processDataOptions.localFiles === true) {

		// set downloaded files to 100% since user already uploaded them manually
		updateProgressBar("municipioPg", true, 1);
		updateProgressBar("catastroPg", true, 1);
		updateProgressBar("comercialPg", true, 1);
		updateProgressBar("zonaPg", true, 1);

		removeLegend(map);
		bdp.loadData(processDataOptions.municipioFc,
						processDataOptions.zonaFc,
						processDataOptions.vCatastralFc,
						processDataOptions.vComercialFc,
						processDataOptions);

		dataLoaded(map);
	}
	else {
		removeLegend(map);
		bdp.loadFromDataFolder("./data", loadDataOptions)
			.then(function() {
				dataLoaded(map);
			})
			.catch(function(err){
				console.error(err);
				clearDataLayers(map);
				stopDownloadProgressAnimation();
				//$("#processDataButton").text("Cerrar").addClass("btn-primary").removeClass("btn-danger");
				$('#processDataModal').modal('hide');
				showAlert("La descarga de datos se canceló o no se encontraron los datos.");
				
			});
	}
}

function dataLoaded(map) {

	console.info("Loading data finished.");
	
	clearDataLayers(map);

	stopDownloadProgressAnimation();

	// zoom to zonas
	var bbox = turf.bbox(bdp.zonaFc);
	map.fitBounds(L.latLngBounds(L.latLng(bbox[1], bbox[0]), L.latLng(bbox[3], bbox[2])));

	
	// Show zonas and municipios
	classifyMap(map);

	map._municipioLayer = L.geoJSON(bdp.municipioFc, {
		color: "#0F0",
		fillOpacity: 0,
		interactive: false
	}).addTo(map);

	
	var prepareDataOptions = {
		collectPgCb: function(perc) {
			return updateProgressBar("collectingPg", true, perc);
		},
		statsPgCb: function(perc) {
			return updateProgressBar("statsPg", true, perc);
		}
	};

	$(".processing-area").addClass("working");
	bdp.PrepareData(prepareDataOptions).then(function(isCanceled) {
		
		if(isCanceled === true) {
			console.log("Preparing data canceled.");
			clearDataLayers(map);
			$('#processDataModal').hide();
			showAlert("Procesamiento cancelado.");
		}
		else
		{
			console.log("Preparing data finished.");
			$("#processDataButton").text("Listo!").addClass("btn-primary").removeClass("btn-danger");
			showProcessingLog(bdp);
			bch.updateIfVisible(bdp);
			onDataReady(map);
		}
		stopDownloadProgressAnimation();
	})
	.catch(function(err){
		clearDataLayers(map);
		stopDownloadProgressAnimation();
		$("#processDataButton").text("Cerrar").addClass("btn-primary").removeClass("btn-danger");

		if(err.message)
			showAlert(err.message);
		else
			showAlert("Error inesperado.");
	});
}

function hideProcessingLog() {
	$("#processing-results").hide();

}

function showProcessingLog(bdp) {
	$("#warning-results-tab").text("Advertencias ("+bdp.errorReport.length+")");
	$("#processing-results").show();

	$("#brecha-tot-zona").text(bdp.zonaFc.features.length);
	$("#brecha-tot-come").text(bdp.vComercialFc.features.length);
	$("#brecha-tot-cata").text(bdp.vCatastralFc.features.length);


	if(this._wt) {
		this._wt.clear().destroy();
		this._wt = null;
	}

	if(bdp.errorReport && bdp.errorReport.length > 0) {
		this._wt = $('#point-warnings').DataTable( {
			data: bdp.errorReport,
			columns: [
				{ title: "Tipo", data: "ltype" },
				{ title: "Id", data: "id" },
				{ title: "Valor", data: "val"  },
				{ title: "Desc", data: "msg" }
			],
			paging: true,
			lengthChange: false,
			ordering: true,
			info: false,
			searching: false,
			serverSide: false,
			responsive: true
		});	
	}
}

function clearDataLayers(map) {
	if(map._zonaLayer)
		map.removeLayer(map._zonaLayer);
	if(map._municipioLayer)
		map.removeLayer(map._municipioLayer);

	map._zonaLayer = null;
	map._municipioLayer = null;
}

function showAlert(msg) {
	bootbox.alert(msg);
	
}

function stopDownloadProgressAnimation() {
	$("#processDataModal .progress-area .progress-bar").removeClass("progress-bar-animated");
	$(".progress-area").removeClass("working");
	$(".processing-area").removeClass("working");
}

function updateProgressBar(elementId, computable, perc) {
	// Check if modal is closed, if so, then we canceled
	if(!$('#processDataModal').hasClass('show'))
		return false;

	if(computable === true) {
		var percTxt = (perc*100).toFixed(0)+"%";
		$("#"+elementId)
			.css("width", percTxt)
			.text(percTxt);
		
		if(perc >= 1.0)
			$("#"+elementId).removeClass("progress-bar-animated");
	}
	else {
		$("#"+elementId)
			.css("width", "100%")
			.text("Cargando datos...");
	}

	return true;
}

