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
  X,
  Sparkles
} from 'lucide-react';
import { Match, Stadium, TeamStanding, GroupData } from './types';
import { STADIUMS, GROUPS, ALL_MATCHES, KNOCKOUT, TEAMS } from './data';
import WorldCupPredictor from './components/WorldCupPredictor';

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

function TrophyLogo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background glow shadow */}
      <circle cx="50" cy="30" r="22" fill="#3B82F6" opacity="0.15" filter="blur(8px)" />
      
      {/* The Globe on top */}
      <circle cx="50" cy="30" r="18" fill="url(#globeGrad)" />
      {/* Stylized longitudinal/latitude continent curves for soccer sphere vibe */}
      <path d="M40 18 C 45 13, 55 13, 60 18" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <path d="M35 26 C 42 22, 58 22, 65 26" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <path d="M38 34 C 45 37, 55 37, 62 34" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <path d="M50 12 C 46 20, 46 40, 50 48" stroke="#1E293B" strokeWidth="1.2" strokeLinecap="round" opacity="0.25" />
      
      {/* Two spiraling athletic figures (the golden ratio ribbons holding the earth) */}
      {/* Left Wing / Arm holding up the earth */}
      <path d="M50 105 C 50 105, 41 85, 41 72 C 41 62, 49 52, 45 42 C 43 38, 38 41, 35 45 C 31 51, 31 62, 34 70 C 37 78, 38 88, 30 96 C 28 98, 25 101, 26 103 C 27 105, 50 105, 50 105 Z" fill="url(#goldRibbonGrad)" />
      
      {/* Right Wing / Arm holding up the earth */}
      <path d="M50 105 C 50 105, 59 85, 59 72 C 59 62, 51 52, 55 42 C 57 38, 62 41, 65 45 C 69 51, 69 62, 66 70 C 63 78, 62 88, 70 96 C 72 98, 75 101, 74 103 C 73 105, 50 105, 50 105 Z" fill="url(#goldRibbonGrad)" />
      
      {/* Central rising core details to add texture & prestige */}
      <path d="M47 105 L53 105 L55 60 C55 60, 50 54, 45 60 Z" fill="url(#coreGrad)" opacity="0.9" />
      <circle cx="50" cy="50" r="4" fill="#60A5FA" opacity="0.8" />
      <circle cx="50" cy="65" r="5" fill="#3B82F6" opacity="0.9" />
      
      {/* Dynamic Base Rings */}
      <ellipse cx="50" cy="105" rx="26" ry="6" fill="#1D4ED8" />
      <ellipse cx="50" cy="109" rx="28" ry="6" fill="#1E293B" />
      <ellipse cx="50" cy="113" rx="24" ry="5" fill="#3B82F6" />
      
      <defs>
        <linearGradient id="globeGrad" x1="35" y1="12" x2="65" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="60%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="goldRibbonGrad" x1="25" y1="40" x2="75" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="coreGrad" x1="45" y1="50" x2="55" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFF6FF" />
          <stop offset="50%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
    </svg>
  );
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
  const [activeTab, setActiveTab] = useState<'schedule' | 'groups' | 'stadiums' | 'saved' | 'bracket' | 'predictor'>('schedule');

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

  // PWA Service Worker Update States
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

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

  // Listen for Service Worker updates, poll for registration changes, and handle client reload
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Fetch the registration object
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        setSwRegistration(reg);

        // Check if there is already a waiting service worker
        if (reg.waiting) {
          setShowUpdateBanner(true);
        }

        // Setup event listener to catch newly installed service workers
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // A new version is fully loaded, ready to take over
                setShowUpdateBanner(true);
              }
            });
          }
        });
      });

      // Poll the service worker registration dynamically to check for new deployments (every 30 seconds)
      const checkForSWUpdate = () => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            // update() forces a request to check /service-worker.js for updates
            reg.update().catch((err) => console.warn('PWA: SW verification check failed:', err));
          }
        });
      };

      const pollInterval = setInterval(checkForSWUpdate, 30000);
      window.addEventListener('focus', checkForSWUpdate);

      // Listen for the 'controllerchange' event to force clean reload of the client page
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('focus', checkForSWUpdate);
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const handleUpdateNow = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

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
    <div className="relative min-h-screen bg-[#0F172A] text-[#F8FAFC] selection:bg-blue-500/30">
      {/* 1. Loading Preloader Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A] p-6 text-center">
          <div className="relative mb-6 animate-float">
            {/* Custom geometric premium trophy silhouette for preloader */}
            <TrophyLogo className="h-32 w-32 filter drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
            <div className="absolute top-1/2 left-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/10 animate-ping absolute -z-10" />
          </div>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F8FAFC] uppercase">
            WORLD CUP <span className="text-[#3B82F6]">DAILY</span>
          </h2>
          <p className="mt-2 text-xs font-semibold tracking-[0.25em] text-[#60A5FA] uppercase font-mono">FIFA 2026 • INDIA</p>
          <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-slate-800/80">
            <div className="h-full bg-[#3B82F6] animate-shimmer" style={{ width: '100%', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, #3b82f6 25%, #FFF 50%, #3b82f6 75%)' }} />
          </div>
          <p className="mt-3.5 text-[10px] text-[#94A3B8] font-mono uppercase tracking-widest font-semibold">Curation of IST Match Schedules</p>
        </div>
      )}

      {/* 2. Global Toast Message Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-[#3B82F6] px-6 py-3 font-semibold text-white shadow-2xl transition-all animate-bounce flex items-center gap-2 border border-[#60A5FA]/20">
          <Check className="h-4 w-4 stroke-[3]" />
          <span className="text-sm tracking-wide font-sans">{toastMessage}</span>
        </div>
      )}

      {/* 2.5 PWA Update Notification Banner */}
      {showUpdateBanner && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm transform rounded-2xl bg-[#1E293B] p-4 text-white shadow-2xl transition-all flex flex-col sm:flex-row items-center gap-4 border border-blue-500/30 backdrop-blur-md animate-slideUp">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#60A5FA] shrink-0">
              <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-wide text-[#F8FAFC]">New version available</p>
              <p className="text-[10px] text-[#94A3B8] font-mono uppercase tracking-wider">Reload to fetch newest assets</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={handleUpdateNow}
              className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              Update Now
            </button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Redesigned Premium Background with Spotlight Effects & Brand Watermarks */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-[#0F172A]">
        {/* Soft Radial Vignette for Stadium mood */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-950/15 via-[#0F172A]/90 to-[#0F172A]" />
        
        {/* Lights Moving / Stadium Spotlight Cones */}
        <div className="absolute left-[15%] top-[-100px] h-[550px] w-[180px] bg-gradient-to-b from-[#3B82F6]/5 to-transparent blur-3xl transform origin-top rotate-[-8deg] animate-lights-moving" />
        <div className="absolute right-[15%] top-[-100px] h-[550px] w-[200px] bg-gradient-to-b from-[#60A5FA]/5 to-transparent blur-3xl transform origin-top rotate-[8deg] animate-lights-moving" style={{ animationDelay: '-4s' }} />

        {/* Low-opacity elegant brand watermarks */}
        <div className="absolute right-[-150px] bottom-[-50px] opacity-[0.02] scale-[1.8] transform rotate-[12deg] pointer-events-none">
          <TrophyLogo className="h-[500px] w-[505px]" />
        </div>
        <div className="absolute left-[-150px] top-[25%] opacity-[0.015] scale-[1.4] transform rotate-[-12deg] pointer-events-none">
          <TrophyLogo className="h-[400px] w-[405px]" />
        </div>
      </div>

      {/* 5. Main Widescreen-Optimized Application Layout Container */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:pb-8">
        
        {/* PREMIUM REDESIGNED GLASS HEADER WITH INTEGRATED TABS */}
        <header className="sticky top-4 z-40 flex flex-col md:flex-row md:items-center justify-between gap-4 py-3.5 px-6 border border-slate-800/60 bg-slate-900/75 backdrop-blur-xl rounded-2xl mb-6 shadow-xl shadow-slate-950/20">
          
          {/* Logo and Brand Title Block */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3.5">
              <TrophyLogo className="h-11 w-9 shrink-0 filter drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]" />
              <div>
                <h1 className="font-display text-xl md:text-2xl font-black tracking-tight uppercase leading-none text-[#F8FAFC]">
                  WORLD CUP <span className="text-[#3B82F6]">DAILY</span>
                </h1>
                <p className="text-[10px] tracking-wider font-mono text-[#60A5FA] font-bold mt-1 uppercase">
                  FIFA 2026 • INDIA
                </p>
              </div>
            </div>

            {/* Mobile Watchlist star button shortcut */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setActiveTab('saved')}
                className={`relative p-2.5 rounded-xl border transition-all ${
                  activeTab === 'saved'
                    ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                    : 'border-slate-800 bg-slate-950/60 text-white hover:bg-slate-800'
                }`}
              >
                <Star className="h-4 w-4" fill={activeTab === 'saved' || savedMatches.length > 0 ? '#3B82F6' : 'none'} />
                {savedMatches.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#3B82F6] text-[9px] font-bold text-white ring-2 ring-[#0F172A]">
                    {savedMatches.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Repositioned Horizontal Navigation Tabs - UEFA style */}
          <nav className="hidden md:flex items-center bg-slate-950/45 p-1 rounded-xl border border-slate-800/80">
            {[
              { id: 'schedule', name: 'Schedule' },
              { id: 'groups', name: 'Standings' },
              { id: 'predictor', name: 'Predictor' },
              { id: 'bracket', name: 'Bracket' },
              { id: 'stadiums', name: 'Stadiums' },
              { id: 'saved', name: 'Watchlist' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`cursor-pointer px-4.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/10 font-extrabold'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>

          {/* Desktop header right action block */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setActiveTab('saved')}
              className={`relative px-4 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
                activeTab === 'saved'
                  ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#60A5FA]'
                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-[#F8FAFC]'
              }`}
            >
              <Star className="h-4 w-4" fill={savedMatches.length > 0 ? '#3B82F6' : 'none'} />
              <span>Watchlist</span>
              {savedMatches.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6] text-[10px] font-black text-white">
                  {savedMatches.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Premium Redesigned Install Banner - Onboarding card style */}
        {showInstallButton && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/65 backdrop-blur-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl relative overflow-hidden animate-fadeIn">
            {/* Brand Accent Indicator Stripe */}
            <div className="absolute top-0 left-0 w-1 h-full bg-[#3B82F6]" />
            
            <div className="flex items-center gap-3.5 pl-1.5">
              <div className="w-10 h-10 bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/5">
                <svg className="w-5 h-5 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-[#F8FAFC] tracking-normal font-sans">Install World Cup Daily</h3>
                <p className="text-xs text-[#94A3B8] font-normal leading-relaxed mt-0.5 max-w-xl">
                  Access fixtures, standings, stadiums and predictions instantly. Enjoy dynamic India Timings (IST) even offline.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={handleInstallClick}
                className="cursor-pointer px-4 py-2 bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-[10px] font-black uppercase rounded-lg tracking-wider shadow-lg shadow-blue-500/20 transition-all text-center shrink-0"
              >
                📲 Install
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1 px-2.5 py-2 text-[#94A3B8] hover:text-[#F8FAFC] border border-slate-800 bg-slate-950/25 hover:bg-slate-800 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase shrink-0"
                title="Dismiss Banner"
              >
                Hide
              </button>
            </div>
          </div>
        )}

        {/* 5. HERO SECTION: Trophy Art, Floodlights, Live Countdown */}
        {activeTab === 'schedule' && (
          <section className="relative mt-5 rounded-3xl overflow-hidden bg-slate-900/60 border border-slate-800/80 p-6 md:p-8 shadow-2xl">
            {/* Ambient Stadium Glow */}
            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-[#3B82F6]/5 via-transparent to-transparent pointer-events-none -z-10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[150px] bg-gradient-radial from-blue-500/10 to-transparent blur-3xl opacity-35 pointer-events-none -z-10" />

            <div className="flex flex-col items-center text-center">
              <span className="mb-2 text-xs font-black tracking-[0.25em] text-[#60A5FA] font-mono uppercase">
                JUNE 11 – JULY 19, 2026
              </span>
              
              <h2 className="font-display text-4xl lg:text-5xl font-black italic tracking-tighter leading-none mt-2 mb-4 drop-shadow-2xl uppercase">
                THE WORLD'S<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]">
                  GREATEST STAGE
                </span>
              </h2>

              <p className="max-w-xs text-[11px] uppercase tracking-wider text-[#94A3B8] font-bold font-sans">
                Group Stage Schedule Hub • Indian Standard Time (IST)
              </p>

              {/* Countdown Component */}
              <div className="mt-6 w-full flex gap-3 bg-[#0F172A]/85 backdrop-blur-xl border border-slate-800/75 p-5 rounded-3xl shadow-2xl justify-center max-w-sm">
                <div className="text-center min-w-[55px]">
                  <span className="block text-2.5xl font-black text-[#3B82F6] font-mono leading-none">{openingCountdown.days}</span>
                  <span className="text-[8px] uppercase tracking-widest text-[#94A3B8] font-bold mt-1 block">Days</span>
                </div>
                <div className="text-center min-w-[55px] border-l border-slate-800/65 pl-2">
                  <span className="block text-2.5xl font-black text-[#F8FAFC] font-mono leading-none">{openingCountdown.hours}</span>
                  <span className="text-[8px] uppercase tracking-widest text-[#94A3B8] font-bold mt-1 block">Hrs</span>
                </div>
                <div className="text-center min-w-[55px] border-l border-slate-800/65 pl-2">
                  <span className="block text-2.5xl font-black text-[#F8FAFC] font-mono leading-none">{openingCountdown.mins}</span>
                  <span className="text-[8px] uppercase tracking-widest text-[#94A3B8] font-bold mt-1 block">Min</span>
                </div>
                <div className="text-center min-w-[55px] border-l border-slate-800/65 pl-2">
                  <span className="block text-2.5xl font-black text-[#60A5FA] font-mono leading-none animate-pulse">{openingCountdown.secs}</span>
                  <span className="text-[8px] uppercase tracking-widest text-[#94A3B8] font-bold mt-1 block">Sec</span>
                </div>
              </div>

              {/* Bento Stats */}
              <div className="mt-6 grid grid-cols-3 gap-3 w-full text-center max-w-md">
                <div className="bg-[#162032] rounded-2xl p-3 border border-slate-800/80 flex flex-col justify-center shadow-lg">
                  <span className="text-2xl font-black font-display text-[#F8FAFC]">48</span>
                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1 block font-mono">Nations</span>
                </div>
                <div className="bg-[#162032] rounded-2xl p-3 border border-[#3B82F6]/30 flex flex-col justify-center shadow-lg shadow-blue-500/5 ring-1 ring-[#3B82F6]/10">
                  <span className="text-2xl font-black font-display text-[#60A5FA]">72</span>
                  <span className="text-[8px] font-bold text-[#3B82F6] uppercase tracking-widest mt-1 block font-mono">Matches</span>
                </div>
                <div className="bg-[#162032] rounded-2xl p-3 border border-slate-800/80 flex flex-col justify-center shadow-lg">
                  <span className="text-2xl font-black font-display text-[#F8FAFC]">16</span>
                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1 block font-mono">Cities</span>
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search team, group, city, stadium..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#162032] border border-slate-800/80 focus:border-[#3B82F6]/60 rounded-xl py-3.5 pl-11 pr-4 text-sm text-[#F8FAFC] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/20 transition-all font-medium font-sans shadow-inner"
              />
            </div>

            {/* Quick Filters Toolbar */}
            <div className="space-y-4 bg-slate-900/35 p-4 rounded-2xl border border-slate-800/60 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-bold uppercase tracking-wider font-mono">
                  <Filter className="h-3.5 w-3.5 text-[#3B82F6]" />
                  <span>Filter Schedules</span>
                </div>

                {/* Card vs Table Switcher */}
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-805/85">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'card' ? 'bg-[#3B82F6] text-white shadow' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                    title="Card View"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'table' ? 'bg-[#3B82F6] text-white shadow' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
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
                        ? 'bg-[#3B82F6] border-[#3B82F6] text-white font-extrabold shadow-lg shadow-blue-500/15'
                        : 'bg-[#162032] border-slate-805 text-[#94A3B8] hover:text-[#F8FAFC] hover:border-slate-700'
                    }`}
                  >
                    {grp === 'All' ? 'All Groups' : `Group ${grp}`}
                  </button>
                ))}
              </div>

              {/* Host Country Selector */}
              <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                {['All', 'USA', 'Canada', 'Mexico'].map(country => (
                  <button
                    key={country}
                    onClick={() => setSelectedCountry(country)}
                    className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                      selectedCountry === country
                        ? 'bg-[#3B82F6]/15 border-[#3B82F6]/25 text-[#60A5FA] font-extrabold'
                        : 'bg-slate-950/40 border-slate-850 text-[#94A3B8] hover:text-white hover:border-slate-700 font-mono'
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
                <p className="text-xs text-[#94A3B8] font-bold uppercase tracking-widest font-mono">
                  {filteredMatches.length} Matches Found
                </p>
                {(searchTerm || selectedGroup !== 'All' || selectedCountry !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedGroup('All');
                      setSelectedCountry('All');
                    }}
                    className="text-[10px] font-bold text-[#3B82F6] hover:underline hover:text-[#60A5FA]"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Today Features Shelf (Show only when no active filters or search terms) */}
              {!searchTerm && selectedGroup === 'All' && selectedCountry === 'All' && (
                <div className="space-y-4 bg-[#1E293B] p-4.5 rounded-2xl border border-slate-800 shadow-xl shadow-blue-950/20">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-850">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold"></span>
                    </span>
                    <h3 className="font-display text-xs font-black tracking-widest text-[#3B82F6] uppercase mt-0.5">
                      DAILY MATCH HUB (IST)
                    </h3>
                  </div>

                  {/* TODAY SECTION */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest font-mono">
                      <span>⚽ TODAY'S KICKOFFS</span>
                      <span className="text-[#94A3B8]/80 font-semibold">{dailyHubGroups.todayStr}</span>
                    </div>
                    {dailyHubGroups.todays.length === 0 ? (
                      <div className="text-[11px] text-[#94A3B8] bg-[#0F172A]/40 px-3 py-2.5 rounded-xl border border-slate-900/40 flex flex-col gap-1">
                        <span>No matches scheduled for today.</span>
                        <span className="text-[9px] text-[#3B82F6] font-semibold font-mono uppercase tracking-wide">🏆 Tournament kicks off June 11!</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 font-medium">
                        {dailyHubGroups.todays.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-[#0F172A]/70 p-2.5 rounded-xl border border-slate-900/50 text-xs">
                            <span className="font-semibold text-[#94A3B8] font-mono text-[9px] uppercase">Match #{m.matchNo}</span>
                            <span className="flex items-center gap-2 text-[#F8FAFC]">
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
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest font-mono">
                      <span>⏳ TOMORROW'S ACTION</span>
                      <span className="text-[#94A3B8]/80 font-semibold">{dailyHubGroups.tomorrowStr}</span>
                    </div>
                    {dailyHubGroups.tomorrows.length === 0 ? (
                      <div className="text-[11px] text-[#94A3B8] bg-[#0F172A]/40 px-3 py-2 rounded-xl border border-slate-900/40">
                        No matches scheduled for tomorrow.
                      </div>
                    ) : (
                      <div className="space-y-1.5 font-medium">
                        {dailyHubGroups.tomorrows.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-[#0F172A]/70 p-2.5 rounded-xl border border-slate-900/50 text-xs">
                            <span className="font-semibold text-[#94A3B8] font-mono text-[9px] uppercase">Match #{m.matchNo}</span>
                            <span className="flex items-center gap-2 text-[#F8FAFC]">
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
                      <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest font-mono">
                        ↩️ RECENTLY PLAYED OUTCOMES
                      </div>
                      <div className="space-y-1.5 font-medium">
                        {dailyHubGroups.recently.map(m => (
                          <div key={m.id} className="flex items-center justify-between bg-[#0F172A]/70 p-2.5 rounded-xl border border-slate-900/50 text-xs">
                            <span className="font-semibold text-[#94A3B8]/85 font-mono text-[9px] uppercase">Match #{m.matchNo}</span>
                            <span className="flex items-center gap-2 text-[#F8FAFC]">
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
                    <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest font-mono">
                      📅 NEXT 5 UPCOMING MATCHES
                    </div>
                    <div className="grid gap-1.5 font-medium">
                      {dailyHubGroups.upcoming.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-[#0F172A]/70 p-2.5 rounded-xl border border-slate-900/50 text-xs">
                          <span className="font-semibold text-[#94A3B8]/85 font-mono text-[9px]">M#{m.matchNo}</span>
                          <span className="flex items-center gap-2 text-[#F8FAFC]">
                            <TeamBadge name={m.team1} />
                            <span className="text-gold/60 font-mono text-[9px]">vs</span>
                            <TeamBadge name={m.team2} />
                          </span>
                          <span className="text-[#94A3B8] font-semibold text-[9.5px] font-mono leading-none text-right">
                            {m.date.split(',')[0]} • {m.timeIST}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {filteredMatches.length === 0 ? (
                <div className="text-center py-12 bg-[#1E293B] rounded-2xl border border-slate-800 p-6">
                  <p className="text-[#94A3B8] mb-2 text-sm font-semibold">No matches match your filter criteria.</p>
                  <p className="text-xs text-[#94A3B8]/60">Try adjusting your search word or Group filters above.</p>
                </div>
              ) : viewMode === 'card' ? (
                /* Card View Mode */
                <div className="space-y-4 transition-all">
                  {filteredMatches.map(match => {
                    const isStarred = savedMatches.includes(match.id);
                    return (
                      <div
                        key={match.id}
                        className={`relative rounded-2xl bg-[#1E293B] p-4.5 border transition-all ${
                          isStarred ? 'border-[#3B82F6]/60 shadow-lg shadow-blue-500/5' : 'border-slate-800/80'
                        }`}
                      >
                        {/* Match card Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3.5">
                          <span className="text-[10px] uppercase font-mono font-bold text-[#94A3B8] flex items-center gap-2">
                            <span>MATCH {match.matchNo}</span>
                            {match.status === 'upcoming' ? (
                              <span className="text-[#22C55E] font-bold bg-[#22C55E]/10 border border-[#22C55E]/20 px-1.5 py-0.5 rounded text-[8px] animate-pulse">
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
                              <span className="text-[#94A3B8] font-bold bg-[#0F172A]/40 border border-slate-8//30 px-1.5 py-0.5 rounded text-[8px]">
                                Completed
                              </span>
                            ) : (
                              <span className="text-[#22C55E] font-bold bg-[#22C55E]/10 border border-[#22C55E]/20 px-1.5 py-0.5 rounded text-[8px] animate-pulse">
                                Live
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/15 font-bold uppercase font-mono">
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
                                  className="w-12 h-8 object-cover rounded-md border border-slate-800 shadow-md mb-2 shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-8 rounded-md bg-[#0F172A]/80 border border-slate-800 flex items-center justify-center text-[10px] text-[#94A3B8] font-extrabold font-mono uppercase mb-2 shrink-0">
                                  ⚐
                                </div>
                              );
                            })()}
                            <span className="text-sm font-black tracking-wider text-[#F8FAFC]">
                              {getTeamDetails(match.team1).fifaCode}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] font-bold leading-tight line-clamp-1 mt-0.5">
                              {match.team1}
                            </span>
                          </div>

                          {/* VS or Score badges */}
                          <div className="flex flex-col items-center">
                            {match.status === 'completed' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                              <div className="flex items-center gap-2 bg-[#3B82F6]/15 px-3 py-1 rounded-full border border-[#3B82F6]/25 shadow-lg shadow-blue-500/5">
                                <span className="text-lg font-black text-[#3B82F6] font-mono">{match.score1}</span>
                                <span className="text-[10px] font-bold text-[#94A3B8] font-mono">-</span>
                                <span className="text-lg font-black text-[#3B82F6] font-mono">{match.score2}</span>
                              </div>
                            ) : match.status === 'live' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                              <div className="flex items-center gap-2 bg-[#22C55E]/15 px-3 py-1 rounded-full border border-[#22C55E]/25 shadow-lg shadow-emerald-500/5">
                                <span className="text-lg font-black text-[#22C55E] font-mono">{match.score1}</span>
                                <span className="text-[10px] font-bold text-[#94A3B8] font-mono">-</span>
                                <span className="text-lg font-black text-[#22C55E] font-mono">{match.score2}</span>
                              </div>
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-[#0F172A]/80 border border-slate-800/60 flex items-center justify-center">
                                <span className="text-[9px] font-extrabold text-[#3B82F6] tracking-tighter">VS</span>
                              </div>
                            )}
                            <span className="text-[9px] font-mono text-[#94A3B8]/60 font-bold uppercase mt-1">IST</span>
                          </div>

                          {/* Away team */}
                          <div className="flex-1 flex flex-col items-center text-center">
                            {(() => {
                              const d = getTeamDetails(match.team2);
                              return d.flagUrl ? (
                                <img
                                  src={d.flagUrl}
                                  alt={match.team2}
                                  className="w-12 h-8 object-cover rounded-md border border-slate-800 shadow-md mb-2 shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-8 rounded-md bg-[#0F172A]/80 border border-slate-800 flex items-center justify-center text-[10px] text-[#94A3B8] font-extrabold font-mono uppercase mb-2 shrink-0">
                                  ⚐
                                </div>
                              );
                            })()}
                            <span className="text-sm font-black tracking-wider text-[#F8FAFC]">
                              {getTeamDetails(match.team2).fifaCode}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] font-bold leading-tight line-clamp-1 mt-0.5">
                              {match.team2}
                            </span>
                          </div>
                        </div>

                        {/* Schedule Metadata */}
                        <div className="mt-4 grid grid-cols-2 gap-2 bg-[#0F172A]/70 p-3 rounded-xl border border-slate-850">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" />
                            <div className="text-[10px]">
                              <span className="text-[#94A3B8] block uppercase tracking-wider font-bold">IST Date</span>
                              <b className="text-[#F8FAFC] block font-semibold leading-tight font-mono">{match.date}</b>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" />
                            <div className="text-[10px]">
                              <span className="text-[#94A3B8] block uppercase tracking-wider font-bold">IST Time</span>
                              <b className="text-electric block font-semibold leading-white font-mono">{match.timeIST}</b>
                            </div>
                          </div>

                          <div className="col-span-2 pt-2 border-t border-slate-800/40 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" />
                            <div className="text-[10px]">
                              <span className="text-[#94A3B8] block uppercase tracking-wider font-bold">Local Venue Time</span>
                              <b className="text-[#F59E0B] block font-semibold leading-tight font-mono">{getLocalKickoffTime(match.utcTimestamp, match.venue)}</b>
                            </div>
                          </div>

                          <div className="col-span-2 pt-2 border-t border-slate-800/40 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                            <p className="text-[10px] text-[#94A3B8] line-clamp-1 leading-tight">
                              <b>{match.stadium}</b>, {match.venue} ({match.country})
                            </p>
                          </div>
                        </div>

                        {/* Centered Kickoff Countdown section for Upcoming Matches */}
                        {match.status === 'upcoming' && (
                          <div className="mt-3.5 px-4 py-2.5 bg-[#3B82F6]/5 rounded-xl border border-[#3B82F6]/15 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#3B82F6]/40 to-transparent" />
                            <span className="text-[8px] font-black tracking-widest text-[#3B82F6]/85 uppercase mb-1 font-sans">KICKOFF COUNTDOWN</span>
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <span className="text-lg font-black text-white font-mono">{(() => {
                                  const diff = match.utcTimestamp - currentTime;
                                  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
                                })()}</span>
                                <span className="text-[8px] uppercase tracking-wider text-[#94A3B8] font-bold ml-1 font-mono">Days</span>
                              </div>
                              <span className="text-neutral-700 font-bold">:</span>
                              <div className="text-center">
                                <span className="text-lg font-black text-white font-mono">{(() => {
                                  const diff = match.utcTimestamp - currentTime;
                                  return Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                                })()}</span>
                                <span className="text-[8px] uppercase tracking-wider text-[#94A3B8] font-bold ml-1 font-mono">Hours</span>
                              </div>
                              <span className="text-neutral-700 font-bold">:</span>
                              <div className="text-center">
                                <span className="text-lg font-black text-white font-mono">{(() => {
                                  const diff = match.utcTimestamp - currentTime;
                                  return Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
                                })()}</span>
                                <span className="text-[8px] uppercase tracking-wider text-[#94A3B8] font-bold ml-1 font-mono font-sans">Minutes</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Match actionable buttons */}
                        <div className="mt-3.5 pt-3.5 border-t border-slate-800/40 flex gap-2">
                          <button
                            onClick={() => toggleSaveMatch(match.id)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-extrabold uppercase rounded-lg border transition-all ${
                              isStarred
                                ? 'bg-[#3B82F6] border-[#3B82F6] text-white font-black'
                                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 text-[#F8FAFC]'
                            }`}
                          >
                            <Star className="h-3.5 w-3.5" fill={isStarred ? 'currentColor' : 'none'} />
                            <span>{isStarred ? 'Saved' : 'Save Match'}</span>
                          </button>

                          <button
                            onClick={() => shareMatchInfo(match)}
                            className="px-3.5 bg-slate-900/60 border border-slate-800 hover:bg-slate-850 text-[#F8FAFC] p-2 rounded-lg transition-all"
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
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#1E293B] transition-all no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs text-[#F8FAFC]">
                    <thead>
                      <tr className="bg-[#0F172A]/70 uppercase font-mono font-bold text-[#94A3B8] border-b border-slate-850">
                        <th className="py-3 px-3">No</th>
                        <th className="py-3 px-2">Matchup</th>
                        <th className="py-3 px-2">Group</th>
                        <th className="py-3 px-2">IST Date/Time</th>
                        <th className="py-3 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredMatches.map(match => {
                        const isStarred = savedMatches.includes(match.id);
                        return (
                          <tr key={match.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-3 font-mono font-bold text-[#94A3B8]">
                              #{match.matchNo}
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="flex flex-col gap-1">
                                <TeamBadge name={match.team1} />
                                <TeamBadge name={match.team2} />
                              </div>
                            </td>
                            <td className="py-3.5 px-2">
                              <span className="font-bold text-[#F8FAFC]">Grp {match.group}</span>
                            </td>
                            <td className="py-3.5 px-2">
                              <div className="font-bold text-[#F8FAFC]">{match.date}</div>
                              <div className="text-[#60A5FA] font-mono font-semibold">{match.timeIST}</div>
                            </td>
                            <td className="py-3.5 px-3">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => toggleSaveMatch(match.id)}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    isStarred ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-slate-900/60 border-slate-800 text-[#94A3B8]/80 hover:text-[#F8FAFC]'
                                  }`}
                                >
                                  <Star className="h-3 w-3" fill={isStarred ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  onClick={() => shareMatchInfo(match)}
                                  className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[#94A3B8]/80 hover:text-[#F8FAFC] transition-all"
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
          <div className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-black italic tracking-tight flex items-center gap-2 uppercase">
                  <TrendingUp className="h-5.5 w-5.5 text-[#3B82F6]" />
                  <span>Groups & Standings</span>
                </h3>
                <p className="text-[10px] uppercase font-mono font-black text-[#94A3B8]/90 tracking-widest mt-1">
                  FIFA 2026 Live Group Matrix (IST)
                </p>
              </div>

              {/* Selector group tabs A to L */}
              <div className="flex gap-1 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                {groupsDataState.map(g => (
                  <button
                    key={g.groupName}
                    onClick={() => setSelectedGroupTab(g.groupName)}
                    className={`cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black font-mono border shrink-0 transition-all ${
                      selectedGroupTab === g.groupName
                        ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-lg shadow-blue-500/15 scale-105'
                        : 'bg-[#162032] border-slate-805 text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {g.groupName}
                  </button>
                ))}
              </div>
            </div>

            {/* Dual Column Widescreen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Standings Table Card (Col-span 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-5 rounded-3xl bg-[#162032] border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 mb-4 bg-slate-900/10 -mx-5 px-5 -mt-5 pt-4 rounded-t-3xl">
                    <h4 className="font-display font-black text-[#3B82F6] text-xs tracking-widest uppercase font-mono">
                      GROUP {selectedGroupTab} STANDINGS
                    </h4>
                    <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-widest font-mono">
                      DYNAMIC INDEX
                    </div>
                  </div>

                  <div className="overflow-x-auto no-scrollbar scroll-smooth">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="text-[9px] uppercase font-mono font-bold text-[#94A3B8] border-b border-slate-800/60 pb-2">
                          <th className="py-2.5 pr-2">Team</th>
                          <th className="py-2.5 px-2 text-center font-mono">Pl</th>
                          <th className="py-2.5 px-2 text-center font-mono">W</th>
                          <th className="py-2.5 px-2 text-center font-mono">D</th>
                          <th className="py-2.5 px-2 text-center font-mono">L</th>
                          <th className="py-2.5 px-2 text-center font-mono">GD</th>
                          <th className="py-2.5 px-3 text-right font-mono">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 font-medium text-[#F8FAFC]">
                        {(calculatedGroups.find(g => g.groupName === selectedGroupTab)?.teams || []).map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 pr-2 flex items-center gap-2.5 font-bold">
                              {(() => {
                                const d = getTeamDetails(t.team);
                                return d.flagUrl ? (
                                  <img
                                    src={d.flagUrl}
                                    alt={t.team}
                                    className="w-6 h-4 object-cover rounded border border-slate-800 shadow-sm shrink-0"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-6 h-4 rounded bg-[#0F172A]/85 border border-[#3B82F6]/20 flex items-center justify-center text-[7px] italic font-mono shrink-0">
                                    ?
                                  </div>
                                );
                              })()}
                              <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-black uppercase tracking-wider text-[#F8FAFC]">
                                  {getTeamDetails(t.team).fifaCode}
                                </span>
                                <span className="text-[10px] text-[#94A3B8]/90 font-normal font-sans tracking-wide leading-none mt-0.5">
                                  {t.team}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-[#94A3B8] font-bold">{t.played}</td>
                            <td className="py-3 px-2 text-center font-mono text-[#94A3B8]/80">{t.won}</td>
                            <td className="py-3 px-2 text-center font-mono text-[#94A3B8]/80">{t.drawn}</td>
                            <td className="py-3 px-2 text-center font-mono text-[#94A3B8]/80">{t.lost}</td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-[#F8FAFC]">
                              {t.goalDifference > 0 ? `+${t.goalDifference}` : t.goalDifference}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-[#60A5FA] text-sm">{t.points}</td>
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
                      <div className="mt-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-[9px] text-[#22C55E] font-bold flex items-center justify-center gap-1.5 leading-none font-mono tracking-wide uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span>COMPOSITION VERIFIED WITH FIFA DATA</span>
                      </div>
                    ) : (
                      <div className="mt-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15 text-[9px] text-red-400 font-bold flex items-center justify-center gap-1.5 leading-none font-mono uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <span>REORDER DETECTED</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column: Direct Fixture List Inside Group Tab (Col-span 5) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[#162032] p-5 rounded-3xl border border-slate-800 shadow-xl">
                  <div className="flex items-center gap-1.5 pb-3 border-b border-slate-800/80 mb-4">
                    <Calendar className="h-4 w-4 text-[#3B82F6]" />
                    <h4 className="font-display font-black text-xs uppercase tracking-wider text-[#F8FAFC]">
                      Group {selectedGroupTab} Fixtures (IST)
                    </h4>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 no-scrollbar scroll-smooth">
                    {matches.filter(m => m.group === selectedGroupTab).map(match => {
                      const isStarred = savedMatches.includes(match.id);
                      return (
                        <div
                          key={match.id}
                          className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-850/80 flex flex-col gap-2.5 relative shadow-md"
                        >
                          <div className="flex justify-between items-center text-[9px] font-mono tracking-wider">
                            <span className="text-[#94A3B8] font-bold">MATCH #{match.matchNo}</span>
                            <span className="text-[#60A5FA] font-bold">{match.timeIST}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <TeamBadge name={match.team1} />
                            
                            {match.status === 'completed' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                              <span className="text-xs text-[#3B82F6] font-black px-2.5 py-0.5 rounded-full bg-[#3B82F6]/12 font-mono border border-[#3B82F6]/15">{match.score1} - {match.score2}</span>
                            ) : match.status === 'live' && typeof match.score1 === 'number' && typeof match.score2 === 'number' ? (
                              <span className="text-xs text-[#22C55E] font-black px-2.5 py-0.5 rounded-full bg-[#22C55E]/12 font-mono border border-[#22C55E]/15 animate-pulse">{match.score1} - {match.score2}</span>
                            ) : (
                              <span className="text-[10px] text-[#94A3B8]/90 font-black px-2 py-0.5 rounded-md bg-[#0F172A]/70 border border-slate-850 font-mono">VS</span>
                            )}

                            <TeamBadge name={match.team2} />
                          </div>

                          <div className="flex justify-between items-center text-[9.5px] text-[#94A3B8] pt-2 border-t border-slate-800/45 mt-1 font-medium font-mono leading-none">
                            <span>📅 {match.date.split(',')[0]}</span>
                            <span className="max-w-[140px] truncate">🏟 {match.venue}</span>
                          </div>

                          <button
                            onClick={() => toggleSaveMatch(match.id)}
                            className={`absolute right-3.5 top-3 p-1 rounded-lg border transition-all cursor-pointer ${
                              isStarred ? 'bg-[#3B82F6]/15 border-[#3B82F6]/30 text-[#60A5FA]' : 'bg-slate-950/40 border-slate-850 text-[#94A3B8]/80 hover:text-[#F8FAFC]'
                            }`}
                          >
                            <Star className="h-3 w-3" fill={isStarred ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: STADIUM GUIDE */}
        {activeTab === 'stadiums' && (
          <div className="space-y-6 mt-6">
            <div>
              <h3 className="font-display text-2xl font-black italic tracking-tight flex items-center gap-2 text-[#F8FAFC] uppercase">
                <MapPin className="h-5.5 w-5.5 text-[#3B82F6]" />
                <span>Host Stadiums</span>
              </h3>
              <p className="text-[10px] uppercase font-mono font-black text-[#94A3B8]/90 tracking-widest mt-1">
                Discover the 16 architectural venues of the 2026 World Cup
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stadiumsDataState.map(st => (
                <div
                  key={st.id}
                  className="group relative rounded-3xl overflow-hidden border border-slate-800/80 shadow-xl min-h-[190px] flex flex-col justify-end p-5 bg-[#162032] transition-all hover:border-[#3B82F6]/40 cursor-pointer"
                >
                  {/* Photo backdrop */}
                  <img
                    src={st.image}
                    alt={st.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:opacity-60 transition-all duration-500 scale-100 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent" />

                  {/* Stadium information */}
                  <div className="relative z-10 space-y-1.5">
                    <span className="inline-block text-[9px] bg-[#3B82F6]/15 border border-[#3B82F6]/25 px-2.5 py-0.5 rounded-full text-[#60A5FA] font-bold uppercase tracking-wider font-mono">
                      {st.country}
                    </span>
                    <h4 className="font-display text-lg font-extrabold tracking-tight text-[#F8FAFC] uppercase group-hover:text-[#60A5FA] transition-colors leading-tight">
                      {st.name}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium font-sans flex items-center gap-1 opacity-90">
                      <span className="text-xs">📍</span> {st.city}
                    </p>

                    <div className="pt-2 flex justify-between items-center text-[10px] text-[#94A3B8] font-bold border-t border-slate-800/70 mt-2 font-mono uppercase tracking-wide">
                      <span>Capacity: <b className="text-white font-mono font-black">{parseInt(st.capacity.replace(/,/g, '')).toLocaleString()}</b></span>
                      <span className="text-[#3B82F6] font-mono">{st.matchesCount} Matches</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4.5: WORLD CUP PREDICTOR WIZARD */}
        {activeTab === 'predictor' && (
          <WorldCupPredictor groupsData={groupsDataState} />
        )}

        {/* TAB 5: KNOCKOUT BRACKET VISUALIZER */}
        {activeTab === 'bracket' && (
          <div className="space-y-6 mt-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-black italic tracking-tight flex items-center gap-2 text-[#F8FAFC] uppercase">
                  <Trophy className="h-5.5 w-5.5 text-[#3B82F6]" />
                  <span>Knockout Bracket visualizer</span>
                </h3>
                <p className="text-[10px] uppercase font-mono font-black text-[#94A3B8]/90 tracking-widest mt-1">
                  Trace the road to the ultimate prize (IST)
                </p>
              </div>

              {/* Bracket Stage Selector Buttons */}
              <div className="flex gap-1 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                {[
                  { id: 'Round of 32', name: 'Round of 32' },
                  { id: 'Round of 16', name: 'Round of 16' },
                  { id: 'Quarter-finals', name: 'Quarter-finals' },
                  { id: 'Semi-finals', name: 'Semi-finals' },
                  { id: 'Finals', name: 'Finals & Final' },
                ].map(round => (
                  <button
                    key={round.id}
                    onClick={() => setSelectedBracketRound(round.id)}
                    className={`cursor-pointer px-4.5 py-2.5 rounded-xl text-xs font-black font-mono border shrink-0 transition-all ${
                      selectedBracketRound === round.id || (round.id === 'Finals' && (selectedBracketRound === 'Final' || selectedBracketRound === 'Third-place match'))
                        ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-lg shadow-blue-500/15 scale-105'
                        : 'bg-[#162032] border-slate-805 text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {round.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Knockout matches responsive bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
              {(() => {
                const targetMatches = knockoutDataState.filter(m => {
                  if (selectedBracketRound === 'Finals') {
                    return m.round === 'Final' || m.round === 'Third-place match';
                  }
                  return m.round === selectedBracketRound;
                });

                if (targetMatches.length === 0) {
                  return (
                    <div className="col-span-full text-center py-12 bg-[#162032] rounded-3xl border border-slate-800 p-6 shadow-xl">
                      <p className="text-[#94A3B8] text-sm font-semibold">No matches loaded for this stage.</p>
                    </div>
                  );
                }

                return targetMatches.map(m => {
                  return (
                    <div
                      key={m.matchNo}
                      className="group relative rounded-3xl bg-[#162032] p-5 border border-slate-800 shadow-lg hover:border-[#3B82F6]/30 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Round Header detail */}
                        <div className="flex justify-between items-center text-[9px] uppercase font-mono font-black text-[#94A3B8] pb-3 border-b border-slate-800/80 mb-4 bg-slate-900/10 -mx-5 px-5 -mt-5 pt-4 rounded-t-3xl">
                          <span>MATCH #{m.matchNo} • {m.round}</span>
                          <span className="text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full border border-[#3B82F6]/15 font-black uppercase tracking-wider">{m.country}</span>
                        </div>

                        {/* Opponents columns */}
                        <div className="grid grid-cols-5 items-center gap-1.5 py-2">
                          {/* Competitor 1 */}
                          <div className="col-span-2 flex flex-col items-center text-center">
                            {(() => {
                              const d = getTeamDetails(m.team1);
                              return d.flagUrl ? (
                                <img
                                  src={d.flagUrl}
                                  alt={m.team1}
                                  className="w-11 h-7.5 object-cover rounded border border-slate-805 shadow-sm mb-1.5 shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-11 h-7.5 rounded bg-[#0F172A]/80 border border-slate-850 flex items-center justify-center text-[9px] text-[#94A3B8] font-extrabold font-mono uppercase mb-1.5 shrink-0">
                                  ⚐
                                </div>
                              );
                            })()}
                            <span className="text-xs font-mono font-black uppercase tracking-wider text-[#F8FAFC]">
                              {getTeamDetails(m.team1).fifaCode}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] font-medium leading-tight line-clamp-1 mt-0.5">
                              {m.team1}
                            </span>
                          </div>

                          {/* Versus Connector */}
                          <div className="col-span-1 flex flex-col items-center justify-center">
                            <div className="h-7 w-7 rounded-full bg-slate-950 border border-slate-800/60 flex items-center justify-center shadow">
                              <span className="text-[8px] font-black text-[#3B82F6] font-mono">VS</span>
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
                                  className="w-11 h-7.5 object-cover rounded border border-slate-805 shadow-sm mb-1.5 shrink-0"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-11 h-7.5 rounded bg-[#0F172A]/80 border border-slate-850 flex items-center justify-center text-[9px] text-[#94A3B8] font-extrabold font-mono uppercase mb-1.5 shrink-0">
                                  ⚐
                                </div>
                              );
                            })()}
                            <span className="text-xs font-mono font-black uppercase tracking-wider text-[#F8FAFC]">
                              {getTeamDetails(m.team2).fifaCode}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] font-medium leading-tight line-clamp-1 mt-0.5">
                              {m.team2}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/60">
                        {/* Location and time strip */}
                        <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-semibold font-sans leading-none">
                          <span className="flex items-center gap-1 font-mono uppercase text-[#94A3B8]/90">
                            📅 {m.date.split(',')[0]}
                          </span>
                          <span className="text-[#3B82F6] font-mono font-black">
                            ⚡ {m.timeIST} (IST)
                          </span>
                        </div>

                        {/* Stadium venue info */}
                        <div className="flex items-center gap-1 text-[9.5px] text-[#94A3B8]/80 font-mono">
                          <MapPin className="h-3 w-3 shrink-0 text-[#94A3B8]/70" />
                          <span className="truncate"><b>{m.stadium}</b>, {m.venue}</span>
                        </div>

                        {/* Quick Calendar trigger link */}
                        <div className="pt-1.5">
                          <a
                            href={getGoogleCalendarUrl(m as unknown as Match)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-[#F8FAFC] hover:text-white text-[9.5px] font-black uppercase rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Calendar className="h-3 w-3 text-[#3B82F6]" />
                            <span>Add to Google Calendar</span>
                          </a>
                        </div>
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
          <div className="space-y-6 mt-6 animate-fadeIn">
            <div>
              <h3 className="font-display text-2xl font-black italic tracking-tight flex items-center gap-2 text-[#F8FAFC] uppercase">
                <Star className="h-5.5 w-5.5 text-[#3B82F6]" />
                <span>My Watchlist</span>
              </h3>
              <p className="text-[10px] uppercase font-mono font-black text-[#94A3B8]/90 tracking-widest mt-1">
                Your custom World Cup schedule tracked in Indian Standard Time (IST)
              </p>
            </div>

            {watchlistedMatches.length === 0 ? (
              <div className="text-center py-16 bg-[#162032] rounded-3xl border border-slate-805/90 px-6 space-y-4 shadow-xl max-w-xl mx-auto">
                <div className="mx-auto h-12 w-12 rounded-full border border-dashed border-slate-705 flex items-center justify-center text-[#94A3B8]">
                  <Star className="h-5 w-5 text-[#3B82F6]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-[#F8FAFC]">Your Watchlist is Empty</h4>
                  <p className="text-xs text-[#94A3B8]/90 mt-1.5 max-w-[310px] mx-auto font-sans leading-relaxed">
                    Browse the match schedules and click the star button on any fixture to build your personal streaming cohort directory.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#60A5FA] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Explore Fixtures List
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {watchlistedMatches.map(match => (
                  <div
                    key={match.id}
                    className="p-5 bg-[#162032] rounded-3xl border border-slate-800 flex flex-col justify-between gap-3 relative animate-fadeIn shadow-lg hover:border-[#3B82F6]/25 transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-center text-[9px] font-mono font-black text-[#94A3B8] uppercase">
                        <span>MATCH #{match.id}</span>
                        <span className="text-[#3B82F6] font-bold">Group {match.group}</span>
                      </div>

                      <div className="flex justify-between items-center py-3">
                        <TeamBadge name={match.team1} />
                        <span className="text-[9px] text-[#94A3B8]/80 font-black font-mono px-2 py-0.5 rounded bg-slate-950">VS</span>
                        <TeamBadge name={match.team2} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/40 rounded-xl border border-slate-850/80 p-2.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-[#3B82F6]" />
                          <span className="text-[#F8FAFC] font-extrabold font-mono text-[9px]">{match.date.split(',')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                          <span className="text-[#60A5FA] font-black font-mono text-[9px]">{match.timeIST}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-800/60 mt-1">
                      <button
                        onClick={() => toggleSaveMatch(match.id)}
                        className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/15 text-red-400 border border-red-500/15 text-[9px] font-black uppercase rounded-xl transition-all cursor-pointer"
                      >
                        Remove Star
                      </button>
                      <button
                        onClick={() => shareMatchInfo(match)}
                        className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-[#F8FAFC] hover:text-white transition-all cursor-pointer"
                        title="Share Match Info"
                      >
                        <Share2 className="h-3.5 w-3.5 text-[#3B82F6]" />
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
          <section className="mt-8 pt-6 border-t border-slate-800 space-y-4">
            <h3 className="font-display text-lg font-extrabold tracking-tight flex items-center gap-2 text-[#F8FAFC]">
              <Info className="h-4 w-4 text-[#60A5FA]" />
              <span>Tournament Fast-Facts</span>
            </h3>

            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div className="p-3 bg-[#1E293B] rounded-xl border border-slate-800/80 space-y-0.5 shadow-md">
                <span className="text-[#94A3B8] uppercase tracking-wider text-[9px] font-bold">Opening Kickoff</span>
                <p className="font-extrabold text-[#F8FAFC]">June 11, 2026</p>
                <p className="text-[10px] text-[#94A3B8]/95 font-semibold uppercase font-mono">Azteca Estadio</p>
              </div>

              <div className="p-3 bg-[#1E293B] rounded-xl border border-slate-800/80 space-y-0.5 shadow-md">
                <span className="text-[#94A3B8] uppercase tracking-wider text-[9px] font-bold">Grand Finale</span>
                <p className="font-extrabold text-[#F8FAFC]">July 19, 2026</p>
                <p className="text-[10px] text-[#94A3B8]/95 font-semibold uppercase font-mono">MetLife New York</p>
              </div>

              <div className="col-span-2 p-3 bg-[#1E293B] rounded-xl border border-slate-800/80 space-y-1.5 shadow-md">
                <span className="text-[#94A3B8] uppercase tracking-wider text-[9px] font-bold block">Host Nations</span>
                <div className="flex items-center justify-between font-bold text-sm pt-0.5 text-[#F8FAFC] pr-2">
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
            <Trophy className="h-4 w-4 text-[#3B82F6]" />
            <span className="font-display text-sm font-bold tracking-wider uppercase text-[#F8FAFC]">WORLD CUP DAILY</span>
          </div>
          <div className="space-y-2">
            <p className="text-[9.5px] text-[#94A3B8] font-semibold max-w-[320px] mx-auto leading-relaxed">
              Fixtures & tournament structure based on FIFA World Cup 2026 official data. All match times shown in IST (India Standard Time).
            </p>
            <p className="text-[9px] text-[#94A3B8]/70 max-w-[320px] mx-auto leading-relaxed font-sans">
              Not an official FIFA publication. Curated matches and schedules adapted in Indian Standard Time (IST) for global sports enthusiasts. All metadata copyrights belong to respective associations.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center text-[8.5px] text-[#94A3B8]/60 font-mono">
            <span>Version 1.0.0</span>
            <span>Last Updated: June 2026</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs font-semibold uppercase text-[#3B82F6]">
            <a href="#home" className="hover:underline hover:text-[#60A5FA] text-[10px]">Back To Top</a>
          </div>
          <p className="text-[9px] text-[#60A5FA] font-medium font-mono uppercase tracking-[0.2em]">CRAFTED CHANNELS INDEX</p>
        </footer>
      </div>

      {/* 8. MOBILE BOTTOM FIXED NAVIGATION TAB BAR */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0F172A]/95 backdrop-filter backdrop-blur-xl border-t border-slate-800/80 z-40">
        <div className="mx-auto max-w-lg flex items-center justify-around h-16.5 px-4 text-center">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'schedule' ? 'text-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'groups' ? 'text-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Standings</span>
          </button>

          <button
            onClick={() => setActiveTab('predictor')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'predictor' ? 'text-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Predictor</span>
          </button>

          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'bracket' ? 'text-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Bracket</span>
          </button>

          <button
            onClick={() => setActiveTab('stadiums')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'stadiums' ? 'text-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <MapPin className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Stadiums</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === 'saved' ? 'text-[#3B82F6]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
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
          <div className="fixed inset-0 bg-[#0F172A]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl relative">
              <button
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F8FAFC] p-1 rounded-lg hover:bg-slate-800 transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/10">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display font-black text-lg text-[#F8FAFC] leading-tight font-sans">Install WCDaily</h4>
                  <span className="inline-block text-[9px] font-mono bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/20 px-1.5 py-0.5 rounded uppercase mt-1">
                    {info.badge}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-[#F8FAFC] font-bold leading-relaxed font-sans">
                  To get offline access, instant load-speeds and home screen integration, follow these instructions for <span className="text-[#3B82F6] font-extrabold">{info.title}</span>:
                </p>
                
                <ol className="space-y-3.5 text-xs text-[#94A3B8] list-decimal pl-4 leading-relaxed font-semibold">
                  {info.steps.map((step, idx) => (
                    <li key={idx} className="marker:text-[#3B82F6] pl-1 font-sans">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="w-full py-2.5 bg-[#3B82F6] hover:bg-[#60A5FA] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-500/10"
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
