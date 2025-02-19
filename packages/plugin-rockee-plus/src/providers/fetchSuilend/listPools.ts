import {
    getFilteredRewards,
    initializeSuilend,
    initializeSuilendRewards,
    LENDING_MARKET_ID,
    LENDING_MARKET_TYPE,
    SuilendClient
} from "@suilend/sdk";
import {
    LIQUID_STAKING_INFO_MAP,
    LstClient,
    NORMALIZED_LST_COINTYPES,
} from "@suilend/springsui-sdk";
import { SuiClient } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const keypair = Ed25519Keypair.deriveKeypair('')
const STAKER = keypair.toSuiAddress();

export const Side = {
    ["DEPOSIT"]: "deposit",
    ["BORROW"]: "borrow",
};

const WALLET_RPC = "https://wallet-rpc.mainnet.sui.io";
const suiClient = new SuiClient({ url: WALLET_RPC });
const initSuilen = async (byAddress) => {
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
    } = await initializeSuilend(suiClient, suilendClient, byAddress);

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
} = await initSuilen(STAKER);
export async function listPool() {
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

    // console.log(rewardPriceMap, rewardMap);
    const revers = lendingMarket.reserves;
    for (const reserve of revers) {
        console.log(reserve.coinType);
        console.log("depositAprPercent", reserve.depositAprPercent.toString());
        const totalDepositAprPercent = getTotalAprPercent(
            "deposit",
            reserve.depositAprPercent,
            getFilteredRewards(rewardMap[reserve.coinType].deposit),
            getStakingYieldAprPercent("deposit", reserve, lstAprPercentMap)
        );
        console.log("totalDepositAprPercent", totalDepositAprPercent.toString());

        console.log("borrowAprPercent", reserve.borrowAprPercent.toString());
        const totalBorrowAprPercent = getTotalAprPercent(
            "borrow",
            reserve.borrowAprPercent,
            getFilteredRewards(rewardMap[reserve.coinType].borrow)
        );
        console.log("totalBorrowAprPercent", totalBorrowAprPercent.toString());
        console.log("=======");
    }
}
