import {RedisClient} from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)

const tagging = ["swap_1_sui_to_usdc", "send_1_sui_to_address", "trending_tokens", "stake_pools"]

export async function filterByTagging(tag: string) {
    tag = tag.trim().toLowerCase();
    const text = tagging.find(t => t.replace(/\s+/g, '_') === tag.replace(/\s+/g, '_'));
    let responseData;
    let result;
    if(!text) return null;
    
    switch (text) {
        case "swap_1_sui_to_usdc":
            responseData = {
                "text": "Please ensure all details are correct before proceeding with the swap to prevent any losses.",
                "result": {
                    "type": "swap",
                    "data": {
                        "amount": "0",
                        "fromToken": {
                            "objectId": "0x9258181f5ceac8dbffb7030890243caed69a9599d2886d957a9cb7656af3bdb3",
                            "type": "0x2::sui::SUI",
                            "decimals": 9,
                            "symbol": "SUI",
                            "name": "Sui",
                            "iconUrl": "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
                            "verified": true
                        },
                        "toToken": {
                            "objectId": "0x8a775c4bbc9639c88e86fdc624bb30d0bfd22a1597b03da29198de214ddaa126",
                            "type": "0x909cba62ce96d54de25bec9502de5ca7b4f28901747bbf96b76c2e63ec5f1cba::coin::COIN",
                            "decimals": 8,
                            "symbol": "USDC",
                            "name": "USD Coin (Portal from BSC)",
                            "iconUrl": "https://co3xbx3vz2ww7tcs2tp4p36hdnkz677tuvqt6wgyfyoeefj6or6a.arweave.net/E7dw33XOrW_MUtTfx-_HG1Wff_OlYT9Y2C4cQhU-dHw",
                            "verified": true,
                            "bridgeProject": "Wormhole",
                            "tags": [
                                "Bridged"
                            ]
                        }
                    }
                }
            }
            break;
        case "send_1_sui_to_address":
            responseData = {
                "text": "Please ensure all details are correct before proceeding with the swap to prevent any losses.",
                "result": {
                    "type": "send_sui_chain",
                    "data": {
                        "amount": "0",
                        "token_info": {
                            "objectId": "0x9258181f5ceac8dbffb7030890243caed69a9599d2886d957a9cb7656af3bdb3",
                            "type": "0x2::sui::SUI",
                            "decimals": 9,
                            "symbol": "SUI",
                            "name": "Sui",
                            "iconUrl": "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png",
                            "verified": true
                        },
                        "destinationAddress": "0x00000"
                    }
                }
            }
            break;
        case "trending_tokens":
            result = await redis.hGet("coins_info", "trending");
            responseData = {
                "text": "Below are trending coins we have collected:",
                "action": "TOP_TRENDING_TOKENS",
                "result": {
                    "type": "sui_trending_tokens",
                    "data": JSON.parse(result).data.map((token: any) => ({
                        name: token.name,
                        symbol: token.symbol.toUpperCase(),
                        price: token.price,
                        market_cap: token.cap,
                        price_change_24h: token.change24h,
                        type:token.address,
                        iconUrl:token.logo
            
                    }))
                }
            }
            break;
        case "stake_pools":
            result = await redis.getValue({key:"STAKE_POOLS"});
            responseData = {
                text: "Below is a list of stake pools:",
                action:"STAKE_POOLS",
                result: {
                 type: "stake_pools",
                 data:JSON.parse(result),
            }}
            break;
        default:
            responseData=null;
    }
    return responseData;
}
