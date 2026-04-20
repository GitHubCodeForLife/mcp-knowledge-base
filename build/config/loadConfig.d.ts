import { z } from "zod";
declare const RawConfigSchema: z.ZodObject<{
    version: z.ZodString;
    project: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
    }>;
    server: z.ZodObject<{
        type: z.ZodString;
        runtime: z.ZodString;
        port: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        runtime: string;
        port?: number | undefined;
    }, {
        type: string;
        runtime: string;
        port?: number | undefined;
    }>;
    knowledge_base: z.ZodObject<{
        sources: z.ZodArray<z.ZodObject<{
            type: z.ZodLiteral<"local_files">;
            name: z.ZodString;
            config: z.ZodObject<{
                path: z.ZodString;
                file_types: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                path: string;
                file_types: string[];
            }, {
                path: string;
                file_types: string[];
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "local_files";
            name: string;
            config: {
                path: string;
                file_types: string[];
            };
        }, {
            type: "local_files";
            name: string;
            config: {
                path: string;
                file_types: string[];
            };
        }>, "many">;
        ingestion: z.ZodObject<{
            chunk_size: z.ZodNumber;
            chunk_overlap: z.ZodNumber;
            encoding: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            chunk_size: number;
            chunk_overlap: number;
            encoding: string;
        }, {
            chunk_size: number;
            chunk_overlap: number;
            encoding: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        sources: {
            type: "local_files";
            name: string;
            config: {
                path: string;
                file_types: string[];
            };
        }[];
        ingestion: {
            chunk_size: number;
            chunk_overlap: number;
            encoding: string;
        };
    }, {
        sources: {
            type: "local_files";
            name: string;
            config: {
                path: string;
                file_types: string[];
            };
        }[];
        ingestion: {
            chunk_size: number;
            chunk_overlap: number;
            encoding: string;
        };
    }>;
    retrieval: z.ZodObject<{
        top_k: z.ZodNumber;
        method: z.ZodEnum<["semantic", "hybrid"]>;
        hybrid: z.ZodOptional<z.ZodObject<{
            dense_weight: z.ZodNumber;
            lexical_weight: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            dense_weight: number;
            lexical_weight: number;
        }, {
            dense_weight: number;
            lexical_weight: number;
        }>>;
        candidate_pool: z.ZodOptional<z.ZodNumber>;
        mmr: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            lambda: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            lambda: number;
        }, {
            enabled: boolean;
            lambda: number;
        }>>;
        verbose_hits_default: z.ZodOptional<z.ZodBoolean>;
        multi_query_tool: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodBoolean;
            name: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            name?: string | undefined;
        }, {
            enabled: boolean;
            name?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        top_k: number;
        method: "semantic" | "hybrid";
        hybrid?: {
            dense_weight: number;
            lexical_weight: number;
        } | undefined;
        candidate_pool?: number | undefined;
        mmr?: {
            enabled: boolean;
            lambda: number;
        } | undefined;
        verbose_hits_default?: boolean | undefined;
        multi_query_tool?: {
            enabled: boolean;
            name?: string | undefined;
        } | undefined;
    }, {
        top_k: number;
        method: "semantic" | "hybrid";
        hybrid?: {
            dense_weight: number;
            lexical_weight: number;
        } | undefined;
        candidate_pool?: number | undefined;
        mmr?: {
            enabled: boolean;
            lambda: number;
        } | undefined;
        verbose_hits_default?: boolean | undefined;
        multi_query_tool?: {
            enabled: boolean;
            name?: string | undefined;
        } | undefined;
    }>;
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        input_schema: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        input_schema?: unknown;
    }, {
        name: string;
        description: string;
        input_schema?: unknown;
    }>, "many">;
    models: z.ZodOptional<z.ZodObject<{
        default: z.ZodString;
        temperature: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        default: string;
        temperature: number;
    }, {
        default: string;
        temperature: number;
    }>>;
    logging: z.ZodObject<{
        level: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        level: string;
    }, {
        level: string;
    }>;
    deployment: z.ZodOptional<z.ZodObject<{
        environment: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        environment: string;
    }, {
        environment: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    project: {
        name: string;
        description?: string | undefined;
    };
    server: {
        type: string;
        runtime: string;
        port?: number | undefined;
    };
    knowledge_base: {
        sources: {
            type: "local_files";
            name: string;
            config: {
                path: string;
                file_types: string[];
            };
        }[];
        ingestion: {
            chunk_size: number;
            chunk_overlap: number;
            encoding: string;
        };
    };
    retrieval: {
        top_k: number;
        method: "semantic" | "hybrid";
        hybrid?: {
            dense_weight: number;
            lexical_weight: number;
        } | undefined;
        candidate_pool?: number | undefined;
        mmr?: {
            enabled: boolean;
            lambda: number;
        } | undefined;
        verbose_hits_default?: boolean | undefined;
        multi_query_tool?: {
            enabled: boolean;
            name?: string | undefined;
        } | undefined;
    };
    tools: {
        name: string;
        description: string;
        input_schema?: unknown;
    }[];
    logging: {
        level: string;
    };
    models?: {
        default: string;
        temperature: number;
    } | undefined;
    deployment?: {
        environment: string;
    } | undefined;
}, {
    version: string;
    project: {
        name: string;
        description?: string | undefined;
    };
    server: {
        type: string;
        runtime: string;
        port?: number | undefined;
    };
    knowledge_base: {
        sources: {
            type: "local_files";
            name: string;
            config: {
                path: string;
                file_types: string[];
            };
        }[];
        ingestion: {
            chunk_size: number;
            chunk_overlap: number;
            encoding: string;
        };
    };
    retrieval: {
        top_k: number;
        method: "semantic" | "hybrid";
        hybrid?: {
            dense_weight: number;
            lexical_weight: number;
        } | undefined;
        candidate_pool?: number | undefined;
        mmr?: {
            enabled: boolean;
            lambda: number;
        } | undefined;
        verbose_hits_default?: boolean | undefined;
        multi_query_tool?: {
            enabled: boolean;
            name?: string | undefined;
        } | undefined;
    };
    tools: {
        name: string;
        description: string;
        input_schema?: unknown;
    }[];
    logging: {
        level: string;
    };
    models?: {
        default: string;
        temperature: number;
    } | undefined;
    deployment?: {
        environment: string;
    } | undefined;
}>;
export type AppConfig = z.infer<typeof RawConfigSchema> & {
    configPath: string;
    projectRoot: string;
    resolvedSources: Array<{
        name: string;
        absolutePath: string;
        fileTypes: Set<string>;
    }>;
};
export declare function loadConfig(projectRoot?: string): AppConfig;
export {};
