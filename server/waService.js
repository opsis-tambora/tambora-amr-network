const axios = require('axios');

// Using the exact configuration you provided
const WAHA_URL = "http://10.33.70.60:3000/api/sendText";
const WA_API_KEY = "97e8c5ac2bab4c4f841e20745d1a4200";
const SESSION_NAME = "default";
const TARGET_NUMBER = "6282132249070@c.us"; 

async function sendNotification(device, status) {
    const isOffline = status === 'offline';
    const icon = isOffline ? '🚨' : '✅';
    const statusText = isOffline ? 'OFFLINE' : 'RECOVERED';
    
    let text = `${icon} *METER ${statusText}* ${icon}\n\n` +
               `*Device:* ${device.name}\n` +
               `*IP:* ${device.ip_address}\n` +
               `*Time:* ${new Date().toLocaleString()}`;

    try {
        await axios.post(WAHA_URL, {
            chatId: TARGET_NUMBER,
            text: text,
            session: SESSION_NAME
        }, {
            headers: { 
                'X-Api-Key': WA_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log(`[WAHA] Notification sent for ${device.name}`);
    } catch (error) {
        console.error("[WAHA] Failed to send message:", error.message);
    }
}

module.exports = { sendNotification };