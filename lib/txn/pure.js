'use strict';

const txn = require('lib/txn');

module.exports = {
  detailsBaseUrl: 'http://104.200.67.171:12312/tx/',

  getRewardInfo: (txnId) => {
    return new Promise((resolve, reject) => {
      txn.getHistory('pure').then((txnHistory) => {
        // Only process a txn once.
        if (txnHistory.indexOf(txnId) !== -1) {
          return resolve();
        }

        exec('pured gettransaction ' + txnId, (err, stdout, stderr) => {
          if (err) {
            logError('pure', err);
            return reject();
          }
          if (stderr) {
            logError('pure', stderr);
            return reject();
          }

          var rewardInfo = {};
          var txnJson = JSON.parse(stdout);

          if (!txnJson.generated) {
            return reject();
          }

          rewardInfo.amount = txnJson.fee - txnJson.vout[2].value;
          rewardInfo.txnDetailsUrl = module.exports.detailsBaseUrl + txnId;

          txn.logId('pure', txnId, txnHistory);

          return resolve(rewardInfo);
        });
      });
    });
  }
};
