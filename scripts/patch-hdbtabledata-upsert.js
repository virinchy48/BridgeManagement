const fs = require("fs");
const path = require("path");

const targets = [
  "gen/db/src/gen/data/bridge.management-GISConfig.hdbtabledata",
];

for (const relPath of targets) {
  const filePath = path.resolve(__dirname, "..", relPath);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  for (const imp of data.imports) {
    imp.import_settings.upsert = true;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}
