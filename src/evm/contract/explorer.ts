import * as settings from "../../settings"
import { AbiContractData } from "./interface"

interface Response {
    result: any,
    message: string,
    status: string
}

export async function getContract(
    network: number,
    address: string
): Promise<AbiContractData | null> {
    let contracts = await _get(network, `?module=contract&action=getsourcecode&address=${address}`) as Array<any>
    if (contracts.length > 1) {
        throw new Error("Unexpected number of contracts")
    } else if (contracts.length == 1) {
        return _parseContract(contracts[0])
    } else {
        return null
    }
}

export async function getContracts(
    network: number
): Promise<Array<AbiContractData>> {
    let contracts = new Array<AbiContractData>()
    let data = await _get(network, "?module=contract&action=listcontracts&page=0&offset=1000&filter=1") as Array<any>
    for (let item of data) {
        let contract = _parseContract(item)
        if (contract != null) {
            contracts.push(contract)
        }
    }
    return contracts
}

function _parseContract(contract: any): AbiContractData | null {
    if (contract && contract.Address && contract.ABI) {
        return {
            address: contract.Address.toLowerCase(),
            name: contract.ContractName,
            abi: contract.ABI
        }
    } else {
        return null
    }
}

async function _get(network: number, path: string): Promise<any> {
    let url = `${settings.EXPLORER[network]}${path}`
    let data = await fetch(url)
    let response = await data.json() as Response
    if (response.status !== "1") {
        throw new Error(response.message)
    }
    return response.result
}