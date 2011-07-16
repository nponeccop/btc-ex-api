var btcexapi = require('btc-ex-api');

var exchanges = new btcexapi.ExchangeSet();

var mtgox = exchanges.add(new btcexapi.Exchange({
  symbol: 'mtgoxUSD'
, tradeFee: 0.0030
, auth: {
    name: 'myuser'
  , pass: 'mypass'
  }
}));

var b7 = exchanges.add(new btcexapi.ExchangeB7({
  symbol: 'b7USD'
, tradeFee: 0.0057
, auth: {
    login_email: 'me@example.com'
  , login_pass: 'mypass'
  , login: 'Login'
  }
}));

exchanges.getBalances(function(err, ex) {
  if (err) {
    console.log('err!: ' + err);
  }
  
  console.log(ex.getSymbol() + ': ' + ex.getBalanceUsds() + ' USD, '
      + ex.getBalanceBtcs() + ' BTC');
}, function(err) {
  if (err)
    console.log('err: ' + err);
  
  console.log('getBalances() Completed!');
});
