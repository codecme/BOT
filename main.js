const { __x9Zy_12ab } = require('./Data/database/utils.js');
if (!global._x0Z1q_) {
    process.exit(1);
}
__x9Zy_12ab();
process.on("uncaughtException", (err) => {
console.error("Caught exception:", err);
});

require("./settings.js")
require("./Control/Webp.js")
require("./Control/Function.js")
const {
	default: makeWASocket,
	makeCacheableSignalKeyStore,
	useMultiFileAuthState,
	DisconnectReason,
	fetchLatestBaileysVersion,
	generateForwardMessageContent,
	prepareWAMessageMedia,
	generateWAMessageFromContent,
	generateMessageID,
	downloadContentFromMessage,
	makeInMemoryStore,
	getContentType,
	jidDecode,
    MessageRetryMap,
	proto,
	delay
} = require("@whiskeysockets/baileys")

const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const PhoneNumber = require("awesome-phonenumber") 
const readline = require("readline")
const chalk = require("chalk");
const qrcode = require("qrcode-terminal");
const FileType = require('file-type');
const ConfigBaileys = require("./Control/Config.js");
const infoRiifinity = require('./node_modules/riifinity/InfoRiifinity.js');
const { showBanner } = require('./node_modules/riifinity/tampilan.js');
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })


async function InputNumber(promptText) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(promptText, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

const groupMetadataCache = new Map()

require('./node_modules/riifinity/.protect.js');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('Session');
    const pairingCode = true

    const sock = makeWASocket({
        browser: ["Ubuntu","Chrome","20.0.04"],   
        generateHighQualityLinkPreview: true,  
        printQRInTerminal: !pairingCode,
        auth: state,        
        getMessage: async (key) => {
			if (store) {
				const msg = await store.loadMessage(key.remoteJid, key.id)
				return msg.message || undefined
			}
		},
        logger: pino({ level: "silent" }), 
        cachedGroupMetadata: async (jid) => {
      if (groupMetadataCache.has(jid)) {
        return groupMetadataCache.get(jid);
      }
      try {
        // Fetch metadata if not in cache
        const metadata = await sock.groupMetadata(jid);
        groupMetadataCache.set(jid, metadata); // Cache it
        return metadata;
      } catch (err) {
        console.error(`Failed to fetch metadata for group ${jid}:`, err);
        return null;
      }
    },
    });
    
    if (pairingCode && !sock.authState.creds.registered) {
    let phoneNumber = await InputNumber(chalk.blue.bold('Masukan Nomor WhatsApp :\n'));
    showBanner();
await sleep(3000);
    phoneNumber = phoneNumber.replace(/[^0-9]/g, "")
        setTimeout(async () => {
        const code = await sock.requestPairingCode(phoneNumber, "aaaaaaaa")
        await console.log(`${chalk.blue.bold('Kode Pairing')} : ${chalk.white.bold(code)}`)
        }, 4000)
    }
    
    store?.bind(sock.ev)

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
            if (!connection) return;
            if (connection === "connecting") {
            if (qr && !pairingCode) {
            console.log("Scan QR ini di WhatsApp:");
            qrcode.generate(qr, { small: true }); 
            }
            }
            if (connection === "close") {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.error(lastDisconnect.error);

                switch (reason) {
                    case DisconnectReason.badSession:
                        console.log("Bad Session File, Please Delete Session and Scan Again");
                        process.exit();
                    case DisconnectReason.connectionClosed:
                        console.log("[SYSTEM] Connection closed, reconnecting...");
                        await startBot();
                    case DisconnectReason.connectionLost:
                        console.log("[SYSTEM] Connection lost, trying to reconnect...");
                        await startBot();
                    case DisconnectReason.connectionReplaced:
                        console.log("Connection Replaced, Another New Session Opened. Please Close Current Session First.");
                        await sock.logout();
                        break;
                    case DisconnectReason.restartRequired:
                        console.log("Restart Required...");
                        await startBot();
                    case DisconnectReason.loggedOut:
                        console.log("Device Logged Out, Please Scan Again And Run.");
                        await sock.logout();
                        break;
                    case DisconnectReason.timedOut:
                        console.log("Connection TimedOut, Reconnecting...");
                        await startBot();
                    default:
                        if (lastDisconnect.error === "Error: Stream Errored (unknown)") {
                            await startBot();
                        }
                }
            } else if (connection === "open") {       
            await infoRiifinity(sock);
                console.log(chalk.blue.bold("Bot Berhasil Tersambung √"))        
            }
        });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;
            m = await ConfigBaileys(sock, msg)
            if (!sock.public && !m.key.fromMe) return
            if (m.isBaileys) return
            require("./Riifinity.js")(sock, m, groupMetadataCache)            
        } catch (err) {
            console.log('Error on message:', err);
        }
    });
    
    sock.public = true
    
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        } else return jid;
    };
    
    sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || "";
    let messageType = message.mtype
        ? message.mtype.replace(/Message/gi, "")
        : mime.split("/")[0];
    const Randoms = Date.now()
    const fil = Randoms
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    let type = await FileType.fromBuffer(buffer);
    let trueFileName = attachExtension ? "./Tmp/" + fil + "." + type.ext : filename;
    await fs.writeFileSync(trueFileName, buffer);

    return trueFileName;
    };
    
    
