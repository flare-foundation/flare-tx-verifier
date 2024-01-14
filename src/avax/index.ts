import * as txnetwork from "../txnetwork"
import * as txtype from "../txtype"
import * as settings from "../settings"
import * as utils from "../utils"
import * as warning from "../warning"
import Avalanche, { BN } from "@flarenetwork/flarejs"
import {
    AmountInput as CAmountInput,
    AmountOutput as CAmountOutput,
    EVMOutput,
    ExportTx as ExportCTx,
    ImportTx as ImportCTx,
    UnsignedTx as UnsignedCTx
} from "@flarenetwork/flarejs/dist/apis/evm"
import {
    AddDelegatorTx,
    AddValidatorTx,
    AmountInput as PAmountInput,
    AmountOutput as PAmountOutput,
    ExportTx as ExportPTx,
    ImportTx as ImportPTx,
    TransferableInput as PTransferableInput,
    TransferableOutput as PTransferableOutput,
    UnsignedTx as UnsignedPTx
} from "@flarenetwork/flarejs/dist/apis/platformvm"
import BinTools from "@flarenetwork/flarejs/dist/utils/bintools"
import { bech32 } from "bech32"
import { sha256 } from "ethers"
import { TxVerification, TxVerificationParameter } from "../interface"
import { Defaults } from "@flarenetwork/flarejs/dist/utils"

const bintools = BinTools.getInstance()

export async function verify(txHex: string): Promise<TxVerification | null> {
    if (!utils.isHex(txHex)) {
        return null
    }

    txHex = utils.toHex(txHex, false)

    let ctx = _tryRecoverCTx(txHex) as UnsignedCTx
    if (ctx != null) {
        return _getCTxParams(ctx)
    }
    
    let ptx = _tryRecoverPTx(txHex) as UnsignedPTx
    if (ptx != null) {
        return _getPTxParams(ptx)
    }

    return null
}

function _tryRecoverCTx(txHex: string): UnsignedCTx | null {
    try {
        let tx = new UnsignedCTx()
        tx.fromBuffer(Buffer.from(txHex, "hex") as any)
        return tx
    } catch {
        return null
    }
}

function _tryRecoverPTx(txHex: string): UnsignedPTx | null {
    try {
        let tx = new UnsignedPTx()
        tx.fromBuffer(Buffer.from(txHex, "hex") as any)
        return tx
    } catch {
        return null
    }
}

function _getMessageToSign(tx: UnsignedCTx | UnsignedPTx): string {
    try {        
        let signatureRequests = tx.prepareUnsignedHashes(undefined as any)
        if (signatureRequests.length > 0) {
            return utils.toHex(signatureRequests[0].message, true)
        } else {
            let txBuffer = Buffer.from(tx.toBuffer().toString("hex"),"hex")
            return utils.toHex(sha256(txBuffer), true)
        }
    } catch {
        throw new Error("Failed to recover message to sign")
    }
}

function _getNetwork(networkId: number, warnings: Set<string>): string {
    if (!txnetwork.isKnownNetwork(networkId)) {
        warnings.add(warning.UNKOWN_NETWORK)
    }
    return txnetwork.getDescription(networkId)
}

async function _getCTxParams(tx: UnsignedCTx) : Promise<TxVerification> {
    let btx = tx.getTransaction()

    let warnings = new Set<string>()

    _checkCBlockchainId(btx.getNetworkID(), btx.getBlockchainID().toString("hex"), warnings)

    let network = _getNetwork(btx.getNetworkID(), warnings)    
    let txType = btx.getTypeName()
    let type: string
    let params: any
    if (txType === "ExportTx") {
        type = txtype.EXPORT_C
        params = _getExportCTxParams(btx as ExportCTx, warnings)
    } else if (txType === "ImportTx") {
        type = txtype.IMPORT_C
        params = _getImportCTxParams(btx as ImportCTx, warnings)
    } else {
        throw new Error("Unkown C-chain transaction type")
    }
    let description = txtype.getDescription(type)
    let messageToSign = _getMessageToSign(tx)
    
    return {
        network,
        type,
        description,
        ...params,
        warnings: Array.from(warnings.values()),
        messageToSign
    }
}

