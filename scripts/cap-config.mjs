import fs from "fs";

const configPath = "./capacitor.config.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const mode = process.argv[2];

if (mode === "dev") {
  config.server ??= {};
  config.server.url = "http://127.0.0.1:5173";
  config.server.cleartext = true;
} else if (mode === "release") {
  if (config.server) {
    delete config.server.url;
  }
} else {
  console.error("Usage: node scripts/cap-config.mjs dev|release");
  process.exit(1);
}

fs.writeFileSync(
  configPath,
  JSON.stringify(config, null, 2) + "\n"
);