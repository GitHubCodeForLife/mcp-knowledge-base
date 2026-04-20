import fs from "node:fs";
import path from "node:path";
export function discoverFiles(config) {
    const out = [];
    for (const source of config.resolvedSources) {
        walk(source.absolutePath, source.absolutePath, source.fileTypes, out, source.name);
    }
    return out;
}
function walk(rootDir, currentDir, allowedExt, acc, mountName) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const ent of entries) {
        const abs = path.join(currentDir, ent.name);
        if (ent.isDirectory()) {
            walk(rootDir, abs, allowedExt, acc, mountName);
        }
        else if (ent.isFile()) {
            const ext = path.extname(ent.name).toLowerCase();
            if (!allowedExt.has(ext))
                continue;
            const inner = path.relative(rootDir, abs).split(path.sep).join("/");
            const relativePath = `${mountName}/${inner}`;
            acc.push({ relativePath, absolutePath: abs, extension: ext });
        }
    }
}
