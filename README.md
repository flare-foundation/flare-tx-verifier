# Flare: Transaction verification tool

The repository contains a command line interface tool for verification of transactions on Flare and Songbird networks, as well as on Coston and Coston2 test networks, prior to their signing.

This tool mitigates the main challenges encountered during transaction signing:
1. Unauthorized alterations to the transaction without user's knowledge before sending it to the wallet.
2. The absence of visibility into the transaction's content or parameters during the signing process (i.e., blind signing).
3. Uncertainty regarding the origin of the called contract, specifically whether it was published by Flare.

## Installation

This tool requires node.js and npm to be installed. You can then verify transactions either by using `npx` (see below) or by cloning this repository and running scripts via `npm` (see below). If you cloned the repository, first run:
```
npm install
```

## Verification process

First, the site/dApp needs to show the user a (zipped) unsigned transaction that was sent to the wallet (in base64 or hex encoding).

The unsigned transaction (`input`) can then be checked with the verification tool by running:
```
npx @flarenetwork/flare-tx-verifier input
```
or (if you cloned the repository)
```
npm run verify input
```
Alernatively, the above commands can be used without `input`. The input is then being continuously read from the clipboard.

The output will include the following parameters (depending on the type of transaction):

| Output parameter | Description |
| :----: | ----- | 
| network 					      | Network name, e.g. Flare Mainnet. For non-flare networks, chainID is returned. |
| type 						        | Possible transaction types are "transferC", "contractCallC", "exportC", "importC", "exportP", "importP", "addDelegatorP", "addValidatorP" |
| description 				    | Description of the transaction type: "Funds transfer on C-chain", "Contract call on C-chain", "Export from C-chain", "Import to C-chain", "Export from P-chain", "Import to P-chain", "Stake on P-chain", "Add validator on P-chain". |                 
| recipients  				    | Recipient of funds or the address of the contract called. |
| values      				    | Amount of funds transferred or staked. |
| fee         				    | Transfer fee stated (if specified in transaction before sending it to the wallet).  |              
| contractName      		  | When calling a contract, its name will be returned (if it exists).  |               	
| contractMethod   			  | When calling a contract, the method called will be returned (if it can be decoded). |                  
| contractData      		  | When calling a contract, the data field is returned (in hex format). |
| isFlareNetworkContract 	| When calling a contract, it returns true/false, depending on the contract being deployed by Flare. |
| parameters				      | When calling a contract, the method's parameters are returned. For types "addDelegatorP" and "addValidatorP", additional staking parameters are returned. |
| warnings					      | Warnings are returned for suspicious data (e.g., "Not official Flare contract"). |
| messageToSign	  			  | Hash sent to the wallet to sign. Useful for confirming P-chain transactions. |

When staking, the returned staking parameters are the following:
| Parameters | Description |
| :----: | ----- | 
| nodeId | Identifier of the validator node that you want to stake to. |
| startTime | Proposed starting time of the stake (in local time). |
| endTime | Proposed ending time of the stake (in local time). |
| validatorFee | Proposed node fee in % (if you want to initialize staking on a validator node). |

> [!IMPORTANT]
> **TO VERIFY A TRANSACTION PLEASE CHECK THE FOLLOWING:**
> 1. If the output parameters represent the transaction that you want to sign (i.e., the network, recipients, value, contract or staking parameters etc. are correct).
> 2. For **C-chain transactions** (transferring funds and contract calls) check if the wallet shows the same network, recipients, value and contractData as the verification tool.
> 3. For **P-chain transactions** (importing/exporting funds and staking) check if the hash you are signing matches the `messageToSign` value (note that some hashes do not include the starting `0x`; this is OK).
