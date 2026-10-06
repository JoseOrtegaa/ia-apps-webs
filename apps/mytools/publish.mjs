import { cp, mkdir, rm } from "node:fs/promises";
const dest = new URL("../../docs/mytools/", import.meta.url);
await mkdir(dest, { recursive: true });
await rm(new URL("assets/", dest), { recursive: true, force: true });
await cp(new URL("./dist/", import.meta.url), dest, { recursive: true });
console.log("Build copiado únicamente a docs/mytools.");
