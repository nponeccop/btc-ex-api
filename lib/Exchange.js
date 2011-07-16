var https = require('https')
  , querify = require('querystring').stringify
  , Order = require('./Order')
  , Util = require('./Util');

var Exchange = function(options) {
	if (typeof options != 'undefined')
		this._loadDefaults(options.symbol);
	
	// merge default and user options
	if (typeof options == 'object')
		for (var key in options)
			this._opts[key] = options[key];
	
	this._balance = {
		usds: null
	  , btcs: null
	};
	this._openOrders = [];
	this._depth = {
		bids: []
	  , asks: []
	};
	
	if (typeof options == 'object' && options.symbol == 'thUSD') {
		this._getBalanceBtcsProperty = 'BTC_Available';
		this._getBalanceUsdsProperty = 'USD_Available';
	} else {
		this._getBalanceBtcsProperty = 'btcs';
		this._getBalanceUsdsProperty = 'usds';
	}
};

Exchange.prototype._loadDefaults = function(symbol) {
	switch (symbol) {
	
		case 'exchbUSD':
			this._opts = {
				symbol: 'exchbUSD'
			  , tradeFee: 0.0029
			  , depthOpts: {
				  host: 'www.exchangebitcoins.com'
				, port: 443
				, path: '/data/depth'
				, method: 'GET'
				, headers: {
					'User-Agent': 'btc-ex-api'
				}
			  }
			  , sellOpts: {
				  host: 'www.exchangebitcoins.com'
				, port: 443
				, path: '/data/sellBTC'
				, method: 'POST'
				, headers: {
					'User-Agent': 'btc-ex-api'
				  , 'Content-Type': 'application/x-www-form-urlencoded'
				}
			  }
			  , buyOpts: {
				  host: 'www.exchangebitcoins.com'
				, port: 443
				, path: '/data/buyBTC'
				, method: 'POST'
				, headers: {
					'User-Agent': 'btc-ex-api'
				  , 'Content-Type': 'application/x-www-form-urlencoded'
				}
			  }
			  , balanceOpts: {
				  host: 'www.exchangebitcoins.com'
				, port: 443
				, path: '/data/getFunds'
				, method: 'POST'
				, headers: {
					'User-Agent': 'btc-ex-api'
				  , 'Content-Type': 'application/x-www-form-urlencoded'
				}
			  }
			};
			break;
			
		case 'mtgoxUSD':
			this._opts = {
				symbol: 'mtgoxUSD'
			  , tradeFee: 0.0030
			  , depthOpts: {
				  host: 'mtgox.com'
				, port: 443
				, path: '/code/data/getDepth.php'
				, method: 'GET'
				, headers: {
					'User-Agent': 'btc-ex-api'
				}
			  }
			  , sellOpts: {
				  host: 'mtgox.com'
				, port: 443
				, path: '/code/sellBTC.php'
				, method: 'POST'
				, headers: {
					'User-Agent': 'btc-ex-api'
				  , 'Content-Type': 'application/x-www-form-urlencoded'
				}
			  }
			  , buyOpts: {
				  host: 'mtgox.com'
				, port: 443
				, path: '/code/buyBTC.php'
				, method: 'POST'
				, headers: {
					'User-Agent': 'btc-ex-api'
				  , 'Content-Type': 'application/x-www-form-urlencoded'
				}
			  }
			  , balanceOpts: {
				  host: 'mtgox.com'
				, port: 443
				, path: '/code/getFunds.php'
				, method: 'POST'
				, headers: {
					'User-Agent': 'btc-ex-api'
				  , 'Content-Type': 'application/x-www-form-urlencoded'
				}
			  }
			};
			break;
			
		case 'thUSD':
			this._opts = {
				symbol: 'thUSD'
				, tradeFee: 0.0060
				, depthOpts: {
					host: 'api.tradehill.com'
					, port: 443
					, path: '/APIv1/USD/Orderbook'
					, method: 'GET'
					, headers: {
						'User-Agent': 'btc-ex-api'
					}
				}
				, sellOpts: {
					host: 'api.tradehill.com'
					, port: 443
					, path: '/APIv1/USD/SellBTC'
					, method: 'POST'
					, headers: {
						'User-Agent': 'btc-ex-api'
					  , 'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
				, buyOpts: {
					host: 'api.tradehill.com'
					, port: 443
					, path: '/APIv1/USD/BuyBTC'
					, method: 'POST'
					, headers: {
						'User-Agent': 'btc-ex-api'
					  , 'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
				, balanceOpts: {
					host: 'api.tradehill.com'
					, port: 443
					, path: '/APIv1/USD/GetBalance'
					, method: 'POST'
					, headers: {
						'User-Agent': 'btc-ex-api'
					  , 'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
			};
			break;
	}
};

/**
 * Gets the current balance (USD and BTC) of the exchange
 * 
 * @param {Function} callback Function(err, exchange)
 */
Exchange.prototype.getBalance = function(callback) {
	var self = this
	  , buffer = ''
	  , opts = this._opts.balanceOpts;
	
	opts.headers['Content-Length'] = querify(this._opts.auth).length;
	var req = https.request(opts, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(d) {
			buffer += d; 
		});
		res.on('end', function() {
			try {
				var balance = JSON.parse(buffer);
				self._balance.usds = parseFloat(balance[self._getBalanceUsdsProperty]);
				self._balance.btcs = parseFloat(balance[self._getBalanceBtcsProperty]);
			} catch (e) {
				callback(e, self);
			}
			callback(null, self);
		});
	});
	req.on('error', function(d) {
		callback(d);
	});
	req.write(querify(this._opts.auth));
	req.end();
};

Exchange.prototype.getBalanceBtcs = function() {
	return this._balance.btcs;
};

Exchange.prototype.getBalanceUsds = function() {
	return this._balance.usds;
};

/**
 * Get the ticker symbol for the exchange
 * 
 * @returns {String}
 */
Exchange.prototype.getSymbol = function() {
	return this._opts.symbol;
};

/**
 * Gets the current depth (bids, asks) of the exchange
 * 
 * @param {Function} callback Function(err, exchange)
 */
Exchange.prototype.getDepth = function(callback) {
	var buffer = ''
	  , self = this
	  , req;
	
	// timeout request after 3 seconds
	var t = setTimeout(function() {
		if (req.connection !== null) {
			req.abort();
			callback('getDepth request timeout', self);
		}
	}, 3000);
	
	
	req = https.request(this._opts.depthOpts, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(d) {
			buffer += d;
		});
		res.on('end', function() {
			clearTimeout(t);
			try {
				var depth = JSON.parse(buffer);
				
				// sort bids from highest to lowest
				var bids = depth.bids.sort(function(a, b) {
					return b[0] - a[0];
				});
				
				// sort asks from lowest to highest
				var asks = depth.asks.sort(function(a, b) {
					return a[0] - b[0];
				});
				
				self._depth = {
					bids: bids
				  , asks: asks
				};
				
			} catch (e) {
				callback(e, self);
				return;
			}
			callback(null, self);
		});
	});
	req.on('error', function(d) {
		clearTimeout(t);
		callback(d, self);
	});
	req.end();
};

Exchange.prototype.getBids = function() {
	return this._depth.bids;
};

Exchange.prototype.getAsks = function() {
	return this._depth.asks;
};

Exchange.prototype.getTradeFee = function() {
	return this._opts.tradeFee;
};

/**
 * Place an order to sell BTC on the exchange
 * 
 * @param {Order} order
 * @param {Function} callback Function(err)
 */
Exchange.prototype.sellBtc = function(order, callback) {
	var self = this
	  , buffer = ''
	  , postData = this._opts.auth
	  , opts = this._opts.sellOpts;
	
	if (!order.isSell())
		throw 'Order must be a sell order in sellBtc';
	
	if (this._balance.usds === null || this._balance.btcs === null)
		throw 'Cannot sell btc, unknown account balances';
	
	postData.amount = order.getAmount();
	postData.price = order.getPrice();
	
	opts.headers['Content-Length'] = querify(postData).length;
	
	var req = https.request(opts, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(d) {
			buffer += d;
		});
		res.on('end', function() {
			try {
				var resObj = JSON.parse(buffer);
				//, openOrders = [];
			
				// parse response object orders into Order objects
				/*
				for (var i in resObj.orders) {
					openOrders.push(new Order(resObj.orders[i]));
				}
				self._openOrders = openOrders;
				 */
			
				// assume the order will be executed and update balance
				self._balance.usds += order.getTotal();
				self._balance.btcs -= order.getAmount();
			
				callback(null);
			} catch (e) {
				callback(e);
			}
		});
	});
	req.on('error', function(d) {
		callback(d);
	});
	req.write(querify(postData));
	req.end();
};