function _getExportCTxParams(tx: ExportCTx, warnings: Set<string>): any {
    let networkId = tx.getNetworkID()

    _checkPBlockchainId(networkId, tx.getDestinationChain().toString("hex"), warnings)

    let inputs = tx.getInputs()
    let inputAmount = new BN(0)
    for (let i = 0; i < inputs.length; i++) {
        inputAmount = inputAmount.add(_getAmountFromEVMOutput(inputs[i]))
        _checkPAssetId(networkId, inputs[i].getAssetID().toString("hex"), warnings)
    }

    let outputs = tx.getExportedOutputs()
    let exportAmounts = new Array<BN>()
    let exportRecipients = new Array<string>()    
    for (let i = 0; i < outputs.length; i++) {
        let output = outputs[i].getOutput() as CAmountOutput
        let addresses = output.getAddresses()
        if (addresses.length > 1) {
            warnings.add(warning.MULTIPLE_SIGNERS)
        }
        let address = _addressesToString(addresses as any, true, networkId)
        let index = exportRecipients.indexOf(address)
        if (index < 0) {
            exportRecipients.push(address)
            exportAmounts.push(output.getAmount())
        } else {
            exportAmounts[index] = exportAmounts[index].add(output.getAmount())
        }
        _checkOutputLockTime(output.getLocktime(), warnings)
        _checkPAssetId(networkId, outputs[i].getAssetID().toString("hex"), warnings)
    }
    if (exportRecipients.length > 1) {
        warnings.add(warning.MULTIPLE_RECIPIENTS)
    }

    let fee = inputAmount.sub(_sumValues(exportAmounts))

    return {
        recipients: exportRecipients,
        values: exportAmounts.map(a => _gweiToWei(a).toString()),
        fee: _gweiToWei(fee).toString()
    }
}

function _getImportCTxParams(tx: ImportCTx, warnings: Set<string>): any {
    let networkId = tx.getNetworkID()

    _checkPBlockchainId(networkId, tx.getSourceChain().toString("hex"), warnings)

    let inputs = tx.getImportInputs()
    let inputAmount = new BN(0)
    for (let i = 0; i < inputs.length; i++) {
        inputAmount = inputAmount.add((inputs[i].getInput() as CAmountInput).getAmount())
        _checkPAssetId(networkId, inputs[i].getAssetID().toString("hex"), warnings)
    }

    let outputs = tx.getOuts()
    let importAmounts = new Array<BN>()
    let importRecipients = new Array<string>()
    for (let i = 0; i < outputs.length; i++) {
        let output = outputs[i]
        let amount = _getAmountFromEVMOutput(output)
        let address = utils.toHex(output.getAddressString().toLowerCase(), true)
        let index = importRecipients.indexOf(address)
        if (index < 0) {
            importRecipients.push(address)
            importAmounts.push(amount)
        } else {
            importAmounts[index] = importAmounts[index].add(amount)
        }
        _checkPAssetId(networkId, output.getAssetID().toString("hex"), warnings)
    }

    let fee = inputAmount.sub(_sumValues(importAmounts))

    return {
        recipients: importRecipients,
        values: importAmounts.map(a => _gweiToWei(a).toString()),
        fee: _gweiToWei(fee).toString()
    }
}

function _getAmountFromEVMOutput(output: EVMOutput): BN {
    let outputBuffer = output.toBuffer()
    return new BN(bintools.copyFrom(outputBuffer, 20, 28))
}

