/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// World Cup Predictor Data and Core Propagation Engine

export interface GroupPrediction {
  groupName: string;
  teams: string[]; // Ordered list of team names: index 0 = 1st, 1 = 2nd, 2 = 3rd, 3 = 4th
}

export interface KnockoutPrediction {
  matchNo: number;
  round: 'Round of 32' | 'Round of 16' | 'Quarter-finals' | 'Semi-finals' | 'Third-place match' | 'Final';
  team1: string; // Dynamic team name or placeholder
  team2: string; // Dynamic team name or placeholder
  winner?: string; // Advancing team name
  loser?: string;  // Elminated team name (important for third-place match determination)
  venue: string;
  stadium: string;
  country: 'USA' | 'Canada' | 'Mexico';
  date: string;
  timeIST: string;
}

export interface PredictorState {
  groups: GroupPrediction[];
  thirdPlaces: string[]; // Order of all 12 third-placed teams ranked by the user
  knockouts: { [matchNo: number]: KnockoutPrediction };
  champion?: string;
  runnerUp?: string;
}

// Round of 32 Mapping Schema
export interface R32Mapping {
  matchNo: number;
  team1Source: { type: 'winner' | 'runner' | 'third'; group?: string; allowedGroups?: string[] };
  team2Source: { type: 'winner' | 'runner' | 'third'; group?: string; allowedGroups?: string[] };
  venue: string;
  stadium: string;
  country: 'USA' | 'Canada' | 'Mexico';
  date: string;
  timeIST: string;
}

// 16 Round of 32 Matches mappings
export const R32_MAPPINGS: R32Mapping[] = [
  {
    matchNo: 73,
    team1Source: { type: 'winner', group: 'A' },
    team2Source: { type: 'third', allowedGroups: ['C', 'E', 'F', 'H', 'I'] },
    venue: "Los Angeles", stadium: "SoFi Stadium", country: "USA", date: "June 28, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 74,
    team1Source: { type: 'runner', group: 'A' },
    team2Source: { type: 'runner', group: 'B' },
    venue: "Boston", stadium: "Gillette Stadium", country: "USA", date: "June 29, 2026", timeIST: "02:30 AM"
  },
  {
    matchNo: 75,
    team1Source: { type: 'winner', group: 'B' },
    team2Source: { type: 'third', allowedGroups: ['E', 'F', 'G', 'I', 'J'] },
    venue: "Vancouver", stadium: "BC Place", country: "Canada", date: "June 29, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 76,
    team1Source: { type: 'winner', group: 'C' },
    team2Source: { type: 'runner', group: 'F' },
    venue: "New York/New Jersey", stadium: "MetLife Stadium", country: "USA", date: "June 30, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 77,
    team1Source: { type: 'winner', group: 'F' },
    team2Source: { type: 'runner', group: 'C' },
    venue: "Boston", stadium: "Gillette Stadium", country: "USA", date: "June 30, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 78,
    team1Source: { type: 'winner', group: 'H' },
    team2Source: { type: 'runner', group: 'J' },
    venue: "Toronto", stadium: "BMO Field", country: "Canada", date: "July 1, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 79,
    team1Source: { type: 'winner', group: 'I' },
    team2Source: { type: 'third', allowedGroups: ['C', 'D', 'F', 'G', 'H'] },
    venue: "Houston", stadium: "NRG Stadium", country: "USA", date: "July 1, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 80,
    team1Source: { type: 'winner', group: 'E' },
    team2Source: { type: 'third', allowedGroups: ['A', 'B', 'C', 'D', 'F'] },
    venue: "Seattle", stadium: "Lumen Field", country: "USA", date: "July 2, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 81,
    team1Source: { type: 'runner', group: 'E' },
    team2Source: { type: 'runner', group: 'I' },
    venue: "San Francisco", stadium: "Levi's Stadium", country: "USA", date: "July 2, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 82,
    team1Source: { type: 'winner', group: 'L' },
    team2Source: { type: 'third', allowedGroups: ['E', 'H', 'I', 'J', 'K'] },
    venue: "Kansas City", stadium: "GEHA Field at Arrowhead Stadium", country: "USA", date: "July 3, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 83,
    team1Source: { type: 'winner', group: 'G' },
    team2Source: { type: 'third', allowedGroups: ['A', 'E', 'H', 'I', 'J'] },
    venue: "Atlanta", stadium: "Mercedes-Benz Stadium", country: "USA", date: "July 3, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 84,
    team1Source: { type: 'runner', group: 'K' },
    team2Source: { type: 'runner', group: 'L' },
    venue: "Philadelphia", stadium: "Lincoln Financial Field", country: "USA", date: "July 4, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 85,
    team1Source: { type: 'winner', group: 'D' },
    team2Source: { type: 'third', allowedGroups: ['B', 'E', 'F', 'I', 'J'] },
    venue: "Miami", stadium: "Hard Rock Stadium", country: "USA", date: "July 4, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 86,
    team1Source: { type: 'runner', group: 'D' },
    team2Source: { type: 'runner', group: 'G' },
    venue: "Dallas", stadium: "AT&T Stadium", country: "USA", date: "July 5, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 87,
    team1Source: { type: 'winner', group: 'J' },
    team2Source: { type: 'runner', group: 'H' },
    venue: "Houston", stadium: "NRG Stadium", country: "USA", date: "July 5, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 88,
    team1Source: { type: 'winner', group: 'K' },
    team2Source: { type: 'third', allowedGroups: ['D', 'E', 'I', 'J', 'L'] },
    venue: "Los Angeles", stadium: "SoFi Stadium", country: "USA", date: "July 6, 2026", timeIST: "03:00 AM"
  }
];

