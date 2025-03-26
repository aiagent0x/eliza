
import axios, { AxiosInstance } from "axios";
const axiosInstance: AxiosInstance = axios.create({
    baseURL: "https://api.aijarvis.xyz",
    timeout: 1000,
});
export default async function verifyToken(token: string, address:string) {
    try {
        const response = await axiosInstance.get(`/api/users/profile/${address}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return {
            status:response.status,
            data:response.data
        };
    } catch (error) {
        console.error(error);
        return null;
    }
}