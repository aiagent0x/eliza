import axios, { AxiosInstance } from "axios";

export class CetusProvider {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://api-sui.cetus.zone/v2/sui",
      timeout: 5000,
    });
  }
  async fetchLiquidityPools(
    is_vaults:boolean = false,
    display_all_pools:boolean = false,
    has_mining:boolean = true,
    has_farming:boolean = true,
    no_incentives:boolean = true,
    order_by:string = "-vol",
    limit: number = 30,
    offset: number = 0
) {
    try {
      const response = await this.axiosInstance.get("/stats_pools", {
        params: {
          is_vaults,
          display_all_pools,
          has_mining,
          has_farming,
          no_incentives,
          order_by,
          limit,
          offset
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw new Error("Failed to fetch market data");
    }
  }
  async fetchDetailLiquidityPools(
    pool:string)
    {
    try {
        const response = await this.axiosInstance.get("/stats_pools", {
            params: {
              pool
            },
          });
        return response.data;
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw new Error("Failed to fetch market data");
    }
  }
}

export default CetusProvider;