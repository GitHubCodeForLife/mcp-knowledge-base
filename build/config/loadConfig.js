import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
const RawConfigSchema = z.object({
    version: z.string(),
    project: z.object({
        name: z.string(),
        description: z.string().optional(),
    }),
    server: z.object({
        type: z.string(),
        runtime: z.string(),
        port: z.number().optional(),
    }),
    knowledge_base: z.object({
        sources: z.array(z.object({
            type: z.literal("local_files"),
            name: z.string(),
            config: z.object({
                path: z.string(),
                file_types: z.array(z.string()),
            }),
        })),
        ingestion: z.object({
            chunk_size: z.number(),
            chunk_overlap: z.number(),
            encoding: z.string(),
        }),
        layers: z
            .object({
            raw_source: z.string().min(1).optional(),
            wiki_source: z.string().min(1).optional(),
        })
            .optional(),
    }),
    retrieval: z.object({
        top_k: z.number(),
        method: z.enum(["semantic", "hybrid"]),
        hybrid: z
            .object({
            dense_weight: z.number(),
            lexical_weight: z.number(),
        })
            .optional(),
        candidate_pool: z.number().optional(),
        mmr: z
            .object({
            enabled: z.boolean(),
            lambda: z.number(),
        })
            .optional(),
        verbose_hits_default: z.boolean().optional(),
        wiki_first: z.boolean().optional(),
        multi_query_tool: z
            .object({
            enabled: z.boolean(),
            name: z.string().min(1).optional(),
        })
            .optional(),
    }),
    tools: z.array(z.object({
        name: z.string(),
        description: z.string(),
        input_schema: z.unknown(),
    })),
    models: z
        .object({
        default: z.string(),
        temperature: z.number(),
    })
        .optional(),
    logging: z.object({
        level: z.string(),
    }),
    deployment: z
        .object({
        environment: z.string(),
    })
        .optional(),
});
function validateRetrievalConsistency(retrieval, configPath) {
    const wd = retrieval.hybrid?.dense_weight ?? 0.5;
    const wl = retrieval.hybrid?.lexical_weight ?? 0.5;
    if (retrieval.method === "hybrid" && wd + wl <= 0) {
        throw new Error(`Invalid config (${configPath}): retrieval.hybrid dense_weight + lexical_weight must be > 0`);
    }
    if (retrieval.candidate_pool !== undefined &&
        retrieval.candidate_pool < retrieval.top_k) {
        throw new Error(`Invalid config (${configPath}): retrieval.candidate_pool must be >= retrieval.top_k`);
    }
    if (retrieval.mmr !== undefined) {
        const { lambda } = retrieval.mmr;
        if (lambda < 0 || lambda > 1) {
            throw new Error(`Invalid config (${configPath}): retrieval.mmr.lambda must be between 0 and 1`);
        }
    }
}
function resolveConfigPath(projectRoot) {
    const override = process.env.LOCAL_DOC_AI_CONFIG;
    if (override) {
        return path.isAbsolute(override)
            ? override
            : path.resolve(projectRoot, override);
    }
    const preferred = path.join(projectRoot, "openspec", "config.yaml");
    if (fs.existsSync(preferred))
        return preferred;
    return path.join(projectRoot, "build", "config.yaml");
}
export function loadConfig(projectRoot = process.cwd()) {
    const configPath = resolveConfigPath(projectRoot);
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }
    const raw = parseYaml(fs.readFileSync(configPath, "utf8"));
    const parsed = RawConfigSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(`Invalid config (${configPath}): ${parsed.error.flatten().formErrors.join(", ")}`);
    }
    const data = parsed.data;
    validateRetrievalConsistency(data.retrieval, configPath);
    const resolvedSources = data.knowledge_base.sources.map((s) => {
        const rel = s.config.path;
        const absolutePath = path.resolve(projectRoot, rel);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Knowledge source "${s.name}" path does not exist: ${absolutePath} (from ${rel})`);
        }
        if (!fs.statSync(absolutePath).isDirectory()) {
            throw new Error(`Knowledge source "${s.name}" is not a directory: ${absolutePath}`);
        }
        return {
            name: s.name,
            absolutePath,
            fileTypes: new Set(s.config.file_types.map((t) => t.toLowerCase())),
        };
    });
    return {
        ...data,
        configPath,
        projectRoot: path.resolve(projectRoot),
        resolvedSources,
    };
}
