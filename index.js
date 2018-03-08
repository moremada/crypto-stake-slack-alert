'use strict';

const fs = require('fs');
const request = require('request');
const exec = require('child_process').exec;

if (process.argv.length <= 2) {
  console.log('Usage: ' + __filename + ' <txnId>');
  process.exit(-1);
}

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
        callback: (error, respObj, resp) => {
          if (error !== null) {
            logError(error);
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
  }
};
txnApi.pure = {
  detailsBaseUrl: 'http://104.200.67.171:12312/tx/',

  getRewardInfo: (txnId) => {
    return new Promise((resolve, reject) => {
      exec('pured gettransaction ' + txnId, (error, stdout, stderr) => {
        if (error) {
          logError(error);
          return reject();
        }
        if (stderr) {
          logError(stderr);
          return reject();
        }

        var rewardInfo = {};
        var txnJson = JSON.parse(stdout);

        if (!txnJson.generated) {
          return reject();
        }

        // TODO: Fix this amount calculation. It is wrong because the
        // transaction state changes as it gets confirmed (or something).
        //rewardInfo.amount = txnJson.amount + txnJson.fee;
        rewardInfo.amount = 7;
        rewardInfo.txnDetailsUrl = txnApi.pure.detailsBaseUrl + txnId;

        return resolve(rewardInfo);
      });
    });
  }
};

function logError(message) {
  var timestamp = new Date().toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');
  fs.appendFile('error.log', timestamp + ' - ' + message);
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
    callback: (error, respObj, resp) => {
      if (error !== null) {
        logError(error);
      }
    }
  });
}

txnApi.getRewardInfo(currency, txnId).then((rewardInfo) => {
  var message = '<@' + slackMemberId + '> received a staking reward of ' + rewardInfo.amount + ' PURE.\n' + rewardInfo.txnDetailsUrl;
  slackApi.sendMessage(slackWebhookUrl, message);
});

