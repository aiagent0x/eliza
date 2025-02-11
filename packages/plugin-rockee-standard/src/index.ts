import { Plugin } from '@elizaos/core';
import { suiTokenPriceBySymbol } from './actions/suiTokenPriceBySymbol';


const rockeeStandardPlugin: Plugin = {
  name: "rockeeStandardPlugin",
  description: "Everything about rockee standard",
  actions: [
    suiTokenPriceBySymbol,
],
  evaluators: [],
  providers: []
};

export default rockeeStandardPlugin;
// export {suimarketPlugin as suimarketPlugin };
