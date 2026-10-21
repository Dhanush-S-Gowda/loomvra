import Redis from "ioredis";

const connection = new Redis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null
});

connection.on("connect", () => {
    console.log("Redis connected");
});

connection.on("error", err => {
    console.error(err);
});

export default connection;
