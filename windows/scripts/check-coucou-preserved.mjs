import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const base = "b6d2d00ac6c3934187a0656e287039f4cbad71e5";
const original = file => execFileSync("git", ["show", `${base}:${file}`], { cwd: root, encoding: "utf8" });
const current = file => readFileSync(path.join(root, file), "utf8");
const failures = [];
function containsAll(label, old, now) {
  const missing = [...new Set(old)].filter(value => !now.includes(value));
  if (missing.length) failures.push(`${label}: ${missing.join(", ")}`);
  else console.log(`${label}: сохранено ${new Set(old).size}`);
}
const handlerNames = text => (text.match(/generate_handler!\[([\s\S]*?)\]/)?.[1] ?? "").split(",").map(x => x.trim()).filter(Boolean);
containsAll("Tauri команды", handlerNames(original("windows/src-tauri/src/lib.rs")), handlerNames(current("windows/src-tauri/src/lib.rs")));
const ids = text => [...text.matchAll(/id:\s*"([^"]+)"/g)].map(m => m[1]);
for (const file of ["windows/src/core/pills.ts", "windows/src/core/providers.ts"]) containsAll(file, ids(original(file)), ids(current(file)));
const fields = text => [...text.matchAll(/pub (\w+):/g)].map(m => m[1]);
containsAll("Поля настроек", fields(original("windows/src-tauri/src/settings.rs")), fields(current("windows/src-tauri/src/settings.rs")));
const originals = execFileSync("git", ["ls-tree", "-r", "--name-only", base, "windows/src", "windows/src-tauri/src", "windows/hook"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/);
const missingFiles = originals.filter(file => !existsSync(path.join(root, file)));
if (missingFiles.length) failures.push(`Удалены исходники: ${missingFiles.join(", ")}`);
else console.log(`Исходные файлы: сохранено ${originals.length}`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log("Структура Coucou сохранена. Это проверка контрактов, а не подтверждение работы ОС, сервисов или macOS-функций в Windows.");
