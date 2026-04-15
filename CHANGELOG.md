# Changelog v2.1 — Revisione logica reale + ridimensionamento UI

## Fix critici
- **AuthContext**: aggiunto `loading: boolean` — eliminato bug di compilazione in App.tsx
- **Date hardcoded**: `new Date('2026-04-07')` e `new Date('2026-04-08')` sostituiti con `new Date()` in Dashboard, ControlloDocumentale, AnagraficaAppaltatori

## Allineamento dati reali (Excel Elaborabili)
- **types/index.ts**: campi `Subaffidamento` rinominati con nomi corretti allineati alle colonne Excel:
  - `app` → `appaltatore` (con alias legacy `app`)
  - `sub` → `subfornitore` (con alias legacy `sub`)
  - `idSap` → `idSapContratto` (con alias legacy `idSap`)
  - `unitaGest` → `unitaGestore` (con alias legacy)
  - `socComm` → `societaCommittente` (con alias legacy)
  - `statoProv` → `statoPerProvvedimento` (con alias legacy)
  - `importoEur` → `importoRichiestoEuro` (con alias legacy)
  - `importoMaxSub` → `importoMassimoSubappaltabile` (con alias legacy)
  - `residuoSub` → `residuoSubappaltabile` (con alias legacy)
  - Aggiunti: `unitaProcuratore`, `validitaAmministrativa`, `codiceSapAppaltatore`,
    `codiceSapSubfornitore`, `descrizioneGm`, `noteAppaltatore`, `dataCreazione`,
    `dataInizio`, `dataFine`, `primaDataAutorizzazione`, `importoRichiestoValuta`,
    `protocolloLegalita`, `antimafiaRichiesta`, `allegatiScaduti`, `richiestoNullaosta`,
    `dataUltimoAggiornamento`, `protocolloNpa`, `esitoProtocolloNpa`, `motivazioneProtocollo`
- **DataContext**: sostituiti tutti i dati fake con i 16 record reali dall'Excel
- **DataContext**: `documenti` ora parte da `[]` (nessun dato inventato)
- **DataContext**: 8 appaltatori reali (DUSSMANN, ESPE, HPC, HYDRO ENGINEERING, PLC, RINA, SICURITALIA, TERNA)

## Ridimensionamento UI (nessuna funzionalità rimossa)
- Dashboard: padding `p-7→p-5`, KPI `text-4xl→text-3xl`, titolo `text-xl→text-base`
- ControlloDocumentale: titolo `text-2xl→text-lg`, input `h-11→h-10`, bottoni `h-14→h-12`
- AnagraficaAppaltatori: avatar panel ridotto, KPI valori ridotti
- Tutte le pagine: `rounded-2xl p-6→rounded-xl p-4` dove eccessivo

## Logica import Excel aggiornata
- ImportaExcel e Dashboard handleExcelImport: mappano ora tutti i 51 campi reali
- Export Excel e PDF: usano `appaltatore || app` per retrocompatibilità
