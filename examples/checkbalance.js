var btcexapi = require('btc-ex-api');

var mtgox = new btcexapi.Exchange({
  symbol: 'mtgoxUSD'
, tradeFee: 0.0030
, auth: {
    name: 'myuser'
  , pass: 'mypas'
  }
});

mtgox.getBalance(function(err, ex) {
  if (err) {
    console.log('err: ' + err);
    return;
  }
  
  console.log(ex.getSymbol() + ': ' + ex.getBalanceUsds() + ' USD, '
      + ex.getBalanceBtcs() + ' BTC');
});
