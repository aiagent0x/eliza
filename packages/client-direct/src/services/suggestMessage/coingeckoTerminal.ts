// import { elizaLogger, IAgentRuntime, Memory, State } from "@elizaos/core";
import axios, { AxiosInstance } from "axios";



export class GeckoTerminalProvider {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: "https://api.geckoterminal.com/api/v2",
      timeout: 5000,
    });
  }

  async fetchMultipleTokenOnNetwork(networkId: string = "sui-network", tokenAddresses: string[]) {
    const url = `/networks/${networkId}/tokens/multi/${tokenAddresses.join(",")}`;
    try {
        const response = await this.api.get(url,{params: {include: "top_pools"}});
        const pools = response.data;
        // Flatten and map pools
        return pools;
      } catch (error) {
        console.error(`Error fetching pools for token ${tokenAddresses.join(",")} on network ${networkId}:`, error.message);
        return [];
      }
  }

 
}

export default GeckoTerminalProvider;