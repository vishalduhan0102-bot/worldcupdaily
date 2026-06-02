/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, Stadium, GroupData } from './types';
import groupsData from './data/groups.json';
import matchesData from './data/matches.json';
import stadiumsData from './data/stadiums.json';
import teamsData from './data/teams.json';
import knockoutData from './data/knockout.json';

export const STADIUMS: Stadium[] = stadiumsData as Stadium[];
export const GROUPS: GroupData[] = groupsData as GroupData[];
export const ALL_MATCHES: Match[] = matchesData as Match[];
export const KNOCKOUT = knockoutData;
export const TEAMS = teamsData;
