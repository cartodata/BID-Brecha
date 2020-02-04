
(function (window) {
	// This function will contain all our code
	function fileloaderLib(containerId, options) {
		var _fl = {
			containerId: containerId,
			title: 'Cargar archivo local (GPX, KML, GeoJSON, SHP (Zip file))',
			LABEL: '&#8965;',
			options: {
				fileSizeLimit: 500000000
			}
		};
		
		$.extend(_fl.options, options);

		_fl._initContainer = function () {
			
            var thisFileLayerLoad = this;

            // Create a button, and bind click on hidden file input
            var container = L.DomUtil.create('div', 'fileloader-container');
			var link = L.DomUtil.create('a', 'fileloader-a', container);
			if(_fl.options.html) {
				link.innerHTML = _fl.options.html;
			}
            
            link.href = '#';
			link.title = _fl.title;
			
            // Create an invisible file input
            var fileInput = L.DomUtil.create('input', 'hidden', container);
            fileInput.type = 'file';
            fileInput.multiple = 'multiple';
            if (!this.options.formats) {
                fileInput.accept = '.gpx,.kml,.geojson,.zip';
            } else {
                fileInput.accept = this.options.formats.join(',');
            }
            fileInput.style.display = 'none';
            // Load on file change
            fileInput.addEventListener('change', function () {
				if(_fl.options.onLoading)
					_fl.options.onLoading();

                thisFileLayerLoad._loadFiles(this.files);
                // reset so that the user can upload the same file again if they want to
                this.value = '';
            }, false);

            L.DomEvent.disableClickPropagation(link);
            L.DomEvent.on(link, 'click', function (e) {
                fileInput.click();
                e.preventDefault();
            });
            return container;
        },

        _fl._loadFiles = function (files) {
            files = Array.prototype.slice.apply(files);

            var i = files.length;
            setTimeout(function () {
                _fl.load(files.shift());
                //
                if (files.length > 0) {
                    setTimeout(arguments.callee, 25);
                }
            }, 25);
		},

		_fl.onLoadError = function() {
			if(_fl.options.onLoadError)
				_fl.options.onLoadError();
		},
		
		_fl.load = function (file /* File */ ) {
			var self = this;
			
			// Check file size
			var fileSize = (file.size / 1024).toFixed(4);
			if (fileSize > this.options.fileSizeLimit) {
				alert('Tamaño de archivo excede el limite (' + fileSize + ' > ' + this.options.fileSizeLimit + 'kb)');
				_fl.onLoadError();
				return;
			}
	
			// Check file extension
			var ext = file.name.split('.').pop(),
				parser = this._parsers[ext];
			if (!parser) {
				alert('Unsupported file type ' + file.type + '(' + ext + ')');
				_fl.onLoadError();
				return;
			}
			// Read selected file using HTML5 File API
			var reader = new FileReader();
			reader.onload = function (e) {
				try {
					parser.call(self, e.target.result, ext);
					
				} catch (err) {
					alert("Error" + err);
					_fl.onLoadError();
				}
	
			};
	
			if (ext != 'zip')
				reader.readAsText(file);
			else
				reader.readAsArrayBuffer(file);
			return reader;
		},
	
		_fl._loadGeoJSON = function (content) {
			if (typeof content === 'string') {
				content = JSON.parse(content);
			}

			if(_fl.options.onGeoJsonReady)
				_fl.options.onGeoJsonReady(content);
			else
				alert("onGeoJsonReady not set.");
		},
	
		_fl._convertToGeoJSON = function (content, format) {
			// Format is either 'gpx' or 'kml'
			if (typeof content === 'string') {
				content = (new window.DOMParser()).parseFromString(content, 'text/xml');
			}
			var geojson = window.toGeoJSON[format](content);
			return this._loadGeoJSON(geojson);
		},
	
		_fl._convertfromSHP = function (content, format) {
			var that = this;
			shp(content).then(function (geojson) {
				return that._loadGeoJSON(geojson)
			});
		}

		_fl._parsers = {
			geojson: _fl._loadGeoJSON,
			json: _fl._loadGeoJSON,
			gpx: _fl._convertToGeoJSON,
			kml: _fl._convertToGeoJSON,
			zip: _fl._convertfromSHP
		},

		$("#"+_fl.containerId).html(_fl._initContainer());
		
		return _fl;
	}
	
	// We need that our library is globally accesible, then we save in the window
	if (typeof (window.FileLoader) === 'undefined') {
        window.FileLoader = fileloaderLib;
    }
})(window);

