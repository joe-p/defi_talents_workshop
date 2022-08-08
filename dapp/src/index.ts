import algosdk from 'algosdk'
import { MyAlgoSession } from './wallets/myalgo'
import Utils from './utils'

const appID = 10
const server = 'http://localhost'
const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const algodClient = new algosdk.Algodv2(token, server, 4001)
const algoIndexer = new algosdk.Indexer(token, server, 8980)
const wallet = new MyAlgoSession()

async function sendTxns (stxns: Array<Uint8Array>) {
  const sentTxn = await algodClient.sendRawTransaction(stxns).do()
  const txId = sentTxn.txId
  console.log('Transaction ID: ' + txId)
  return await algosdk.waitForConfirmation(algodClient, txId, 3)
}

async function getBidTxns (from: string, amount: number) {
  const suggestedParams = await algodClient.getTransactionParams().do()

  const appInfo = await algoIndexer.lookupApplications(appID).do()
  const gState = Utils.getReadableState(appInfo.application.params['global-state'])
  const highestBidder = gState.highestBidder

  const accounts = [] as Array<string>

  if (highestBidder) {
    accounts.push(highestBidder.address)
  }

  const appObj = {
    appIndex: appID,
    suggestedParams,
    from,
    appArgs: [
      new Uint8Array(Buffer.from('bid')),
      algosdk.encodeUint64(amount)
    ],
    accounts
  }

  const appTxn = algosdk.makeApplicationNoOpTxnFromObject(appObj)

  const bidObj = {
    suggestedParams,
    from,
    amount,
    to: algosdk.getApplicationAddress(appID)
  }

  const bidTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(bidObj)

  return algosdk.assignGroupID([appTxn, bidTxn])
}

async function sendBid () {
  const bidBtn = document.getElementById('amount') as HTMLInputElement

  const bidTxns = await getBidTxns(wallet.accounts[0].address, bidBtn.valueAsNumber * 1E6)
  const signedTxns = (await wallet.signTxns(bidTxns)).map(t => t.blob)
  await sendTxns(signedTxns)
  await new Promise(resolve => setTimeout(resolve, 1000)) // sleep to let indexer catch up
  updatePage()
}

async function updatePage () {
  document.getElementById('app-id').innerText = appID.toString()
  const appInfo = await algoIndexer.lookupApplications(appID).do()
  const gState = Utils.getReadableState(appInfo.application.params['global-state'])
  document.getElementById('highest-bid').innerText = (gState.highestBid.number) / 1E6 + ' ALGO'
  document.getElementById('highest-bidder').innerText = gState.highestBidder.address
  document.getElementById('owner').innerText = gState.owner.address
  document.getElementById('end').innerText = new Date(1000 * (gState.auctionEnd.number)).toLocaleString()
}

updatePage()
document.getElementById('connect').onclick = () => wallet.getAccounts()
document.getElementById('bid').onclick = () => sendBid()
