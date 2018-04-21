'use strict';

module.exports.pure = require('./lib/txn/pure');

module.exports = {
  getRewardInfo: (currency, txnId) => {
    return new Promise((resolve, reject) => {
      if (!module.exports.hasOwnProperty(currency)) {
        logError('The "' + currency + '" currency is not supported.');
        return reject();
      }

      return module.exports[currency].getRewardInfo(txnId).then(resolve, reject);
    });
  },
  getHistory: (currency) => {
    return new Promise((resolve, reject) => {
      fs.readFile(logsDir + '/' + currency + '.txn-history.log', 'utf8', (err, data) => {
        if (err) {
          logError(currency, err);
          return resolve([]);
        }

        return resolve(data.split("\n"));
      });
    });
  },
  logId: (currency, txnId, txnHistory) => {
    if (!txnHistory) {
      module.exports.getHistory(currency).then((txnHistory) => {
        return module.exports.logId(currency, txnId, txnHistory);
      });
    }

    txnHistory.push(txnId);
    if(txnHistory.length > 10) {
      txnHistory = txnHistory.slice(txnHistory.length - 10);
    }

    fs.writeFile(logsDir + '/' + currency + '.txn-history.log', txnHistory.join("\n"), 'utf8');
  }
};
