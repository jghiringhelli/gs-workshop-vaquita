# Session Instructions

## Setup
```bash
npm install
npm run dev     # starts on http://localhost:3000
npm test        # confirm baseline passes before you start
```

## Step 1 — Connect ForgeCraft to your AI assistant

Create `.vscode/mcp.json` in this folder:
```json
{
  "servers": {
    "forgecraft": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "forgecraft-mcp@1.1.0"]
    }
  }
}
```
Open Copilot Chat → Agent mode → confirm `forgecraft` appears in the tools list.

## Step 2 — Run project setup
Tell your AI assistant:
```
I have a new project at [paste your local path here].
Use the forgecraft MCP tool to run setup_project on it.
Answer any questions it asks you.
```
Follow wherever it leads. Let ForgeCraft drive.

## Step 3 — Build the spec
Once setup is done, tell the AI:
```
Read docs/spec.md carefully. Use ForgeCraft check_cascade to confirm
we are ready to build, then implement the spec.
```

## Step 4 — Bonus (if time allows)
Once the spec is implemented:
```
Add a pool leaderboard endpoint — members ranked by total contributions.
```

## At the end (run these, note the results)
```bash
npm test
```

Note down:
- Did the setup feel smooth or confusing?
- How many times did you have to intervene manually?
- Did the AI stay aligned with `docs/spec.md` throughout?

