// Copyright Fortior Blockchain 2022
// 17 U.S.C §§ 101-1511

// importing relevant files and dependencies
import React from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import MyAlgoConnect from "@randlabs/myalgo-connect";
import algosdk from "algosdk";
import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import WalletConnect from "@walletconnect/client"; 


//JSX Component Propose
const Propose = () => {

 // Starting React-dispatch to dispatch action in state in the component
  const dispatch = useDispatch();

// Getting address from local storage
  const isThereAddress = localStorage.getItem("address");

  // Starting AlgoClient Instance
  const algod_token = {
    "X-API-Key": "AE6Ave7wNH8bKB1SiwutOakoTHreBlWZ9TMKElZs"
  }
  const algod_address = "https://mainnet-algorand.api.purestake.io/ps2";
  const headers = "";
  const ASSET_ID = 297995609;
  const algodClient = new algosdk.Algodv2(algod_token, algod_address, headers);

  const walletType = localStorage.getItem("wallet-type");

  // Choice Coin Rewards Adrress
  const rewardsAddress = 'BSW4FRTCT2SXKVK6P53I57SEAOCCPD6TYAS77YUU725KCY6U7EM2LLJOEI'


  //candidates
  const candidates = [{
    first : "firstcandidate"
  }, {
    second : "secondcandidate"
  }]

// Crafting Transactioon
  const craftTransactions =async(candidates) => {
    const txns = [];
  
    const suggestedParams = await algodClient.getTransactionParams().do();

    // top up payment
    for (let candidate of candidates) {
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: isThereAddress,
        to: candidate.address,
        amount: 100000,
        suggestedParams,
      });
      txns.push(txn);
    }
    // rewards 
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: isThereAddress,
      to: rewardsAddress,
      amount: (document.getElementById('rewards').value) * 100,
      assetIndex: ASSET_ID,
      suggestedParams,
    });

    txns.push(txn)

    algosdk.assignGroupID(txns);
    let continueExecution = true;

    try {
      const myAlgoWallet = new MyAlgoConnect({ shouldSelectOneAccount: false });
      const connector = new WalletConnect({
        bridge: "https://bridge.walletconnect.org",
        qrcodeModal: QRCodeModal,
      });

      if (walletType === "algosigner") {
        

        const signedTxns = await window.AlgoSigner.signTxn(
          txns.map((txn) => ({
            txn: window.AlgoSigner.encoding.msgpackToBase64(txn.toByte()),
          }))
        );
        await algodClient
          .sendRawTransaction(
            signedTxns.map((txn) =>
              window.AlgoSigner.encoding.base64ToMsgpack(txn.blob)
            )
          )
          .do();
      } else if (walletType === "my-algo") {
        const signedTxns = await myAlgoWallet.signTransaction(
          txns.map((txn) => txn.toByte())
        );

        // send the transactions to the net.
        await algodClient
          .sendRawTransaction(signedTxns.map((txn) => txn.blob))
          .do();
      } else if (walletType === "walletconnect") {
        let Txns = []

      // eslint-disable-next-line
      txns.map((transaction) => {

        Txns.push({
          txn: Buffer.from(algosdk.encodeUnsignedTransaction(transaction)).toString(
            "base64"
          ),
          message: "Transaction using Mobile Wallet",
        })
      })


      const requestParams = [Txns];

      const request = formatJsonRpcRequest("algo_signTxn", requestParams);
      const result = await connector.sendCustomRequest(request);
   // eslint-disable-next-line
      const decodedResult = result.map((element) => {
        return element ? new Uint8Array(Buffer.from(element, "base64")) : null;
      });

      }
    } catch (error) {
      console.log(error);
      continueExecution = false;
    }

    return continueExecution;

  }

    const createCandidates = () => {
    const candidateCred=[]
    // eslint-disable-next-line
      for (let candidate of candidates) {
        const { sk: private_key, addr: address } = algosdk.generateAccount();
       candidateCred.push({
          private_key: algosdk.secretKeyToMnemonic(private_key),
          address,
        });
      }

     return candidateCred

    }

    // Proposal checks
    const createProposal = () => {

      if(!isThereAddress) {
        dispatch({
          type: "alert_modal",
          alertContent: "Kindly Connect Wallet To Make Payment.",
        });
        return;
    } else if(!(document.getElementById('governance_name').value)) {
      dispatch({
        type: "alert_modal",
        alertContent: "You didn't enter governance name.",
      });
      return;
    }
      
     else if(!(document.getElementById('rewards').value)) {
        dispatch({
          type: "alert_modal",
          alertContent: "Enter Choice Rewards for Governance.",
        });
        return;
      } else if (!(document.getElementById('issue').value)) {
        dispatch({
          type: "alert_modal",
          alertContent: "Voting issue for governance not found.",
        });
        return;
      } else if (!(document.getElementById('option1').value)) {
        dispatch({
          type: "alert_modal",
          alertContent: "Enter what option 1 should be ?",
        });
        return;
      } else if (!(document.getElementById('option2').value)) {
        dispatch({
          type: "alert_modal",
          alertContent: "Enter what option 2 should be ?",
        });
        return;
      }
      const candidatesForElection = createCandidates()

      craftTransactions(candidatesForElection).then((continueExecution) => {
          if (continueExecution) {
            const headers = {
              "x-authorization-id": "",
            };
            // add choice per vote input
            axios
              .post(
                `https://v2-testnet.herokuapp.com/elections/create`,
                {
                  candidates: candidatesForElection,
                  name: document.getElementById("governance_name").value,
                  issue: document.getElementById("issue").value,
                  option1: document.getElementById("option1").value,
                  option2: document.getElementById("option2").value,
                  rewards: document.getElementById("rewards").value
                },
                { headers }
              )
              .then((response) => alert(response.data.message));
          }
        });
      

    }

// Building block
    return (
       <div className="propose">
           <div className="create_elt">
      <div className="create_elt_inn">
        <div className="crt_hd">
          <p className="converter-header"> Create Proposal & Schedule Election</p>
        </div>


        <div className="vote_sect">
          <div className="vote_sect_img">

          </div>

          <div className="v_inp_cov inpCont_cand">
            <p className="inp_tit">Issue</p>
            <input id="governance_name"
              type="text"
            />
            <p className="ensure_txt">
            The title for the issue.
            </p>
          </div>
          <div className="v_inp_cov inpCont_cand">
            <p className="inp_tit">Rewards</p>
            <input
              type="text" id="rewards"
            />
            <p className="ensure_txt">
            Rewards distributed to voters on the Issue.
            </p>
          </div>
          <div className="v_inp_cov inpCont_cand">
            <p className="inp_tit">Description</p>
            <input
              type="text"
              id="issue"
            />
            <p className="ensure_txt">
            A short overview about the vote.
            </p>
          </div>
          <div className="v_inp_cov inpCont_cand">
            <p className="inp_tit">Option 1</p>
            <input
              type="text"
              id="option1"
            />
            <p className="ensure_txt">
              First choice.
            </p>
          </div>
      
          <div className="v_inp_cov inpCont_cand">
            <p className="inp_tit">Option 2</p>
            <input
              type="text"
              id="option2"
            />
            <p className="ensure_txt">
             Second choice.
            </p>
          </div>

            <br />

          <div className="crt_butt">
            <button onClick={createProposal}>Create Proposal</button>
            <p className="safety">
             By creating this proposal you agree to Choice Coin's Terms and Conditions.
            </p>
          </div>

        </div>

      </div>
    </div>
       </div>
    );
}

export default Propose;