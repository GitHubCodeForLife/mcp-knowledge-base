---
name: openspec-propose
description: Propose a new change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with solution architecture, analysis, specs, and tasks ready for implementation.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Propose a new change - create the change and generate all artifacts in one step.

I'll create a change with artifacts:
- proposal.md (what & why)
- **How (split across two files + OpenSpec bridge)**:
  - `solution-architecture.md` — solution overview, boundaries, **high-level before vs after** (see Design split), and **diagrams** (flow, sequence, component/context as needed)
  - `solution-analysis.md` — **detailed** solution: **exact methods and symbols to change** per file (see Design split), modules/files, APIs, data shapes, migration and edge cases, **plus Mermaid diagrams**
  - `design.md` — short **bridge** file so OpenSpec marks the `design` artifact complete (see guidelines below); not the place for long-form content
- tasks.md (implementation steps)

When ready to implement, run /opsx:apply

---

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   This creates a scaffolded change at `openspec/changes/<name>/` with `.openspec.yaml`.

3. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation (e.g., `["tasks"]`)
   - `artifacts`: list of all artifacts with their status and dependencies

4. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is `ready` (dependencies satisfied)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you - do NOT include in output)
        - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `outputPath`: Where to write the artifact
        - `dependencies`: Completed artifacts to read for context
      - Read any completed dependency files for context
      - **If `artifact-id` is `design`**: follow **Design split (this project)** below instead of a single monolithic `design.md`.
      - Otherwise: create the artifact file using `template` as the structure
      - Apply `context` and `rules` as constraints - but do NOT copy them into the file
      - Show brief progress: "Created <artifact-id>" (for `design`, report all three files)

   b. **Continue until all `applyRequires` artifacts are complete**
      - After creating each artifact, re-run `openspec status --change "<name>" --json`
      - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
      - Stop when all `applyRequires` artifacts are done

   c. **If an artifact requires user input** (unclear context):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run `/opsx:apply` or ask me to implement to start working on the tasks."

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what each artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use the CLI `template` from `openspec instructions` when present; for **`solution-architecture.md`** and **`solution-analysis.md`**, align section numbering with:
  - `.cursor/skills/openspec-propose/template/solution-architecture.md`
  - `.cursor/skills/openspec-propose/template/solution-analysis.md`
- For template sections that do not apply (e.g. **## 6 Observability** subsections for a local game), keep each heading and write **Not applicable for this change** on one line.

**Design split (this project)** — when `openspec instructions` targets the `design` artifact (`outputPath: design.md`):

OpenSpec only detects completion when `design.md` exists, but **substance** lives in two sibling files next to it under `openspec/changes/<name>/`:

1. **`solution-architecture.md`** (overview & visualization)
   - Follow **`.cursor/skills/openspec-propose/template/solution-architecture.md`** section order (`## 1` … `## 9`).
   - High-level solution, major components, integration points, trust boundaries
   - **High-level changes (before → after)** — place under **`### 3.4`** of the template. Use table **Area | Today (before) | After this change**; add **unchanged boundary** when helpful.
   - **Flow diagrams** (e.g. Mermaid `flowchart` / `graph`) for main paths
   - **Sequence diagrams** (Mermaid `sequenceDiagram`) for critical interactions
   - Optional: context diagram, deployment view — keep concise and readable
   - Maps to the spirit of `instruction` + `template` sections that belong at architecture level: Context, Goals / Non-Goals, Decisions (summary), Risks / Trade-offs (summary)

2. **`solution-analysis.md`** (depth & implementation-facing detail)
   - Follow **`.cursor/skills/openspec-propose/template/solution-analysis.md`** section order (`## 1` … `## 10`). Include **`## 8. Testing Strategy`** with concrete rows (manual, unit, or integration as fits the repo).
   - File/module-level impact, new vs changed symbols, public APIs, config keys
   - **Methods and symbols** — under **`## 3. Detail Architecture`**, subsection **`### 3.3 Methods and symbols to change`**: **per-file** `### \`src/...\`` subsections and a **Symbol | Change** table (**Change** / **Add** / **Remove** / **No change** plus concrete behavior). Scan **actual** `src/` when the change is not greenfield. Use **`### 3.1`** / **`### 3.2`** for system context (Mermaid) and architecture overview bullets.
   - Data model deltas, validation rules, error handling, performance or security notes
   - Step-by-step technical approach where it helps implementers; migration / rollback detail
   - Anything that reads like “what to type” or “which file to touch” belongs here, not in the architecture doc
   - **Diagrams (class / implementation granularity)** — use Mermaid:
     - **`classDiagram`**: modules or key types as classes, important methods, relationships to shared state (who mutates vs read-only). OK to note “maps to functions in `*.ts`” if the codebase is functional rather than OOP.
     - **`sequenceDiagram` (class-level)**: one typical frame or one critical use case showing collaboration between named modules (e.g. `GameLoop`, `KeyboardInput`, `*System`, `SceneRenderer`, `GameState`).
     - **`flowchart`**: non-trivial control order (e.g. game tick, request pipeline) when steps are not obvious from prose alone.
   - **Mermaid robustness** (avoids common preview/parser failures): in sequence messages, do **not** use `/` or `+` inside the label text; do **not** name a participant `Loop` (reserve word clash — use `GameLoop` or similar); prefer plain words over `<=` / `>=` in labels.

3. **`design.md`** (bridge — satisfy OpenSpec + orient readers)
   - Short: roughly one screen or less
   - State that the technical design is split into `solution-architecture.md` and `solution-analysis.md`, with links or paths
   - Optional: 2–4 bullet summary of the most important decisions (no duplication of long sections)

Create **all three** in one pass when handling the `design` artifact, then re-run `openspec status` so `design` shows `done`.

- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

**Guardrails**
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- When **revising** an existing change’s design, keep **solution-architecture.md** and **solution-analysis.md** aligned: update the **before → after** table and the **`### 3.3 Methods and symbols to change`** tables whenever scope shifts.
- Always read dependency artifacts before creating a new one; for `tasks`, include `solution-architecture.md` and `solution-analysis.md` when this project’s design split was used (not only `design.md`)
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, ask if user wants to continue it or create a new one
- Verify each artifact file exists after writing before proceeding to next
