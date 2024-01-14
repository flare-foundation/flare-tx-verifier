type NetworkId = {
    [key: number]: string
}

export const RPC: NetworkId = {
    14: "https://flare-api.flare.network/ext/bc/C/rpc",
    16: "https://coston-api.flare.network/ext/bc/C/rpc",
    19: "https://songbird-api.flare.network/ext/bc/C/rpc",
    114: "https://coston2-api.flare.network/ext/bc/C/rpc"
}

export const FLARE_CONTRACT_REGISTRY: NetworkId = {
    14: "0xad67fe66660fb8dfe9d6b1b4240d8650e30f6019",
    16: "0xad67fe66660fb8dfe9d6b1b4240d8650e30f6019",
    19: "0xad67fe66660fb8dfe9d6b1b4240d8650e30f6019",
    114: "0xad67fe66660fb8dfe9d6b1b4240d8650e30f6019"
}

export const EXPLORER: NetworkId = {
    14: "https://flare-explorer.flare.network/api",
    16: "https://coston-explorer.flare.network/api",
    19: "https://songbird-explorer.flare.network/api",
    114: "https://coston2-explorer.flare.network/api",
}