import axios, { AxiosInstance } from "axios";

export class BlockBerryProvider {
  private axiosInstance: AxiosInstance;

  constructor(apiKey: string) {
    this.axiosInstance = axios.create({
      baseURL: "https://api.blockberry.one/sui/v1",
      timeout: 60000,
      headers: {
        "x-api-key": apiKey,
      },
    });
  }

  async fetchDex(
    page: number = 0,
    size: number = 10,
    sortBy:string ,
    orderBy: string,
    period: string 
  ) {
    try {
      const response: any = await this.axiosInstance.post(
        `/dex?page=${page}&size=${size}&orderBy=${orderBy}&period=${period}&sortBy=${sortBy}`,
        {
          withTvlOnly: false,
        }
      );
      return response.data.content;
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw new Error("Failed to fetch market data");
    }
  }
}

export default BlockBerryProvider;
