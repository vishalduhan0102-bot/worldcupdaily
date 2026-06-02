/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Share2,
  Search,
  Star,
  MapPin,
  Clock,
  Grid,
  List,
  Trophy,
  TrendingUp,
  Filter,
  Check,
  Info,
  X
} from 'lucide-react';
import { Match, Stadium, TeamStanding, GroupData } from './types';
import { STADIUMS, GROUPS, ALL_MATCHES, KNOCKOUT, TEAMS } from './data';

// Helper function to calculate local kickoff time dynamically based on summer standard daylight timezone offsets of host venues
function getLocalKickoffTime(utcTimestamp: number, venue: string): string {
  let offset = -5; // default fallback (Central Daylight Time - CDT)
  const v = venue.toLowerCase();
  
  if (v.includes('los angeles') || v.includes('vancouver') || v.includes('seattle') || v.includes('san francisco') || v.includes('bay area')) {
    offset = -7; // Pacific Daylight Time (PDT)
  } else if (v.includes('mexico city') || v.includes('guadalajara') || v.includes('monterrey')) {
    offset = -6; // Central Standard Time (CST) for Mexico which does not observe DST in June
  } else if (v.includes('dallas') || v.includes('houston') || v.includes('kansas city') || v.includes('chicago')) {
    offset = -5; // Central Daylight Time (CDT)
  } else if (v.includes('toronto') || v.includes('boston') || v.includes('new york') || v.includes('atlanta') || v.includes('miami') || v.includes('philadelphia')) {
    offset = -4; // Eastern Daylight Time (EDT)
  }

  const localTimeMs = utcTimestamp + (offset * 60 * 60 * 1000);
  const localDate = new Date(localTimeMs);
  
  let hours = localDate.getUTCHours();
  const minutes = localDate.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  const hoursStr = hours < 10 ? '0' + hours : hours;

  let tzAbbr = 'EDT';
  if (offset === -7) tzAbbr = 'PDT';
  else if (offset === -6) tzAbbr = 'CST';
  else if (offset === -5) tzAbbr = 'CDT';
  else if (offset === -4) tzAbbr = 'EDT';

  return `${hoursStr}:${minutesStr} ${ampm} ${tzAbbr}`;
}

const countryToFifa: Record<string, string> = {
  "Mexico": "MEX", "South Africa": "RSA", "South Korea": "KOR", "Czech Republic": "CZE",
  "Canada": "CAN", "Bosnia and Herzegovina": "BIH", "Qatar": "QAT", "Switzerland": "SUI",
  "Brazil": "BRA", "Morocco": "MAR", "Haiti": "HAI", "Scotland": "SCO",
  "USA": "USA", "Paraguay": "PAR", "Australia": "AUS", "Turkey": "TUR",
  "Germany": "GER", "Curaçao": "CUW", "Ivory Coast": "CIV", "Ecuador": "ECU",
  "Netherlands": "NED", "Japan": "JPN", "Sweden": "SWE", "Tunisia": "TUN",
  "Belgium": "BEL", "Egypt": "EGY", "Iran": "IRN", "New Zealand": "NZL",
  "Spain": "ESP", "Cape Verde": "CPV", "Saudi Arabia": "KSA", "Uruguay": "URU",
  "France": "FRA", "Senegal": "SEN", "Iraq": "IRQ", "Norway": "NOR",
  "Argentina": "ARG", "Algeria": "ALG", "Austria": "AUT", "Jordan": "JOR",
  "Portugal": "POR", "DR Congo": "COD", "Uzbekistan": "UZB", "Colombia": "COL",
  "England": "ENG", "Croatia": "CRO", "Ghana": "GHA", "Panama": "PAN"
};

const countryToIso: Record<string, string> = {
  "Mexico": "mx", "South Africa": "za", "South Korea": "kr", "Czech Republic": "cz",
  "Canada": "ca", "Bosnia and Herzegovina": "ba", "Qatar": "qa", "Switzerland": "ch",
  "Brazil": "br", "Morocco": "ma", "Haiti": "ht", "Scotland": "gb-sct",
  "USA": "us", "Paraguay": "py", "Australia": "au", "Turkey": "tr",
  "Germany": "de", "Curaçao": "cw", "Ivory Coast": "ci", "Ecuador": "ec",
  "Netherlands": "nl", "Japan": "jp", "Sweden": "se", "Tunisia": "tn",
  "Belgium": "be", "Egypt": "eg", "Iran": "ir", "New Zealand": "nz",
  "Spain": "es", "Cape Verde": "cv", "Saudi Arabia": "sa", "Uruguay": "uy",
  "France": "fr", "Senegal": "sn", "Iraq": "iq", "Norway": "no",
  "Argentina": "ar", "Algeria": "dz", "Austria": "at", "Jordan": "jo",
  "Portugal": "pt", "DR Congo": "cd", "Uzbekistan": "uz", "Colombia": "co",
  "England": "gb-eng", "Croatia": "hr", "Ghana": "gh", "Panama": "pa"
};

function getTeamDetails(name: string) {
  if (!name) return { fifaCode: "TBD", flagUrl: null, name: "" };
  
  const trimmed = name.trim();
  const fifa = countryToFifa[trimmed];
  const iso = countryToIso[trimmed];

  if (fifa) {
    return {
      fifaCode: fifa,
      flagUrl: `https://flagcdn.com/w40/${iso.toLowerCase()}.png`,
      name: trimmed
    };
  }

  // Handle placeholders like "Winner Group A", "3rd Group C/D/I", "TBD", etc.
  let code = "TBD";
  if (trimmed.toUpperCase().startsWith("WINNER GROUP")) {
    const grp = trimmed.split(" ").pop();
    code = `W-${grp}`;
  } else if (trimmed.toUpperCase().startsWith("RUNNER-UP GROUP")) {
    const grp = trimmed.split(" ").pop();
    code = `R-${grp}`;
  } else if (trimmed.toUpperCase().startsWith("3RD GROUP")) {
    code = "3RD";
  } else if (trimmed.toUpperCase().startsWith("TBD")) {
    code = "TBD";
  } else {
    // Fallback: use first 3 letters if nothing else matched
    code = trimmed.substring(0, 3).toUpperCase();
  }

  return {
    fifaCode: code,
    flagUrl: null,
    name: trimmed
  };
}

