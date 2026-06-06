/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Match {
  id: number;
  matchNo: number;
  group: string; // A - L
  team1: string;
  flag1: string;
  team2: string;
  flag2: string;
  date: string;       // e.g., "June 11, 2026"
  timeIST: string;    // e.g., "05:30 AM" or "11:30 PM"
  utcTimestamp: number; // UTC Epoc timestamp in milliseconds for countdowns
  venue: string;      // City
  stadium: string;
  country: 'USA' | 'Canada' | 'Mexico';
  isFinalized?: boolean;
  status: 'upcoming' | 'live' | 'completed';
  score1?: number;
  score2?: number;
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: 'USA' | 'Canada' | 'Mexico';
  capacity: string;
  matchesCount: number;
  image: string;
}

export interface TeamStanding {
  team: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface GroupData {
  groupName: string; // "A" - "L"
  teams: TeamStanding[];
}
