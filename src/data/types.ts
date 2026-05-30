export type Division =
  | "Flyweight"
  | "Bantamweight"
  | "Featherweight"
  | "Lightweight"
  | "Welterweight"
  | "Middleweight"
  | "Light Heavyweight"
  | "Cruiserweight"
  | "Heavyweight";

export const DIVISIONS: Division[] = [
  "Flyweight",
  "Bantamweight",
  "Featherweight",
  "Lightweight",
  "Welterweight",
  "Middleweight",
  "Light Heavyweight",
  "Cruiserweight",
  "Heavyweight",
];

export type Stance = "Orthodox" | "Southpaw" | "Switch";

export interface FightRecord {
  opponent: string;
  result: "W" | "L" | "D";
  method: string;
  date: string;
  event: string;
}

export interface Fighter {
  username: string;
  displayName: string;
  nickname: string;
  division: Division;
  rank: number; // 0 = champion
  wins: number;
  losses: number;
  draws: number;
  kos: number;
  stance: Stance;
  belts: number;
  beltsHeld: string;
  debut: string;
  streak: string;
  bio: string;
  history: FightRecord[];
  image?: string; // URL to fighter photo
  discordId?: string;
}

export interface BoxingEvent {
  slug: string;
  name: string;
  date: string; // ISO
  arena: string;
  mainEvent: { a: string; b: string; title: string };
  card: { a: string; b: string; weight: Division }[];
  status: "upcoming" | "past";
  tagline: string;
  image?: string;
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: "Breaking News" | "Fight Results" | "Rankings" | "Event Announcements" | "Interviews";
  author: string;
  date: string;
  fighters: string[]; // usernames
  featured?: boolean;
  image?: string;
}

export interface Video {
  id: string;
  title: string;
  category:
    | "Highlights"
    | "Knockouts"
    | "Full Fights"
    | "Training"
    | "Faceoffs"
    | "Press Conferences";
  duration: string;
  fighters: string[];
  views: string;
}

export interface Product {
  id: string;
  name: string;
  category: "Hoodies" | "Shirts" | "Gloves" | "Caps" | "Champion Collection" | "Limited Drop";
  price: number;
  limited?: boolean;
  stock?: number;
  image?: string;
}
