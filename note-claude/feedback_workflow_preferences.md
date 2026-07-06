---
name: feedback-workflow-preferences
description: "Pietro's collaboration preferences — sequential tool calls, non-technical user needing hand-holding and cross-checks"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 07d583c3-b9a7-4c35-b3dd-d55634d5b921
---

**Run risky/multi-step operations sequentially, never in parallel.** Pietro explicitly said "in parallelo mai" when confirming the deploy sequence (commit → deploy.sh → restart server).
**Why:** he wants to follow along step by step and be able to stop between steps; parallel tool calls make that harder to reason about for operations with real-world side effects (git, deploys).
**How to apply:** for git operations, deploys, or anything touching production/shared state, run one Bash call at a time and report before moving to the next, even when steps look independent enough to parallelize.

**Pietro is not technical.** He needed guided, copy-pasteable steps to install Node.js/nvm, doesn't know how to verify report correctness himself, and said so directly ("io non so neanche come verificarlo"). See [[project-monthly-report-eni]] for the concrete workflow this produced (he sends source + generated files each month for a cross-check).
**How to apply:** give concrete numbered steps (not just "check the print settings"), avoid assuming familiarity with dev tools/terminal, and proactively offer to do verification/comparison work rather than asking him to self-serve on anything technical.
