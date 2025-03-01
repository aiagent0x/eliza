import {
    Scallop,
} from '@scallop-io/sui-scallop-sdk';
import { elizaLogger } from "@elizaos/core"
import { RedisClient } from "@elizaos/adapter-redis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)
const scallopSDK = new Scallop({
    networkType: 'mainnet'
});
const scallopQuery = await scallopSDK.createScallopQuery();
const listCoinName: any = ["usdc", "sbeth", "sbusdt", "sbwbtc", "weth", "wbtc", "wusdc", "wusdt", "sui", "wapt", "wsol", "cetus", "afsui", "hasui", "vsui", "sca", "fud", "deep", "fdusd", "blub", "musd"];
const listCoins: any = [{
    coin_name: "usdc",
    img_icon: "https://www.circle.com/hubfs/Brand/USDC/USDC_icon_32x32.png"
},
{
    coin_name: "sbeth",
    img_icon: "https://jhng3zbssnnpgkupluczr6x7gholyzj4icqb4rlf5zhrehexok7q.arweave.net/Sdpt5DKTWvMqj10FmPr_Mdy8ZTxAoB5FZe5PEhyXcr8"
},
{
    coin_name: "sbusdt",
    img_icon: "data:image/png;base64,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"
},
{
    coin_name: "sbwbtc",
    img_icon: "https://app.scallop.io/assets/sbwbtc-dU_LLe5S.webp"
},
{
    coin_name: "weth",
    img_icon: "https://app.scallop.io/assets/sbwbtc-dU_LLe5S.webp"
},
{
    coin_name: "wbtc",
    img_icon: "https://app.scallop.io/assets/sbwbtc-dU_LLe5S.webp"
},
{
    coin_name: "wusdc",
    img_icon: "https://klrhtty4kphjcsrez2eaeh6r27tbaayw3odjadigbrek544f3i2a.arweave.net/UuJ5zxxTzpFKJM6IAh_R1-YQAxbbhpANBgxIrvOF2jQ"
},
{
    coin_name: "wusdt",
    img_icon: "data:image/jpeg;base64,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"
},
{
    coin_name: "sui",
    img_icon: "https://strapi-dev.scand.app/uploads/sui_c07df05f00.png"
},
{
    coin_name: "wapt",
    img_icon: "https://app.scallop.io/assets/wapt-413_n0SE.png"
},
{
    coin_name: "wsol",
    img_icon: "https://strapi-dev.scand.app/uploads/Bez_nazvaniya_a03b9b6fbb.jpeg"
},
{
    coin_name: "cetus",
    img_icon: "https://strapi-dev.scand.app/uploads/Cetus_fd3e9a7dbd.png"
},
{
    coin_name: "afsui",
    img_icon: "https://aftermath.finance/coins/afsui.svg"
},
{
    coin_name: "afsui",
    img_icon: "https://aftermath.finance/coins/afsui.svg"
},

{
    coin_name: "hasui",
    img_icon: "https://assets.haedal.xyz/logos/hasui.svg"
},
{
    coin_name: "vsui",
    img_icon: "https://strapi-dev.scand.app/uploads/volo_SUI_Logo_f28ed9c6a1.png"
},
{
    coin_name: "sca",
    img_icon: "https://vrr7y7aent4hea3r444jrrsvgvgwsz6zi2r2vv2odhgfrgvvs6iq.arweave.net/rGP8fARs-HIDcec4mMZVNU1pZ9lGo6rXThnMWJq1l5E"
},
{
    coin_name: "fud",
    img_icon: "https://strapi-dev.scand.app/uploads/FUD_Logo_46c0468f49.jpg"
},
{
    coin_name: "deep",
    img_icon: "https://app.scallop.io/assets/deep-BSlmC92V.webp"
},

{
    coin_name: "fdusd",
    img_icon: "https://cdn.1stdigital.com/icon/fdusd.svg"
},

{
    coin_name: "blub",
    img_icon: "https://assets.coingecko.com/coins/images/39356/standard/Frame_38.png?1721888572"
},
{
    coin_name: "musd",
    img_icon: "https://app.scallop.io/assets/musd-BdCCBMx9.webp"
},
];
export async function listPoolScallop() {
    await scallopQuery.init();
    let marketPools: any = await scallopQuery.getMarketPools(listCoinName,{
        indexer: true,
    });
    let marketPoolsArray: any = []
    marketPools = marketPools.pools;
    Object.keys(marketPools).forEach((key, index) => {
        const coin = listCoins.find((c: any) => c.coin_name === marketPools[key].coinName);
        marketPoolsArray[index] = {
            img_icon: coin.img_icon,
            coin_name: marketPools[key].coinName,
            symbol: marketPools[key].symbol,
            market_coin_type: marketPools[key].marketCoinType,
            coin_type: marketPools[key].coinType,
            s_coin_type: marketPools[key].sCoinType,
            coin_wrapped_type: marketPools[key].coinWrappedType,
            coin_price: marketPools[key].coinPrice,
            high_kink: parseFloat(marketPools[key].highKink) * 100,
            mid_kink: parseFloat(marketPools[key].midKink) * 100,
            reserve_factor: parseFloat(marketPools[key].reserveFactor) * 100,
            borrow_weight: parseFloat(marketPools[key].borrowWeight) * 100,
            borrow_fee: parseFloat(marketPools[key].borrowFee) * 100,
            market_coin_supply_amount: parseFloat(marketPools[key].marketCoinSupplyAmount) * 100,
            min_borrow_amount: parseFloat(marketPools[key].minBorrowAmount) * 100,
            base_borrow_apr: parseFloat(marketPools[key].baseBorrowApr) * 100,
            base_borrow_apy: parseFloat(marketPools[key].baseBorrowApy) * 100,
            borrow_apr_on_high_kink: parseFloat(marketPools[key].borrowAprOnHighKink) * 100,
            borrow_apy_on_high_kink: parseFloat(marketPools[key].borrowApyOnHighKink) * 100,
            borrow_apr_on_mid_kink: parseFloat(marketPools[key].borrowAprOnMidKink) * 100,
            borrow_apy_on_mid_kink: parseFloat(marketPools[key].borrowApyOnMidKink) * 100,
            coin_decimal: marketPools[key].coinDecimal,
            max_borrow_apr: parseFloat(marketPools[key].maxBorrowApr) * 100,
            max_borrow_apy: parseFloat(marketPools[key].maxBorrowApy) * 100,
            borrow_apr: parseFloat(marketPools[key].borrowApr) * 100,
            borrow_apy: parseFloat(marketPools[key].borrowApy) * 100,
            borrow_index: marketPools[key].borrowIndex,
            growth_interest: marketPools[key].growthInterest,
            supply_amount: marketPools[key].supplyAmount,
            supply_coin: marketPools[key].supplyCoin,
            borrow_amount: marketPools[key].borrowAmount,
            borrow_coin: marketPools[key].borrowCoin,
            reserve_amount: marketPools[key].reserveAmount,
            reserve_coin: marketPools[key].reserveCoin,
            utilization_rate: parseFloat(marketPools[key].utilizationRate) * 100,
            supply_apr: parseFloat(marketPools[key].supplyApr) * 100,
            supply_apy: parseFloat(marketPools[key].supplyApy) * 100,
            total_supply_rate: parseFloat(marketPools[key].supplyApy) * 100,
            conversion_rate: marketPools[key].conversionRate,
            is_isolated: marketPools[key].isIsolated,
            max_supply_coin: marketPools[key].maxSupplyCoin,
            max_borrow_coin: marketPools[key].maxBorrowCoin,
            protocol: "scallop"

        };
    });

    for (let data of marketPoolsArray) {

        const success = await redis.hSet("STAKE_POOLS_SCALLOP", data.coin_name.toLowerCase(), JSON.stringify(data), 300);
        if (!success) {
            elizaLogger.error(`Failed to set data for pool ${data.name} in Redis.`);
        }
    }
    return
}