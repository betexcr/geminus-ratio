const fs = require("fs");
const t = fs.readFileSync("js/game.js", "utf8");
const re = /\{ aid: "([^"]+)", name: "([^"]*)", desc: "((?:[^"\\]|\\.)*)"/g;
const keys = [];
let m;
while ((m = re.exec(t))) keys.push(m[1]);
console.log(keys.length);
fs.writeFileSync("tools/aids-list.txt", keys.join("\n"));
