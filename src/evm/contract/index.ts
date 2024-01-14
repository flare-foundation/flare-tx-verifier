import * as chain from "./chain"
import * as explorer from "./explorer"
import { ContractData, AbiContractData } from "./interface";
import { registry } from "./registry"
import { Interface } from "ethers";

export async function getContractData(
    network: number,
    address: string
): Promise<ContractData | null> {    
    let data = _getDataFromRegistry(network, address)
    if (data == null) {
        data = await _getDataFromExplorer(network, address)
    }
    return _toContractData(network, data)
}

export async function isFlareContract(
    network: number,
    address: string
): Promise<boolean> {
    return chain.isFlareNetworkContract(network, address)
}

function _getDataFromRegistry(
    network: number,
    address: string
): AbiContractData | null {
    return address in registry[network] ? registry[network][address] : null
}

async function _getDataFromExplorer(
    network: number,
    address: string
): Promise<AbiContractData | null> {
    return explorer.getContract(network, address)
}

async function _toContractData(
    network: number,
    data: AbiContractData | null
): Promise<ContractData | null> {
    if (data == null) {
        return null
    } else {
        let isFlareNetworkContract = await isFlareContract(network, data.address)
        return {
            ...data,
            isFlareNetworkContract,
            interface: Interface.from(data.abi)
        }
    }
}