async function _getPTxParams(tx: UnsignedPTx): Promise<TxVerification> {
    let btx = tx.getTransaction()

    let warnings = new Set<string>()

    _checkPBlockchainId(btx.getNetworkID(), btx.getBlockchainID().toString("hex"), warnings)

    let network = _getNetwork(btx.getNetworkID(), warnings)
    let txType = btx.getTypeName()
    let type: string
    let params: any
    if (txType === "AddDelegatorTx") {
        type = txtype.ADD_DELEGATOR_P
        params = await _getAddDelegatorParams(btx as AddDelegatorTx, warnings)
    } else if (txType === "AddValidatorTx") {
        type = txtype.ADD_VALIDATOR_P
        params = await _getAddValidatorParams(btx as AddValidatorTx, warnings)
    } else if (txType === "ExportTx") {
        type = txtype.EXPORT_P
        params = await _getExportPTx(btx as ExportPTx, warnings)
    } else if (txType === "ImportTx") {
        type = txtype.IMPORT_P
        params = await _getImportPTx(btx as ImportPTx, warnings)
    } else {
        throw new Error("Unkown P-chain transaction type")
    }
    let description = txtype.getDescription(type)
    let messageToSign = _getMessageToSign(tx)
    return {
        network,
        type,
        description,
        ...params,
        warnings: Array.from(warnings.values()),
        messageToSign
    }
}

async function _getAddDelegatorParams(tx: AddDelegatorTx, warnings: Set<string>): Promise<any> {
    return _getStakeTxData(tx, warnings)
}

async function _getAddValidatorParams(tx: AddValidatorTx, warnings: Set<string>): Promise<any> {        
    return _getStakeTxData(tx, warnings)
}

async function _getStakeTxData(tx: AddDelegatorTx | AddValidatorTx, warnings: Set<string>): Promise<any> {
    let [recipients, receivedAmounts] = _getPOutputsData(
        tx.getNetworkID(),
        tx.getOuts(),
        warnings
    )

    let sentAmount = await _getPInputsData(
        tx.getNetworkID(),
        tx.getIns(),
        recipients.length == 1 && !recipients[0].includes(",") ? recipients[0] : undefined,
        undefined,
        warnings
    )    
    
    let stakeAmount = tx.getStakeAmount()
    let fee = sentAmount.sub(_sumValues(receivedAmounts)).sub(stakeAmount)
    
    let [stakeoutRecipients, stakeoutAmounts] = _getPOutputsData(
        tx.getNetworkID(),
        tx.getStakeOuts(),
        warnings
    )
    _compareRecipients(stakeoutRecipients, recipients, warnings)

    if (tx instanceof AddDelegatorTx) {
        await _checkNodeId(tx, warnings)
    }

    let parameters = new Array<TxVerificationParameter>()
    parameters.push({
        name: "nodeId",
        value: tx.getNodeIDString()
    })
    parameters.push({
        name: "startTime",
        value: tx.getStartTime().toString()!
    })
    parameters.push({
        name: "endTime",
        value: tx.getEndTime().toString()!
    })
    if (tx instanceof AddValidatorTx) {
        parameters.push({
            name: "delegationFee",
            value: tx.getDelegationFee().toString()
        })
    }

    return {
        recipients: stakeoutRecipients,
        values: stakeoutAmounts.map(a => _gweiToWei(a).toString()),
        fee: _gweiToWei(fee).toString(),
        parameters
    }
}

async function _getExportPTx(tx: ExportPTx, warnings: Set<string>): Promise<any> {
    let networkId = tx.getNetworkID()
    _checkCBlockchainId(networkId, tx.getDestinationChain().toString("hex"), warnings)
    let [utxoRecipients, utxoReceivedAmounts] = _getPOutputsData(
        networkId,
        tx.getOuts(),
        warnings
    )
    let [exportRecipients, exportAmounts] = _getPOutputsData(
        networkId,
        tx.getExportOutputs(),
        warnings
    )
    _compareRecipients(exportRecipients, utxoRecipients, warnings)
    
    let utxoSentAmount = await _getPInputsData(
        networkId,
        tx.getIns(),
        exportRecipients.length == 1 && !exportRecipients.includes(",") ? exportRecipients[0] : undefined,
        undefined,
        warnings
    )

    let fee = utxoSentAmount.sub(_sumValues(utxoReceivedAmounts)).sub(_sumValues(exportAmounts))

    return {
        recipients: exportRecipients,
        values: exportAmounts.map(a => _gweiToWei(a).toString()),
        fee: _gweiToWei(fee).toString()
    }
}

