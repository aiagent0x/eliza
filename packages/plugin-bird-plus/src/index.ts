import { Plugin } from '@elizaos/core';
// import { topMeme } from './actions/topMeMeToken';
// import { topDefi } from './actions/topDefiToken';
// import { trendingTokens } from './actions/trendingTokens';
// import { topNewMemeToken } from './actions/topNewMemeToken';
// import { topNftInfos } from './actions/topNft';
// import { stakePoolsNavi } from './actions/stakePools';
// import { stakeTokenPoolsNavi } from './actions/stakeToken';
// import { unstakeTokenPoolsNavi } from './actions/unstakeToken';
import { stake } from './actions/stake';
import { liquidityCetus } from './actions/liquidityCetus';
import { topToken } from './actions/topToken';

const birdPlusPlugin: Plugin = {
  name: "birdPlusPlugin",
  description: "Everything about bird Plus",
  actions: [
    // topMeme,
    // topDefi,
    // trendingTokens,
    // topNewMemeToken,
    // topNftInfos,
    // stakePoolsNavi,
    // stakeTokenPoolsNavi,
    // unstakeTokenPoolsNavi,
    topToken,
    stake,
    liquidityCetus

  ],
  evaluators: [],
  providers: []
};

export default birdPlusPlugin;
// export {suimarketPlugin as suimarketPlugin };