function TeamBadge({ name, className = "" }: { name: string; className?: string }) {
  const details = getTeamDetails(name);
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {details.flagUrl ? (
        <img
          src={details.flagUrl}
          alt={details.name}
          className="w-5.5 h-3.5 object-cover rounded-xs border border-white/10 shadow-sm shrink-0"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div className="w-5.5 h-3.5 rounded-xs bg-white/10 border border-white/10 flex items-center justify-center text-[7px] text-neutral-400 font-extrabold uppercase font-mono leading-none shrink-0">
          ?
        </div>
      )}
      <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
        {details.fifaCode}
      </span>
    </div>
  );
}

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'schedule' | 'groups' | 'stadiums' | 'saved' | 'bracket'>('schedule');

  // Dynamic Data States loaded via fetch
  const [matches, setMatches] = useState<Match[]>(ALL_MATCHES);
  const [groupsDataState, setGroupsDataState] = useState<GroupData[]>(GROUPS);
  const [stadiumsDataState, setStadiumsDataState] = useState<Stadium[]>(STADIUMS);
  const [knockoutDataState, setKnockoutDataState] = useState<any[]>(KNOCKOUT);
  const [teamsDataState, setTeamsDataState] = useState<any[]>(TEAMS);
  const [isDataFetching, setIsDataFetching] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [selectedBracketRound, setSelectedBracketRound] = useState<string>('Round of 32');

  // Saved Matches State
  const [savedMatches, setSavedMatches] = useState<number[]>([]);

  // Preloader State
  const [isLoading, setIsLoading] = useState(true);

  // Reminders Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Big Countdown State (June 11, 2026 20:00:00 UTC / June 12, 1:30 AM IST)
  const openingKickoffUTC = 1781294400000; // Epoch for June 11, 2026, 20:00:00 UTC
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Group stand-in highlighting state
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('A');

  // PWA installation states and effects
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    const globalWin = window as any;
    
    // Check if the app is already running in standalone display-mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || globalWin.navigator.standalone === true;
    const isDismissed = localStorage.getItem('wcdaily_pwa_dismissed') === 'true';

    // If it's not standalone and has not been dismissed, we want the banner to be visible
    if (!isStandalone && !isDismissed) {
      setShowInstallButton(true);
    }

    // Check if prompt was already captured globally in index.html
    if (globalWin.deferredPrompt) {
      setDeferredPrompt(globalWin.deferredPrompt);
    }

    // Also listen for runtime callbacks
    globalWin.onBeforeInstallPrompt = (e: any) => {
      setDeferredPrompt(e);
      if (!isStandalone && !isDismissed) {
        setShowInstallButton(true);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone && !isDismissed) {
        setShowInstallButton(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallButton(false);
      globalWin.deferredPrompt = null;
      localStorage.setItem('wcdaily_pwa_dismissed', 'true'); // Persist so they don't see it again
      showToast('🎉 World Cup Daily successfully installed!');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      globalWin.onBeforeInstallPrompt = null;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const pmt = deferredPrompt || (window as any).deferredPrompt;
    if (pmt) {
      try {
        pmt.prompt();
        const { outcome } = await pmt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          (window as any).deferredPrompt = null;
          setShowInstallButton(false);
          showToast('🎉 Thank you for installing World Cup Daily!');
        }
      } catch (e) {
        console.error('[PWA] Native install prompt failed:', e);
        setShowInstallGuide(true);
      }
    } else {
      // Prompt not available (e.g. Safari, inside iframe, or pending heuristics), show the interactive guide modal
      setShowInstallGuide(true);
    }
  };

  const handleDismissBanner = () => {
    setShowInstallButton(false);
    localStorage.setItem('wcdaily_pwa_dismissed', 'true');
    showToast('Banner dismissed. You can still install the app using your browser menu.');
  };

  const getInstallInstructions = () => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      return {
        title: "Preview App Shell",
        steps: [
          "You are currently viewing the app inside an interactive preview iframe.",
          "Please click the 'Open in new tab' button at the top of your screen to access the application outside the editor container.",
          "Once opened in a standalone tab, you will be able to install it directly to your home screen."
        ],
        badge: "Browser Preview Container"
      };
    }

    const userAgent = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

    if (isIOS || isSafari) {
      return {
        title: "Apple iOS / Safari Setup",
        steps: [
          "Tap the 'Share' button in your Safari navigation bar (the square icon with an up-pointing arrow).",
          "Scroll down the sharing options menu and tap 'Add to Home Screen'.",
          "Tap 'Add' in the upper-right corner to complete the installation."
        ],
        badge: "iOS / macOS Standard"
      };
    }

    return {
      title: "Browser & Desktop Setup",
      steps: [
        "Look for the computer screen icon with a down-pointing arrow (or the '+' symbol) inside your browser's address/search bar.",
        "Click it and select 'Install' to add the application.",
        "Alternatively, open the browser's main menu (⋮ or ⋯) and click 'Install World Cup Daily' or 'Add to Home Screen'."
      ],
      badge: "Android / Chrome / Edge"
    };
  };

  // Initialize and load saved state from localStorage and fetch dynamic datasets
  useEffect(() => {
    const saved = localStorage.getItem('wc_daily_saved');
    if (saved) {
      try {
        setSavedMatches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved watchlist templates', e);
      }
    }

    // Dynamic Fetching from the copied public directory
    Promise.all([
      fetch('/data/matches.json').then(res => {
        if (!res.ok) throw new Error('Matches fetch failed');
        return res.json();
      }),
      fetch('/data/groups.json').then(res => {
        if (!res.ok) throw new Error('Groups fetch failed');
        return res.json();
      }),
      fetch('/data/stadiums.json').then(res => {
        if (!res.ok) throw new Error('Stadiums fetch failed');
        return res.json();
      }),
      fetch('/data/knockout.json').then(res => {
        if (!res.ok) throw new Error('Knockout fetch failed');
        return res.json();
      }),
      fetch('/data/teams.json').then(res => {
        if (!res.ok) throw new Error('Teams fetch failed');
        return res.json();
      }),
    ])
      .then(([m, g, s, k, t]) => {
        console.log('Dynamic data loaded successfully via fetch()!');
        setMatches(m);
        setGroupsDataState(g);
        setStadiumsDataState(s);
        setKnockoutDataState(k);
        setTeamsDataState(t);
        setIsDataFetching(false);
      })
      .catch(err => {
        console.warn('Dynamic fetch fallback triggered (using static imports):', err);
        setIsDataFetching(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Sync saved list with local storage
  const toggleSaveMatch = (id: number) => {
    let updated: number[];
    if (savedMatches.includes(id)) {
      updated = savedMatches.filter(mId => mId !== id);
      showToast('Removed from Watchlist ❌');
    } else {
      updated = [...savedMatches, id];
      showToast('Added to Watchlist! ⭐');
    }
    setSavedMatches(updated);
    localStorage.setItem('wc_daily_saved', JSON.stringify(updated));
  };

  // Live countdown clock ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Toast Helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Google Calendar Integration Generator
  const getGoogleCalendarUrl = (match: Match) => {
    const formatTimeForGoogle = (timestamp: number) => {
      const d = new Date(timestamp);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    const start = formatTimeForGoogle(match.utcTimestamp);
    const end = formatTimeForGoogle(match.utcTimestamp + 7200000); // 2 Hours match block
    const title = encodeURIComponent(`World Cup 2026: ${match.team1} vs ${match.team2}`);
    const details = encodeURIComponent(
      `Match No: ${match.matchNo} (${match.group} Stage)\n` +
      `Host country: ${match.country}\n` +
      `Indian Standard Time (IST): ${match.timeIST}\n` +
      `Curation by World Cup Daily (IST Hub). Enjoy the match!`
    );
    const location = encodeURIComponent(`${match.stadium}, ${match.venue}, ${match.country}`);
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  };

  // Copy or native social share trigger
  const shareMatchInfo = (match: Match) => {
    const t1Details = getTeamDetails(match.team1);
    const t2Details = getTeamDetails(match.team2);
    const shareText = `⚽ World Cup 2026 Match ${match.matchNo}:\n🔥 ${t1Details.fifaCode} (${match.team1}) vs ${t2Details.fifaCode} (${match.team2})\n⏰ ${match.date} | ${match.timeIST} (IST)\n🏟 ${match.stadium}, ${match.venue}\n\nCheck official schedule on World Cup Daily IST Hub!`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'World Cup Daily Hub',
        text: shareText,
        url: shareUrl,
      })
        .then(() => showToast('Shared successfully! 📲'))
        .catch(() => {
          copyToClipboard(shareText);
        });
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Match details copied to clipboard! 📋'))
      .catch(() => showToast('Unable to copy details.'));
  };

  const setRemindMe = (match: Match) => {
    showToast(`🔔 Reminder set for Match ${match.matchNo} (${match.team1} vs ${match.team2})!`);
  };

  // Standings engine calculated dynamically
  const calculatedGroups = useMemo(() => {
    return groupsDataState.map(group => {
      // Initialize team stats
      const teamsStats = group.teams.map((t, index) => ({
        team: t.team,
        flag: t.flag,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        goalDifference: 0,
        originalIndex: index
      }));

      // Find all matches belonging to this group
      const groupMatches = matches.filter(m => m.group === group.groupName);

      groupMatches.forEach(match => {
        if ((match.status === 'completed' || match.isFinalized) && typeof match.score1 === 'number' && typeof match.score2 === 'number') {
          const t1 = teamsStats.find(t => t.team === match.team1);
          const t2 = teamsStats.find(t => t.team === match.team2);

          if (t1 && t2) {
            t1.played += 1;
            t2.played += 1;
            t1.goalsFor += match.score1;
            t1.goalsAgainst += match.score2;
            t2.goalsFor += match.score2;
            t2.goalsAgainst += match.score1;

            if (match.score1 > match.score2) {
              t1.won += 1;
              t1.points += 3;
              t2.lost += 1;
            } else if (match.score1 < match.score2) {
              t2.won += 1;
              t2.points += 3;
              t1.lost += 1;
            } else {
              t1.drawn += 1;
              t1.points += 1;
              t2.drawn += 1;
              t2.points += 1;
            }
          }
        }
      });

      teamsStats.forEach(t => {
        t.goalDifference = t.goalsFor - t.goalsAgainst;
      });

      // Sort teams dynamically by points, goalDifference, goalsFor, then original index to preserve groups.json order
      const sortedTeams = [...teamsStats].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.originalIndex - b.originalIndex;
      });

      return {
        groupName: group.groupName,
        teams: sortedTeams
      };
    });
  }, [groupsDataState, matches]);

  // Debug report and validation step for group loadings in standings component
  useEffect(() => {
    if (activeTab === 'groups' && !isDataFetching) {
      console.log('--- STANDINGS COMPONENT DEBUG REPORT ---');
      calculatedGroups.forEach(g => {
        const teamNames = g.teams.map(t => t.team);
        console.log(`Group ${g.groupName} teams: ${teamNames.join(', ')}`);
        
        // Validation check for Group F
        if (g.groupName === 'F') {
          const originalGroupF = GROUPS.find(orig => orig.groupName === 'F');
          const originalTeams = originalGroupF ? originalGroupF.teams.map(t => t.team) : [];
          const isMatch = teamNames.length === 4 && teamNames.every((t, i) => t === originalTeams[i]);
          if (isMatch) {
            console.log('✅ Validation Succeeded: Group F matches groups.json exactly!');
          } else {
            console.warn('❌ Validation Failed: Group F mismatch with groups.json!', { originalTeams, shownTeams: teamNames });
          }
        }
      });
      console.log('-----------------------------------------');
    }
  }, [activeTab, calculatedGroups, isDataFetching]);

  // Today features dynamically computed
  const dailyHubGroups = useMemo(() => {
    const currDateObj = new Date(currentTime);
    const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' } as const;
    const todayStr = currDateObj.toLocaleDateString('en-US', dateOptions); // "June 2, 2026"
    
    const tomDateObj = new Date(currentTime + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomDateObj.toLocaleDateString('en-US', dateOptions); // "June 3, 2026"

    const todays = matches.filter(m => m.date === todayStr);
    const tomorrows = matches.filter(m => m.date === tomorrowStr);
    
    // Recently played: any match where status is 'completed'
    const recently = matches
      .filter(m => m.status === 'completed')
      .sort((a, b) => b.utcTimestamp - a.utcTimestamp);

    // Upcoming: matches that have status 'upcoming' or 'live' and are in the future
    const upcoming = matches
      .filter(m => m.status === 'upcoming' && m.date !== todayStr && m.date !== tomorrowStr && m.utcTimestamp > currentTime)
      .sort((a, b) => a.utcTimestamp - b.utcTimestamp);

    return {
      todays,
      tomorrows,
      recently: recently.slice(0, 5), // show recent 5 matches
      upcoming: upcoming.slice(0, 5), // show next 5 matches
      todayStr,
      tomorrowStr
    };
  }, [matches, currentTime]);

  // Filter schedule based on search terms and tab choices
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const pinsSearch = 
        match.team1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.team2.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.stadium.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.date.toLowerCase().includes(searchTerm.toLowerCase());

      const groupMatch = selectedGroup === 'All' || match.group === selectedGroup;
      const countryMatch = selectedCountry === 'All' || match.country === selectedCountry;

      return pinsSearch && groupMatch && countryMatch;
    });
  }, [matches, searchTerm, selectedGroup, selectedCountry]);

  // Saved/Watchlisted filtered matchups
  const watchlistedMatches = useMemo(() => {
    return matches.filter(m => savedMatches.includes(m.id));
  }, [matches, savedMatches]);

  // Live countdown components calculation
  const getCountdownParts = (targetTimestamp: number) => {
    const diff = targetTimestamp - currentTime;
    if (diff <= 0) {
      return { days: '00', hours: '00', mins: '00', secs: '00', active: false };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days: days.toString().padStart(2, '0'),
      hours: hours.toString().padStart(2, '0'),
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0'),
      active: true
    };
  };

  const openingCountdown = getCountdownParts(openingKickoffUTC);

  return (
    <div className="relative min-h-screen bg-[#050505] text-white">
      {/* 1. Loading Preloader Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
          <div className="relative mb-6 animate-float">
            {/* SVG custom animated World Cup Trophy */}
            <svg className="h-28 w-28 text-gold drop-shadow-[0_0_25px_rgba(212,175,55,0.7)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" fill="currentColor" opacity="0.15" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.5 0 3-1.5 3-3V6c0-1.5-1.5-3-3-3s-3 1.5-3 3v2c0 1.5 1.5 3 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 8c0 2-1.5 5.5-3.5 7.5S12 18 12 18s-1.5-2.5-3.5-4.5S5 10 5 8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3m-4 0h8" />
              <circle cx="12" cy="7" r="1.5" fill="currentColor" />
            </svg>
            <div className="absolute top-1/2 left-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10 animate-ping absolute -z-10" />
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-wider text-white">
            WORLD CUP <span className="text-gold gold-glow-text">DAILY</span>
          </h2>
          <p className="mt-2 text-xs font-medium tracking-[0.3em] text-electric">FIFA WORLD CUP 2026 IST INDEX</p>
          <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full bg-gold animate-shimmer" style={{ width: '100%', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #D4AF37 25%, #FFF 50%, #D4AF37 75%)' }} />
          </div>
          <p className="mt-3 text-xs text-neutral-500 font-mono">POPULATING 72 GROUP FIXTURES</p>
        </div>
      )}

      {/* 2. Global Toast Message Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-gold px-6 py-3 font-semibold text-black shadow-2xl transition-all animate-bounce flex items-center gap-2">
          <Check className="h-4 w-4 stroke-[3]" />
          <span className="text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* 3. Global Static Spotlight Cones Backdrop (Animated) */}
      <div className="pointer-events-none fixed top-0 left-0 right-0 h-[450px] overflow-hidden -z-10">
        <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-[#0e213b]/30 via-transparent to-transparent" />
        <div className="absolute left-[20%] top-[-100px] h-96 w-[120px] bg-gradient-to-b from-electric/15 to-transparent blur-2xl transform origin-top animate-lights-moving" />
        <div className="absolute right-[20%] top-[-100px] h-96 w-[140px] bg-gradient-to-b from-gold/15 to-transparent blur-2xl transform origin-top animate-lights-moving" style={{ animationDelay: '-4s' }} />
      </div>

      {/* 4. Main Application Layout Container */}
      <div className="mx-auto max-w-lg px-4 pt-4 pb-24">
        {/* Application Header Bar */}
        <header className="flex items-center justify-between py-4 border-b border-white/10 bg-black/40 backdrop-blur-md rounded-2xl px-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gold rounded-sm rotate-45 flex items-center justify-center shadow-lg shadow-gold/20">
              <div className="text-black font-black text-xs -rotate-45 font-display">WC</div>
            </div>
            <div>
              <h1 className="font-display text-xl font-black tracking-tighter uppercase leading-none">
                WORLD CUP <span className="text-gold">DAILY</span>
              </h1>
              <p className="text-[9px] tracking-widest font-mono text-electric font-bold mt-1">FIFA 2026 IST INDEX</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('saved')}
              className={`relative p-2.5 rounded-xl border transition-all ${
                activeTab === 'saved'
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-white/5 bg-white/5 hover:bg-white/10 text-white'
              }`}
            >
              <Star className="h-4.5 w-4.5" fill={activeTab === 'saved' || savedMatches.length > 0 ? 'currentColor' : 'none'} />
              {savedMatches.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-black ring-2 ring-[#050505]">
                  {savedMatches.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* PWA Install Banner */}
        {showInstallButton && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-gold/15 to-yellow-600/15 border border-gold/40 flex items-center justify-between shadow-lg shadow-gold/5 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center shrink-0 shadow-md">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
              </div>
              <div className="text-left">
                <span className="block text-xs font-black text-white uppercase tracking-wider">World Cup Daily</span>
                <span className="block text-[10px] text-neutral-400 font-semibold font-sans leading-tight">Get every 2026 fixture in IST, even offline.</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="cursor-pointer px-3 py-1.5 bg-gold hover:bg-yellow-400 text-black text-[10px] font-black uppercase rounded-lg tracking-wider shadow-lg transition-all shrink-0"
              >
                📲 Install
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Dismiss Banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 5. HERO SECTION: Trophy Art, Floodlights, Live Countdown */}
        {activeTab === 'schedule' && (
          <section className="relative mt-5 rounded-2xl overflow-hidden glass-panel border border-white/10 p-6 shadow-2xl">
            {/* Ambient Stadium Glow */}
            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-blue-900/20 via-transparent to-transparent pointer-events-none -z-10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[150px] bg-gradient-radial from-white/10 to-transparent blur-2xl opacity-30 pointer-events-none -z-10" />

            <div className="flex flex-col items-center text-center">
              <span className="mb-2 text-xs font-black tracking-[0.3em] text-blue-400">
                JUNE 11 – JULY 19, 2026
              </span>
              
              <h2 className="font-display text-4xl lg:text-5xl font-black italic tracking-tighter leading-none mt-2 mb-4 drop-shadow-2xl">
                THE WORLD'S<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-600">
                  GREATEST STAGE
                </span>
              </h2>

              <p className="max-w-xs text-[11px] uppercase tracking-wider text-neutral-400 font-bold font-sans">
                Group Stage Schedule Hub • Indian Standard Time (IST)
              </p>

              {/* Countdown Component */}
              <div className="mt-6 w-full flex gap-3 bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-2xl justify-center">
                <div className="text-center min-w-[55px]">
                  <span className="block text-2xl font-black text-gold">{openingCountdown.days}</span>
                  <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-extrabold">Days</span>
                </div>
                <div className="text-center min-w-[55px]">
                  <span className="block text-2xl font-black">{openingCountdown.hours}</span>
                  <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-extrabold">Hrs</span>
                </div>
                <div className="text-center min-w-[55px]">
                  <span className="block text-2xl font-black">{openingCountdown.mins}</span>
                  <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-extrabold">Min</span>
                </div>
                <div className="text-center min-w-[55px]">
                  <span className="block text-2xl font-black text-blue-400">{openingCountdown.secs}</span>
                  <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-extrabold">Sec</span>
                </div>
              </div>

              {/* Bento Stats */}
              <div className="mt-5 grid grid-cols-3 gap-3 w-full text-center">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col justify-center">
                  <span className="text-xl font-black oswald">48</span>
                  <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Nations</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col justify-center animate-pulse-glow">
                  <span className="text-xl font-black oswald text-gold">72</span>
                  <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Matches</span>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col justify-center">
                  <span className="text-xl font-black oswald">16</span>
                  <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Cities</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 6. TABBED SECTIONS VIEW ROUTER */}
        {/* TAB 1: SCHEDULE HUB */}
        {activeTab === 'schedule' && (
          <div className="mt-5 space-y-4">
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search team, group, city, stadium..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#121212] border border-white/5 focus:border-gold/50 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all font-medium"
              />
            </div>

            {/* Quick Filters Toolbar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                  <Filter className="h-3 w-3 text-gold" />
                  <span>Filter Group</span>
                </div>

                {/* Card vs Table Switcher */}
                <div className="flex bg-[#121212] p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'card' ? 'bg-gold/10 text-gold' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    title="Card View"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'table' ? 'bg-gold/10 text-gold' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    title="Table View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Group selection pills */}
              <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                {['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(grp => (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroup(grp)}
                    className={`cursor-pointer px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all border shrink-0 ${
                      selectedGroup === grp
                        ? 'bg-gold border-gold text-black font-extrabold shadow-lg shadow-gold/15'
                        : 'bg-[#121212] border-white/5 text-neutral-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {grp === 'All' ? 'All Groups' : `Group ${grp}`}
                  </button>
                ))}
              </div>

              {/* Host Country Selector */}
              <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                {['All', 'USA', 'Canada', 'Mexico'].map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                      selectedCountry === country
                        ? 'bg-electric/25 border-electric text-electric font-semibold'
                        : 'bg-[#121212] border-white/5 text-neutral-500'
                    }`}
                  >
                    {country === 'All' ? 'All Host Countries' : `${country}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Listings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest font-mono">
                  {filteredMatches.length} Matches Found
                </p>
                {(searchTerm || selectedGroup !== 'All' || selectedCountry !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedGroup('All');
                      setSelectedCountry('All');
                    }}
                    className="text-[10px] font-bold text-gold hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Today Features Shelf (Show only when no active filters or search terms) */}
              {!searchTerm && selectedGroup === 'All' && selectedCountry === 'All' && (
                <div className="space-y-4 bg-gradient-to-b from-[#18181A] to-[#0d0d0e] p-4.5 rounded-2xl border border-white/5 shadow-xl">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold"></span>
                    </span>
                    <h3 className="font-display text-xs font-black tracking-widest text-gold uppercase mt-0.5">
                      DAILY MATCH HUB (IST)
                    </h3>
                  </div>

                  {/* TODAY SECTION */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                      <span>⚽ TODAY'S KICKOFFS</span>
                      <span className="text-neutral-500 font-semibold">{dailyHubGroups.todayStr}</span>
                    </div>
                    {dailyHubGroups.todays.length === 0 ? (
                      <div className="text-[11px] text-neutral-500 bg-black/20 px-3 py-2.5 rounded-xl border border-white/5 flex flex-col gap-1">
                        <span>No matches scheduled for today.</span>
                        <span className="text-[9px] text-[#00A3FF] font-semibold font-mono uppercase tracking-wide">🏆 Tournament kicks off June 11!</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 font-medium">
                        {dailyHubGroups.todays.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-black/45 p-2.5 rounded-xl border border-white/5 text-xs">
                            <span className="font-semibold text-neutral-400 font-mono text-[9px] uppercase">Match #{m.matchNo}</span>
                            <span className="flex items-center gap-2 text-white">
                              <TeamBadge name={m.team1} />
                              <span className="text-gold font-mono font-black text-[10px]">VS</span>
                              <TeamBadge name={m.team2} />
                            </span>
                            <span className="text-electric font-mono text-[10px] font-bold">{m.timeIST}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TOMORROW SECTION */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                      <span>⏳ TOMORROW'S ACTION</span>
                      <span className="text-neutral-500 font-semibold">{dailyHubGroups.tomorrowStr}</span>
                    </div>
                    {dailyHubGroups.tomorrows.length === 0 ? (
                      <div className="text-[11px] text-neutral-500 bg-black/20 px-3 py-2 rounded-xl border border-white/5">
                        No matches scheduled for tomorrow.
                      </div>
                    ) : (
                      <div className="space-y-1.5 font-medium">
                        {dailyHubGroups.tomorrows.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-black/45 p-2.5 rounded-xl border border-white/5 text-xs">
                            <span className="font-semibold text-neutral-400 font-mono text-[9px] uppercase">Match #{m.matchNo}</span>
                            <span className="flex items-center gap-2 text-white">
                              <TeamBadge name={m.team1} />
                              <span className="text-gold font-mono font-black text-[10px]">VS</span>
                              <TeamBadge name={m.team2} />
                            </span>
                            <span className="text-electric font-mono text-[10px] font-bold">{m.timeIST}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RECENTLY PLAYED SECTION */}
                  {dailyHubGroups.recently.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                        ↩️ RECENTLY PLAYED OUTCOMES
                      </div>
                      <div className="space-y-1.5 font-medium">
                        {dailyHubGroups.recently.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-black/45 p-2.5 rounded-xl border border-white/5 text-xs">
                            <span className="font-semibold text-neutral-500 font-mono text-[9px] uppercase">Match #{m.matchNo}</span>
                            <span className="flex items-center gap-2 text-white">
                              <TeamBadge name={m.team1} />
                              {typeof m.score1 === 'number' && typeof m.score2 === 'number' ? (
                                <span className="text-gold font-mono bg-gold/15 px-1.5 py-0.5 rounded text-[10px] font-black">{m.score1} - {m.score2}</span>
                              ) : (
                                <span className="text-neutral-500 font-mono text-[10px]">VS</span>
                              )}
                              <TeamBadge name={m.team2} />
                            </span>
                            <span className="text-emerald-400 font-mono text-[9px] font-bold uppercase">FT</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* UPCOMING MATCHES PLANNER */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                      📅 NEXT 5 UPCOMING MATCHES
                    </div>
                    <div className="grid gap-1.5 font-medium">
                      {dailyHubGroups.upcoming.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-black/45 p-2.5 rounded-xl border border-white/5 text-xs">
                          <span className="font-semibold text-neutral-400 font-mono text-[9px]">M#{m.matchNo}</span>
                          <span className="flex items-center gap-2 text-white">
                            <TeamBadge name={m.team1} />
                            <span className="text-gold/60 font-mono text-[9px]">vs</span>
                            <TeamBadge name={m.team2} />
                          </span>
                          <span className="text-neutral-400 font-semibold text-[9.5px] font-mono leading-none text-right">
                            {m.date.split(',')[0]} • {m.timeIST}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {filteredMatches.length === 0 ? (
                <div className="text-center py-12 bg-[#121212] rounded-2xl border border-white/5 p-6">
                  <p className="text-neutral-500 mb-2 text-sm font-semibold">No matches match your filter criteria.</p>
                  <p className="text-xs text-neutral-600">Try adjusting your search word or Group filters above.</p>
                </div>
              ) : viewMode === 'card' ? (
                /* Card View Mode */
                <div className="space-y-4 transition-all">
                  {filteredMatches.map(match => {
                    const isStarred = savedMatches.includes(match.id);
                    return (
                      <div
                        key={match.id}
                        className={`relative rounded-2xl bg-gradient-to-b from-[#18181A] to-[#111] p-4.5 border transition-all ${
                          isStarred ? 'border-gold/40' : 'border-white/5'
                        }`}
                      >
                        {/* Match card Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3.5">
                          <span className="text-[10px] uppercase font-mono font-bold text-neutral-400 flex items-center gap-2">
                            <span>MATCH {match.matchNo}</span>
                            {match.status === 'upcoming' ? (
                              <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] animate-pulse">
                                ⏳ {(() => {
                                  const diff = match.utcTimestamp - currentTime;
                                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                  if (days > 0) return `${days}d ${hours}h`;
                                  if (hours > 0) return `${hours}h ${mins}m`;
                                  return `${mins}m`;
                                })()}
                              </span>
                            ) : match.status === 'completed' ? (
                              <span className="text-neutral-400 font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[8px]">
                                Completed
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] animate-pulse">
                                Live
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/15 font-bold uppercase font-mono">
                            GROUP {match.group}
                          </span>
                        </div>

                        {/* Match card Body - Competitors */}
                        <div className="flex items-center justify-between gap-2.5 py-1">
                          {/* Home team */}
                          <div className="flex-1 flex flex-col items-center text-center">
                            {(() => {
                              const d = getTeamDetails(match.team1);
                              return d.flagUrl ? (
                                <img
                                  src={d.flagUrl}
                                  alt={match.team1}
                                  className="w-12 h-8 object-cover rounded-md border border-white/10 shadow-md mb-2 shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-8 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-neutral-400 font-extrabold font-mono uppercase mb-2 shrink-0">
                                  ⚐
                                </div>
                              );
                            })()}
                            <span className="text-sm font-black tracking-wider text-white">
                              {getTeamDetails(match.team1).fifaCode}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold leading-tight line-clamp-1 mt-0.5">
                              {match.team1}
                            </span>
                          </div>

                          {/* VS or Score badges */}
                          <div className="flex flex-col items-center">
                            {match.status === 'completed' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                              <div className="flex items-center gap-2 bg-gold/15 px-3 py-1 rounded-full border border-gold/25 shadow-lg shadow-gold/5">
                                <span className="text-lg font-black text-gold font-mono">{match.score1}</span>
                                <span className="text-[10px] font-bold text-neutral-500 font-mono">-</span>
                                <span className="text-lg font-black text-gold font-mono">{match.score2}</span>
                              </div>
                            ) : match.status === 'live' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                              <div className="flex items-center gap-2 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/25 shadow-lg shadow-emerald-500/5">
                                <span className="text-lg font-black text-emerald-400 font-mono">{match.score1}</span>
                                <span className="text-[10px] font-bold text-neutral-500 font-mono">-</span>
                                <span className="text-lg font-black text-emerald-400 font-mono">{match.score2}</span>
                              </div>
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-black/40 border border-white/5 flex items-center justify-center">
                                <span className="text-[9px] font-extrabold text-gold tracking-tighter">VS</span>
                              </div>
                            )}
                            <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase mt-1">IST</span>
                          </div>

                          {/* Away team */}
                          <div className="flex-1 flex flex-col items-center text-center">
                            {(() => {
                              const d = getTeamDetails(match.team2);
                              return d.flagUrl ? (
                                <img
                                  src={d.flagUrl}
                                  alt={match.team2}
                                  className="w-12 h-8 object-cover rounded-md border border-white/10 shadow-md mb-2 shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-8 rounded-md bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-neutral-400 font-extrabold font-mono uppercase mb-2 shrink-0">
                                  ⚐
                                </div>
                              );
                            })()}
                            <span className="text-sm font-black tracking-wider text-white">
                              {getTeamDetails(match.team2).fifaCode}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold leading-tight line-clamp-1 mt-0.5">
                              {match.team2}
                            </span>
                          </div>
                        </div>

                        {/* Schedule Metadata */}
                        <div className="mt-4 grid grid-cols-2 gap-2 bg-black/25 p-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gold shrink-0" />
                            <div className="text-[10px]">
                              <span className="text-neutral-500 block uppercase tracking-wider font-bold">IST Date</span>
                              <b className="text-white block font-semibold leading-tight font-mono">{match.date}</b>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
                            <div className="text-[10px]">
                              <span className="text-neutral-500 block uppercase tracking-wider font-bold">IST Time</span>
                              <b className="text-electric block font-semibold leading-white font-mono">{match.timeIST}</b>
                            </div>
                          </div>

                          <div className="col-span-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
                            <div className="text-[10px]">
                              <span className="text-neutral-500 block uppercase tracking-wider font-bold">Local Venue Time</span>
                              <b className="text-yellow-500 block font-semibold leading-tight font-mono">{getLocalKickoffTime(match.utcTimestamp, match.venue)}</b>
                            </div>
                          </div>

                          <div className="col-span-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                            <p className="text-[10px] text-neutral-400 line-clamp-1 leading-tight">
                              <b>{match.stadium}</b>, {match.venue} ({match.country})
                            </p>
                          </div>
                        </div>

                        {/* Centered Kickoff Countdown section for Upcoming Matches */}
                        {match.status === 'upcoming' && (
                          <div className="mt-3.5 px-4 py-2.5 bg-gold/5 rounded-xl border border-gold/15 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                            <span className="text-[8px] font-black tracking-widest text-gold/80 uppercase mb-1 font-sans">KICKOFF COUNTDOWN</span>
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <span className="text-lg font-black text-white font-mono">{(() => {
                                  const diff = match.utcTimestamp - currentTime;
                                  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                                })()}</span>
                                <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold ml-1 font-mono">Days</span>
                              </div>
                              <span className="text-neutral-700 font-bold">:</span>
                              <div className="text-center">
                                <span className="text-lg font-black text-white font-mono">{(() => {
                                  const diff = match.utcTimestamp - currentTime;
                                  return Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                                })()}</span>
                                <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold ml-1 font-mono">Hours</span>
                              </div>
                              <span className="text-neutral-700 font-bold">:</span>
                              <div className="text-center">
                                <span className="text-lg font-black text-white font-mono">{(() => {
                                  const diff = match.utcTimestamp - currentTime;
                                  return Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
                                })()}</span>
                                <span className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold ml-1 font-mono font-sans">Minutes</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Match actionable buttons */}
                        <div className="mt-3.5 pt-3.5 border-t border-white/5 flex gap-2">
                          <button
                            onClick={() => toggleSaveMatch(match.id)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-extrabold uppercase rounded-lg border transition-all ${
                              isStarred
                                ? 'bg-gold border-gold text-black font-extrabold'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                            }`}
                          >
                            <Star className="h-3.5 w-3.5" fill={isStarred ? 'currentColor' : 'none'} />
                            <span>{isStarred ? 'Saved' : 'Save Match'}</span>
                          </button>

                          <button
                            onClick={() => shareMatchInfo(match)}
                            className="px-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white p-2 rounded-lg transition-all"
                            title="Share Match Details"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>

                          <a
                            href={getGoogleCalendarUrl(match)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setRemindMe(match)}
                            className="px-3.5 bg-[#00A3FF]/15 border border-[#00A3FF]/20 text-[#00A3FF] hover:bg-[#00A3FF]/30 p-2 rounded-lg flex items-center justify-center transition-all"
                            title="Add match to calendar reminder"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Table View Mode */
                <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#121212] transition-all no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/5 uppercase font-mono font-bold text-neutral-400 border-b border-white/5">
                        <th className="py-3 px-3">No</th>
                        <th className="py-3 px-2">Matchup</th>
                        <th className="py-3 px-2">Group</th>
                        <th className="py-3 px-2">IST Date/Time</th>
                        <th className="py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {filteredMatches.map(match => {
                        const isStarred = savedMatches.includes(match.id);
                        return (
                          <tr key={match.id} className="hover:bg-white/5">
                            <td className="py-3.5 px-3 font-mono font-bold text-neutral-400">
                              #{match.matchNo}
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="flex flex-col gap-1">
                                <TeamBadge name={match.team1} />
                                <TeamBadge name={match.team2} />
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              <span className="font-bold text-neutral-300">Grp {match.group}</span>
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="font-bold">{match.date}</div>
                              <div className="text-electric font-mono font-semibold">{match.timeIST}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => toggleSaveMatch(match.id)}
                                  className={`p-1.5 rounded-lg border ${
                                    isStarred ? 'bg-gold border-gold text-black' : 'bg-white/5 border-white/5 text-neutral-400'
                                  }`}
                                >
                                  <Star className="h-3 w-3" fill={isStarred ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  onClick={() => shareMatchInfo(match)}
                                  className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-neutral-400"
                                >
                                  <Share2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GROUPS & ACTIVE STANDINGS */}
        {activeTab === 'groups' && (
          <div className="mt-5 space-y-4">
            <h3 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gold" />
              <span>Groups & Standings</span>
            </h3>

            {/* Selector group tabs A to L */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {groupsDataState.map(g => (
                <button
                  key={g.groupName}
                  onClick={() => setSelectedGroupTab(g.groupName)}
                  className={`cursor-pointer w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold font-display tracking-wide border shrink-0 transition-all ${
                    selectedGroupTab === g.groupName
                      ? 'bg-gold border-gold text-black shadow-lg shadow-gold/20'
                      : 'bg-[#121212] border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {g.groupName}
                </button>
              ))}
            </div>

            {/* Standings Table card */}
            <div className="p-4 rounded-2xl bg-[#121212] border border-white/5">
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3">
                <h4 className="font-display font-black text-gold text-sm tracking-wide">
                  GROUP {selectedGroupTab} STANDINGS
                </h4>
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
                  DYNAMIC STANDINGS INDEX
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase font-mono font-bold text-neutral-500 border-b border-white/5">
                      <th className="py-2 pr-2">Team</th>
                      <th className="py-2 px-1 text-center font-mono">Pl</th>
                      <th className="py-2 px-1 text-center font-mono">W</th>
                      <th className="py-2 px-1 text-center font-mono">D</th>
                      <th className="py-2 px-1 text-center font-mono">L</th>
                      <th className="py-2 px-1 text-center font-mono">GD</th>
                      <th className="py-2 px-2 text-center font-mono">Pts</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y divide-white/5 font-medium text-white">
                      {(calculatedGroups.find(g => g.groupName === selectedGroupTab)?.teams || []).map((t, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="py-3 flex items-center gap-2.5 font-bold">
                            {(() => {
                              const d = getTeamDetails(t.team);
                              return d.flagUrl ? (
                                <img
                                  src={d.flagUrl}
                                  alt={t.team}
                                  className="w-5.5 h-3.5 object-cover rounded-sm border border-white/10 shadow-sm shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-5.5 h-3.5 rounded-sm bg-white/10 border border-white/10 flex items-center justify-center text-[7px] italic font-mono shrink-0">
                                  ?
                                </div>
                              );
                            })()}
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                                {getTeamDetails(t.team).fifaCode}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-normal">
                                {t.team}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-1 text-center font-mono text-neutral-400 font-bold">{t.played}</td>
                          <td className="py-3 px-1 text-center font-mono text-neutral-450">{t.won}</td>
                          <td className="py-3 px-1 text-center font-mono text-neutral-450">{t.drawn}</td>
                          <td className="py-3 px-1 text-center font-mono text-neutral-450">{t.lost}</td>
                          <td className="py-3 px-1 text-center font-mono text-neutral-450 font-bold text-neutral-300">
                            {t.goalDifference > 0 ? `+${t.goalDifference}` : t.goalDifference}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-gold">{t.points}</td>
                        </tr>
                      ))}
                    </tbody>
                </table>
              </div>

              {/* Group composition validation indicator */}
              {(() => {
                const currentTeams = (calculatedGroups.find(g => g.groupName === selectedGroupTab)?.teams || []).map(t => t.team);
                const originalTeams = (GROUPS.find(g => g.groupName === selectedGroupTab)?.teams || []).map(t => t.team);
                const isValid = currentTeams.length === 4 && currentTeams.every((t, i) => t === originalTeams[i]);
                return isValid ? (
                  <div className="mt-3.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span>✓ Group {selectedGroupTab} composition exactly matches groups.json</span>
                  </div>
                ) : (
                  <div className="mt-3.5 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-bold flex items-center justify-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span>⚠ Group {selectedGroupTab} composition mismatch detected</span>
                  </div>
                );
              })()}
            </div>

            {/* Direct Fixture list inside Group Tab */}
            <div className="space-y-3">
              <h4 className="font-display font-extrabold text-[11px] uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 pt-2">
                <Calendar className="h-3.5 w-3.5 text-electric" />
                <span>Group {selectedGroupTab} Fixtures (IST)</span>
              </h4>

              {matches.filter(m => m.group === selectedGroupTab).map(match => {
                const isStarred = savedMatches.includes(match.id);
                return (
                  <div
                    key={match.id}
                    className="p-3.5 rounded-xl bg-[#111] border border-white/5 flex flex-col gap-2 relative"
                  >
                    <div className="flex justify-between items-center text-[9px] text-neutral-400 font-mono">
                      <span>MATCH {match.matchNo}</span>
                      <span className="text-electric font-semibold">{match.timeIST}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <TeamBadge name={match.team1} />
                      
                      {match.status === 'completed' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                        <span className="text-xs text-gold font-bold px-2 py-0.5 rounded-md bg-gold/15 font-mono">{match.score1} - {match.score2}</span>
                      ) : match.status === 'live' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                        <span className="text-xs text-emerald-400 font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 font-mono">{match.score1} - {match.score2}</span>
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-bold px-2 py-0.5 rounded-md bg-white/5 font-mono">VS</span>
                      )}

                      <TeamBadge name={match.team2} />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-neutral-500 pt-1.5 border-t border-white/5 mt-1 font-semibold leading-tight">
                      <span>📅 {match.date}</span>
                      <span>🏟 {match.venue}</span>
                    </div>

                    <button
                      onClick={() => toggleSaveMatch(match.id)}
                      className={`absolute right-3.5 top-3.5 p-1 rounded-lg border transition-all ${
                        isStarred ? 'bg-gold/15 border-gold text-gold' : 'bg-white/5 border-white/5 text-neutral-500'
                      }`}
                    >
                      <Star className="h-3 w-3" fill={isStarred ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: STADIUM GUIDE */}
        {activeTab === 'stadiums' && (
          <div className="mt-5 space-y-4">
            <h3 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gold" />
              <span>Host Stadiums</span>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
              The 2026 World Cup features 16 world-class architectural marvels. Discover key venues hosting high-octane group fixtures.
            </p>

            <div className="grid gap-4 mt-3">
              {stadiumsDataState.map(st => (
                <div
                  key={st.id}
                  className="group relative rounded-2xl overflow-hidden border border-white/10 shadow-xl min-h-[160px] flex flex-col justify-end p-4 bg-black"
                >
                  {/* Photo backdrop */}
                  <img
                    src={st.image}
                    alt={st.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-all duration-300 scale-100 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Stadium information */}
                  <div className="relative z-10 space-y-1">
                    <span className="inline-block text-[9px] bg-electric/25 border border-electric/30 px-2 py-0.5 rounded text-electric font-semibold uppercase tracking-wider font-mono">
                      {st.country}
                    </span>
                    <h4 className="font-display text-xl font-bold tracking-tight text-white uppercase group-hover:text-gold transition-colors leading-tight">
                      {st.name}
                    </h4>
                    <p className="text-xs text-neutral-300 font-medium">{st.city}</p>

                    <div className="pt-2 flex justify-between items-center text-[10px] text-neutral-400 font-semibold border-t border-white/10 mt-2 font-mono">
                      <span>CAPACITY: <b className="text-white font-mono">{st.capacity}</b></span>
                      <span className="text-gold font-mono uppercase">{st.matchesCount} Group Matches</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: KNOCKOUT BRACKET VISUALIZER */}
        {activeTab === 'bracket' && (
          <div className="mt-5 space-y-4 animate-fadeIn">
            <h3 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold" />
              <span>Knockout Bracket</span>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
              Trace the road to the ultimate prize. Tap on the tournament stages below to explore the official FIFA World Cup 2026 knockout matchups.
            </p>

            {/* Bracket Stage Selector Buttons */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
              {[
                { id: 'Round of 32', name: 'R32' },
                { id: 'Round of 16', name: 'R16' },
                { id: 'Quarter-finals', name: 'QF' },
                { id: 'Semi-finals', name: 'SF' },
                { id: 'Finals', name: 'Finals' },
              ].map(round => (
                <button
                  key={round.id}
                  onClick={() => setSelectedBracketRound(round.id)}
                  className={`cursor-pointer px-4.5 py-2.5 rounded-xl text-xs font-bold font-display tracking-wide border shrink-0 transition-all ${
                    selectedBracketRound === round.id || (round.id === 'Finals' && (selectedBracketRound === 'Final' || selectedBracketRound === 'Third-place match'))
                      ? 'bg-gold border-gold text-black shadow-lg shadow-gold/20'
                      : 'bg-[#121212] border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {round.name}
                </button>
              ))}
            </div>

            {/* Knockout matches stacked visual tree list */}
            <div className="space-y-3 pt-2">
              {(() => {
                const targetMatches = knockoutDataState.filter(m => {
                  if (selectedBracketRound === 'Finals') {
                    return m.round === 'Final' || m.round === 'Third-place match';
                  }
                  return m.round === selectedBracketRound;
                });

                if (targetMatches.length === 0) {
                  return (
                    <div className="text-center py-12 bg-[#121212] rounded-2xl border border-white/5 p-6">
                      <p className="text-neutral-500 text-sm">No matches loaded for this stage.</p>
                    </div>
                  );
                }

                return targetMatches.map(m => {
                  return (
                    <div
                      key={m.matchNo}
                      className="group relative rounded-2xl bg-[#111] p-4.5 border border-white/5 hover:border-white/10 transition-all shadow-md"
                    >
                      {/* Round Header detail */}
                      <div className="flex justify-between items-center text-[9px] uppercase font-mono font-bold text-neutral-550 pb-2.5 border-b border-white/5 mb-3">
                        <span>MATCH {m.matchNo} • {m.round}</span>
                        <span className="text-gold bg-gold/10 px-1.5 py-0.5 rounded border border-gold/15">{m.country}</span>
                      </div>

                      {/* Opponents columns */}
                      <div className="grid grid-cols-5 items-center gap-1">
                        {/* Competitor 1 */}
                        <div className="col-span-2 flex flex-col items-center text-center">
                          {(() => {
                            const d = getTeamDetails(m.team1);
                            return d.flagUrl ? (
                              <img
                                src={d.flagUrl}
                                alt={m.team1}
                                className="w-10 h-6.5 object-cover rounded-xs border border-white/10 shadow-sm mb-1 shrink-0"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-10 h-6.5 rounded-xs bg-white/10 border border-white/10 flex items-center justify-center text-[9px] text-neutral-400 font-extrabold font-mono uppercase mb-1 shrink-0">
                                ⚐
                              </div>
                            );
                          })()}
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white select-none">
                            {getTeamDetails(m.team1).fifaCode}
                          </span>
                          <span className="text-[9.5px] text-neutral-400 font-semibold leading-tight line-clamp-1 mt-0.5">
                            {m.team1}
                          </span>
                        </div>

                        {/* Versus Connector */}
                        <div className="col-span-1 flex flex-col items-center justify-center">
                          <div className="h-6 w-6 rounded-full bg-black/45 border border-white/5 flex items-center justify-center">
                            <span className="text-[8px] font-extrabold text-gold">VS</span>
                          </div>
                        </div>

                        {/* Competitor 2 */}
                        <div className="col-span-2 flex flex-col items-center text-center">
                          {(() => {
                            const d = getTeamDetails(m.team2);
                            return d.flagUrl ? (
                              <img
                                src={d.flagUrl}
                                alt={m.team2}
                                className="w-10 h-6.5 object-cover rounded-xs border border-white/10 shadow-sm mb-1 shrink-0"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-10 h-6.5 rounded-xs bg-white/10 border border-white/10 flex items-center justify-center text-[9px] text-neutral-400 font-extrabold font-mono uppercase mb-1 shrink-0">
                                ⚐
                              </div>
                            );
                          })()}
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-white select-none">
                            {getTeamDetails(m.team2).fifaCode}
                          </span>
                          <span className="text-[9.5px] text-neutral-400 font-semibold leading-tight line-clamp-1 mt-0.5">
                            {m.team2}
                          </span>
                        </div>
                      </div>

                      {/* Location and time strip */}
                      <div className="mt-3.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-450 font-medium">
                        <span className="flex items-center gap-1 font-mono text-neutral-500 text-[9px]">
                          📅 {m.date}
                        </span>
                        <span className="text-electric font-mono font-bold text-[9.5px]">
                          ⚡ {m.timeIST} (IST)
                        </span>
                      </div>

                      {/* Stadium venue info */}
                      <div className="mt-1 flex items-center gap-1 text-[9.5px] text-neutral-500">
                        <MapPin className="h-3 w-3 shrink-0 text-neutral-600" />
                        <span className="truncate"><b>{m.stadium}</b>, {m.venue}</span>
                      </div>

                      {/* Quick Schedule trigger link */}
                      <div className="mt-3 flex gap-2">
                        <a
                          href={getGoogleCalendarUrl(m as unknown as Match)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[9.5px] font-bold uppercase rounded-lg border border-white/5 text-center transition-all flex items-center justify-center gap-1"
                        >
                          <Calendar className="h-3 w-3 text-gold" />
                          <span>Add to Calendar</span>
                        </a>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* TAB 4: WATCHLIST & PERSONAL HUB */}
        {activeTab === 'saved' && (
          <div className="mt-5 space-y-4">
            <h3 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Star className="h-5 w-5 text-gold" />
              <span>Watchlist</span>
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
              Save matches to build your custom schedule. Keep track of specific times translated to Indian Standard Time (IST).
            </p>

            {watchlistedMatches.length === 0 ? (
              <div className="text-center py-16 bg-[#121212] rounded-2xl border border-white/5 px-6 space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full border border-dashed border-white/15 flex items-center justify-center text-neutral-500">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-400">Your Watchlist is Empty</p>
                  <p className="text-xs text-neutral-600 mt-1 max-w-[280px] mx-auto">
                    Browse the complete Schedule tab and star the matchups you are excited to witness.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="px-5 py-2 rounded-lg bg-gold text-black text-xs font-bold hover:opacity-90"
                >
                  Explore Fixtures
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {watchlistedMatches.map(match => (
                  <div
                    key={match.id}
                    className="p-4 bg-gradient-to-tr from-[#1a1a1c] to-[#121212] rounded-2xl border border-gold/30 flex flex-col gap-3 relative animate-fadeIn"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                      <span>MATCH {match.id}</span>
                      <span className="text-gold uppercase font-bold">Group {match.group}</span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <TeamBadge name={match.team1} />
                      <span className="text-[10px] text-neutral-500 font-bold font-mono">VS</span>
                      <TeamBadge name={match.team2} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-black/35 rounded-xl border border-white/5 p-2.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gold" />
                        <span className="text-neutral-300 font-bold">{match.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-electric" />
                        <span className="text-electric font-semibold font-mono">{match.timeIST}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-white/5 mt-1">
                      <button
                        onClick={() => toggleSaveMatch(match.id)}
                        className="flex-1 py-1.5 bg-gold/10 text-gold border border-gold/20 text-[10px] font-bold uppercase rounded-lg"
                      >
                        Remove Star
                      </button>
                      <button
                        onClick={() => shareMatchInfo(match)}
                        className="p-1 px-3 bg-white/5 border border-white/5 rounded-lg text-neutral-300"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. TOURNAMENT OVERVIEW SECTION */}
        {activeTab === 'schedule' && (
          <section className="mt-8 pt-6 border-t border-white/10 space-y-4">
            <h3 className="font-display text-lg font-extrabold tracking-tight flex items-center gap-2 text-white">
              <Info className="h-4 w-4 text-gold" />
              <span>Tournament Fast-Facts</span>
            </h3>

            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div className="p-3 bg-[#111] rounded-xl border border-white/5 space-y-0.5">
                <span className="text-neutral-500 uppercase tracking-wider text-[9px] font-bold">Opening Kickoff</span>
                <p className="font-extrabold text-white">June 11, 2026</p>
                <p className="text-[10px] text-neutral-400 font-semibold uppercase font-mono">Azteca Estadio</p>
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-white/5 space-y-0.5">
                <span className="text-neutral-500 uppercase tracking-wider text-[9px] font-bold">Grand Finale</span>
                <p className="font-extrabold text-white">July 19, 2026</p>
                <p className="text-[10px] text-neutral-400 font-semibold uppercase font-mono">MetLife New York</p>
              </div>

              <div className="col-span-2 p-3 bg-[#111] rounded-xl border border-white/5 space-y-1.5">
                <span className="text-neutral-500 uppercase tracking-wider text-[9px] font-bold block">Host Nations</span>
                <div className="flex items-center justify-between font-bold text-sm pt-0.5 text-white pr-2">
                  <span className="flex items-center gap-1">🇺🇸 USA</span>
                  <span className="flex items-center gap-1">🇨🇦 CAN</span>
                  <span className="flex items-center gap-1">🇲🇽 MEX</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Curation Footer */}
        <footer className="mt-12 text-center space-y-4 pb-4">
          <div className="inline-flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="font-display text-sm font-bold tracking-wider uppercase">WORLD CUP DAILY</span>
          </div>
          <div className="space-y-2">
            <p className="text-[9.5px] text-neutral-400 font-semibold max-w-[320px] mx-auto leading-relaxed">
              Fixtures & tournament structure based on FIFA World Cup 2026 official data. All match times shown in IST (India Standard Time).
            </p>
            <p className="text-[9px] text-neutral-500 max-w-[320px] mx-auto leading-relaxed">
              Not an official FIFA publication. Curated matches and schedules adapted in Indian Standard Time (IST) for global sports enthusiasts. All metadata copyrights belong to respective associations.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center text-[8.5px] text-neutral-600 font-mono">
            <span>Version 1.0.0</span>
            <span>Last Updated: June 2026</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold uppercase text-gold">
            <a href="#home" className="hover:underline text-[10px]">Back To Top</a>
          </div>
          <p className="text-[9px] text-[#00A3FF] font-medium font-mono uppercase tracking-[0.2em]">CRAFTED CHANNELS INDEX</p>
        </footer>
      </div>

      {/* 8. MOBILE BOTTOM FIXED NAVIGATION TAB BAR */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#050505]/95 backdrop-filter backdrop-blur-xl border-t border-white/5 z-40">
        <div className="mx-auto max-w-lg flex items-center justify-around h-16.5 px-4 text-center">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'schedule' ? 'text-gold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'groups' ? 'text-gold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Standings</span>
          </button>

          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'bracket' ? 'text-gold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Bracket</span>
          </button>

          <button
            onClick={() => setActiveTab('stadiums')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'stadiums' ? 'text-gold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <MapPin className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Stadiums</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'saved' ? 'text-gold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Star className="h-5 w-5" fill={activeTab === 'saved' ? 'currentColor' : 'none'} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Watchlist</span>
          </button>
        </div>
      </nav>

      {/* PWA Installation Instructions Modal */}
      {showInstallGuide && (() => {
        const info = getInstallInstructions();
        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0b0b0b] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative">
              <button
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-gold to-yellow-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                  <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-white leading-tight">Install WCDaily</h4>
                  <span className="inline-block text-[9px] font-mono bg-white/5 text-gold border border-gold/20 px-1.5 py-0.5 rounded uppercase mt-1">
                    {info.badge}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-neutral-300 font-bold leading-relaxed">
                  To get offline access, instant load-speeds and home screen integration, follow these instructions for <span className="text-gold">{info.title}</span>:
                </p>
                
                <ol className="space-y-3.5 text-xs text-neutral-400 list-decimal pl-4 leading-relaxed font-semibold">
                  {info.steps.map((step, idx) => (
                    <li key={idx} className="marker:text-gold/80 pl-1">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
