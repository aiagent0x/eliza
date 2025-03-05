import {
    getFilteredRewards,
    getStakingYieldAprPercent,
    getTotalAprPercent,
    initializeSuilend,
    initializeSuilendRewards,
    LENDING_MARKET_ID,
    LENDING_MARKET_TYPE,
    SuilendClient,

} from "@suilend/sdk";
import {
    LIQUID_STAKING_INFO_MAP,
    LstClient,
    NORMALIZED_LST_COINTYPES,
} from "@suilend/springsui-sdk";
import { SuiClient } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { RedisClient } from "@elizaos/adapter-redis";
import { elizaLogger } from "@elizaos/core"
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redis = new RedisClient(REDIS_URL)


export enum Side {
    DEPOSIT = "deposit",
    BORROW = "borrow",
}
const suiClient = new SuiClient({
    url: "https://fullnode.mainnet.sui.io"
});

export async function listSuilendPool(job: any) {
    const initSuilen = async () => {
        const suilendClient = await SuilendClient.initialize(
            LENDING_MARKET_ID,
            LENDING_MARKET_TYPE,
            suiClient
        );

        const {
            lendingMarket,
            coinMetadataMap,

            reserveMap,
            refreshedRawReserves,
            reserveCoinTypes,
            reserveCoinMetadataMap,

            rewardCoinTypes,
            rewardCoinMetadataMap,
            obligations,
            obligationOwnerCaps,
        } = await initializeSuilend(suiClient, suilendClient);

        const { rewardPriceMap, rewardMap } = await initializeSuilendRewards(
            reserveMap,
            rewardCoinTypes,
            rewardCoinMetadataMap,
            obligations && obligations.length ? obligations : []
        );
        return {
            suilendClient,
            lendingMarket,
            coinMetadataMap,

            reserveMap,
            refreshedRawReserves,
            reserveCoinTypes,
            reserveCoinMetadataMap,

            rewardCoinTypes,
            rewardCoinMetadataMap,
            obligations,
            obligationOwnerCaps,

            rewardPriceMap,
            rewardMap,
        };
    };
    const {
        lendingMarket,
        reserveMap,
        rewardMap,
    } = await initSuilen();
    const lstAprPercentMapEntries = await Promise.all(
        NORMALIZED_LST_COINTYPES.filter(
            (lstCoinType) =>
                !!reserveMap[lstCoinType] &&
                !!Object.values(LIQUID_STAKING_INFO_MAP).find(
                    (info) => info.type === lstCoinType
                )
        )
            .map((lstCoinType) =>
                Object.values(LIQUID_STAKING_INFO_MAP).find(
                    (info) => info.type === lstCoinType
                )
            )
            .map((LIQUID_STAKING_INFO) =>
                (async () => {
                    const lstClient = await LstClient.initialize(
                        suiClient,
                        LIQUID_STAKING_INFO
                    );

                    const apr = await lstClient.getSpringSuiApy(); // TODO: Use APR
                    const aprPercent = new BigNumber(apr).times(100);

                    return [LIQUID_STAKING_INFO.type, aprPercent];
                })()
            )
    );
    const lstAprPercentMap = Object.fromEntries(lstAprPercentMapEntries);
    const revers = lendingMarket.reserves;
    let dataLendingMarket: any = [];
    for (const reserve of revers) {
        const totalDepositAprPercent = getTotalAprPercent(
            Side.DEPOSIT,
            reserve.depositAprPercent,
            getFilteredRewards(rewardMap[reserve.coinType].deposit),
            getStakingYieldAprPercent(Side.DEPOSIT, reserve, lstAprPercentMap)
        );
        const totalBorrowAprPercent = getTotalAprPercent(
            Side.BORROW,
            reserve.borrowAprPercent,
            getFilteredRewards(rewardMap[reserve.coinType].borrow)
        );
        let obj = {
            protocol: "suilend",
            type: reserve.token.coinType,
            decimals: reserve.token.decimals,
            symbol: reserve.token.symbol,
            description: reserve.token.symbol,
            img_icon: reserve.token.iconUrl,
            deposit_apr_percent: reserve.depositAprPercent.toString(),
            total_deposit_apr_percent: totalDepositAprPercent.toString(),
            borrow_apr_percent: reserve.borrowAprPercent.toString(),
            total_borrow_apr_percent: totalBorrowAprPercent.toString(),
            deposited_amount_usd: new BigNumber(reserve.depositedAmountUsd).toString(),
            deposited_amount: new BigNumber(reserve.depositedAmount).toString(),
            available_amount_usd: new BigNumber(reserve.availableAmountUsd).toString(),
            borrowed_amount_usd: new BigNumber(reserve.borrowedAmountUsd).toString(),
            total_supply_rate: parseFloat(totalDepositAprPercent.toString())
        }
        dataLendingMarket.push(obj)
        const success = await redis.hSet("STAKE_POOLS_SUILEND", obj.symbol.toLowerCase(), JSON.stringify(obj), 300);
        if (!success) {
            elizaLogger.error(`Failed to set data for pool ${obj.symbol} in Redis.`);
        }
    }
    return;
}