/**
 * Place an order to buy BTC on the exchange
 * 
 * @param {Order} order
 * @param {Function} callback Function(err)
 */
Exchange.prototype.buyBtc = function(order, callback) {
	var self = this
	  , buffer = ''
	  , postData = this._opts.auth
	  , opts = this._opts.buyOpts;
	
	if (!order.isBuy())
		throw 'Order must be a buy order in buyBtc';
	
	if (this._balance.usds === null || this._balance.btcs === null)
		throw 'Cannot buy btc, unknown account balances';
	
	postData.amount = order.getAmount();
	postData.price = order.getPrice();
	
	opts.headers['Content-Length'] = querify(postData).length;
	var req = https.request(opts, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(d) {
			buffer += d;
		});
		res.on('end', function() {
			try {
				var resObj = JSON.parse(buffer);
				//, openOrders = [];
			
				// parse response object orders into Order objects
				/*
				for (var i in resObj.orders) {
					openOrders.push(new Order(resObj.orders[i]));
				}
				self._openOrders = openOrders;
				 */
			
				// assume the order will be executed and update balance
				self._balance.usds -= order.getTotal();
				self._balance.btcs += order.getAmount();
			
				callback(null);
			} catch (e) {
				callback(e);
			}
		});
	});
	req.on('error', function(d) {
		callback(d);
	});
	req.write(querify(postData));
	req.end();
};

