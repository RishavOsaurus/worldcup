export interface Team {
  name: string;
  flag?: string; // emoji flag
  isPlayoff?: boolean;
}

export interface Group {
  name: string;
  teams: Team[];
}
