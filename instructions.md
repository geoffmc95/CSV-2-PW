# Architecture Overview

This is a GitHub Copilot Agent-powered framework that converts Azure DevOps test cases (CSV/JSON) into Playwright end-to-end tests via a 3-agent pipeline, backed by the Playwright MCP (Model Context Protocol) server.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [VS Code](https://code.visualstudio.com/) with [GitHub Copilot](https://github.com/features/copilot)

## RECOMMEND GITHUB COPILOT PRO. Agents should use minimum Claude Sonnet 4. 

### Setup

```bash
git clone https://github.com/geoffmc95/CSV-2-PW.git
cd project_name
Npm init playwright@latest
npx tsc --init
npx playwright init-agents --loop vscode
```

This will install dependencies and initialize the Copilot agents (`playwright-test-planner`, `playwright-test-generator`, `playwright-test-healer`).

## Playwright CSV/JSON Conversion Workflow

### Canonical folders

- `TESTS-TO-CONVERT/` — source CSV or JSON files
- `TESTS-TO-CONVERT/parsed/` — normalized JSON produced by the parse script
- `specs/` — generated markdown test plans
- `e2e/` — generated Playwright test specs

### Workflow

1. Place CSV or JSON files in `TESTS-TO-CONVERT/`
2. Run `npm run parse` to produce normalized JSON in `TESTS-TO-CONVERT/parsed/`
3. Run `playwright-test-planner` (point it at the parsed JSON)
4. Review the generated plan in `specs/`
5. Run `playwright-test-generator`
6. Run the generated Playwright specs in `e2e/`
7. Use `playwright-test-healer` for failures

### Parse script

```bash
npm run parse                          # parse new or modified files only
npm run parse -- --force               # re-parse all files
npm run parse -- path/to/file.csv      # parse a specific file
```

By default the script skips source files that haven't changed since they were last parsed.
Use `--force` to re-parse everything.

Output is written to `TESTS-TO-CONVERT/parsed/` as `*.parsed.json`.

Every parsed file uses the same schema regardless of whether the source was CSV or JSON:

```json
{
  "source_file": "original.csv",
  "parsed_at": "2026-03-08T...",
  "test_cases": [
    {
      "id": "101",
      "title": "Test case title",
      "source_format": "csv",
      "steps": [
        { "step": 1, "action": "Do something", "expected": "Something happens" }
      ]
    }
  ]
}
```

### Recommended operating rules

- Treat `e2e/` as the single source of truth for Playwright specs
- Keep uploaded CSV/JSON files structured and traceable
- Review plans before generation; do not skip the approval step
- Prefer one scenario per generated spec file
- Keep seed/setup references consistent across plans and specs
- Treat `specs/*.md` and `e2e/**/*.spec.ts` as disposable/regenerable outputs for each workflow run
