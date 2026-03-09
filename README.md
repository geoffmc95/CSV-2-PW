# CSV-2-PW

Convert Azure DevOps test cases (CSV/JSON) into Playwright end-to-end tests using GitHub Copilot agents.

## How It Works

This framework uses a 3-agent pipeline powered by the Playwright MCP server:

| Agent | Purpose |
|-------|---------|
| `playwright-test-planner` | Reads parsed test cases and generates a markdown test plan |
| `playwright-test-generator` | Turns the approved plan into Playwright `.spec.ts` files |
| `playwright-test-healer` | Debugs and fixes failing tests automatically |

```
CSV/JSON → parse script → normalized JSON → planner → plan → generator → specs → healer (if needed)
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [VS Code](https://code.visualstudio.com/) with [GitHub Copilot](https://github.com/features/copilot) (Pro recommended)
- Agents should use **Claude Sonnet 4** at minimum

## Setup

```bash
git clone https://github.com/geoffmc95/CSV-2-PW.git
cd CSV-2-PW
npm init playwright@latest
npx tsc --init
npx playwright init-agents --loop vscode
```

## Usage

### 1. Add test cases

Place your Azure DevOps CSV or JSON exports in `TESTS-TO-CONVERT/`.

### 2. Parse

```bash
npm run parse                          # parse new or modified files only
npm run parse -- --force               # re-parse all files
npm run parse -- path/to/file.csv      # parse a specific file
```

Normalized JSON is written to `TESTS-TO-CONVERT/parsed/`.

### 3. Plan → Generate → Heal

1. Run `playwright-test-planner` in Copilot — point it at the parsed JSON
2. Review the generated plan in `specs/`
3. Run `playwright-test-generator` to create Playwright specs in `e2e/`
4. Run the tests — use `playwright-test-healer` for any failures

## Project Structure

```
TESTS-TO-CONVERT/          ← source CSV/JSON files
TESTS-TO-CONVERT/parsed/   ← normalized JSON (generated)
specs/                     ← markdown test plans (generated)
e2e/                       ← Playwright test specs (generated)
scripts/parse-tests.js     ← pre-processing script
.github/agents/            ← Copilot agent definitions
```

## Parsed Output Schema

Every parsed file uses the same format regardless of CSV or JSON source:

```json
{
  "source_file": "original.csv",
  "parsed_at": "2026-03-08T...",
  "test_cases": [
    {
      "id": "101",
      "title": "Register a new user",
      "source_format": "csv",
      "steps": [
        { "step": 1, "action": "Click Register link", "expected": "Registration page opens" }
      ]
    }
  ]
}
```

## License

ISC

