
import axios, { AxiosInstance } from "axios";

export class CmsProvider {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: "https://cms.rockee.ai/api/coin",
            timeout: 5000,
        });
    }
    async getTokens(category:string){
        const url = '/get-coins';
        let responseData = await this.axiosInstance.get(url, { params: { category } });
        return responseData.data;
    }

}

export default CmsProvider;