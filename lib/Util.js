var Util = {
	
	/**
	 * Rounds a given number to 4 decimal places. Seems to be safe for most
	 * exchanges.
	 * 
	 * @param {Number} number
	 * @returns {Number}
	 */
	round: function(number) {
		return Math.ceil(number * 10000) / 10000;
	}

	/**
	 * Finds a random number between the two values
	 * 
	 * @param {Number} min
	 * @param {Number} max
	 * @returns {Number}
	 */
  , rand: function(min, max) {
	  	return Math.random() * (max - min) + min;
	}
};

module.exports = Util;
