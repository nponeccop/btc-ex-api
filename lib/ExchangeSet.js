var Order = require('./Order')
	, Util = require('./Util');

var ExchangeSet = function() {
	this._exchanges = [];
};

/**
 * Add an exchange to the set
 * 
 * @param {Exchange} exchange
 * @returns {Exchange}
 */
ExchangeSet.prototype.add = function(exchange) {
	this._exchanges.push(exchange);
	return exchange;
};

/**
 * Returns the exchanges array
 * 
 * @returns {Array}
 */
ExchangeSet.prototype.getExchanges = function() {
	return this._exchanges;
};

/**
 * Gets the balances for all the exchanges in set, which can then be retrieved
 * with subsequent calls to an exchange object
 * 
 * @param {Function} callback Function(err, exchange)
 * @param {Function} done Called when all balances have completed Function(err)
 * @returns {ExchangeSet}
 */
ExchangeSet.prototype.getBalances = function(callback, done) {
	var completed = 0
	  , anyErr = null
	  , self = this;
	for (var i in this._exchanges) {
		this._exchanges[i].getBalance(function(err, exchange) {
			if (err && !anyErr)
				anyErr = err;
			
			callback(err, exchange);
			
			if (++completed == self._exchanges.length)
				done(anyErr);
		});
	}
	
	return this;
};

ExchangeSet.prototype.getDepths = function(callback, done) {
	var completed = 0
	  , anyErr = null
	  , self = this;
	for (var i in this._exchanges) {
		this._exchanges[i].getDepth(function(err, exchange) {
			if (err && !anyErr)
				anyErr = err;
			
			callback(err, exchange);
			
			if (++completed == self._exchanges.length)
				done(anyErr);
		});
	}
	
	return this;
};

module.exports = ExchangeSet;