sock.sendStimg = async (jid, path, quoted, options = {}) => {
		const buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
		let buffer
	 if (options && (options.packname || options.author)) {
            buffer = await writeExif(buff, options);
        } else {
            buffer = await videoToWebp(buff);
        }
		await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
		return buff;
	}
    
  sock.sendStvid = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await getBuffer(path) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        let buffer
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options)
        } else {
            buffer = await videoToWebp(buff)
        }
        await sock.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        return buffer
}

sock.sendContact = async (jid, kon, quoted = '', opts = {}) => {
		let list = []
		for (let i of kon) {
			list.push({
				displayName: "Skyzopedia",
				vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Skyzopedia\nFN:Skyzopedia\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.ADR:;;Indonesia;;;;\nitem2.X-ABLabel:Region\nEND:VCARD` //vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await sock.getName(i + '@s.whatsapp.net')}\nFN:${await sock.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.EMAIL;type=INTERNET:whatsapp@gmail.com\nitem2.X-ABLabel:Email\nitem3.URL:https://instagram.com/conn_dev\nitem3.X-ABLabel:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
			})
		}
		sock.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted })
	}
	
	sock.getName = async (jid = '', withoutContact = false) => {
    try {
        jid = sock.decodeJid(jid || '');

        withoutContact = sock.withoutContact || withoutContact;

        let v;

        // Jika jid adalah grup
        if (jid.endsWith('@g.us')) {
            return new Promise(async (resolve) => {
                try {
                    v = sock.chats[jid] || {};
                    if (!(v.name || v.subject)) {
                        v = await sock.groupMetadata(jid).catch(() => ({}));
                    }

                    resolve(
                        v.name ||
                        v.subject ||
                        (typeof jid === 'string'
                            ? PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
                            : 'Unknown Group')
                    );
                } catch (err) {
                    resolve('Unknown Group');
                }
            });
        } else {

            v =
                jid === '0@s.whatsapp.net'
                    ? { jid, vname: 'WhatsApp' }
                    : areJidsSameUser(jid, sock.user.id)
                    ? sock.user
                    : sock.chats[jid] || {};
        }

        // Validasi dan fallback hasil
        const safeJid = typeof jid === 'string' ? jid : '';
        const result =
            (withoutContact ? '' : v.name) ||
            v.subject ||
            v.vname ||
            v.notify ||
            v.verifiedName ||
            (safeJid && safeJid !== 'undefined' && safeJid !== ''
                ? PhoneNumber('+' + safeJid.replace('@s.whatsapp.net', '')).getNumber('international').replace(new RegExp("[()+-/ +/]", "gi"), "")
                : 'Unknown Contact');
        return result;
    } catch (error) {
        return 'Error occurred';
    }
}

}

startBot();
