import axios, { AxiosInstance } from "axios";
const axiosInstance: AxiosInstance = axios.create({
    baseURL: "http://localhost:3002/",
    timeout: 60000,
});

export async function sendMessage(agentA: string, agentB: string, text: string, roomId: string) {
    let response = await axiosInstance.post(`/${agentA}/message`, {
        text: text,
        userId: agentB,
        roomId: roomId
    }, {
        headers: {
            Authorization: "Bearer 73947db7-8515-4191-bf0d-64fdd8c5b902"
        }
    })
    return response;
}