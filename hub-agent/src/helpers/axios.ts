import axios, { AxiosInstance } from "axios";
const axiosInstance: AxiosInstance = axios.create({
    baseURL: "http://localhost:3002/",
    timeout: 5000,
});

export async function sendMessage(agentA: string, agentB: string, text: string, roomId: string) {
    let response = await axiosInstance.post(`/${agentA}/message`, {
        text: text,
        userId: agentB,
        roomId: roomId
    })
    return response;
}