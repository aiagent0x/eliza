import { Plugin } from '@elizaos/core';
import { suiTokenPriceByAddress } from './actions/suiTokenPriceByAddress';
import { executeSwap } from './actions/swapBySymbol';
import { executeSwapByAddress } from './actions/swapByAddress';
import { sendTokenBySymbol } from './actions/sendTokenBySymbol';
import { checkTxhashOnSui } from './actions/checkInfoTxHash';
import { projectInfo } from './actions/projectCoinOverview';
import { suiTokenPriceBySymbol } from './actions/suiTokenPriceBySymbol';
import { topPotentialTokenOnSui } from './actions/topPotentialTokenOnSui';
import { swapSui } from './actions/swap';
import { questInfo } from './actions/quest';
import { taggingProvider } from './providers/taggingProvider';

const rockeeStandardPlugin: Plugin = {
  name: "rockeeStandardPlugin",
  description: "Everything about rockee standard",
  actions: [
    swapSui,
    // executeSwap,
    // executeSwapByAddress,
    sendTokenBySymbol,
    // checkTxhashOnSui,
    projectInfo,
    // topDexInfo,
    suiTokenPriceBySymbol,
    suiTokenPriceByAddress,
    // topPotentialTokenOnSui
    questInfo
],
  evaluators: [],
  providers: [taggingProvider]
};

export default rockeeStandardPlugin;

