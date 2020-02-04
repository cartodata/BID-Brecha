L.Toolbar2.SimpleAction = L.Toolbar2.Action.extend({
	initialize: function(map) {
		this.map = map;
		L.Toolbar2.Action.prototype.initialize.call(this);
	},
	options: {
		toolbarIcon: {
		}
	},
	addHooks: function() {
		if(this.options.callback)
			this.options.callback(this.map);
	}
});

L.Toolbar2.NonActiveAction = L.Toolbar2.Action.extend({
	initialize: function(map) {
		this.map = map;
		L.Toolbar2.Action.prototype.initialize.call(this);
	},
	options: {
		toolbarIcon: {
		}
	},
	_createIcon: function(toolbar, container, args) {
		L.Toolbar2.Action.prototype._createIcon.call(this, toolbar, container, args);

		// removes click handler so it doesn't deactivate current active toolbar action
		L.DomEvent.off(this._link, 'click', this.enable, this);

		// Call our own callback
		L.DomEvent.on(this._link, 'click', this._callback, this);
	},
	_callback: function() {
		if(this.options.callback)
			this.options.callback(this.map);
	}
});

L.Toolbar2.ClickMapAction = L.Toolbar2.Action.extend({
	initialize: function(map) {
		this.map = map;
		L.Toolbar2.Action.prototype.initialize.call(this);
	},
	options: {
		toolbarIcon: {
		}
	},
	addHooks: function() {
		
		this.map.on('click', this._onClick, this);
		$(this.map._container).addClass("pointer-cursor-enabled");
	},
	removeHooks: function() {
		$(this.map._container).removeClass("pointer-cursor-enabled");
		this.map.off('click', this._onClick, this);
		if(this.options.onActionRemoved)
			this.options.onActionRemoved();
	},
	_onClick: function(e) {
		if(this.options.onClick)
			this.options.onClick(this.map, e);	
	}
});

