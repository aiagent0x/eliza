import { Plugin } from '@elizaos/core';
import { suiTokenPriceByAddress } from './actions/suiTokenPriceByAddress';
import { sendTokenBySymbol } from './actions/sendTokenBySymbol';
import { projectInfo } from './actions/projectCoinOverview';
import { suiTokenPriceBySymbol } from './actions/suiTokenPriceBySymbol';
import { swapSui } from './actions/swap';
import { questInfo } from './actions/quest';
import { taggingProvider } from './providers/taggingProvider';

const rockeeStandardPlugin: Plugin = {
  name: "rockeeStandardPlugin",
  description: "Everything about rockee standard",
  actions: [
    swapSui,
    sendTokenBySymbol,
    projectInfo,
    suiTokenPriceBySymbol,
    suiTokenPriceByAddress,
    questInfo
],
  evaluators: [],
  providers: [taggingProvider]
};

export default rockeeStandardPlugin;