// Bracket Advancement Map (R16 down to Final)
export interface BracketMapping {
  matchNo: number;
  round: 'Round of 16' | 'Quarter-finals' | 'Semi-finals' | 'Third-place match' | 'Final';
  team1Source: { type: 'match'; matchNo: number; useWinner: boolean };
  team2Source: { type: 'match'; matchNo: number; useWinner: boolean };
  venue: string;
  stadium: string;
  country: 'USA' | 'Canada' | 'Mexico';
  date: string;
  timeIST: string;
}

export const BRACKET_MAPPINGS: BracketMapping[] = [
  // Round of 16
  {
    matchNo: 89, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 73, useWinner: true },
    team2Source: { type: 'match', matchNo: 75, useWinner: true },
    venue: "Houston", stadium: "NRG Stadium", country: "USA", date: "July 4, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 90, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 74, useWinner: true },
    team2Source: { type: 'match', matchNo: 77, useWinner: true },
    venue: "Dallas", stadium: "AT&T Stadium", country: "USA", date: "July 5, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 91, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 76, useWinner: true },
    team2Source: { type: 'match', matchNo: 78, useWinner: true },
    venue: "Seattle", stadium: "Lumen Field", country: "USA", date: "July 5, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 92, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 79, useWinner: true },
    team2Source: { type: 'match', matchNo: 80, useWinner: true },
    venue: "Atlanta", stadium: "Mercedes-Benz Stadium", country: "USA", date: "July 6, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 93, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 83, useWinner: true },
    team2Source: { type: 'match', matchNo: 84, useWinner: true },
    venue: "Vancouver", stadium: "BC Place", country: "Canada", date: "July 6, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 94, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 81, useWinner: true },
    team2Source: { type: 'match', matchNo: 82, useWinner: true },
    venue: "San Francisco", stadium: "Levi's Stadium", country: "USA", date: "July 7, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 95, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 86, useWinner: true },
    team2Source: { type: 'match', matchNo: 88, useWinner: true },
    venue: "Boston", stadium: "Gillette Stadium", country: "USA", date: "July 7, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 96, round: 'Round of 16',
    team1Source: { type: 'match', matchNo: 85, useWinner: true },
    team2Source: { type: 'match', matchNo: 87, useWinner: true },
    venue: "New York/New Jersey", stadium: "MetLife Stadium", country: "USA", date: "July 8, 2026", timeIST: "03:00 AM"
  },

  // Quarter-finals
  {
    matchNo: 97, round: 'Quarter-finals',
    team1Source: { type: 'match', matchNo: 89, useWinner: true },
    team2Source: { type: 'match', matchNo: 90, useWinner: true },
    venue: "Boston", stadium: "Gillette Stadium", country: "USA", date: "July 9, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 98, round: 'Quarter-finals',
    team1Source: { type: 'match', matchNo: 91, useWinner: true },
    team2Source: { type: 'match', matchNo: 92, useWinner: true },
    venue: "Los Angeles", stadium: "SoFi Stadium", country: "USA", date: "July 10, 2026", timeIST: "03:00 AM"
  },
  {
    matchNo: 99, round: 'Quarter-finals',
    team1Source: { type: 'match', matchNo: 93, useWinner: true },
    team2Source: { type: 'match', matchNo: 94, useWinner: true },
    venue: "Miami", stadium: "Hard Rock Stadium", country: "USA", date: "July 11, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 100, round: 'Quarter-finals',
    team1Source: { type: 'match', matchNo: 95, useWinner: true },
    team2Source: { type: 'match', matchNo: 96, useWinner: true },
    venue: "Kansas City", stadium: "GEHA Field at Arrowhead Stadium", country: "USA", date: "July 12, 2026", timeIST: "03:00 AM"
  },

  // Semi-finals
  {
    matchNo: 101, round: 'Semi-finals',
    team1Source: { type: 'match', matchNo: 97, useWinner: true },
    team2Source: { type: 'match', matchNo: 98, useWinner: true },
    venue: "Dallas", stadium: "AT&T Stadium", country: "USA", date: "July 14, 2026", timeIST: "11:30 PM"
  },
  {
    matchNo: 102, round: 'Semi-finals',
    team1Source: { type: 'match', matchNo: 99, useWinner: true },
    team2Source: { type: 'match', matchNo: 100, useWinner: true },
    venue: "Atlanta", stadium: "Mercedes-Benz Stadium", country: "USA", date: "July 15, 2026", timeIST: "03:00 AM"
  },

  // Third-place
  {
    matchNo: 103, round: 'Third-place match',
    team1Source: { type: 'match', matchNo: 101, useWinner: false },
    team2Source: { type: 'match', matchNo: 102, useWinner: false },
    venue: "Miami", stadium: "Hard Rock Stadium", country: "USA", date: "July 18, 2026", timeIST: "11:30 PM"
  },

  // Final
  {
    matchNo: 104, round: 'Final',
    team1Source: { type: 'match', matchNo: 101, useWinner: true },
    team2Source: { type: 'match', matchNo: 102, useWinner: true },
    venue: "New York/New Jersey", stadium: "MetLife Stadium", country: "USA", date: "July 19, 2026", timeIST: "11:30 PM"
  }
];

