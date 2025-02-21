import {
    Scallop,
} from '@scallop-io/sui-scallop-sdk'
const scallopSDK = new Scallop({
    networkType: 'mainnet'
});
const scallopQuery = await scallopSDK.createScallopQuery();
const listCoinName: any = ["usdc", "sbeth", "sbusdt", "sbwbtc", "weth", "wbtc", "wusdc", "wusdt", "sui", "wapt", "wsol", "cetus", "afsui", "hasui", "vsui", "sca", "fud", "deep", "fdusd", "blub", "musd"];
export class ScallopProvider {

    constructor() { }
    async listPools() {
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
        return marketPoolsArray;
    }

}

export default ScallopProvider;