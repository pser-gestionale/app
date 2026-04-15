export type UserRole = 'Amministratore' | 'Contract Holder Collaborator (PSER)' | 'Resp. Project Service - PSER';

export interface User {
  username: string;
  password?: string;
  role: UserRole;
  nome: string;
  email: string;
  created: string;
  settore?: string;
}

export interface Subaffidamento {
  id: string;
  stato: string;
  versione?: number;
  idSapContratto?: string;
  unitaGestore?: string;
  unitaProcuratore?: string;
  societaCommittente?: string;
  oggetto?: string;
  dataInizioContratto?: string;
  dataFineContratto?: string;
  validitaAmministrativa?: string;
  valuta?: string;
  appaltatore: string;
  codiceSapAppaltatore?: string;
  subfornitore: string;
  codiceSapSubfornitore?: string;
  gm?: string;
  descrizioneGm?: string;
  noteAppaltatore?: string;
  oggettoRichiesta?: string;
  tipo: 'Subappalto' | 'Subcontratto';
  dataCreazione?: string;
  dataInizio?: string;
  dataFine?: string;
  scadenza?: string;
  inserito?: string;
  primaDataAutorizzazione?: string;
  contractHolder?: string;
  importoRichiestoValuta?: string;
  importoRichiestoEuro?: string;
  importoMassimoSubappaltabile?: string;
  residuoSubappaltabile?: string;
  consuntivo?: string;
  consuntivoForzato?: boolean;
  protocolloLegalita?: boolean;
  antimafiaRichiesta?: boolean;
  allegati?: string;
  antimafia?: string;
  nominativiChecklist?: string;
  statoQualifica?: string;
  statoAnagrafica?: string;
  statoPerProvvedimento?: string;
  richiestoNullaosta?: boolean;
  dataUltimoAggiornamento?: string;
  allegatiScaduti?: boolean;
  protocolloNpa?: string;
  esitoProtocolloNpa?: string;
  motivazioneProtocollo?: string;
  ch?: string;
  cam?: string;
  ca?: string;
  chc?: string;
  cc?: string;
  // Alias legacy per compatibilità UI (rimossi gradualmente)
  app?: string;
  sub?: string;
  attivita?: string;
  importoEur?: string;
  importoMaxSub?: string;
  residuoSub?: string;
  idSap?: string;
  unitaGest?: string;
  socComm?: string;
  statoProv?: string;
  note?: string;
  inizio?: string;
}

export interface Appaltatore {
  nome: string;
  settore: string;
  tipo: string;
  referente: string;
  email: string;
  tel: string;
  piva: string;
  sede: string;
  note: string;
  aggiunto: string;
  dataInizio?: string;
  dataFine?: string;
  idSap?: string;
  codApp?: string;
}

export interface DocumentoControllo {
  app: string;
  sap: string;
  doc: string;
  esito: string;
  scad: string;
  cat?: string;
  giorni?: number;
  prio?: string;
  ts?: string;
  utente?: string;
  nota?: string;
  termineAdeguamento?: string;
  responsabile?: string;
}

export interface ActivityLog {
  ts: string;
  tsDisplay: string;
  utente: string;
  tipo: 'insert' | 'update' | 'delete' | 'import' | 'login' | 'export';
  foglio: string;
  desc: string;
  detail: string;
}

export interface AccessLog {
  user: string;
  role: string;
  nome: string;
  ts: string;
}

export interface Settings {
  accent_color?: string;
  density?: 'normal' | 'compact' | 'spacious';
  animations?: boolean;
  tooltips?: boolean;
  alert_scadenze?: boolean;
  alert_days?: number;
  alert_rigettate?: boolean;
  alert_documenti?: boolean;
  cal_auto?: boolean;
  cal_default_view?: 'today' | 'upcoming';
  import_dup_default?: 'ask' | 'update' | 'keep' | 'skip';
  import_preview?: boolean;
  import_log?: boolean;
  standby_enabled?: boolean;
  standby_minutes?: number;
}
