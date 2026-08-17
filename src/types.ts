export interface Student {
  name: string;
  pw: string;
  cls: string;
  unitIds: number[];
}

export interface Dialogue {
  lines: string[];
}

export interface Unit {
  id: number;
  name: string;
  emoji: string;
  classes: string[];
  dialogues: Dialogue[];
}

export interface SavedProgress {
  done: number[];
  next: number;
}

export interface HardRecord {
  dial: number;
  step: number;
  sentence: string;
  words: string[];
  tries: number;
}

export interface PassRecord {
  dial: number;
  step: number;
  tries: number;
  sentence: string;
}
