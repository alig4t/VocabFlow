import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const file = new URL("../android/billing.local.properties", import.meta.url);
let contents = existsSync(file) ? readFileSync(file, "utf8") : "";
if (process.argv.includes("--init")) {
  if (!contents)
    contents = readFileSync(
      new URL("../android/billing.properties.example", import.meta.url),
      "utf8",
    );
  if (!/^developer\.secret=\S+/m.test(contents)) {
    const secret = randomBytes(32).toString("hex");
    contents = /^developer\.secret=/m.test(contents)
      ? contents.replace(
          /^developer\.secret=.*$/m,
          `developer.secret=${secret}`,
        )
      : `${contents}\ndeveloper.secret=${secret}\n`;
    writeFileSync(file, contents, "utf8");
    console.log(
      "Developer configuration initialized. Rebuild Android before using a code.",
    );
  }
}
const secret = contents.match(/^developer\.secret=(\S+)\s*$/m)?.[1];
if (!secret)
  throw new Error("Run with --init once to create the local developer secret.");
const suppliedDay = process.argv.find((arg) => /^\d{8}$/.test(arg));
const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const part = (type) => parts.find((value) => value.type === type).value;
const day = suppliedDay ?? `${part("year")}${part("month")}${part("day")}`;
const digest = createHmac("sha256", secret).update(`VocabFlow|${day}`).digest();
let bits = 0n;
for (const byte of digest.subarray(0, 5)) bits = (bits << 8n) | BigInt(byte);
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let code = "VF-";
for (let i = 7; i >= 0; i--)
  code += alphabet[Number((bits >> BigInt(i * 5)) & 31n)];
console.log(`${day}: ${code}`);
