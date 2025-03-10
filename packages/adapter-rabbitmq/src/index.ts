import amqplib, { Connection, Channel } from 'amqplib';


export class RabbitMQ {
    private connection: any | null = null;
    private channel: amqplib.Channel | null = null;
    private queues: string[];
    private url: string;
    private prefetch: number;

    constructor(url: string = 'amqp://localhost', queues: string[] = ['default_queue'], prefetch: number = 1) {
        this.url = url;
        this.queues = queues;
        this.prefetch = prefetch;
    }

    private async connect(): Promise<void> {
        if (!this.connection) {
            try {
                const connection: any = await amqplib.connect(this.url);
                this.connection = connection;
                this.channel = await connection.createChannel();

                this.channel.prefetch(this.prefetch);
                for (const queue of this.queues) {
                    await this.channel.assertQueue(queue, { durable: true });
                }

                this.connection.on('close', async () => {
                    console.log('Connection closed, reconnecting...');
                    this.connection = null;
                    this.channel = null;
                    await this.connect();
                });
            } catch (error) {
                console.error('Error connecting to RabbitMQ:', error);
                setTimeout(() => this.connect(), 5000); // Retry connection after 5s
            }
        }
    }

    async publish(queue: string, message: string): Promise<void> {
        await this.connect();
        if (this.channel) {
            this.channel.sendToQueue(queue, Buffer.from(message), { persistent: true });
            console.log(`[x] Sent to '${queue}': '${message}'`);
        }
    }

    async consume(queue: string, callback: (msg: string) => void): Promise<void> {
        await this.connect();
        if (this.channel) {
            let messageCount = 0;
            let startTime = Date.now();

            this.channel.consume(queue, (msg) => {
                if (msg) {
                    const currentTime = Date.now();
                    const elapsedTime = (currentTime - startTime) / 1000; // in seconds

                    if (elapsedTime > 1) {
                        messageCount = 0;
                        startTime = currentTime;
                    }

                    if (messageCount < 10000) {
                        callback(msg.content.toString());
                        this.channel?.ack(msg);
                        messageCount++;
                    } else {
                        console.log('Rate limit exceeded, message deferred');
                        setTimeout(() => this.channel?.nack(msg, false, true), 100); // Requeue the message after a short delay
                    }
                }
            }, { noAck: false });
            console.log(`[*] Waiting for messages in '${queue}'. To exit, press CTRL+C`);
        }
    }

    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
            this.channel = null;
        }
    }
}