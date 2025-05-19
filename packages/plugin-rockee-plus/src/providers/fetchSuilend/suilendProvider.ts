
import axios, { AxiosInstance } from "axios";

export class SuilendProvider {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: "https://api.suilend.fi",
            timeout: 5000,
        });
    }
    async listAprPercent(){
        const url = '/springsui/lst-info';
        let responseData = await this.axiosInstance.get(url);
        return responseData.data;
    }

}

export default SuilendProvider;