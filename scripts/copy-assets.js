const fs = require("fs");
const path = require("path");

const srcPublic = path.join(__dirname, "..", "src", "webapp", "public");
const destDist = path.join(__dirname, "..", "dist", "webapp", "public");
const destVercel = path.join(__dirname, "..", "public", "app");
const srcSchema = path.join(__dirname, "..", "src", "database", "schema.sql");
const destSchema = path.join(__dirname, "..", "dist", "database", "schema.sql");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyDir(srcPublic, destDist);
copyDir(srcPublic, destVercel);
fs.mkdirSync(path.dirname(destSchema), { recursive: true });
fs.copyFileSync(srcSchema, destSchema);
console.log("Assets copied to dist/ and public/app/");
