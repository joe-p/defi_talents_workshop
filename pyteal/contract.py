#!/usr/bin/env python3
from pyteal import *
import os

# Bytes = 2
OWNER = Bytes("owner")
HIGHEST_BIDDER = Bytes("highestBidder")

# Ints = 2
HIGHEST_BID = Bytes("highestBid")
AUCTION_END = Bytes("auctionEnd")

def on_create():
    return Seq(
            App.globalPut(OWNER, Txn.sender()),
            App.globalPut(HIGHEST_BID, Int(0)),
            App.globalPut(HIGHEST_BIDDER, Bytes("")),
            App.globalPut(AUCTION_END, Int(0))
        )

def start_auction():
    auction_end = Btoi(Txn.application_args[1])
    fund_txn = Gtxn[Txn.group_index() + Int(1)]

    min_balance = Int(100_000)

    return Seq(
        Assert(Txn.sender() == App.globalGet(OWNER)),
        Assert(fund_txn.receiver() == Global.current_application_address()),
        Assert(fund_txn.amount() >= min_balance),
        App.globalPut(AUCTION_END, auction_end)
    )

def bid():
    bid_txn = Gtxn[Txn.group_index() + Int(1)]

    return Seq(
        Assert(Global.latest_timestamp() < App.globalGet(AUCTION_END)),
        Assert(bid_txn.sender() == Txn.sender()),
        Assert(bid_txn.amount() > App.globalGet(HIGHEST_BID)),
        If(App.globalGet(HIGHEST_BIDDER) != Bytes(""), return_bid()),
        App.globalPut(HIGHEST_BIDDER, Txn.sender()),
        App.globalPut(HIGHEST_BID, bid_txn.amount())
    )

def return_bid():
    receiver = App.globalGet(HIGHEST_BIDDER)
    amount = App.globalGet(HIGHEST_BID)

    return Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.Payment,
                TxnField.receiver: receiver,
                TxnField.amount: amount - Global.min_txn_fee(),
            }
        ),
        InnerTxnBuilder.Submit(),
    )

def approval():
    return Seq(
        Cond(
            [Txn.application_id() == Int(0), on_create()],
            [Txn.application_args[0] == Bytes('bid'), bid()],
            [Txn.application_args[0] == Bytes('start_auction'), start_auction()]
        ), 
        Approve()
    )


def clear():
    return Approve()


if __name__ == "__main__":
    if os.path.exists("approval.teal"):
        os.remove("approval.teal")

    if os.path.exists("clear.teal"):
        os.remove("clear.teal")

    compiled_approval = compileTeal(approval(), mode=Mode.Application, version=6)

    with open("approval.teal", "w") as f:
        f.write(compiled_approval)

    compiled_clear = compileTeal(clear(), mode=Mode.Application, version=6)

    with open("clear.teal", "w") as f:
        f.write(compiled_clear)
