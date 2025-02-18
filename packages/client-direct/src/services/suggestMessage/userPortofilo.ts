import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

import GeckoTerminalProvider from "./coingeckoTerminal";
import { elizaLogger } from "@elizaos/core";
export async function getUserPortofilo(addressWallet: string, agentName: string) {

    const userPortofilo = await client.getAllBalances({ owner: addressWallet });
    const coinTypes: string[] = userPortofilo.map((coin: any) => coin.coinType);
    const coingeckoTerminal = new GeckoTerminalProvider();
    let coinInfos: any = await coingeckoTerminal.fetchMultipleTokenOnNetwork("sui-network", coinTypes);
    
    const formattedCoinInfos = coinInfos.data.map((data: any) => ({
        type: data.attributes.address,
        name: data.attributes.name,
        symbol: data.attributes.symbol,
        decimals: data.attributes.decimals,
        image_url: data.attributes.image_url,
        total_supply: data.attributes.total_supply,
        price_usd: data.attributes.price_usd,
        fdv_usd: data.attributes.fdv_usd,
        total_reserve_in_usd: data.attributes.total_reserve_in_usd,
        volume_usd: data.attributes.volume_usd.h24,
        market_cap_usd: data.attributes.market_cap_usd
    }));

    userPortofilo.forEach((coin: any) => {
        const coinInfo = formattedCoinInfos.find((info: any) => info.type === coin.coinType);
        if (coinInfo) {
            Object.assign(coin, coinInfo);
        }
    });
    const responseData = {
        user: agentName,
        text: "User portofilo:",
        result: {
            type: "user_portofilo",
            data: userPortofilo
        }
    };
    return responseData
}