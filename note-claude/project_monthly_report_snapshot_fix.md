---
name: project-monthly-report-snapshot-fix
description: "Monthly Report ENI \"NUOVO\" comparison was localStorage-only (per-browser) and got fixed to a shared Supabase table"
metadata: 
  node_type: memory
  type: project
  originSessionId: 07d583c3-b9a7-4c35-b3dd-d55634d5b921
---

Fixed 2026-07-06: the Monthly Report ENI's "NUOVO" badge (pratiche new vs. last month) used to compare against a snapshot stored only in the browser's `localStorage` (`pser_monthly_report_snapshot`). On a fresh browser/profile this snapshot is empty, so every pratica gets wrongly flagged NUOVO.

**Fix applied:** moved the snapshot to a shared Supabase table `monthly_report_snapshot` (single row, id=1), following the same pattern as `auto_settings_shared` in `src/contexts/DataContext.tsx`. New type `MonthlyReportSnapshot` in `src/types/index.ts`. Table + RLS policy + realtime publication SQL is documented in `setup-supabase.sql`.

**Why this matters going forward:** if "NUOVO" ever looks wrong again (e.g., everything flagged new after a long gap), check whether `monthly_report_snapshot` actually got upserted on the last export (the first export after this fix was expected to show everything as NUOVO once, since there was nothing to compare against yet — that was correct behavior, not a bug).

Related: [[project-monthly-report-eni]]
