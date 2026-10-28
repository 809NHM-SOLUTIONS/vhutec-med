
const { io } = require("socket.io-client");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Paste the patient JWT token: ", (token) => {
    token = token.trim();

    if (!token) {
        console.error("A JWT token is required.");
        rl.close();
        process.exit(1);
    }

    const socket = io("http://localhost:5000", {
        auth: { token },
        transports: ["websocket"],
        timeout: 10000
    });

    socket.on("connect", () => {
        console.log("SUCCESS: Socket connected.");
        console.log("Socket ID:", socket.id);
        console.log("Waiting for notification:new events...");
        console.log("Keep this terminal open during the test.");
    });

    socket.on("connect_error", (error) => {
        console.error("Socket connection failed:", error.message);
    });

    socket.on("notification:new", (notification) => {
        console.log("\nLIVE NOTIFICATION RECEIVED:");
        console.log(JSON.stringify(notification, null, 2));
    });

    socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
    });

    rl.close();
});
