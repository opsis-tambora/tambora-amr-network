const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const axios = require('axios');
const db = require('./database');

// Your WAHA configuration
const WAHA_URL = "http://10.33.70.151:3000/api/sendText";
const WA_API_KEY = "97e8c5ac2bab4c4f841e20745d1a4200";
const SESSION_NAME = "default";

// Fungsi bantuan untuk mengubah milidetik menjadi format HH.MM.SS
const formatDuration = (ms) => {
    if (!ms || ms < 0) return "00.00.00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Format agar selalu dua digit (misal: 01.05.09)
    return `${String(hours).padStart(2, '0')}.${String(minutes).padStart(2, '0')}.${String(seconds).padStart(2, '0')}`;
};

// Tambahkan parameter ketiga: offlineTime
const sendNotification = async (device, newStatus, offlineTime = null) => {
    // 1. Fetch live recipients from the database
    const recipients = await db.getRecipients();
    
    // 2. If no recipients are in the settings page, just skip sending
    if (recipients.length === 0) {
        console.log("[WAHA] No recipients configured. Skipping notification.");
        return;
    }

    const isOffline = newStatus === 'offline';
    const icon = isOffline ? '📵' : '🌐';
    const statusText = isOffline ? 'OFFLINE' : 'RECOVERED';
    
    // 3. Format the message dasar
    let textMessage = `${icon} *METER ${statusText}* ${icon}\n\n` +
               `*Device:* ${device.name}\n` +
               `*Site:* ${device.site || 'Unknown Site'}\n` +
               `*IP:* ${device.ip_address}\n`;

    // Penyesuaian format waktu berdasarkan status OFFLINE atau RECOVERED
    if (isOffline) {
        textMessage += `*Time:* ${new Date().toLocaleString('id-ID')}`;
    } else {
        // Jika RECOVERED, susun Time Offline, Time Online, dan Duration
        if (offlineTime) {
            textMessage += `*Time Offline:* ${new Date(offlineTime).toLocaleString('id-ID')}\n`;
        }
        textMessage += `*Time Online:* ${new Date().toLocaleString('id-ID')}`;
        
        if (offlineTime) {
            const durationMs = Date.now() - offlineTime; // Hitung selisih waktu
            textMessage += `\n*Duration:* ${formatDuration(durationMs)}`;
        }
    }

    // 4. Loop through the database recipients and send the message
    for (let person of recipients) {
        try {
            // Check if it's a group or an individual, and format the ID properly
            const chatId = person.type === 'group' ? `${person.phone}@g.us` : `${person.phone}@c.us`;
            
            // Send the HTTP POST request to WAHA using Axios
            await axios.post(WAHA_URL, {
                chatId: chatId,
                text: textMessage,
                session: SESSION_NAME
            }, {
                headers: {
                    'accept': 'application/json',
                    'X-Api-Key': WA_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[WAHA] Sent alert to ${person.name} (${chatId})`);
            
            // Random delay between 1.5s and 3.5s to prevent spam detection
            const randomDelay = Math.floor(Math.random() * (3500 - 1500 + 1)) + 1500;
            console.log(`Pausing for ${randomDelay}ms to prevent spam detection...`);
            await delay(randomDelay);

        } catch (error) {
            console.error(`[WAHA] Failed to send to ${person.name}:`, error.message);
        }
    }
}

module.exports = { sendNotification };