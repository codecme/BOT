const chalk = require("chalk");
const fs = require("fs");

global.owner = "628812555389"
global.namaOwner = "Ananta"

global.dana = "0895383301627"
global.ovo = "0895383301627"
global.gopay = "0895383301627"
global.qris = "https://files.catbox.moe/dxk4lk.jpeg"

global.JedaPushkontak = 3500 // 1000 = 1detik
global.JedaJpm = 5000  // 1000 = 1detik

let file = require.resolve(__filename) 
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(chalk.blue(">> Update File :"), chalk.black.bgWhite(`${__filename}`))
delete require.cache[file]
require(file)
})