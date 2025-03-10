import axios from 'axios';
import { Queue, Worker } from 'bullmq';

const API_URL = 'http://localhost:3002';
const AUTH_TOKEN = '73947db7-8515-4191-bf0d-64fdd8c5b902';

const chatQueue = new Queue('chat-queue');
const inputQueue = new Queue('input-queue');

async function sendMessage(sender: string, receiver: string, message: string, roomId: string) {
    try {
        const response = await axios.post(
            `${API_URL}/${sender}/message`,
            {
                text: message,
                userId: receiver,
                roomId: roomId,
            },
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Error sending message from ${sender} to ${receiver}:`, error);
    }
}

