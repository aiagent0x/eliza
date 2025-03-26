
import axios, { AxiosInstance } from "axios";
const axiosInstance: AxiosInstance = axios.create({
    baseURL: "http://localhost:3000",
    timeout: 60000,
});

async function sendMessage(agentId: string, userId: string, roomId: string, text: string) {
    try {
   
        const formData = new URLSearchParams();
        formData.append("userId", userId);
        formData.append("roomId", roomId);
        formData.append("text", text);
        const response = await axiosInstance.post(`/${agentId}/message`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                "Authorization": "Bearer 73947db7-8515-4191-bf0d-64fdd8c5b902"
            },
        });
        return response.data;
    } catch (error) {
        console.log("sendMessage -> error", error);
        return null;
    }

}
export default { sendMessage };