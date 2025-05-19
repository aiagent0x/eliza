import { Plugin } from '@elizaos/core';
import { suiTokenPriceByAddress } from './actions/suiTokenPriceByAddress';
import { sendTokenBySymbol } from './actions/sendTokenBySymbol';
import { projectInfo } from './actions/projectCoinOverview';
import { suiTokenPriceBySymbol } from './actions/suiTokenPriceBySymbol';
import { swapSui } from './actions/swap';

const birdPlugin: Plugin = {
  name: "birdPlugin",
  description: "Everything about bird",
  actions: [
    swapSui,
    sendTokenBySymbol,
    projectInfo,
    suiTokenPriceBySymbol,
    suiTokenPriceByAddress,
],
  evaluators: [],
  providers: []
};

export default birdPlugin;
// export {suimarketPlugin as suimarketPlugin };
