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
export async function listPoolScallop() {
    let marketPools: any = await scallopQuery.getMarketPools(listCoinName);
    let marketPoolsArray: any = []
    marketPools = marketPools.pools;
    Object.keys(marketPools).forEach((key, index) => {
        marketPoolsArray[index] = {
            coin_name: marketPools[key].coinName,
            symbol: marketPools[key].symbol,
            market_coin_type: marketPools[key].marketCoinType,
            coin_type: marketPools[key].coinType,
            s_coin_type: marketPools[key].sCoinType,
            coin_wrapped_type: marketPools[key].coinWrappedType,
            coin_price: marketPools[key].coinPrice,
            high_kink: marketPools[key].highKink * 100,
            mid_kink: marketPools[key].midKink * 100,
            reserve_factor: marketPools[key].reserveFactor * 100,
            borrow_weight: marketPools[key].borrowWeight * 100,
            borrow_fee: marketPools[key].borrowFee * 100,
            market_coin_supply_amount: marketPools[key].marketCoinSupplyAmount * 100,
            min_borrow_amount: marketPools[key].minBorrowAmount * 100,
            base_borrow_apr: marketPools[key].baseBorrowApr * 100,
            base_borrow_apy: marketPools[key].baseBorrowApy * 100,
            borrow_apr_on_high_kink: marketPools[key].borrowAprOnHighKink * 100,
            borrow_apy_on_high_kink: marketPools[key].borrowApyOnHighKink * 100,
            borrow_apr_on_mid_kink: marketPools[key].borrowAprOnMidKink * 100,
            borrow_apy_on_mid_kink: marketPools[key].borrowApyOnMidKink * 100,
            coin_decimal: marketPools[key].coinDecimal,
            max_borrow_apr: marketPools[key].maxBorrowApr * 100,
            max_borrow_apy: marketPools[key].maxBorrowApy * 100,
            borrow_apr: marketPools[key].borrowApr * 100,
            borrow_apy: marketPools[key].borrowApy * 100,
            borrow_index: marketPools[key].borrowIndex,
            growth_interest: marketPools[key].growthInterest,
            supply_amount: marketPools[key].supplyAmount,
            supply_coin: marketPools[key].supplyCoin,
            borrow_amount: marketPools[key].borrowAmount,
            borrow_coin: marketPools[key].borrowCoin,
            reserve_amount: marketPools[key].reserveAmount,
            reserve_coin: marketPools[key].reserveCoin,
            utilization_rate: marketPools[key].utilizationRate * 100,
            supply_apr: marketPools[key].supplyApr * 100,
            supply_apy: marketPools[key].supplyApy * 100,
            total_supply_rate: marketPools[key].supplyApy * 100,
            conversion_rate: marketPools[key].conversionRate,
            is_isolated: marketPools[key].isIsolated,
            max_supply_coin: marketPools[key].maxSupplyCoin,
            max_borrow_coin: marketPools[key].maxBorrowCoin,
            protocol: "scallop"

        };
    });
    for (let data of marketPoolsArray) {
        const success = await redis.hSet("STAKE_POOLS_NAVI", data.coin_name, JSON.stringify(data), 300);
        if (!success) {
            elizaLogger.error(`Failed to set data for pool ${data.name} in Redis.`);
        }
    }
    return
}