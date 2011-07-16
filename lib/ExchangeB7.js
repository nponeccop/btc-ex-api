var https = require('https')
  , querify = require('querystring').stringify
  , jsdom = require('jsdom')
  , Exchange = require('./Exchange');
  
ExchangeB7.prototype = new Exchange;
function ExchangeB7(options) {
	Exchange.call(this, options);
	this._cookie = null; 		// cookie auth value
	this._cookieTime = null;	// Date.now() timestamp of when cookie was retrieved
	this._cookieExpires = 180000; // milliseconds after _cookieTime to retrieve new cookie; 180,000 = 3 mins 
	
	// csrf protection fields to buy and sell orders
	this._tradeFieldName = "public_key";
	this._tradeFieldValue = null;
}

ExchangeB7.prototype._loadDefaults = function(symbol) {
	this.constructor.prototype._loadDefaults.call(this, symbol);
	
	if (symbol !== 'b7USD') {
		throw 'Invalid symbol for ExchangeB7';
	}
	
	this._opts = {
		symbol: 'b7USD'
	  , tradeFee: 0.0057
	  , depthOpts: {
		  host: 'bitcoin7.com'
		, port: 443
		, path: '/api/public/getDepth.php?currency=usd'
		, method: 'GET'
		, headers: {
			'User-Agent': 'btc-ex-api'
		}
	  }
	};
	
	this._opts.cookieOpts = {
		host: 'bitcoin7.com'
	  , port: 443
	  , path: '/index.php'
	  , method: 'POST'
	  , headers: {
		  'User-Agent': 'btc-ex-api'
		, 'Content-Type': 'application/x-www-form-urlencoded'
	  }
	};
	
	this._opts.balanceOpts = {
		host: 'bitcoin7.com'
	  , port: 443
	  , path: '/index.php?show=trade'
	  , method: 'GET'
	  , headers: {
		  'User-Agent': 'btc-ex-api'
	  }
	};
	
	this._opts.sellOpts = {
		host: 'bitcoin7.com'
	  , port: 443
	  , path: '/index.php?show=trade'
	  , method: 'POST'
	  , headers: {
		  'User-Agent': 'btc-ex-api'
		, 'Content-Type': 'application/x-www-form-urlencoded'
	  }
	};
	
	this._opts.buyOpts = {
		host: 'bitcoin7.com'
	  , port: 443
	  , path: '/index.php?show=trade'
	  , method: 'POST'
	  , headers: {
		  'User-Agent': 'btc-ex-api'
		, 'Content-Type': 'application/x-www-form-urlencoded'
	  }
	};
};

/**
 * Attempts to login to the bitcoin7 site 
 * and retrieve the authentication cookie
 * 
 * @param {Function} callback Function(err)
 */
ExchangeB7.prototype._getCookie = function(callback) {
	var opts = this._opts.cookieOpts;
	opts.headers['Content-Length'] = querify(this._opts.auth).length;
	
	var self = this
	  , buffer = ''
	  , req = https.request(opts, function(res) {
		 res.setEncoding('utf8');
		 res.on('data', function(d) {
			buffer += d; 
		 });
		 res.on('end', function() {
			 var regex = /^PHPSESSID=(.*);/i;
			 for (var i in res.headers['set-cookie']) {
				 var matches = regex.exec(res.headers['set-cookie'][i]);
				 if (matches !== null) {
					 self._cookie = matches[1];
					 self._cookieTime = Date.now();
					 callback(null);
					 return;
				 }
			 }
			 
			 callback('Could not get cookie');
		 });
	  });
	req.on('error', function(d) {
		callback(d);
	});
	req.write(querify(this._opts.auth));
	req.end();
};

/**
 * Checks if cookie has expired/hasn't been set yet
 * 
 * @returns {Boolean}
 */
ExchangeB7.prototype._isCookieExpired = function() {
	return (this._cookie === null 
		|| Date.now() - this._cookieTime > this._cookieExpires);
};

