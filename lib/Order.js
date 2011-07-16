
var Order = function(options) {
	this._opts = {
		oid: null
	  , type: null 		// 'Buy' or 'Sell' (buying or selling BTC?)
	  , amount: null 	// amount of coins
	  , price: null		// price per coin in USD
	  , date: null
	  , exchange: null
	};
	
	if (typeof options.type == 'undefined'
		|| typeof options.amount == 'undefined'
		|| typeof options.price == 'undefined')
		throw 'Missing option in Order constructor';
	
	switch ( (new String(options.type)).toLowerCase() ) {
		case '1':
		case 'sell':
			this._opts.type = 'Sell';
			break;
			
		case '2':
		case 'buy':
			this._opts.type = 'Buy';
			break;
			
		default:
			throw 'Unknown order type: ' + options.type;
	}
	
	this._opts.type = options.type;
	this._opts.amount = parseFloat(options.amount);
	this._opts.price = parseFloat(options.price);
	
	if (typeof options.oid != 'undefined')
		this._opts.oid = options.oid;
	
	if (typeof options.date != 'undefined')
		this._opts.date = options.date;
	
	if (typeof options.exchange != 'undefined')
		this._opts.exchange = options.exchange;
};

/**
 * Executes the order on the previously set exchange, 
 * proxies to either Exchange.sellBtc or Exchange.buyBtc
 * 
 * @param callback Function(err, order)
 */
Order.prototype.execute = function(callback) {
	var self = this;
	
	if (this._opts.exchange === null) {
		throw 'Cannot execute order, exchange property not set';
	}
	
	if (this.isSell()) {
		this._opts.exchange.sellBtc(this, function(err) {
			if (err) {
				callback(err, self);
				return;
			}
			
			callback(null, self);
		});
	} else if (this.isBuy()) {
		//this._opts.exchange.buyBtc(this, callback);
		this._opts.exchange.buyBtc(this, function(err) {
			if (err) {
				callback(err, self);
				return;
			}
			
			callback(null, self);
		});
	} else {
		throw 'Cannot execute order, unknown order type';
	}	
};

Order.prototype.getAmount = function() {
	return this._opts.amount;
};

Order.prototype.getPrice = function() {
	return this._opts.price;
};

Order.prototype.getTotal = function() {
	return this._opts.amount * this._opts.price;
};

Order.prototype.isSell = function() {
	return this._opts.type === 'Sell';
};

Order.prototype.isBuy = function() {
	return this._opts.type === 'Buy';
};

Order.prototype.getExchange = function() {
	return this._opts.exchange;
};

module.exports = Order;
