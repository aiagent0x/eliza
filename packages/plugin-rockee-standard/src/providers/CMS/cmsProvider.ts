
import axios, { AxiosInstance } from "axios";

export class CMSProvider {
    private axiosInstance: AxiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: "https://cms.rockee.ai/api",
            timeout: 5000,
        });
    }
    async listProjects() {
        const url = '/project/get-projects';
        let responseData: any = await this.axiosInstance.get(url);
        if (!responseData && responseData.data.message === "fail") {
            return "";
        }
        let output = `List Project: \n`
        for (const project of responseData.data.data) {
            output += `Project Name: ${project.name}\n`;
            output += `Project Id: ${project._id}\n`;
            output += '\n';
        }
        return output;
    }
    async listProjectsV2() {
        const url = '/project/get-projects';
        let responseData: any = await this.axiosInstance.get(url);
        return responseData.data.data;
    }
    async projectDetail(id: string) {
        const url = `/project/project/${id}`;
        let responseData: any = await this.axiosInstance.get(url);
        return responseData.data;
    }
}

export default CMSProvider;