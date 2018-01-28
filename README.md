# crypto-stake-slack-alert
A way to send slack alerts when crypto staking rewards are received.

## Usage
### Qt Wallet
In your qt wallet config file, add the following line:
```
walletnotify=nodejs <path-to-this-repo>/index.js <slack-webhook-url> <slack-member-id> pure %s
```
Fill in each `<variable>` with your own information (but leave `%s` as-is).

When your wallet receives a staking reward, a message about it will be posted to the Slack workspace and channel specified in the Webhook URL, and the specified member will be mentioned.