// Helper to assign 3rd placed teams to R32 matches
// Solves assignments dynamically ensuring no group conflicts if possible
export function allocateThirdPlaces(qualifiedThirds: string[], teamToGroupMap: { [team: string]: string }): { [matchNo: number]: string } {
  const assignments: { [matchNo: number]: string } = {};
  const activeThirds = [...qualifiedThirds]; // Order of priority ranking
  
  // R32 match slots that need 3rd places
  const slots = [
    { matchNo: 73, allowed: ['C', 'E', 'F', 'H', 'I'] },
    { matchNo: 75, allowed: ['E', 'F', 'G', 'I', 'J'] },
    { matchNo: 79, allowed: ['C', 'D', 'F', 'G', 'H'] },
    { matchNo: 80, allowed: ['A', 'B', 'C', 'D', 'F'] },
    { matchNo: 82, allowed: ['E', 'H', 'I', 'J', 'K'] },
    { matchNo: 83, allowed: ['A', 'E', 'H', 'I', 'J'] },
    { matchNo: 85, allowed: ['B', 'E', 'F', 'I', 'J'] },
    { matchNo: 88, allowed: ['D', 'E', 'I', 'J', 'L'] }
  ];

  const assignedTeams = new Set<string>();

  // Greedy match based on user's priority order:
  for (const slot of slots) {
    // 1. Look for the highest priority team belonging to an allowed group
    let matchedTeam = '';
    for (const team of activeThirds) {
      if (assignedTeams.has(team)) continue;
      const grp = teamToGroupMap[team];
      if (slot.allowed.includes(grp)) {
        matchedTeam = team;
        break;
      }
    }
    
    // 2. Fallback: if no ideal team fits, take the highest priority available team
    if (!matchedTeam) {
      for (const team of activeThirds) {
        if (!assignedTeams.has(team)) {
          matchedTeam = team;
          break;
        }
      }
    }

    if (matchedTeam) {
      assignments[slot.matchNo] = matchedTeam;
      assignedTeams.add(matchedTeam);
    } else {
      assignments[slot.matchNo] = "3rd Place Slot TBD";
    }
  }

  return assignments;
}

