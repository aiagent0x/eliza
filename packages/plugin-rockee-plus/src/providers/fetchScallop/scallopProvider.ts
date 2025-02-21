import {

    Scallop,
    ScallopQuery,

} from '@scallop-io/sui-scallop-sdk'
const scallopSDK = new Scallop({
    networkType: 'mainnet'
});
const scallopQuery = await scallopSDK.createScallopQuery();
export class ScallopProvider {

    constructor() {}
    async listPools(){
        const marketPools = await scallopQuery.getMarketPools(['sui']);
        console.log(marketPools)
        return
    }

}

export default ScallopProvider;