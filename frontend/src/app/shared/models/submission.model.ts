export interface Submission {
  id: string;
  reference_code: string;
  titel: string;
  beschreibung?: string;
  kategorie: string;
  prioritaet: string;
  status: string;
  is_anonymous: boolean;
  eingegangen_am: string;
  tage_seit_eingang: number;
  eingangsbestaetigung_ueberfaellig: boolean;
  rueckmeldung_ueberfaellig: boolean;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  size: string;
  mime_type: string;
  uploaded_at: string;
}

export type HinweisKategorie =
  | "korruption" | "betrug" | "geldwaesche" | "steuerhinterziehung"
  | "umweltverstoss" | "verbraucherschutz" | "datenschutz"
  | "diskriminierung" | "arbeitssicherheit" | "produktsicherheit"
  | "sonstiges";

export type HinweisStatus =
  | "eingegangen" | "eingangsbestaetigung" | "in_pruefung"
  | "in_bearbeitung" | "rueckmeldung" | "abgeschlossen" | "abgelehnt";