// Full Knockout State Auto Generator & Updater
export function generateKnockouts(
  groups: GroupPrediction[],
  thirdPlaces: string[],
  teamToGroupMap: { [team: string]: string },
  existingKnockouts?: { [matchNo: number]: KnockoutPrediction }
): { [matchNo: number]: KnockoutPrediction } {
  
  const nextKnockouts: { [matchNo: number]: KnockoutPrediction } = {};

  // Extract Winners (1st) and Runners-up (2nd) and 3rds mapping for lookup
  const winners: { [group: string]: string } = {};
  const runners: { [group: string]: string } = {};
  const thirds: { [group: string]: string } = {};

  groups.forEach(g => {
    winners[g.groupName] = g.teams[0] || `Winner Group ${g.groupName}`;
    runners[g.groupName] = g.teams[1] || `Runner-up Group ${g.groupName}`;
    thirds[g.groupName] = g.teams[2] || `3rd Group ${g.groupName}`;
  });

  // Calculate top 8 third-places that qualified
  const qualifiedThirds = thirdPlaces.slice(0, 8);
  const thirdPlaceMatchAssignments = allocateThirdPlaces(qualifiedThirds, teamToGroupMap);

  // Initialize Round of 32
  R32_MAPPINGS.forEach(mapping => {
    const matchNo = mapping.matchNo;
    
    let t1 = "";
    if (mapping.team1Source.type === 'winner') {
      t1 = winners[mapping.team1Source.group!];
    } else if (mapping.team1Source.type === 'runner') {
      t1 = runners[mapping.team1Source.group!];
    } else {
      t1 = thirdPlaceMatchAssignments[matchNo] || "3rd Place Placeholder";
    }

    let t2 = "";
    if (mapping.team2Source.type === 'winner') {
      t2 = winners[mapping.team2Source.group!];
    } else if (mapping.team2Source.type === 'runner') {
      t2 = runners[mapping.team2Source.group!];
    } else {
      t2 = thirdPlaceMatchAssignments[matchNo] || "3rd Place Placeholder";
    }

    // Preserve existing results
    const prevMatch = existingKnockouts ? existingKnockouts[matchNo] : undefined;
    const winner = prevMatch && (prevMatch.winner === t1 || prevMatch.winner === t2) ? prevMatch.winner : undefined;
    const loser = winner ? (winner === t1 ? t2 : t1) : undefined;

    nextKnockouts[matchNo] = {
      matchNo,
      round: 'Round of 32',
      team1: t1,
      team2: t2,
      winner,
      loser,
      venue: mapping.venue,
      stadium: mapping.stadium,
      country: mapping.country,
      date: mapping.date,
      timeIST: mapping.timeIST
    };
  });

  // Propagate sequentially through subsequent rounds
  BRACKET_MAPPINGS.forEach(mapping => {
    const matchNo = mapping.matchNo;

    // Determine team 1 from source mapping
    let t1 = `Winner Match ${mapping.team1Source.matchNo}`;
    if (mapping.team1Source.type === 'match') {
      const parent = nextKnockouts[mapping.team1Source.matchNo];
      if (parent) {
        if (mapping.team1Source.useWinner) {
          t1 = parent.winner || `Winner Match ${mapping.team1Source.matchNo}`;
        } else {
          t1 = parent.loser || `Loser Match ${mapping.team1Source.matchNo}`;
        }
      }
    }

    // Determine team 2 from source mapping
    let t2 = `Winner Match ${mapping.team2Source.matchNo}`;
    if (mapping.team2Source.type === 'match') {
      const parent = nextKnockouts[mapping.team2Source.matchNo];
      if (parent) {
        if (mapping.team2Source.useWinner) {
          t2 = parent.winner || `Winner Match ${mapping.team2Source.matchNo}`;
        } else {
          t2 = parent.loser || `Loser Match ${mapping.team2Source.matchNo}`;
        }
      }
    }

    // Preserve existing winner and loser if possible
    const prevMatch = existingKnockouts ? existingKnockouts[matchNo] : undefined;
    const winner = prevMatch && (prevMatch.winner === t1 || prevMatch.winner === t2) ? prevMatch.winner : undefined;
    const loser = winner ? (winner === t1 ? t2 : t1) : undefined;

    nextKnockouts[matchNo] = {
      matchNo,
      round: mapping.round,
      team1: t1,
      team2: t2,
      winner,
      loser,
      venue: mapping.venue,
      stadium: mapping.stadium,
      country: mapping.country,
      date: mapping.date,
      timeIST: mapping.timeIST
    };
  });

  return nextKnockouts;
}

