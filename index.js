'use strict';

const fs = require('fs');
const request = require('request');
const exec = require('child_process').exec;

if (process.argv.length <= 2) {
  console.log('Usage: ' + __filename + ' <txnId>');
  process.exit(-1);
}

var logsDir = __dirname + '/logs';
var slackWebhookUrl = process.argv[2];
var slackMemberId = process.argv[3];
var currency = process.argv[4];
var txnId = process.argv[5];

var slackApi = {
  sendMessage: (webhookUrl, message) => {
    return new Promise((resolve, reject) => {
      request({
        url: webhookUrl,
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        json: true,
        body: {
          text: message
        },
        callback: (err, respObj, resp) => {
          if (err !== null) {
            logError('slack', err);
            return reject();
          }
          return resolve();
        }
      });
    });
  }
};

var txnApi = {
  getRewardInfo: (currency, txnId) => {
    return new Promise((resolve, reject) => {
      if (!txnApi.hasOwnProperty(currency)) {
        logError('The "' + currency + '" currency is not supported.');
        return reject();
      }

      return txnApi[currency].getRewardInfo(txnId).then(resolve, reject);
    });
  },
  getTxnHistory: (currency) => {
    return new Promise((resolve, reject) => {
      fs.readFile(logsDir + '/' + currency + '.txn-history.log', (err, data) => {
        if (err) {
          logError(currency, err);
          return resolve([]);
        }

        return resolve(data.split("\n"));
      });
    });
  },
  logTxnId: (currency, txnId, txnHistory) => {
    if (!txnHistory) {
      txnApi.getTxnHistory(currency).then((txnHistory) => {
        return txnApi.logTxnId(currency, txnId, txnHistory);
      });
    }

    txnHistory.push(txnId);
    if(txnHistory.length > 10) {
      txnHistory = txnHistory.slice(txnHistory.length - 10);
    }

    fs.writeFile(logsDir + '/' + currency + '.txn-history.log', txnHistory.join("\n"));
  }
};

txnApi.pure = {
  detailsBaseUrl: 'http://104.200.67.171:12312/tx/',

  getRewardInfo: (txnId) => {
    return new Promise((resolve, reject) => {
      txnApi.getTxnHistory('pure').then((txnHistory) => {
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
          rewardInfo.txnDetailsUrl = txnApi.pure.detailsBaseUrl + txnId;

          txnApi.logTxnId('pure', txnId, txnHistory);

          return resolve(rewardInfo);
        });
      });
    });
  }
};

function logError(context, message) {
  if (!message) {
    message = context;
    context = 'script';
  }

  var timestamp = new Date().toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');
  fs.appendFile(logsDir + '/' + context + '.error.log', timestamp + ' - ' + message);
}

function sendSlackMessage(message) {
  request({
    url: slackWebhookUrl,
    method: 'POST',
    headers: {
      'Content-type': 'application/json'
    },
    json: true,
    body: {
      text: message
    },
    callback: (err, respObj, resp) => {
      if (err !== null) {
        logError('slack', err);
      }
    }
  });
}

txnApi.getRewardInfo(currency, txnId).then((rewardInfo) => {
  var message = '<@' + slackMemberId + '> received a staking reward of ' + rewardInfo.amount + ' PURE.\n' + rewardInfo.txnDetailsUrl;
  slackApi.sendMessage(slackWebhookUrl, message);
});

