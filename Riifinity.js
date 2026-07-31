const util = require("util");
const chalk = require("chalk");
const fs = require("fs");
const axios = require("axios");
const fetch = require("node-fetch");
const { exec, spawn, execSync } = require('child_process');

module.exports = async (sock, m, store) => {
try {
const isCmd = m?.body?.startsWith(m.prefix)
const quoted = m.quoted ? m.quoted : m
const mime = quoted?.msg?.mimetype || quoted?.mimetype || null
const args = m.body.trim().split(/ +/).slice(1)
const qmsg = (m.quoted || m)
const text = q = args.join(" ")
const isOwner = global.owner+"@s.whatsapp.net" == m.sender || m.key.fromMe
const command = isCmd ? m.body.slice(m.prefix.length).trim().split(' ').shift().toLowerCase() : ''
const cmd = m.prefix + command
const botNumber = await sock.decodeJid(sock.user.id)
try {
  m.isGroup = m.chat.endsWith('g.us');
  if (m.isGroup) {
    let meta = store.get(m.chat)
    m.metadata = meta;
    const p = meta.participants || [];
    m.isAdmin = p.some(i => i.id === m.sender && i.admin);
    m.isBotAdmin = p.some(i => i.id === botNumber && i.admin);
  } else {
    m.metadata = {};
    m.isAdmin = false;
    m.isBotAdmin = false;
  }
} catch {
  m.metadata = {};
  m.isAdmin = false;
  m.isBotAdmin = false;
}


//=============================================//

const FakeChannel = {
  key: {
    remoteJid: 'status@broadcast',
    fromMe: false,
    participant: '0@s.whatsapp.net'
  },
  message: {
    newsletterAdminInviteMessage: {
      newsletterJid: '123@newsletter',
      caption: `Powered By Riifinity.`,
      inviteExpiration: 0
    }
  }
}

const FakeLocation = {
  key: {
    participant: '0@s.whatsapp.net',
    ...(m.chat ? { remoteJid: 'status@broadcast' } : {})
  },
  message: {
    locationMessage: {
      name: `ᴘᴏᴡᴇʀᴇᴅ ʙʏ .`,
      jpegThumbnail: ''
    }
  }
}


//=============================================//

switch (command) {
case "menu": {
const teks = `
 • Botmode: ${sock.public ? "Public" : "Self"}
 • Runtime: ${runtime(process.uptime())}
 • Owner: @${global.owner}
 
┌──⭓ *Listmenu*
│
│⭔ .pushkontak
│⭔ .savekontak
│⭔ .stoppush
│⭔ .jpm
│⭔ .stopjpm
│⭔ .payment
│
└───────⭓
`
await sock.sendMessage(m.chat, {text: teks, mentions: [m.sender, global.owner+"@s.whatsapp.net"]}, {quoted: FakeChannel })
}
break;


case "payment": case "pay": {
const teksPayment = `
*Daftar Payment ${namaOwner} 🔖*

* *Dana :* ${global.dana}
* *Ovo :* ${global.ovo}
* *Gopay :* ${global.gopay}

*Penting!*
Wajib kirimkan bukti transfer demi keamanan bersama!
`
return sock.sendMessage(m.chat, {image: {url: global.qris}, caption: teksPayment}, {quoted: FakeChannel})
}
break;

case "backupsc":
case "bck":
case "backup": {
    if (m.sender.split("@")[0] !== global.owner && m.sender !== botNumber)
        return m.reply("Fitur ini hanya untuk owner pemilik bot!");
    try {        
        const tmpDir = "./Tmp";
        if (fs.existsSync(tmpDir)) {
            const files = fs.readdirSync(tmpDir).filter(f => !f.endsWith(".js"));
            for (let file of files) {
                fs.unlinkSync(`${tmpDir}/${file}`);
            }
        }
        await m.reply("Processing Backup Script . .");        
        const name = `Script-Riifinity`; 
        const exclude = ["node_modules", "Auth", "package-lock.json", "yarn.lock", ".npm", ".cache"];
        const filesToZip = fs.readdirSync(".").filter(f => !exclude.includes(f) && f !== "");

        if (!filesToZip.length) return m.reply("Tidak ada file yang dapat di-backup.");

        execSync(`zip -r ${name}.zip ${filesToZip.join(" ")}`);

        await sock.sendMessage(m.sender, {
            document: fs.readFileSync(`./${name}.zip`),
            fileName: `${name}.zip`,
            mimetype: "application/zip"
        }, { quoted: m });

        fs.unlinkSync(`./${name}.zip`);

        if (m.chat !== m.sender) m.reply("Script bot berhasil dikirim ke private chat.");
    } catch (err) {
        console.error("Backup Error:", err);
        m.reply("Terjadi kesalahan saat melakukan backup.");
    }
}
break;

case "jasher": case "jpm": case "jaser": {
if (!isOwner) return m.reply("Fitur ini untuk owner bot!")
if (!text) return m.reply(`Format salah!\n\nContoh penggunaan :\n.jpm teks & foto (opsional)`)
    let mediaPath
    const mimeType = mime
    if (/image/.test(mimeType)) {
        mediaPath = await sock.downloadAndSaveMediaMessage(qmsg)
    }
    const allGroups = await sock.groupFetchAllParticipating()
    const groupIds = Object.keys(allGroups)
    let successCount = 0
    const messageContent = mediaPath
        ? { image: await fs.readFileSync(mediaPath), caption: text }
        : { text }
    const senderChat = m.chat
    await m.reply(`Memproses ${mediaPath ? "JPM teks & foto" : "JPM teks"} ke ${groupIds.length} grup chat`)
    global.statusjpm = true
    
    for (const groupId of groupIds) {
        if (global.stopjpm) {
        delete global.stopjpm
        delete global.statusjpm
        break
        }
        try {
            await sock.sendMessage(groupId, messageContent, { quoted: FakeChannel })
            successCount++
        } catch (err) {
            console.error(`Gagal kirim ke grup ${groupId}:`, err)
        }
        await sleep(global.JedaJpm)
    }

    if (mediaPath) await fs.unlinkSync(mediaPath)
    delete global.statusjpm
    await sock.sendMessage(senderChat, {
        text: `JPM ${mediaPath ? "teks & foto" : "teks"} berhasil dikirim ke ${successCount} grup.`,
    }, { quoted: m })
}
break

case "sticker": case "stiker": case "sgif": case "s": {
if (!/image|video/.test(mime)) return m.reply("Kirim foto nya!")
if (/video/.test(mime)) {
if ((qmsg).seconds > 15) return m.reply("Durasi vidio maksimal 15 detik!")
}
var media = await sock.downloadAndSaveMediaMessage(qmsg)
await sock.sendStimg(m.chat, media, m, {packname: "Whatsapp Bot 2024"})
await fs.unlinkSync(media)
}
break

case "self": case "public": {
if (!isOwner) return m.reply("Khusus developer bot!")
let status = true
if (command == "self") status = false
sock.public = status
return m.reply(`Berhasil mengganti ke mode ${command}`)
}
break

case "pushkontak": case "puskontak": {
if (!isOwner) return m.reply("Khusus developer bot!")
if (!text) return m.reply(`Masukan pesannya\n*Contoh:* ${cmd} pesannya`)
global.textpushkontak = text
let rows = []
const a = await sock.groupFetchAllParticipating()
if (a.length < 1) return m.reply("Tidak ada grup chat.")
const Data = Object.values(a)
let number = 0
for (let u of Data) {
const name = u.subject || "Unknown"
rows.push({
title: name,
description: `Total Member: ${u.participants.length}`, 
id: `.pushkontak-response ${u.id}`
})
}
await sock.sendMessage(m.chat, {
  buttons: [
    {
    buttonId: 'action',
    buttonText: { displayText: 'ini pesan interactiveMeta' },
    type: 4,
    nativeFlowInfo: {
        name: 'single_select',
        paramsJson: JSON.stringify({
          title: 'Pilih Grup',
          sections: [
            {
              title: `© Powered By ${namaOwner}`,
              rows: rows
            }
          ]
        })
      }
      }
  ],
  headerType: 1,
  viewOnce: true,
  text: `\nPilih Target Grup Pushkontak\n`
}, { quoted: m })
}
break

case "pushkontak-response": {
  if (!isOwner) return m.reply("Khusus developer bot!")
  if (!global.textpushkontak) return m.reply(`Data teks pushkontak tidak ditemukan!\nSilahkan ketik *.pushkontak* pesannya`);
  const teks = global.textpushkontak
  const jidawal = m.chat
  const data = await sock.groupMetadata(text)
  const halls = data.participants
    .filter(v => v.id && v.id.endsWith('.net'))
    .map(v => v.id)
    .filter(id => id !== botNumber && id.split("@")[0] !== global.owner); 

  await m.reply(`🚀 Memulai pushkontak ke dalam grup ${data.subject} dengan total member ${halls.length}`);
  
  global.statuspush = true
  
 delete global.textpushkontak
 
  for (const mem of halls) {
    if (global.stoppush) {
    delete global.stoppush
    delete global.statuspush
    break
    }
    await sock.sendMessage(mem, { text: teks }, { quoted: FakeChannel });
    await global.sleep(global.JedaPushkontak);
  }
  
  delete global.statuspush
  await m.reply(`✅ Sukses pushkontak!\nPesan berhasil dikirim ke *${halls.length}* member.`, jidawal)
}
break

case "savekontak": case "svkontak": {
if (!isOwner) return m.reply("Khusus developer bot!")
if (!text) return m.reply(`Masukan namakontak\n*Contoh:* ${cmd} Riifinity`)
global.namakontak = text
let rows = []
const a = await sock.groupFetchAllParticipating()
if (a.length < 1) return m.reply("Tidak ada grup chat.")
const Data = Object.values(a)
let number = 0
for (let u of Data) {
const name = u.subject || "Unknown"
rows.push({
title: name,
description: `Total Member: ${u.participants.length}`, 
id: `.savekontak-response ${u.id}`
})
}
await sock.sendMessage(m.chat, {
  buttons: [
    {
    buttonId: 'action',
    buttonText: { displayText: 'ini pesan interactiveMeta' },
    type: 4,
    nativeFlowInfo: {
        name: 'single_select',
        paramsJson: JSON.stringify({
          title: 'Pilih Grup',
          sections: [
            {
              title: `© Powered By ${namaOwner}`,
              rows: rows
            }
          ]
        })
      }
      }
  ],
  headerType: 1,
  viewOnce: true,
  text: `\nPilih Target Grup Savekontak\n`
}, { quoted: m })
}
break

case "savekontak-response": {
  if (!isOwner) return m.reply("Khusus developer bot!")
  if (!global.namakontak) return m.reply(`Data nama savekontak tidak ditemukan!\nSilahkan ketik *.savekontak* namakontak`);
  try {
    const res = await sock.groupMetadata(text)
    const halls = res.participants
      .filter(v => v.id.endsWith('.net'))
      .map(v => v.id)
      .filter(id => id !== botNumber && id.split("@")[0] !== global.owner)

    if (!halls.length) return m.reply("Tidak ada kontak yang bisa disimpan.")
    let names = text
    const existingContacts = JSON.parse(fs.readFileSync('./Data/contacts.json', 'utf8') || '[]')
    const newContacts = [...new Set([...existingContacts, ...halls])]

    fs.writeFileSync('./Data/contacts.json', JSON.stringify(newContacts, null, 2))

    // Buat file .vcf
    const vcardContent = newContacts.map(contact => {
      const phone = contact.split("@")[0]
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${global.namakontak} - ${phone}`,
        `TEL;type=CELL;type=VOICE;waid=${phone}:+${phone}`,
        "END:VCARD",
        ""
      ].join("\n")
    }).join("")

    fs.writeFileSync("./Data/contacts.vcf", vcardContent, "utf8")

    // Kirim ke private chat
    if (m.chat !== m.sender) {
      await m.reply(`Berhasil membuat file kontak dari grup ${res.subject}\n\nFile kontak telah dikirim ke private chat\nTotal ${halls.length} kontak`)
    }

    await sock.sendMessage(
      m.sender,
      {
        document: fs.readFileSync("./Data/contacts.vcf"),
        fileName: "contacts.vcf",
        caption: `File kontak berhasil dibuat ✅\nTotal ${halls.length} kontak`,
        mimetype: "text/vcard",
      },
      { quoted: m }
    )
    
    delete global.namakontak

    fs.writeFileSync("./Data/contacts.json", "[]")
    fs.writeFileSync("./Data/contacts.vcf", "")

  } catch (err) {
    m.reply("Terjadi kesalahan saat menyimpan kontak:\n" + err.toString())
  }
}
break

case "stopjpm": {
if (!isOwner) return m.reply("Khusus developer bot!")
if (!global.statusjpm) return m.reply("Jpm sedang tidak berjalan!")
global.stopjpm = true
return m.reply("Berhasil menghentikan jpm ✅")
}
break

case "stoppushkontak": case "stoppush": case "stoppus": {
if (!isOwner) return m.reply("Khusus developer bot!")
if (!global.statuspush) return m.reply("Pushkontak sedang tidak berjalan!")
global.stoppush = true
return m.reply("Berhasil menghentikan pushkontak ✅")
}
break

default:
if (m.text.toLowerCase().startsWith("xx")) {
    if (!isOwner) return;

    try {
        const result = await eval(`(async () => { ${text} })()`);
        const output = typeof result !== "string" ? util.inspect(result) : result;
        return sock.sendMessage(m.chat, { text: util.format(output) }, { quoted: m });
    } catch (err) {
        return sock.sendMessage(m.chat, { text: util.format(err) }, { quoted: m });
    }
}

if (m.text.toLowerCase().startsWith("x")) {
    if (!isOwner) return;

    try {
        let result = await eval(text);
        if (typeof result !== "string") result = util.inspect(result);
        return sock.sendMessage(m.chat, { text: util.format(result) }, { quoted: m });
    } catch (err) {
        return sock.sendMessage(m.chat, { text: util.format(err) }, { quoted: m });
    }
}

if (m.text.startsWith('$')) {
    if (!isOwner) return;
    
    exec(m.text.slice(2), (err, stdout) => {
        if (err) {
            return sock.sendMessage(m.chat, { text: err.toString() }, { quoted: m });
        }
        if (stdout) {
            return sock.sendMessage(m.chat, { text: util.format(stdout) }, { quoted: m });
        }
    });
}

}

} catch (err) {
console.log(err)
await sock.sendMessage(global.owner+"@s.whatsapp.net", {text: err.toString()}, {quoted: m ? m : null })
}}

//=============================================//

process.on("uncaughtException", (err) => {
console.error("Caught exception:", err);
});

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.blue(">> Update File:"), chalk.black.bgWhite(__filename));
    delete require.cache[file];
    require(file);
});