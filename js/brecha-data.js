// Pollyfill

Number.isNaN = Number.isNaN || function(value) {     
    return value !== null && (value != value || +value != value);
}


var BrechaData = function() {
	this._errorOnGtEqValorM2 = 50000; // Greater than or equal to valor m2
	this._errorOnLtEqSuperficie = 0;	// Equal or less than superficie
	this._clearData();
};

BrechaData.prototype = {
	getZonaByLatLng: function(latLng) {
		
		var pt = turf.point([latLng.lng, latLng.lat]);
		// search for zona by latlng
		var zplen = this.zonaPoints.length;
		for(var i=0; i < zplen; i++) {
			var zonaFeature = this.zonaPoints[i].zonaFeature;
			
			// First check by bbox (faster elimination)
			var bboxPoly = turf.bboxPolygon(zonaFeature.bbox);
			if(turf.booleanPointInPolygon(pt, bboxPoly))
			{
				// check zona full polygon
				if(turf.booleanPointInPolygon(pt, zonaFeature))
					return this.zonaPoints[i];
			}
		}

		return null;
	},
	validateCatastroFc: function(fc) {
		if(fc.features.length <= 0)
			return false;

		var len = fc.features.length;
		for(var i=0; i < len; i++) {
			var ftype = fc.features[i].geometry.type.toLowerCase();
			if(ftype != "point")
				return false;
		}

		return true;
	},
	validateComercialFc: function(fc) {
		if(fc.features.length <= 0)
			return false;
		
		var len = fc.features.length;
		for(var i=0; i < len; i++) {
			var ftype = fc.features[i].geometry.type.toLowerCase();
			if(ftype != "point")
				return false;
		}

		return true;
	},
	validateZonaFc: function(fc) {
		if(fc.features.length <= 1)
			return false;
		
		var len = fc.features.length;
		for(var i=0; i < len; i++) {
			var ftype = fc.features[i].geometry.type.toLowerCase();
			if(ftype != "multipolygon" && ftype != "polygon")
				return false;
		}

		return true;
	},
	validateMunicipioFc: function(fc) {
		//if(fc.features.length <= 0)
		//	return false;
		
		// can contain any type, but restricted to 1,000 features
		if(fc.features.length > 1000)
			return false;

		return true;
	},

	/* Load geojson feature collections directly */
	loadData: function(municipioFc, zonaFc, vCatastralFc, vComercialFc, options) {
		console.log("Loading data locally");
		var self = this;
		this._clearData();
		if(!options)
			options = {};

		self.municipioFc = municipioFc;
		self.zonaFc = zonaFc;

		self.vCatastralFc = vCatastralFc;
		self.vCatastralFc.features = self.vCatastralFc.features.filter(self._filterPointFc(options.filterCatastroFeatures, "Catastro"));

		self.vComercialFc = vComercialFc;
		self.vComercialFc.features = self.vComercialFc.features.filter(self._filterPointFc(options.filterComercialFeatures, "Comercial"));
	},

	/*	Load geojson feature collections from a folder.
		Files must have specific filenames.
		municipio.geojson, valor_catastral.geojson, valor_comercial.geojson, zona.geojson
	*/
	loadFromDataFolder: function(baseUrl, options) {
		if(this.dataPromiseBusy === true) {
			console.log("Busy: Downloading data.");
			return;
		}
		console.log("Loading data");
		
		var self = this;
		this._clearData();

		var munUrl = baseUrl+"/municipio.geojson";
		var vCataUrl = baseUrl+"/valor_catastral.geojson";
		var vComUrl = baseUrl+"/valor_comercial.geojson";
		var zonaUrl = baseUrl+"/zona.geojson";

		this.dataPromiseBusy = true;
		if(!options)
			options = {};
		
			/* do NOT change order of promises or change order in Promise.all response! */
		var promises = [];
		promises.push(this._getAjaxData(munUrl, options.municipoPgCb));
		promises.push(this._getAjaxData(vCataUrl, options.catastroPgCb));
		promises.push(this._getAjaxData(vComUrl, options.comercialPgCb));
		promises.push(this._getAjaxData(zonaUrl, options.zonaPgCb));

		return Promise.all(promises)
			.then(function(responses){
				self.municipioFc = responses[0];
				self.zonaFc = responses[3];

				self.vCatastralFc = responses[1];
				self.vCatastralFc.features = self.vCatastralFc.features.filter(self._filterPointFc(options.filterCatastroFeatures, "Catastro"));

				self.vComercialFc = responses[2];
				self.vComercialFc.features = self.vComercialFc.features.filter(self._filterPointFc(options.filterComercialFeatures, "Comercial"));
				

				self.dataPromiseBusy = false;
				return responses;
			})
			.catch(function(err){
				self.dataPromiseBusy = false;
				return err;
			});
	},
	_filterPointFc: function(filterCallback, type) {
		var self = this;
		return function(feature) {
			if(filterCallback) {
				if(filterCallback(feature) !== true)
					return false;
			}
			
			if(feature.properties.valor === "undefined") {
				self._addError(type, feature.properties.id, feature.properties.valor, "Ignorado: valor indefinido");
				return false;
			}
			
			if(feature.properties.superficie === "undefined") {
				self._addError(type, feature.properties.id, feature.properties.valor, "Ignorado: valor indefinido");
				return false;
			}
			
			if(Number.isNaN(feature.properties.valor)) {
				self._addError(type, feature.properties.id, feature.properties.valor, "Ignorado: valor inválido");
				return false;
			}
			if(Number.isNaN(feature.properties.superficie)) {
				self._addError(type, feature.properties.id, feature.properties.valor, "Ignorado: supe. inválida");
				return false;
			}

			if(feature.properties.superficie <= self._errorOnLtEqSuperficie)
			{
				self._addError(type, feature.properties.id, feature.properties.superficie, "Ignorado: supe. mínima");
				return false;
			}

			var m2 = feature.properties.valor / feature.properties.superficie;
			if(m2 >= self._errorOnGtEqValorM2) {
				self._addError(type, feature.properties.id, self._round(m2), "Ignorado: valor m² máximo");
				return false;
			}

			return true;
		}
	},
	_round: function(val) {
		if(val == null || val === 'undefined')
			return null;
		return (Math.round(val * 100) / 100);
	},
	_addError: function(errorType, id, val, msg) {
		this.errorReport.push({
			ltype: errorType,
			id: id,
			val: val,
			msg: msg
		});
	},

	/* Prepares data for further analysis */
	PrepareData: function(options) {
		var self = this;
		options = $.extend({}, options);

		console.log("Preparing data");


		// Collect into each polygon all points within
		return new Promise(function(resolve, reject) { 

			if(self.municipioFc == null || self.vCatastralFc == null || self.vComercialFc == null || self.zonaFc == null)
				throw new Error("No existen datos para municipios o valores catastrales o valores comerciales o zonas.");
			// Create point indexes
			var vCatastralPtIdx, vComercialPtIdx;
			try
			{
				console.log("Indexing geometries");
				vCatastralPtIdx = new KDBush(turf.coordAll(self.vCatastralFc));	// Create vCatastralFc index
				vComercialPtIdx = new KDBush(turf.coordAll(self.vComercialFc));	// Create vComercialFc index
			}
			catch(err)
			{
				self._clearData();
				reject(err);
				return;
			}

			self._collectPromise(self, options, vCatastralPtIdx, vComercialPtIdx)
				.then(function(isCanceled) {
					if(isCanceled) {
						self._clearData();
						resolve(isCanceled);
					}
					else
					{
						self._calcStatsPromise(self, options)
							.then(function(isCanceled) {
								if(isCanceled)
									self._clearData();
								resolve(isCanceled);
							})
							.catch(function(err) {
								self._clearData();
								reject(err);
							});	
					}
				})
				.catch(function(err){
					self._clearData();
					reject(err);
				});
		});
	},
	_calcStatsPromise: function(self, options) {
		return new Promise(function(resolve, reject) { 
			var chunkIdx = 0;
			var chunkSize = 100;

			function loop() {
				setTimeout(function() {
					var perc;
					try
					{
						perc = self._calcAllZoneStats(chunkIdx, chunkSize);
					}
					catch(err)
					{
						reject(err);
						return;
					}
					if(options.statsPgCb)
					{
						if(options.statsPgCb(perc) === false)	// was it canceled?
						{
							resolve(true);
							return;
						}
					}
					if(perc >= 1.0)
						resolve(false);
					else
					{
						chunkIdx++;
						loop();
					}
				}, 0);
			}

			console.log("Calculating stats");
			loop();
		});
	},
	_collectPromise: function(self, options, vCatastralPtIdx, vComercialPtIdx) {
		return new Promise(function(resolve, reject) { 
			var chunkIdx = 0;
			var chunkSize = 10;

			function loop() {
				setTimeout(function() {
					var perc;
					try
					{
						perc = self._collectWithin(chunkIdx, chunkSize, vCatastralPtIdx, vComercialPtIdx);
					}
					catch(err)
					{
						reject(err);
						return;
					}
					if(options.collectPgCb)
					{
						if(options.collectPgCb(perc) === false)	// was it canceled?
						{
							resolve(true);
							return;
						}
					}
					if(perc >= 1.0)
						resolve(false);
					else
					{
						chunkIdx++;
						loop();
					}
				}, 0);
			}

			console.log("Grouping data into zones");
			loop();
		});
	},
	_calcAllZoneStats: function(chunkIdx, chunkSize) {
		
		var zi=chunkIdx*chunkSize;
		var chunkLen = zi+chunkSize;
		var zonaPointsLen = this.zonaPoints.length;

		// Calc stats for all zona points
		for(; zi < zonaPointsLen && zi < chunkLen; zi++) {
			this._calcStatsForZona(this.zonaPoints[zi]);
		}
		return zi/zonaPointsLen;
	},
	_calcStatsForZona: function(zonap) {
		
		// create valor m2 property for each point in comercial and catastral
		$.each(zonap.catastroFc.features, function(index, value) {
			if(value.properties.valor === "undefined" || value.properties.superficie === "undefined")
				throw new Error("Puntos de valor catastral no tiene la propiedad 'valor' o 'superficie'.")
			value.properties.valor_m2 = value.properties.valor / value.properties.superficie;
		});

		$.each(zonap.comercialFc.features, function(index, value) {
			if(value.properties.valor === "undefined" || value.properties.superficie === "undefined")
				throw new Error("Puntos de valor comercial no tiene la propiedad 'valor' o 'superficie'.")
			value.properties.valor_m2 = value.properties.valor / value.properties.superficie;
		});

		var valorCataM2 = $.map(zonap.catastroFc.features, function(value) {
			return value.properties.valor_m2;
		});

		var valorComerM2 = $.map(zonap.comercialFc.features, function(value){
			return value.properties.valor_m2;
		});

		var stats = {
			dif_prom: null, 
			cat_prom: null, 
			com_prom: null, 

			dif_median: null, 
			cat_median: null, 
			com_median: null, 

			dif_desv: null,
			cat_desv: null,
			com_desv: null,

			dif_var: null,
			cat_var: null,
			com_var: null,

			dif_min: null,
			cat_min: null,
			com_min: null,

			dif_max: null,
			cat_max: null,
			com_max: null,

			cat_totpnt: 0,
			com_totpnt: 0,
			total_pnts: 0
		};

		if(valorComerM2.length > 0) {
			stats.com_prom = this._round(math.mean(valorComerM2));
			stats.com_median = this._round(math.median(valorComerM2));
			stats.com_desv = this._round(math.std(valorComerM2));
			stats.com_var = this._round(math.variance(valorComerM2));
			stats.com_min = this._round(math.min(valorComerM2));
			stats.com_max = this._round(math.max(valorComerM2));
			stats.com_totpnt = valorComerM2.length;
		}

		if(valorCataM2.length > 0) {
			stats.cat_prom = this._round(math.mean(valorCataM2));
			stats.cat_median = this._round(math.median(valorCataM2));
			stats.cat_desv = this._round(math.std(valorCataM2));
			stats.cat_var = this._round(math.variance(valorCataM2));
			stats.cat_min = this._round(math.min(valorCataM2));
			stats.cat_max = this._round(math.max(valorCataM2));
			stats.cat_totpnt = valorCataM2.length;
		}

		// Debe haber al menos un punto comercial y catastral para poder comparar diferencias
		if(valorCataM2.length > 0 && valorComerM2.length > 0) {
			stats.dif_prom = stats.com_prom - stats.cat_prom;
			stats.dif_median = stats.com_median - stats.cat_median;
			
			stats.dif_desv = this._round(math.std($.merge($.merge([], valorComerM2), valorCataM2))); // standard deviation of ALL points
			//stats.dif_desv = stats.com_desv - stats.cat_desv;
			//stats.dif_desv = math.sqrt(math.pow(stats.com_desv, 2) + math.pow(stats.cat_desv, 2)); // StdDev cannot be subtracted. Use gausian error progagation: sqrt( [SD1]² + [SD2]² )

			stats.dif_var = stats.com_var - stats.cat_var;
			stats.dif_min = stats.com_min - stats.cat_min;
			stats.dif_max = stats.com_max - stats.cat_max;
		}
		
		stats.total_pnts = stats.com_totpnt + stats.cat_totpnt;

		$.extend(zonap.zonaFeature.properties, stats);
	},
	getZonaByInternalId: function(id) {
		if(id === "undefined")
			return null;
		
		// First check if id == array index (our private _internal_id is a direct index)
		if(id >= 0 && id < this.zonaPoints.length && this.zonaPoints[id]._internal_id == id)
			return this.zonaPoints[id];

		// If not do a full search
		console.warn("Doing full search for zona points by _internal_id: "+id);
		for(var i=0; i < this.zonaPoints.length; i++) {
			if(this.zonaPoints[i]._internal_id == id)
				return this.zonaPoints[i];
		}

		return null;
	},
	_collectWithin: function(chunkIdx, chunkSize, vCatastralPtIdx, vComercialPtIdx) {
		
		//console.info("CHUNK INDEX: "+chunkIdx+" CHUNK SIZE:" + chunkSize);
		var zi=chunkIdx*chunkSize;
		var chunkLen = zi+chunkSize;
		
		var zonaLen = this.zonaFc.features.length;
		for(; zi < zonaLen && zi < chunkLen; zi++) {
			var zonaFeature = this.zonaFc.features[zi];
			var catastro = this._pointsWithinZona(this.vCatastralFc, vCatastralPtIdx, zonaFeature);
			var comercial = this._pointsWithinZona(this.vComercialFc, vComercialPtIdx, zonaFeature);

						
			this.zonaPoints.push({
				_internal_id: zi,	// use zona feature index as _internal_id used for searching by _internal_id
				zonaFeature: zonaFeature,
				catastroFc: catastro,
				comercialFc: comercial
			});
		}

		return zi/zonaLen;
	},
	_pointsWithinZona(points, pointIndex, zonaFeature) {
		if(!pointIndex)
			throw new Error("pointIndex not initialized.");
		if(!zonaFeature.bbox)
			zonaFeature.bbox = turf.bbox(zonaFeature.geometry);	// calculate zona bounding box
		var foundFeaturePointIdxs = pointIndex.range(zonaFeature.bbox[0], zonaFeature.bbox[1], zonaFeature.bbox[2], zonaFeature.bbox[3]);	// get points in bounding box
		// get features from idexes
		var fs = foundFeaturePointIdxs.map(function(id){
			return points.features[id];
		});
		var fc = turf.featureCollection(fs);	// convert found point features to a feature collection
		return turf.pointsWithinPolygon(fc, zonaFeature);	// find points within polygon
	},
	_getAjaxData: function(url, progressCallback) {
		var ajaxOptions = {
			url: url,
			method: "GET",
			dataType: "json",
			cache: true
		};
		if(progressCallback)
		{
			ajaxOptions.xhr = function() {
				var xhr = $.ajaxSettings.xhr();
				xhr.onprogress = function (e) {
					if (e.lengthComputable)
					{
						if(progressCallback(true, e.loaded / e.total) === false)
							xhr.abort();
					}
					else
					{
						if(progressCallback(false) === false)
							xhr.abort();
					}
				};
				return xhr;
			}
		}
		
		return $.ajax(ajaxOptions)
			.fail(function(xhr, statusText, errorThrown){
				console.error("Request: "+url+" "+errorThrown );
		});
	},
	_clearData: function() {
		this.errorReport = [];
		this.municipioFc = null;
		this.vCatastralFc = null;
		this.vComercialFc = null;
		this.zonaFc = null;
		this.zonaPoints = [];
	}
};



