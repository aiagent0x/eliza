import {
    formatRewards,
    getFilteredRewards,
    getStakingYieldAprPercent,
    getTotalAprPercent,
    initializeSuilend,
    initializeSuilendRewards,
    LENDING_MARKET_ID,
    LENDING_MARKET_TYPE,
    SuilendClient,
} from "@suilend/sdk";
import { SuiClient } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import SuilendProvider from "./suilendProvider";

export enum Side {
    DEPOSIT = "deposit",
    BORROW = "borrow",
}
const suiClient = new SuiClient({
    url: "https://fullnode.mainnet.sui.io",
});

export async function getDetail(symbol: string) {
    const suilendClient = await SuilendClient.initialize(
        LENDING_MARKET_ID,
        LENDING_MARKET_TYPE,
        suiClient
    );

    const {
        reserveMap,
        lendingMarket,
        activeRewardCoinTypes,
        rewardCoinMetadataMap,
    } = await initializeSuilend(suiClient, suilendClient);

    const { rewardPriceMap } = await initializeSuilendRewards(
        reserveMap,
        activeRewardCoinTypes
    );

    const rewardMap = formatRewards(
        reserveMap,
        rewardCoinMetadataMap,
        rewardPriceMap
    );

    const suilendProvider = new SuilendProvider();
    const lstAprPercent = await suilendProvider.listAprPercent();

    const lstAprPercentMap = Object.fromEntries(
        Object.values(lstAprPercent).map(({ LIQUID_STAKING_INFO, apy }) => [
            LIQUID_STAKING_INFO.type,
            new BigNumber(apy),
        ])
    );

    const revers = lendingMarket.reserves;
    let dataLendingMarket: any = [];
    for (const reserve of revers) {
        if (reserve.token.symbol.toLowerCase() === symbol.toLowerCase()) {
            const totalDepositAprPercent = getTotalAprPercent(
                Side.DEPOSIT,
                reserve.depositAprPercent,
                getFilteredRewards(rewardMap[reserve.coinType].deposit),
                getStakingYieldAprPercent(
                    Side.DEPOSIT,
                    reserve.coinType,
                    lstAprPercentMap
                )
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
                deposited_amount_usd: new BigNumber(
                    reserve.depositedAmountUsd
                ).toString(),
                deposited_amount: new BigNumber(
                    reserve.depositedAmount
                ).toString(),
                available_amount_usd: new BigNumber(
                    reserve.availableAmountUsd
                ).toString(),
                borrowed_amount_usd: new BigNumber(
                    reserve.borrowedAmountUsd
                ).toString(),
                total_supply_rate: parseFloat(
                    totalDepositAprPercent.toString()
                ),
            };
            dataLendingMarket.push(obj);
        }
    }
    return dataLendingMarket;
}