ExchangeB7.prototype.getBalance = function(callback) {
	var self = this;
	if (this._isCookieExpired()) {
		this._getCookie(function(err) {
			if (err) {
				callback(err, self);
				return;
			}
			
			self.getBalance(callback);
		});
		return;
	}
	
	var opts = this._opts.balanceOpts;
	opts.headers['Cookie'] = 'PHPSESSID=' + this._cookie;
	
	var self = this
	  , buffer = ''
	  , req = https.request(opts, function(res) {
		  res.setEncoding('utf8');
		  res.on('data', function(d) {
			 buffer += d; 
		  });
		  res.on('end', function() {
			  jsdom.env(buffer, ['../vendor/jquery-1.6.2.min.js'], function(err, window) {
				  if (err) {
					  callback(err, self);
					  return;
				  }
				  var $ = window.$;
				  
				  // check that the login worked successfully
				  if ($('#userStats').length != 1) {
					  callback('Login failed while attempting to retrieve balance', self);
					  return;
				  }
				  
				  // get the BTC balance
				  var btcsText = $('#userStats > .group.bitcoins > .expandBlock > .title').text();
				  if (!/^[0-9]+(\.[0-9]+)?$/.test(btcsText)) {
					  callback('Failed to find balance of BTCs', self);
					  return;
				  }
				  self._balance.btcs = parseFloat(btcsText);
				  
				  // get the USD balance
				  var usdsText = $.trim($('#userStats > .group:not(.bitcoins) > .expandBlock > .title').last().text());
				  var matches = /^([0-9]+\.[0-9]+) USD$/.exec(usdsText);
				  if (matches === null) {
					  callback('Failed to find balance of USDs', self);
					  return;
				  }
				  self._balance.usds = parseFloat(matches[1]);
				  
				  // get the csrf protection value
				  self._tradeFieldValue = $('.tradeBitcoins input[name=' + self._tradeFieldName + ']').first().val();
				  
				  callback(null, self);
			  });
		  });
	  });
	req.end();
};

//TODO: this doesn't parse open orders from the response like Exchange
//TODO: the response body could be used to more accurately? update balance
ExchangeB7.prototype.sellBtc = function(order, callback, getBalanceUpdated) {
	var self = this
	  , buffer = ''
	  , postData = {};
	
	if (this._isCookieExpired()) {
		this._getCookie(function(err) {
			if (err) {
				callback(err);
				return;
			}
			
			self.sellBtc(order, callback);
		});
		return;
	}
	
	// update balance to refresh CRSF field value
	if (typeof getBalanceUpdated == 'undefined' || !getBalanceUpdated) {
		this.getBalance(function(err, exchange) {
			if (err) {
				callback(err);
				return;
			}
			
			self.buyBtc(order, callback, true);
		});
	}
	
	// do some simple error checking
	if (!order.isSell())
		throw 'Order must be a sell order in sellBtc';
	
	if (this._balance.usds === null || this._balance.btcs === null)
		throw 'Cannot sell btc, unknown account balances';
	
	if (this._tradeFieldValue === null)
		throw 'Cannot execute sell order, no tradeFieldValue set!';
	
	// set up POST data
	postData.sell_btc_amount = order.getAmount();
	postData.sell_price_per_one = order.getPrice();
	postData[this._tradeFieldName] = this._tradeFieldValue;
	postData.sell_coins = 'Sell Bitcoins';
	
	// set up headers
	var opts = this._opts.sellOpts;
	opts.headers['Cookie'] = 'PHPSESSID=' + this._cookie;
	opts.headers['Content-Length'] = querify(postData).length;
	
	var req = https.request(opts, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(d) {
			buffer += d;
		});
		res.on('end', function() {
			
			// assume the order will be executed and update balance
			self._balance.usds += order.getTotal();
			self._balance.btcs -= order.getAmount();
			
			callback(null);
		});
	});
	req.on('error', function(d) {
		callback(d);
	});
	req.write(querify(postData));
	req.end();
};

//TODO: this doesn't parse open orders from the response like Exchange
//TODO: this response body could be used to more accurately? update balance
ExchangeB7.prototype.buyBtc = function(order, callback, getBalanceUpdated) {
	var self = this
	  , buffer = ''
	  , postData = {};
	
	if (this._isCookieExpired()) {
		this._getCookie(function(err) {
			if (err) {
				callback(err);
				return;
			}
			
			self.buyBtc(order, callback);
		});
		return;
	}
	
	// update balance to refresh CRSF field value
	if (typeof getBalanceUpdated == 'undefined' || !getBalanceUpdated) {
		this.getBalance(function(err, exchange) {
			if (err) {
				callback(err);
				return;
			}
			
			self.buyBtc(order, callback, true);
		});
	}
	
	if (!order.isBuy())
		throw 'Order must be a buy order in buyBtc';
	
	if (this._balance.usds === null || this._balance.btcs === null)
		throw 'Cannot buy btc, unknown account balances';
	
	// set up POST data
	postData.buy_btc_amount = order.getAmount();
	postData.buy_price_per_one = order.getPrice();
	postData[this._tradeFieldName] = this._tradeFieldValue;
	postData.buy_coins = 'Buy Bitcoins';
	
	// set up headers
	var opts = this._opts.buyOpts;
	opts.headers['Cookie'] = 'PHPSESSID=' + this._cookie;
	opts.headers['Content-Length'] = querify(postData).length;
	
	var req = https.request(opts, function(res) {
		res.setEncoding('utf8');
		res.on('data', function(d) {
			buffer += d;
		});
		res.on('end', function() {
			
			// assume the order will be executed and update balance
			self._balance.usds -= order.getTotal();
			self._balance.btcs += order.getAmount();
			
			callback(null);
		});
	});
	req.on('error', function(d) {
		callback(d);
	});
	req.write(querify(postData));
	req.end();
};

module.exports = ExchangeB7;