// Helper to advance a team in a knockout match
export function advanceTeam(
  knockouts: { [matchNo: number]: KnockoutPrediction },
  matchNo: number,
  winnerName: string
): { [matchNo: number]: KnockoutPrediction } {
  const updatedKnockouts = { ...knockouts };
  const targetMatch = updatedKnockouts[matchNo];

  if (!targetMatch) return knockouts;

  const opponent = targetMatch.team1 === winnerName ? targetMatch.team2 : targetMatch.team1;
  targetMatch.winner = winnerName;
  targetMatch.loser = opponent;

  // Let's re-run propagation to push this winning team further down the bracket automatically.
  // We iteratively resolve paths matching BRACKET_MAPPINGS
  BRACKET_MAPPINGS.forEach(mapping => {
    const parentMatchNo = mapping.matchNo;
    const m = updatedKnockouts[parentMatchNo];
    if (!m) return;

    let t1 = m.team1;
    let t2 = m.team2;

    const source1 = updatedKnockouts[mapping.team1Source.matchNo];
    if (source1) {
      if (mapping.team1Source.useWinner) {
        t1 = source1.winner || `Winner Match ${mapping.team1Source.matchNo}`;
      } else {
        t1 = source1.loser || `Loser Match ${mapping.team1Source.matchNo}`;
      }
    }

    const source2 = updatedKnockouts[mapping.team2Source.matchNo];
    if (source2) {
      if (mapping.team2Source.useWinner) {
        t2 = source2.winner || `Winner Match ${mapping.team2Source.matchNo}`;
      } else {
        t2 = source2.loser || `Loser Match ${mapping.team2Source.matchNo}`;
      }
    }

    // Update teams in this node
    m.team1 = t1;
    m.team2 = t2;

    // Check if the current winner of this match node is still valid!
    if (m.winner !== t1 && m.winner !== t2) {
      m.winner = undefined;
      m.loser = undefined;
    } else {
      m.loser = m.winner === t1 ? t2 : t1;
    }
  });

  return updatedKnockouts;
}

// Initial defaults generator using teamsData
export function createNewPrediction(groupsData: any[]): PredictorState {
  const groups: GroupPrediction[] = groupsData.map(g => ({
    groupName: g.groupName,
    teams: g.teams.map((t: any) => t.team)
  }));

  // Initial group thirds list
  const initialThirds = groups.map(g => g.teams[2]);

  // Map to find what group a team belongs to
  const teamToGroupMap: { [team: string]: string } = {};
  groupsData.forEach(g => {
    g.teams.forEach((t: any) => {
      teamToGroupMap[t.team] = g.groupName;
    });
  });

  const knockouts = generateKnockouts(groups, initialThirds, teamToGroupMap);

  return {
    groups,
    thirdPlaces: initialThirds,
    knockouts
  };
}
