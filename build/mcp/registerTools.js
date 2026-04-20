import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { extractText } from "../ingestion/extract.js";
import { normalizePathPrefix } from "../paths/pathPrefix.js";
import { resolveDocumentPath } from "../paths/resolveDocument.js";
import { mergeMultiQueryScores, rankHitsFromMap, retrieveFusedRankedUnbounded, retrieveRankedWithOptions, } from "../search/hybridRetriever.js";
function toolDescription(config, name, fallback) {
    const t = config.tools.find((x) => x.name === name);
    return t?.description ?? fallback;
}
function defaultCandidatePool(topK, configured) {
    if (configured !== undefined && configured > 0)
        return configured;
    return Math.max(topK * 4, topK);
}
function formatHits(hits, includeMetadata) {
    if (hits.length === 0) {
        return "No matching chunks found in the indexed documents.";
    }
    const lines = hits.map((h, i) => `${i + 1}. [${h.relativePath} #${h.chunkIndex}] score=${h.fusionScore.toFixed(4)} method=${h.retrievalMethod}\n${h.text}`);
    let text = lines.join("\n\n---\n\n");
    if (includeMetadata) {
        const payload = hits.map((h) => ({
            id: h.id,
            denseScore: h.denseScore,
            lexicalScore: h.lexicalScore,
            fusionScore: h.fusionScore,
            retrievalMethod: h.retrievalMethod,
        }));
        text += `\n\n---\n\n--- retrieval_metadata (JSON) ---\n${JSON.stringify({ hits: payload }, null, 2)}`;
    }
    return text;
}
function safeSlug(s) {
    const base = s
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return base || "untitled";
}
function stripLeadingMountPrefix(input, mountName) {
    const trimmed = input.trim();
    if (!trimmed)
        return trimmed;
    const normalized = trimmed.replace(/\\/g, "/");
    const prefix = `${mountName}/`;
    if (normalized === mountName)
        return "";
    if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
        return normalized.slice(prefix.length);
    }
    return trimmed;
}
function getMountRoot(config, mountName) {
    return config.resolvedSources.find((s) => s.name === mountName)?.absolutePath ?? null;
}
function ensureWikiEntryPoints(config) {
    const wikiMount = config.knowledge_base.layers?.wiki_source ?? "wiki";
    const wikiRoot = getMountRoot(config, wikiMount);
    if (!wikiRoot)
        return;
    const indexPath = path.join(wikiRoot, "index.md");
    const logPath = path.join(wikiRoot, "log.md");
    if (!fs.existsSync(indexPath)) {
        fs.writeFileSync(indexPath, ["# Index", "", "## Sources", "", "## Concepts", "", "## Entities", "", "## Analyses", ""].join("\n"), "utf8");
    }
    if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, ["# Log", "", "Append-only operations log.", ""].join("\n"), "utf8");
    }
}
function appendWikiLog(config, title, bullets) {
    const wikiMount = config.knowledge_base.layers?.wiki_source ?? "wiki";
    const wikiRoot = getMountRoot(config, wikiMount);
    if (!wikiRoot)
        return;
    const logPath = path.join(wikiRoot, "log.md");
    const date = new Date().toISOString().slice(0, 10);
    const entry = [
        `## [${date}] ${title}`,
        "",
        ...bullets.map((b) => `- ${b}`),
        "",
    ].join("\n");
    fs.appendFileSync(logPath, `\n${entry}`, "utf8");
}
function updateWikiIndexAppend(config, sectionHeader, linkPath, description) {
    const wikiMount = config.knowledge_base.layers?.wiki_source ?? "wiki";
    const wikiRoot = getMountRoot(config, wikiMount);
    if (!wikiRoot)
        return;
    const indexPath = path.join(wikiRoot, "index.md");
    if (!fs.existsSync(indexPath))
        return;
    const body = fs.readFileSync(indexPath, "utf8");
    const line = `- [\`${linkPath}\`](${linkPath.replace(/^wiki\//, "")}) — ${description}`.trim();
    if (body.includes(line) || body.includes(`[\`${linkPath}\`]`))
        return;
    const marker = `${sectionHeader}\n`;
    const idx = body.indexOf(marker);
    if (idx === -1) {
        fs.appendFileSync(indexPath, `\n${sectionHeader}\n\n${line}\n`, "utf8");
        return;
    }
    const insertPos = idx + marker.length;
    const updated = body.slice(0, insertPos) + `\n${line}\n` + body.slice(insertPos);
    fs.writeFileSync(indexPath, updated, "utf8");
}
const searchDocsInputSchema = {
    query: z.string().describe("Search query"),
    include_metadata: z
        .boolean()
        .optional()
        .describe("Include per-hit score breakdown as JSON after results"),
    path_prefix: z
        .string()
        .optional()
        .describe("Optional relative path prefix to limit hits (e.g. docs/subfolder); must stay under configured knowledge roots"),
};
export function registerLocalDocTools(server, deps) {
    const { config, index, bm25, embedder } = deps;
    const topK = config.retrieval.top_k;
    server.registerTool("search_docs", {
        description: toolDescription(config, "search_docs", "Search local documents for relevant information"),
        inputSchema: searchDocsInputSchema,
    }, async ({ query, include_metadata, path_prefix }) => {
        let prefix;
        try {
            prefix =
                path_prefix !== undefined && path_prefix.trim() !== ""
                    ? normalizePathPrefix(path_prefix)
                    : undefined;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return {
                content: [{ type: "text", text: `Error: ${msg}` }],
                isError: true,
            };
        }
        const qEmb = await embedder.embedQuery(query);
        const useMeta = include_metadata ??
            config.retrieval.verbose_hits_default ??
            false;
        const hits = retrieveRankedWithOptions(index, bm25, config, query, qEmb, {
            path_prefix: prefix,
        });
        return {
            content: [
                {
                    type: "text",
                    text: formatHits(hits, useMeta),
                },
            ],
        };
    });
    const mq = config.retrieval.multi_query_tool;
    if (mq?.enabled) {
        const toolName = mq.name ?? "search_docs_multi";
        server.registerTool(toolName, {
            description: toolDescription(config, toolName, "Run multiple search queries and merge the best matching chunks (for complex questions)"),
            inputSchema: {
                queries: z
                    .array(z.string().min(1))
                    .min(1)
                    .max(24)
                    .describe("One or more search queries to combine"),
                include_metadata: z.boolean().optional(),
                path_prefix: z.string().optional(),
            },
        }, async ({ queries, include_metadata, path_prefix }) => {
            let prefix;
            try {
                prefix =
                    path_prefix !== undefined && path_prefix.trim() !== ""
                        ? normalizePathPrefix(path_prefix)
                        : undefined;
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                return {
                    content: [{ type: "text", text: `Error: ${msg}` }],
                    isError: true,
                };
            }
            const useMeta = include_metadata ??
                config.retrieval.verbose_hits_default ??
                false;
            const perQuery = [];
            for (const q of queries) {
                const emb = await embedder.embedQuery(q);
                const ranked = retrieveFusedRankedUnbounded(index, bm25, config, q, emb, { path_prefix: prefix });
                perQuery.push(ranked);
            }
            const merged = mergeMultiQueryScores(perQuery);
            const poolSize = defaultCandidatePool(topK, config.retrieval.candidate_pool);
            const hits = rankHitsFromMap(merged, topK, poolSize, config.retrieval.mmr?.enabled ?? false, config.retrieval.mmr?.lambda ?? 0.5);
            return {
                content: [
                    {
                        type: "text",
                        text: formatHits(hits, useMeta),
                    },
                ],
            };
        });
    }
    server.registerTool("get_document", {
        description: toolDescription(config, "get_document", "Get full document content by file name"),
        inputSchema: {
            filename: z
                .string()
                .describe("File name or path relative to the configured docs folder"),
        },
    }, async ({ filename }) => {
        try {
            const resolved = resolveDocumentPath(config, filename);
            const ext = path.extname(resolved.absolutePath).toLowerCase();
            const body = await extractText(resolved.absolutePath, ext, config.knowledge_base.ingestion.encoding);
            return {
                content: [
                    {
                        type: "text",
                        text: `File: ${resolved.relativePath}\n\n${body}`,
                    },
                ],
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${msg}`,
                    },
                ],
                isError: true,
            };
        }
    });
    server.registerTool("update_document", {
        description: toolDescription(config, "update_document", "Update document content by file name (wiki-only)"),
        inputSchema: {
            filename: z
                .string()
                .describe("Path relative to a configured source mount (e.g. wiki/index.md). Only wiki/* is writable."),
            content: z.string().describe("Full new file content"),
        },
    }, async ({ filename, content }) => {
        try {
            const resolved = resolveDocumentPath(config, filename);
            if (!resolved.relativePath.startsWith("wiki/")) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Document is not writable (only wiki/* can be updated): ${resolved.relativePath}`,
                        },
                    ],
                    isError: true,
                };
            }
            fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
            fs.writeFileSync(resolved.absolutePath, content, "utf8");
            return {
                content: [
                    {
                        type: "text",
                        text: `Updated: ${resolved.relativePath}`,
                    },
                ],
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${msg}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // --- Wiki operations (lightweight primitives; callers provide the content) ---
    server.registerTool("wiki_ingest_source", {
        description: toolDescription(config, "wiki_ingest_source", "Create/update a wiki source page, update wiki index and log"),
        inputSchema: {
            source_filename: z
                .string()
                .describe("A raw source file (e.g. raw/article.md) or any readable file under configured mounts"),
            summary_title: z.string().min(1).describe("Title for the wiki summary page"),
            summary_markdown: z.string().min(1).describe("Full markdown for the wiki summary page"),
        },
    }, async ({ source_filename, summary_title, summary_markdown }) => {
        try {
            ensureWikiEntryPoints(config);
            const rawMount = config.knowledge_base.layers?.raw_source ?? "raw";
            const rawResolved = resolveDocumentPath(config, stripLeadingMountPrefix(source_filename, rawMount));
            const wikiMount = config.knowledge_base.layers?.wiki_source ?? "wiki";
            const wikiRoot = getMountRoot(config, wikiMount);
            if (!wikiRoot) {
                throw new Error(`Wiki mount "${wikiMount}" is not configured`);
            }
            const slug = safeSlug(summary_title);
            const wikiPath = `sources/${slug}.md`;
            const wikiAbsPath = path.join(wikiRoot, wikiPath);
            fs.mkdirSync(path.dirname(wikiAbsPath), { recursive: true });
            fs.writeFileSync(wikiAbsPath, summary_markdown, "utf8");
            updateWikiIndexAppend(config, "## Sources", wikiPath, summary_title);
            appendWikiLog(config, `ingest | ${summary_title}`, [
                `Source: \`${rawResolved.relativePath}\``,
                `Wiki page: \`${wikiPath}\``,
            ]);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            source: rawResolved.relativePath,
                            wiki_page: wikiPath,
                            created_or_updated: [wikiPath, "wiki/index.md", "wiki/log.md"],
                        }, null, 2),
                    },
                ],
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
    server.registerTool("wiki_file_answer", {
        description: toolDescription(config, "wiki_file_answer", "File a provided answer as a wiki analysis page and update index/log"),
        inputSchema: {
            title: z.string().min(1).describe("Title for the filed page"),
            markdown: z.string().min(1).describe("Full markdown body for the filed page"),
        },
    }, async ({ title, markdown }) => {
        try {
            ensureWikiEntryPoints(config);
            const slug = safeSlug(title);
            const wikiPath = `wiki/analyses/${slug}.md`;
            const wikiResolved = resolveDocumentPath(config, wikiPath);
            fs.mkdirSync(path.dirname(wikiResolved.absolutePath), { recursive: true });
            fs.writeFileSync(wikiResolved.absolutePath, markdown, "utf8");
            updateWikiIndexAppend(config, "## Analyses", wikiPath, title);
            appendWikiLog(config, `file | ${title}`, [`Wiki page: \`${wikiPath}\``]);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ wiki_page: wikiPath, created_or_updated: [wikiPath, "wiki/index.md", "wiki/log.md"] }, null, 2),
                    },
                ],
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
    server.registerTool("wiki_query", {
        description: toolDescription(config, "wiki_query", "Search wiki-first and return top matching chunks (with optional raw fallback)"),
        inputSchema: {
            query: z.string().min(1),
            include_raw_fallback: z.boolean().optional().describe("Also include raw hits after wiki hits"),
            top_k: z.number().int().positive().max(20).optional().describe("Override retrieval.top_k for this call"),
        },
    }, async ({ query, include_raw_fallback, top_k }) => {
        try {
            const qEmb = await embedder.embedQuery(query);
            const k = top_k ?? config.retrieval.top_k;
            const wikiHits = retrieveFusedRankedUnbounded(index, bm25, config, query, qEmb, {
                path_prefix: "wiki",
            }).slice(0, k);
            const rawMount = config.knowledge_base.layers?.raw_source ?? "raw";
            const rawHits = include_raw_fallback
                ? retrieveFusedRankedUnbounded(index, bm25, config, query, qEmb, {
                    path_prefix: rawMount,
                }).slice(0, k)
                : [];
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            wiki: wikiHits.map((h) => ({
                                path: h.relativePath,
                                chunk: h.chunkIndex,
                                score: h.fusionScore,
                                method: h.retrievalMethod,
                                text: h.text,
                            })),
                            raw: rawHits.map((h) => ({
                                path: h.relativePath,
                                chunk: h.chunkIndex,
                                score: h.fusionScore,
                                method: h.retrievalMethod,
                                text: h.text,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
    server.registerTool("wiki_lint", {
        description: toolDescription(config, "wiki_lint", "Check wiki health: missing entry points, orphans (not in index), contradiction markers"),
        inputSchema: {
            include_details: z.boolean().optional(),
        },
    }, async ({ include_details }) => {
        try {
            const wikiMount = config.knowledge_base.layers?.wiki_source ?? "wiki";
            const wikiRoot = config.resolvedSources.find((s) => s.name === wikiMount)?.absolutePath;
            if (!wikiRoot) {
                return { content: [{ type: "text", text: "Error: wiki source is not configured." }], isError: true };
            }
            const indexPath = path.join(wikiRoot, "index.md");
            const logPath = path.join(wikiRoot, "log.md");
            const issues = [];
            if (!fs.existsSync(indexPath)) {
                issues.push({
                    type: "missing_entry_point",
                    path: "wiki/index.md",
                    message: "Missing wiki/index.md",
                    suggestion: "Create wiki/index.md (or run a wiki operation that initializes entry points).",
                });
            }
            if (!fs.existsSync(logPath)) {
                issues.push({
                    type: "missing_entry_point",
                    path: "wiki/log.md",
                    message: "Missing wiki/log.md",
                    suggestion: "Create wiki/log.md (or run a wiki operation that initializes entry points).",
                });
            }
            const indexBody = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
            const mdFiles = [];
            const walk = (dir) => {
                for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
                    const abs = path.join(dir, ent.name);
                    if (ent.isDirectory())
                        walk(abs);
                    else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md"))
                        mdFiles.push(abs);
                }
            };
            walk(wikiRoot);
            for (const abs of mdFiles) {
                const relInner = path.relative(wikiRoot, abs).split(path.sep).join("/");
                const rel = `${wikiMount}/${relInner}`;
                if (rel === "wiki/index.md" || rel === "wiki/log.md")
                    continue;
                if (indexBody && !indexBody.includes(relInner)) {
                    issues.push({
                        type: "orphan_page",
                        path: rel,
                        message: "Wiki page is not referenced in wiki/index.md",
                        suggestion: "Add a link to this page under the appropriate section in wiki/index.md.",
                    });
                }
                const body = fs.readFileSync(abs, "utf8");
                if (/contradiction/i.test(body) || /##\s+Contradictions/i.test(body)) {
                    issues.push({
                        type: "contradiction_marker",
                        path: rel,
                        message: "Page contains a contradiction marker/section",
                        suggestion: "Review and resolve contradictory claims; add citations to raw sources if needed.",
                    });
                }
            }
            const payload = {
                issues,
                counts: issues.reduce((acc, i) => {
                    acc[i.type] = (acc[i.type] ?? 0) + 1;
                    return acc;
                }, {}),
            };
            return {
                content: [
                    {
                        type: "text",
                        text: include_details ? JSON.stringify(payload, null, 2) : JSON.stringify({ counts: payload.counts }, null, 2),
                    },
                ],
            };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
        }
    });
}
