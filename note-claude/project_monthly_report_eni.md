---
name: project-monthly-report-eni
description: "Recurring monthly ENI subappalti/subcontratti report — workflow, stakeholder, and known-correct data quirks"
metadata: 
  node_type: memory
  type: project
  originSessionId: 07d583c3-b9a7-4c35-b3dd-d55634d5b921
---

Pietro produces a recurring **Monthly Report ENI** ("Lista Subappalti Autorizzati e Subcontratti Attivati") for **Rosalinda Di Fiore** (ENI contact, email rosalinda.difiore@ren.eniplenitude.com), covering 8 projects: Assemini BESS, Gela BESS, TARSIA Lotto 1/2, SCANDERBEG Lotto 1/2, MASCHITO EPC Lotto 1/2.

**Why:** Rosalinda explicitly asked (email, cycle ending 2026-07-06) for the list updated to a given cutoff date, and cautioned that "contracts covering multiple projects must be attributed only to the relevant project" — initially read as a bug report, but Pietro confirmed the flagged companies genuinely are multi-site, so no data fix was needed that cycle.

**Monthly workflow (confirmed working end-to-end 2026-07-06):**
1. Pietro downloads the "Tutte" export from the ENI portal (Excel, all pratiche).
2. Imports it via the gestionale's *Importa Excel* page (updates Supabase `subaffidamenti`).
3. Opens Report/Export → Monthly Report ENI (component `src/components/MonthlyReportENI.tsx`), sets the "Aggiornato al" date — report (KPI, per-project table, charts, email draft) generates automatically from imported data, no manual step needed.
4. Exports Excel/PDF — this also saves a snapshot (now in Supabase, see [[project-monthly-report-snapshot-fix]]) for next month's "NUOVO" comparison.
5. Pietro is not technical enough to self-verify correctness — he sends both the fresh ENI Excel export and the generated PDF/Excel back to Claude each month for a cross-check before sending to Rosalinda. Keep doing this until he feels confident.

**Known-correct data fact (do not re-flag as a bug):** GRUPPO MAMMANA SRL, FE.VI. SRL, and POSA FER SRL are **genuinely** multi-site — the same subappalto pratica legitimately covers TARSIA Lotto 1, SCANDERBEG Lotto 1, and MASCHITO EPC Lotto 1 simultaneously (shared SAP contract 3510002383, RTI MAMMANA-IDOKA-DELTA). This is the intended "★ multi-sito" behavior, confirmed explicitly by Pietro twice. A manual per-pratica override exists (`progettoOverrideId`, click the ★ badge in the live report table) only as a safety valve for the rare case a shared-SAP pratica should NOT be split across all matching projects — not needed for these three companies.
