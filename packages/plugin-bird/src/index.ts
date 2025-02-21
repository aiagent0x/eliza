import { Plugin } from '@elizaos/core';
import { suiTokenPriceByAddress } from './actions/suiTokenPriceByAddress';
import { executeSwap } from './actions/swapBySymbol';
import { executeSwapByAddress } from './actions/swapByAddress';
import { sendTokenBySymbol } from './actions/sendTokenBySymbol';
import { checkTxhashOnSui } from './actions/checkInfoTxHash';
import { projectInfo } from './actions/projectCoinOverview';
import { topDexInfo } from './actions/topDexByNetwork';
import { suiTokenPriceBySymbol } from './actions/suiTokenPriceBySymbol';
import { topPotentialTokenOnSui } from './actions/topPotentialTokenOnSui';
import { swapSui } from './actions/swap';

const birdPlugin: Plugin = {
  name: "birdPlugin",
  description: "Everything about bird",
  actions: [
    // executeSwap,
    // executeSwapByAddress,
    swapSui,
    sendTokenBySymbol,
    // checkTxhashOnSui,
    projectInfo,
    // topDexInfo,
    suiTokenPriceBySymbol,
    suiTokenPriceByAddress,
    // topPotentialTokenOnSui
],
  evaluators: [],
  providers: []
};

export default birdPlugin;
// export {suimarketPlugin as suimarketPlugin };