async function _getImportPTx(tx: ImportPTx, warnings: Set<string>): Promise<any> {
    let networkId = tx.getNetworkID()

    _checkCBlockchainId(networkId, tx.getSourceChain().toString("hex"), warnings)
    
    let [recipients, receivedAmounts] = _getPOutputsData(
        tx.getNetworkID(),
        tx.getOuts(),
        warnings
    )

    let sentAmount = await _getPInputsData(
        networkId,
        tx.getIns(),
        recipients.length == 1 && !recipients[0].includes(",") ? recipients[0] : undefined,
        _getCBlockchainId(networkId),
        warnings
    )
    
    let importAmount = await _getPInputsData(
        networkId,
        tx.getImportInputs(),
        recipients.length == 1 && !recipients[0].includes(",") ? recipients[0] : undefined,
        _getCBlockchainId(networkId),
        warnings
    )

    let fee = importAmount.add(sentAmount).sub(_sumValues(receivedAmounts))
    
    return {
        recipients,
        values: receivedAmounts.map(a => _gweiToWei(a).toString()),
        fee: _gweiToWei(fee).toString()
    }
}

async function _getPInputsData(
    networkId: number,
    inputs: Array<PTransferableInput>,
    address: string | undefined,
    blockchainId: string | undefined,
    warnings: Set<string>
): Promise<BN> {
    let utxos = address ? (await _getPUTXOs(networkId, address, blockchainId)) : new Array<any>()
    let sentAmount = new BN(0)
    for (let input of inputs) {        
        let ai = input.getInput() as PAmountInput        
        sentAmount = sentAmount.add(ai.getAmount())
        _checkPAssetId(networkId, input.getAssetID().toString("hex"), warnings)
        if (address) {
            let txId = input.getTxID().toString("hex")
            let outputIdx = parseInt(input.getOutputIdx().toString("hex"),16)
            if (!utxos.find(u => u.txId === txId && u.outputIdx === outputIdx)) {
                warnings.add(warning.FUNDS_NOT_RETURNED)
            }
        }
    }
    return sentAmount
}

function _getPOutputsData(
    networkId: number,
    outputs: Array<PTransferableOutput>,
    warnings: Set<string>
): [Array<string>, Array<BN>] {
    let recipients = new Array<string>()
    let receivedAmounts = new Array<BN>()
    for (let output of outputs) {
        let ao = output.getOutput() as PAmountOutput
        let addresses = ao.getAddresses()
        if (addresses.length != 1) {
            warnings.add(warning.MULTIPLE_SIGNERS)
        }
        let address = _addressesToString(addresses as any, true, networkId)
        let index = recipients.indexOf(address)
        if (index < 0) {
            recipients.push(address)
            receivedAmounts.push(ao.getAmount())
        } else {
            receivedAmounts[index] = receivedAmounts[index].add(ao.getAmount())
        }
        _checkOutputLockTime(ao.getLocktime(), warnings)
        _checkPAssetId(networkId, output.getAssetID().toString("hex"), warnings)
    }
    if (recipients.length > 1) {
        warnings.add(warning.MULTIPLE_RECIPIENTS)
    }
    return [recipients, receivedAmounts]
}

async function _getPUTXOs(
    networkId: number,
    address: string,
    blockchainId?: string
): Promise<Array<any>> {
    let avalanche = _getAvalanche(networkId)
    let utxos = (await avalanche.PChain().getUTXOs(`P-${address}`, blockchainId)).utxos
    return utxos.getAllUTXOs().map(u => { return {
        txId: u.getTxID().toString("hex"),
        outputIdx: parseInt(u.getOutputIdx().toString("hex"), 16)
    }})
}