/**
 * Calculate the cost in USD to buy the given amount of BTC.
 * 
 * This function will take into account the trading fee and adjust the amount
 * of coins to buy so that the number of coins gained after the trading fee is
 * equal to the btc param.
 * 
 * @param {Number} btc
 * @returns {Object} properties: price, priceTotal, amount
 */
Exchange.prototype.buyBtcCost = function(btc) {
	var amountTotal = 0
	  , priceTotal = 0
	  , btcAdjusted = Util.round(btc * (1 + this.getTradeFee()))
	  , ask
	  , amountToAdd;
	
	for (var i in this._depth.asks) {
		ask = this._depth.asks[i];
		
		if (ask[1] + amountTotal > btcAdjusted) {
			amountToAdd = btcAdjusted - amountTotal;
			amountTotal += amountToAdd;
			priceTotal += amountToAdd * ask[0];
			break;
		}
		
		amountTotal += ask[1];
		priceTotal += ask[1] * ask[0];
	}
	
	priceTotal = Util.round(priceTotal);
	
	return {
		price: ask[0]			// price per coin to place
	  , costTotal: priceTotal 	// total cost for all coins 
	  , amount: amountTotal		// amount of coins gained (should be equal to btc)
	  , exchange: this
	  , validBalance: (this.getBalanceUsds() - priceTotal >= 0)
	};
};

/**
 * Calculate the amount gained in USD by selling the given amount of BTC.
 * 
 * This function will take into account the trading fee and adjust the 
 * amount of USD gained that is returned based on that
 *  
 * @param {Number} btc
 * @returns {Object}
 */
Exchange.prototype.sellBtcGain = function(btc) {
	var amountTotal = 0
	  , priceTotal = 0
	  , priceTotalAdjusted
	  , bid
	  , amountToAdd;
	
	for (var i in this._depth.bids) {
		bid = this._depth.bids[i];
		
		if (bid[1] + amountTotal > btc) {
			amountToAdd = btc - amountTotal;
			amountTotal += amountToAdd;
			priceTotal += amountToAdd * bid[0];
			break;
		}
		
		amountTotal += bid[1];
		priceTotal += bid[1] * bid[0];
	}
	
	priceTotalAdjusted = Util.round(priceTotal - (priceTotal * this.getTradeFee()));
	
	return {
		price: bid[0]					// price per coin to place
	  , gainTotal: priceTotalAdjusted	// total price (gain) for all coins
	  , amount: amountTotal				// amount of coins to sell
	  , exchange: this
	  , validBalance: (this.getBalanceBtcs() - amountTotal >= 0)
	};
};

module.exports = Exchange;
