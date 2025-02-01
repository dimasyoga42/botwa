const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

let isConnected = false; // Flag untuk cek status koneksi
let retryCount = 0;
//const maxRetries = 5; // Maksimal percobaan ulang

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      if (!isConnected) {
        console.log("✅ Bot terhubung!");
        isConnected = true; // Set status koneksi ke true

        // Logika keep-alive untuk menjaga koneksi tetap hidup
        setInterval(() => {
          sock.sendMessage("status", { text: "Bot tetap aktif" });  // Mengirim pesan untuk menjaga koneksi
        }, 10000); // Kirim pesan setiap 10 detik untuk menjaga koneksi tetap hidup
      }
    } else if (connection === "close") {
      console.log("⚠ Koneksi terputus. Mencoba menyambung kembali...");
      isConnected = false; // Set status koneksi ke false jika terputus
      await reconnectBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text =
      msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    if (text.toLowerCase() === "menu") {
      await sock.sendMessage(sender, {
        image: fs.readFileSync("./𝙀𝙡𝙖𝙞𝙣𝙖 𝙄𝙄𝙘𝙤𝙣.jpeg"),
        caption: "1. toram\n2. Info\n3. Bantuan",
      });
    } else if (text.toLowerCase() === "toram") {
      await sock.sendMessage(sender, {
        text: "*menu toram*\n spot farming\n spot leveling\n code buff\n bosstat\n",
      });
    } else if (text.toLowerCase() === "halo") {
      await sock.sendMessage(sender, {
        text: "Halo! Ada yang bisa saya bantu?",
      });
    } else {
      await sock.sendMessage(sender, { text: "bot tidak mengerti" });
    }
  });
}

// Fungsi untuk mencoba menyambung kembali
async function reconnectBot() {
  if (retryCount < maxRetries) {
    try {
      retryCount++;
      console.log(`Menunggu 5 detik sebelum mencoba lagi... Coba ke-${retryCount}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await startBot(); // Mulai ulang bot hanya jika terputus
    } catch (error) {
      console.error("Gagal menyambung kembali. Coba lagi nanti.", error);
    }
  } else {
    console.error("Gagal terhubung setelah beberapa percobaan. Bot dihentikan.");
    process.exit(1); // Keluar setelah percobaan gagal terlalu banyak
  }
}

// Menjalankan bot pertama kali
startBot();
