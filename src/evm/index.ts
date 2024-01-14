import * as txnetwork from "../txnetwork"
import * as txtype from "../txtype"
import * as utils from "../utils"
import * as warning from "../warning"
import { Transaction } from "ethers";
import { getContractData, isFlareContract } from "./contract";
import { TxVerification, TxVerificationParameter } from "../interface";

export async function verify(txHex: string): Promise<TxVerification | null> {
    let tx: Transaction
    try {
        tx = Transaction.from(utils.toHex(txHex, true))

        let warnings = new Set<string>()

        let network = _getNetwork(tx, warnings)
        let type = _getType(tx)
        let description = txtype.getDescription(type)
        let recipient = _getRecipient(tx)
        let value = _getValue(tx)
        let fee = _getMaxFee(tx, warnings)
        let contract = await _getContract(tx)
        let messageToSign = tx.unsignedHash

        return {
            network,
            type,
            description,
            recipients: [recipient],
            values: [value],
            fee,
            ...contract,
            warnings: Array.from(warnings.values()),
            messageToSign
        }
    } catch {
        return null
    }
}

function _getNetwork(tx: Transaction, warnings: Set<string>): string {
    let chainId = Number(tx.chainId)
    if (!txnetwork.isKnownNetwork(chainId)) {
        warnings.add(warning.UNKOWN_NETWORK)
    }
    return txnetwork.getDescription(chainId)
}

function _getType(tx: Transaction): string {
    if (utils.isZeroHex(tx.data)) {
        return txtype.TRANSFER_C
    } else {
        return txtype.CONTRACT_CALL_C
    }
}

function _getRecipient(tx: Transaction): string {
    return tx.to ? tx.to.toLowerCase() : ""
}

function _getValue(tx: Transaction): string {
    return tx.value.toString()
}

function _getMaxFee(tx: Transaction, warnings: Set<string>): string | undefined {
    let maxFee = BigInt(0)
    if (tx.gasPrice) {
        maxFee = tx.gasLimit * tx.gasPrice
    } else if (tx.maxFeePerGas) {
        maxFee = tx.gasLimit * tx.maxFeePerGas
    }
    if (maxFee === BigInt(0)) {
        warnings.add(warning.FEE_NOT_SET)
        return undefined
    } else {
        return maxFee.toString()
    }
}

async function _getContract(tx: Transaction): Promise<any> {
    if (_getType(tx) !== txtype.CONTRACT_CALL_C) {
        return {}
    }

    let contractName: string | undefined = undefined
    let contractMethod: string | undefined = undefined
    let contractData: string | undefined = undefined
    let isFlareNetworkContract: boolean | undefined = undefined
    let parameters: Array<TxVerificationParameter> | undefined = undefined

    let chainId = Number(tx.chainId)

    contractData = tx.data
    if (tx.to != null) {        
        let contract = await getContractData(chainId, tx.to!)
        if (contract) {
            contractName = contract.name
            isFlareNetworkContract = contract.isFlareNetworkContract
            let txData = { data: tx.data, value: tx.value }
            let description = contract.interface.parseTransaction(txData)
            if (description) {
                contractMethod = description.name
                let inputs = description.fragment.inputs
                parameters = Array<TxVerificationParameter>()
                for (let i = 0; i < inputs.length; i++) {
                    parameters.push({
                        name: inputs[i].name,
                        value: description.args[i].toString()
                    })
                }
            }
        } else {
            isFlareNetworkContract = await isFlareContract(chainId, tx.to!)
        }
    }

    return {
        contractName,
        contractMethod,
        contractData,
        isFlareNetworkContract,
        parameters
    }
}