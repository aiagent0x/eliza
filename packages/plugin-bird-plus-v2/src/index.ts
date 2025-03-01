import { Plugin } from '@elizaos/core';

import { stake } from './actions/stake';
import { liquidityCetus } from './actions/liquidityCetus';
import { topToken } from './actions/topToken';
import { myPortfolio } from './actions/myPortfolio';

const rockeePlusPlugin: Plugin = {
  name: "rockeePlusPlugin",
  description: "Everything about rockee plus",
  actions: [
    topToken,
    stake,
    liquidityCetus,
    myPortfolio
  ],
  evaluators: [],
  providers: []
};

export default rockeePlusPlugin;
