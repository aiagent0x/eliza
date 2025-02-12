import axios, { AxiosInstance } from 'axios';

// Interfaces for token raw and flat data structures


export class GeckoTerminalProvider2 {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: "https://cms.rockee.ai/api/coin/get-coins",
      timeout: 5000,
    });
  }
  async getTokenDetails(category: string){
    const url = ``;
    try {
      const response = await this.api.get(url,{
        params:{
            category:category
        }
      });
      return response;
    } catch (error) {
    //   console.error(`Error fetching token details for ${tokenId}:`, error.message);
      return null;
    }
  }

}

export default GeckoTerminalProvider2;