async function _checkNodeId(tx: AddDelegatorTx, warnings: Set<string>) {
    let avalanche = _getAvalanche(tx.getNetworkID())
    
    let stakes = new Array<any>
    let cvalidators = await avalanche.PChain().getCurrentValidators() as any
    if (cvalidators && cvalidators.validators) {
        let cstakes = cvalidators.validators as Array<any>
        if (cstakes) {
            stakes = stakes.concat(cstakes)
        }
    }
    let pvalidators = await avalanche.PChain().getPendingValidators() as any
    if (pvalidators && pvalidators.validators) {
        let pstakes = pvalidators.validators as Array<any>
        if (pstakes) {
            stakes = stakes.concat(pstakes)
        }
    }

    let nodeIds = new Set<string>()
    for (let stake of stakes) {
        if (stake.nodeID) {
            nodeIds.add(stake.nodeID)
        }
    }
    if (!nodeIds.has(tx.getNodeIDString())) {
        warnings.add(warning.UNKNOWN_NODEID)
    }

}

function _getAvalanche(networkId: number): Avalanche {
    let url = new URL(settings.RPC[networkId])
    let avalanche = new Avalanche(
        url.hostname,
        url.port ? parseInt(url.port) : undefined,
        url.protocol,
        networkId
    )
    return avalanche
}

function _addressesToString(
    addresses: Array<Buffer>,
    toBech: boolean,
    networkId?: number
): string {
    let items = new Array(addresses.length)
    for (let i = 0; i < addresses.length; i++) {
        let address = addresses[i].toString("hex")
        if (toBech) {
            items[i] = _addressToBech(networkId!, address)
        } else {
            items[i] = utils.toHex(address, true)
        }
    }
    return items.sort().join(", ")
}

function _checkOutputLockTime(outputLockTime: BN, warnings: Set<string>) {
    if (!outputLockTime.isZero()) {
        warnings.add(warning.FUNDS_LOCKED)
    }
}

function _checkCBlockchainId(networkId: number, blockchainId: string, warnings: Set<string>) {
    if (utils.isZeroHex(blockchainId)) {
        return
    }
    let cBlockchainId = bintools.cb58Decode(_getCBlockchainId(networkId)).toString("hex")
    if (blockchainId !== cBlockchainId) {
        warnings.add(warning.INVALID_BLOCKCHAIN)
    }
}

function _getCBlockchainId(networkId: number): string {
    return Defaults.network[networkId].C.blockchainID
}

function _checkPBlockchainId(networkId: number, blockchainId: string, warnings: Set<string>) {
    if (utils.isZeroHex(blockchainId)) {
        return
    }
    let pBlockchainId = bintools.cb58Decode(_getPBlockchainId(networkId)).toString("hex")
    if (blockchainId !== pBlockchainId) {
        warnings.add(warning.INVALID_BLOCKCHAIN)
    }
}

function _getPBlockchainId(networkId: number): string {
    return Defaults.network[networkId].P.blockchainID
}

function _checkPAssetId(networkId: number, assetId: string, warnings: Set<string>) {
    let pAssetId = bintools.cb58Decode(Defaults.network[networkId].P.avaxAssetID!).toString("hex")
    if (assetId !== pAssetId) {
        warnings.add(warning.INVALID_ASSET)
    }
}

function _compareRecipients(
    recipients: Array<string>,
    utxoRecipients: Array<string>,
    warnings: Set<string>
) {
    if (recipients.length != 1) {
        return
    }
    if (utxoRecipients.length == 0) {
        return
    }
    if (utxoRecipients.length > 1 || utxoRecipients[0] !== recipients[0]) {
        warnings.add(warning.UNSPENT_AMOUNT_NOT_TO_RECIPIENT)
    }
}

function _sumValues(values: Array<BN>): BN {
    return values.reduce((p, c) => p.add(c), new BN(0))
}

function _addressToBech(networkId: number, addressHex: string): string {
    return bech32.encode(txnetwork.getHRP(networkId), bech32.toWords(Buffer.from(addressHex,"hex")))
}

function _gweiToWei(gweiValue: BN): BN {
    return gweiValue.mul(new BN(1e9))
}