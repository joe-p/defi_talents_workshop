// since this is js, you can use variables
const server = "http://localhost"
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

module.exports = {
  algod: {
    server,
    token,
    port: 4001
  },
  kmd: {
    server,
    token,
    port: 4002,
    wallet: "unencrypted-default-wallet",
    password: ""
  },
  accounts: {
    alice: {
      initialBalance: 10_000_000
    },
    bob: {
      initialBalance: 10_000_000
    }
  },
  txns: {
    create: [
      {
        type: 'ApplicationCreate',
        name: 'auctionApp',
        onComplete: 'NoOp',
        from: 'alice',
        schema: {
          global: {
            ints: 2,
            bytes: 2
          },
          local: {
            ints: 0,
            bytes: 0
          }
        },
        teal: {
          compileCmd: "python3 contract.py", // run this command before creating app
          approval: "./approval.teal",
          clear: "./clear.teal"
        },
        // args: [ 'hello world', 1337 ],
        // accounts: [ 'bob' ],
        // apps: [ 'anotherApp' ],
        // assets: [ 1337 ],
        // note: "this is a txn note",
        // extraPages: 0,
        // lease: undefined,
        // rekeyTo: undefined,
      }
    ],
    start: [
      {
        type: 'ApplicationCall',
        onCompletion: 'NoOp',
        from: 'alice',
        appID: 'auctionApp',
        name: 'startCall',
        args: ['start_auction', 1691330941],
      },
      {
        type: 'Payment',
        from: 'alice',
        amount: 100_000,
        to: 'auctionApp',
        name: 'startPayment'
      },
    ]
  }
}