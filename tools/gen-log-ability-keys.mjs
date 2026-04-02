import fs from "fs";
const path = new URL("../js/game.js", import.meta.url);
const s = fs.readFileSync(path, "utf8");
const lines = s.split("\n");
const out = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('log(abilityName(ab) + "') || line.includes("log(abilityName(ab) + '")) {
    const m = line.match(/\+\s*["']([^"']+)["']/);
    if (m) out.push({ line: i + 1, suffix: m[1] });
  }
}
const uniq = [...new Set(out.map((o) => o.suffix))].sort();
for (const u of uniq) console.log(JSON.stringify(u));
