/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  TrendingUp,
  Sparkles,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Download,
  Share2,
  Check,
  Star,
  MapPin,
  Calendar,
  Clock,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  Award,
  AlertCircle,
  Info
} from 'lucide-react';
import {
  PredictorState,
  GroupPrediction,
  KnockoutPrediction,
  createNewPrediction,
  generateKnockouts,
  advanceTeam
} from '../predictorEngine';

// Replicating App.tsx country mappings to maintain perfect visual assets (flags & custom codes)
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

function getLocalTeamDetails(name: string) {
  if (!name) return { fifaCode: "TBD", flagUrl: null, name: "" };
  const trimmed = name.trim();
  const fifa = countryToFifa[trimmed];
  const iso = countryToIso[trimmed];

  if (fifa && iso) {
    return {
      fifaCode: fifa,
      flagUrl: `https://flagcdn.com/w40/${iso.toLowerCase()}.png`,
      name: trimmed
    };
  }

  // Handle placeholders nicely
  let code = "TBD";
  if (trimmed.toUpperCase().startsWith("WINNER GROUP")) {
    const grp = trimmed.split(" ").pop();
    code = `W-${grp}`;
  } else if (trimmed.toUpperCase().startsWith("RUNNER-UP GROUP")) {
    const grp = trimmed.split(" ").pop();
    code = `R-${grp}`;
  } else if (trimmed.toUpperCase().startsWith("3RD GROUP")) {
    code = "3RD";
  } else if (trimmed.toUpperCase().startsWith("WINNER MATCH")) {
    const matchId = trimmed.split(" ").pop();
    code = `W${matchId}`;
  } else if (trimmed.toUpperCase().startsWith("LOSER MATCH")) {
    const matchId = trimmed.split(" ").pop();
    code = `L${matchId}`;
  } else {
    code = trimmed.substring(0, 3).toUpperCase();
  }

  return {
    fifaCode: code,
    flagUrl: null,
    name: trimmed
  };
}

interface WorldCupPredictorProps {
  groupsData: any[]; // Raw static data populated from groups.json
}

type PredictorStep = 'welcome' | 'groups' | 'bracket' | 'champion';

export default function WorldCupPredictor({ groupsData }: WorldCupPredictorProps) {
  // Main states
  const [activeStep, setActiveStep] = useState<PredictorStep>('welcome');
  const [state, setState] = useState<PredictorState | null>(null);
  
  // Tab states inside each stage
  const [currentGroupTab, setCurrentGroupTab] = useState<string>('A');
  const [activeBracketRound, setActiveBracketRound] = useState<'R32' | 'R16' | 'QF' | 'SF' | 'Finals'>('R32');
  
  // UI feedbacks
  const [toast, setToast] = useState<string | null>(null);
  const [sharingImage, setSharingImage] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Group letters
  const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Map to find what group a team belongs to (needed for 3rd place mappings)
  const teamToGroupMap = useMemo(() => {
    const mapping: { [team: string]: string } = {};
    groupsData.forEach(g => {
      g.teams.forEach((t: any) => {
        mapping[t.team] = g.groupName;
      });
    });
    return mapping;
  }, [groupsData]);

  // Load from LocalStorage if exists
  useEffect(() => {
    try {
      const saved = localStorage.getItem('world_cup_predictor_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.groups && parsed.knockouts) {
          setState(parsed);
          // Set to main step if they already have an existing progress
          if (parsed.champion) {
            setActiveStep('champion');
          } else {
            setActiveStep('groups');
          }
        }
      }
    } catch (e) {
      console.error("Failed to restore predictor state from localStorage:", e);
    }
  }, []);

  // Save automatically on state updates
  const saveState = (newState: PredictorState) => {
    setState(newState);
    localStorage.setItem('world_cup_predictor_state', JSON.stringify(newState));
  };

  // Toast feedback helper
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Actions
  const handleStartNew = () => {
    const blank = createNewPrediction(groupsData);
    saveState(blank);
    setActiveStep('groups');
    triggerToast("Dashboard initialized! Start reordering Groups A-L");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your predictions? All custom group ranks and bracket advancements will be cleared.")) {
      localStorage.removeItem('world_cup_predictor_state');
      setState(null);
      setActiveStep('welcome');
      setSharingImage(null);
      triggerToast("Predictions successfully reset.");
    }
  };

  // Group ranking updates
  const handleSwapTeams = (groupName: string, indexA: number, indexB: number) => {
    if (!state) return;
    const group = state.groups.find(g => g.groupName === groupName);
    if (!group) return;

    const list = [...group.teams];
    const temp = list[indexA];
    list[indexA] = list[indexB];
    list[indexB] = temp;

    // Update group predictions list
    const updatedGroups = state.groups.map(g => 
      g.groupName === groupName ? { ...g, teams: list } : g
    );

    // Dynamic 3rd place lists adjustments
    // When a group standings change, the list of 3rd placed teams is rebuilt
    const nextThirds = updatedGroups.map(g => g.teams[2]);
    
    // We filter the user's custom third-places priority list to make sure we keep the same teams but preserve/adjust missing elements
    let nextUserThirds = state.thirdPlaces.filter(t => nextThirds.includes(t));
    nextThirds.forEach(t => {
      if (!nextUserThirds.includes(t)) {
        nextUserThirds.push(t);
      }
    });

    // Re-verify they remain 12
    nextUserThirds = nextUserThirds.slice(0, 12);

    // Auto-generate knockouts with updated team lists
    const nextKnockouts = generateKnockouts(updatedGroups, nextUserThirds, teamToGroupMap, state.knockouts);

    saveState({
      ...state,
      groups: updatedGroups,
      thirdPlaces: nextUserThirds,
      knockouts: nextKnockouts
    });
  };

  // Third places reordering (User custom preference list of best 3rd placed teams)
  const handleMoveThirdPlace = (index: number, direction: 'up' | 'down') => {
    if (!state) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= 12) return;

    const list = [...state.thirdPlaces];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const nextKnockouts = generateKnockouts(state.groups, list, teamToGroupMap, state.knockouts);

    saveState({
      ...state,
      thirdPlaces: list,
      knockouts: nextKnockouts
    });
  };

  // Drag and Drop support for groups (HTML5 Native)
  const handleDragStart = (e: React.DragEvent, index: number, type: 'group' | 'third') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ index, type }));
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number, type: 'group' | 'third') => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.type !== type) return;
      
      const sourceIndex = data.index;
      if (sourceIndex === targetIndex) return;

      if (type === 'group') {
        handleSwapTeams(currentGroupTab, sourceIndex, targetIndex);
      } else {
        // Swap third place elements
        if (!state) return;
        const list = [...state.thirdPlaces];
        const temp = list[sourceIndex];
        list[sourceIndex] = list[targetIndex];
        list[targetIndex] = temp;
        
        const nextKnockouts = generateKnockouts(state.groups, list, teamToGroupMap, state.knockouts);
        saveState({
          ...state,
          thirdPlaces: list,
          knockouts: nextKnockouts
        });
      }
    } catch (e) {
      console.error("Drop handling failed", e);
    }
  };

  // Auto-fill all 12 groups randomly / with default lists to proceed fast for testing
  const handleAutoFillAll = () => {
    if (!state) return;
    const autofilledGroups: GroupPrediction[] = groupsData.map(g => ({
      groupName: g.groupName,
      // Just keep default seeds as predicted rankings
      teams: g.teams.map((t: any) => t.team)
    }));

    const nextThirds = autofilledGroups.map(g => g.teams[2]);
    const nextKnockouts = generateKnockouts(autofilledGroups, nextThirds, teamToGroupMap, {});

    saveState({
      ...state,
      groups: autofilledGroups,
      thirdPlaces: nextThirds,
      knockouts: nextKnockouts,
      champion: undefined,
      runnerUp: undefined
    });

    triggerToast("Auto-filled default rankings for all groups!");
  };

  // Select Winner in a Bracket Match
  const handleSelectBracketWinner = (matchNo: number, winnerName: string) => {
    if (!state) return;
    
    // Check if team is placeholder first
    if (winnerName.startsWith("Winner Match") || winnerName.startsWith("Loser Match") || winnerName.startsWith("3rd Place Slot")) {
      triggerToast("Unlock this competitor by predicting parent matches first!");
      return;
    }

    const updatedKnockouts = advanceTeam(state.knockouts, matchNo, winnerName);
    
    // Check if we just predicted the grand final (Match 104)
    let champion = state.champion;
    let runnerUp = state.runnerUp;
    if (matchNo === 104) {
      champion = winnerName;
      const finalMatch = updatedKnockouts[104];
      runnerUp = finalMatch.winner === finalMatch.team1 ? finalMatch.team2 : finalMatch.team1;
    }

    saveState({
      ...state,
      knockouts: updatedKnockouts,
      champion,
      runnerUp
    });

    // If final completed, auto scroll / forward to celebrate!
    if (matchNo === 104) {
      setActiveStep('champion');
      triggerToast("🏅 Champion Crowned! Celebrate and download your board.");
    }
  };

  // Check if group stage completed (users can modify anything, but let's encourage clicking)
  const handleProceedToBracket = () => {
    setActiveStep('bracket');
    triggerToast("Welcome to the Knockout Stages! Tap match winners to advance them.");
  };

  // Filter matches of selected active bracket round
  const activeRoundMatches = useMemo(() => {
    if (!state) return [];
    const matchesArray = Object.values(state.knockouts) as KnockoutPrediction[];
    
    switch (activeBracketRound) {
      case 'R32':
        return matchesArray.filter(m => m.round === 'Round of 32');
      case 'R16':
        return matchesArray.filter(m => m.round === 'Round of 16');
      case 'QF':
        return matchesArray.filter(m => m.round === 'Quarter-finals');
      case 'SF':
        return matchesArray.filter(m => m.round === 'Semi-finals');
      case 'Finals':
        return matchesArray.filter(m => m.round === 'Final' || m.round === 'Third-place match');
      default:
        return [];
    }
  }, [state, activeBracketRound]);

  // Render a visual connector tree representing team paths on desktop
  const isBracketComplete = useMemo(() => {
    if (!state) return false;
    // Check if final has a winner
    return !!state.knockouts[104]?.winner;
  }, [state]);

  // Get Semi-finalists
  const semiFinalists = useMemo(() => {
    if (!state) return [];
    const sf1 = state.knockouts[101];
    const sf2 = state.knockouts[102];
    const res: string[] = [];
    if (sf1?.team1) res.push(sf1.team1);
    if (sf1?.team2) res.push(sf1.team2);
    if (sf2?.team1) res.push(sf2.team1);
    if (sf2?.team2) res.push(sf2.team2);
    return res.filter(n => !n.startsWith("Winner Match"));
  }, [state]);

  // HIGH-DPI CANVAS SHARE GENERATOR
  const handleGenerateShareImage = () => {
    if (!state || !canvasRef.current) return;
    setIsGeneratingShare(true);
    setSharingImage(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsGeneratingShare(false);
      return;
    }

    // Set high-res dimensions (1200 x 630 - optimized FB/Twitter open graph ratio)
    canvas.width = 1200;
    canvas.height = 630;

    const champ = state.champion || "TBD";
    const runner = state.runnerUp || "TBD";
    const sfList = semiFinalists.length >= 4 ? semiFinalists : ["TBD", "TBD", "TBD", "TBD"];

    // 1. Draw premium gradient background
    const bgGrad = ctx.createRadialGradient(600, 315, 50, 600, 315, 750);
    bgGrad.addColorStop(0, '#1E293B'); // slate-800
    bgGrad.addColorStop(1, '#0F172A'); // slate-900
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // 2. Decorative stadium style spotlights
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(100 + i * 50, 0);
      ctx.lineTo(600, 450);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(1100 - i * 50, 0);
      ctx.lineTo(600, 450);
      ctx.stroke();
    }

    // Glowing sphere overlay
    ctx.fillStyle = 'rgba(59, 130, 246, 0.03)';
    ctx.beginPath();
    ctx.arc(600, 290, 250, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Brand Titles
    ctx.fillStyle = '#60A5FA'; // light blue
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FIFA 2026 OFFICIAL BRACKET PREVIEW', 600, 40);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 38px "Inter", sans-serif';
    ctx.fillText('WORLD CUP DAILY PREDICTOR', 600, 80);

    // Draw elegant boundary rules line
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(500, 110);
    ctx.lineTo(700, 110);
    ctx.stroke();

    // 4. DRAW CHAMPION CARD (CENTER PIECE)
    // Blue/Gold frame for champion
    const champX = 600;
    const champY = 285;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.strokeStyle = '#F59E0B'; // golden outline
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(champX - 180, champY - 140, 360, 280, 20);
    ctx.fill();
    ctx.stroke();

    // Gold sparkles/trophy silhouette inside champion card
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.beginPath();
    ctx.arc(champX, champY - 30, 60, 0, Math.PI * 2);
    ctx.fill();

    // Trophy drawing
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    // Bowl
    ctx.arc(champX, champY - 45, 18, 0, Math.PI, false);
    ctx.fill();
    // Stem
    ctx.fillRect(champX - 4, champY - 45, 8, 25);
    // Base
    ctx.fillRect(champX - 12, champY - 20, 24, 7);
    // Handles
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(champX - 18, champY - 42, 8, -Math.PI / 2, Math.PI / 2, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(champX + 18, champY - 42, 8, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // Champion Titles
    ctx.fillStyle = '#F59E0B';
    ctx.font = '800 13px "Inter", sans-serif';
    ctx.fillText('🏆 PREDICTED CHAMPION', champX, champY + 25);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 28px "Inter", sans-serif';
    ctx.fillText(champ.toUpperCase(), champX, champY + 65);

    const champFifaCode = countryToFifa[champ] || "TBD";
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(`CODE: ${champFifaCode}`, champX, champY + 100);


    // 5. DRAW RUNNER-UP CARD (LEFT FLANK)
    const runX = 260;
    const runY = 320;
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.strokeStyle = '#64748B'; // silver outline
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(runX - 140, runY - 90, 280, 180, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('🥈 RUNNER-UP', runX, runY - 45);

    ctx.fillStyle = '#EF4444'; // white/red vibe
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px "Inter", sans-serif';
    ctx.fillText(runner.toUpperCase(), runX, runY);

    const runnerFifaCode = countryToFifa[runner] || "TBD";
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(`CODE: ${runnerFifaCode}`, runX, runY + 30);


    // 6. DRAW SEMI-FINALISTS CARDS (RIGHT FLANK)
    const sfX = 940;
    const sfY = 320;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.strokeStyle = '#3B82F6'; // blue outline
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sfX - 140, sfY - 90, 280, 180, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('🥉 SEMI-FINALISTS', sfX, sfY - 45);

    // List the semi-finalists excluding champ & runner if we have them
    const otherSfs = sfList.filter(s => s !== champ && s !== runner).slice(0, 2);
    const sfTeam1 = otherSfs[0] || (sfList[0] === champ || sfList[0] === runner ? sfList[2] : sfList[0]) || "Semi-finalist 1";
    const sfTeam2 = otherSfs[1] || (sfList[1] === champ || sfList[1] === runner ? sfList[3] : sfList[1]) || "Semi-finalist 2";

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText(sfTeam1.toUpperCase(), sfX, sfY - 5);
    ctx.fillText(sfTeam2.toUpperCase(), sfX, sfY + 25);

    ctx.fillStyle = '#4B5563';
    ctx.font = '10px "Inter", sans-serif';
    ctx.fillText('TOP 4 IN INDIA PREVIEW STANDINGS', sfX, sfY + 55);


    // 7. FOOTER CREDIT
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('World Cup Daily © June 2026 • Made in India', 600, 580);

    // Render Canvas into PNG Data Url
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setSharingImage(dataUrl);
    } catch (e) {
      console.error("Rendering canvas to base64 failed", e);
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Trigger Download of shared PNG board
  const handleDownloadImage = () => {
    if (!sharingImage) return;
    const link = document.createElement('a');
    link.download = `WCDaily2026_MyBracketProjection.png`;
    link.href = sharingImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("💾 Saved Projection image successfully!");
  };

  // Welcome / loading state check
  if (!state) {
    return (
      <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800/80 text-center max-w-2xl mx-auto my-12 backdrop-blur-md">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#3B82F6] mb-6 shadow-lg shadow-blue-500/5">
          <Trophy className="h-7 w-7" />
        </div>
        <h3 className="font-display text-3xl font-black tracking-tight text-[#F8FAFC] uppercase mb-4">
          WORLD CUP <span className="text-[#3B82F6]">PREDICTOR</span>
        </h3>
        <p className="text-sm text-[#94A3B8] leading-relaxed max-w-lg mx-auto mb-8">
          Welcome to the flagship 2026 predictions platform! Rank all 12 groups, select the qualifying 3rd-place wildcards, and tap winners through an interactive bracket to crown your 2026 Champion.
        </p>

        <button
          onClick={handleStartNew}
          className="hover:scale-[1.02] active:scale-[0.98] w-full md:w-auto px-10 py-4 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-xl shadow-blue-500/15 hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-3.5 cursor-pointer mx-auto"
        >
          <Sparkles className="h-5.5 w-5.5 text-yellow-300 animate-pulse" />
          <span>Launch Predictor Wizard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Dynamic Toast Feedback inside Widget */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 z-50 -translate-x-1/2 bg-blue-600 border border-blue-400 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2"
          >
            <Check className="h-4.5 w-4.5 stroke-[3]" />
            <span className="text-xs font-bold font-sans tracking-wide">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STAGE HEADER WIDGET STEPPER */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/5">
            <Trophy className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="font-display text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
              <span>WC 2026 PREDICTOR HUB</span>
              <span className="inline-block text-[8px] tracking-widest font-mono font-black border border-blue-500/50 bg-[#3B82F6]/10 px-1.5 py-0.5 rounded text-[#3B82F6] uppercase">ACTIVE</span>
            </h3>
            <p className="text-[10px] uppercase font-mono font-black text-[#94A3B8] tracking-widest mt-0.5">
              INDIA • FIFA qualification pathways
            </p>
          </div>
        </div>

        {/* Stepper Wizard Nodes */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveStep('groups')}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              activeStep === 'groups'
                ? 'border-blue-500/40 bg-blue-500/10 text-[#60A5FA]'
                : 'border-slate-800 bg-slate-950/40 text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            1. Groups Standings
          </button>
          
          <div className="h-px w-3 bg-slate-800 shrink-0" />
          
          <button
            onClick={handleProceedToBracket}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              activeStep === 'bracket'
                ? 'border-blue-500/40 bg-blue-500/10 text-[#60A5FA]'
                : 'border-slate-800 bg-slate-950/40 text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            2. Brackets
          </button>

          <div className="h-px w-3 bg-slate-800 shrink-0" />

          <button
            onClick={() => {
              if (isBracketComplete) {
                setActiveStep('champion');
              } else {
                triggerToast("Complete predictions to unlock showcase board!");
              }
            }}
            className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              activeStep === 'champion'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-slate-800 bg-slate-950/40 text-[#94A3B8] hover:text-[#F8FAFC]'
            } ${!isBracketComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            3. My Champion
          </button>
        </div>

        {/* Floating actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            title="Reset active state"
            className="cursor-pointer p-2 rounded-xl border border-slate-800 bg-slate-950/60 text-[#94A3B8] hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* PRIMARY VIEWER PORTALS */}
      <AnimatePresence mode="wait">
        
        {/* STEP 1: GROUP PREDICTOR VIEW */}
        {activeStep === 'groups' && (
          <motion.div
            key="groups-stage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left side column: Group Standings List selector */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-3.5 border-b border-slate-800/70 pb-3">
                  <h4 className="font-display text-sm font-black text-white uppercase flex items-center gap-2">
                    <LayoutGrid className="h-4.5 w-4.5 text-[#3B82F6]" />
                    <span>GROUPS STANDINGS</span>
                  </h4>
                  
                  {/* Shortcut auto filler */}
                  <button
                    onClick={handleAutoFillAll}
                    className="cursor-pointer text-[9px] font-bold bg-[#3B82F6]/10 hover:bg-[#3B82F6]/25 text-[#60A5FA] border border-[#3B82F6]/20 py-1 px-2 rounded uppercase transition-all"
                  >
                    Auto-Fill All
                  </button>
                </div>

                {/* 12 Group Tabs grid layout */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {groupsList.map(grpName => {
                    const groupData = state.groups.find(g => g.groupName === grpName);
                    // Generate teaser flag list
                    const previews = groupData ? groupData.teams : [];

                    return (
                      <button
                        key={grpName}
                        onClick={() => setCurrentGroupTab(grpName)}
                        className={`cursor-pointer p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                          currentGroupTab === grpName
                            ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-white shadow-lg'
                            : 'border-slate-800/50 bg-slate-950/40 text-[#94A3B8] hover:border-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="font-display font-black text-sm uppercase leading-none">GROUP {grpName}</span>
                        {/* 4 Flag miniatures */}
                        <div className="flex items-center justify-center -space-x-1">
                          {previews.map((tName, tIdx) => {
                            const details = getLocalTeamDetails(tName);
                            if (!details.flagUrl) return null;
                            return (
                              <img
                                key={tIdx}
                                src={details.flagUrl}
                                alt={details.name}
                                referrerPolicy="no-referrer"
                                className="h-3 w-4.5 object-cover rounded shadow ring-1 ring-slate-900 shrink-0"
                              />
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STAGE PROGRESS PREVIEW STATS */}
              <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/20 rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-[#3B82F6]">
                  <TrendingUp className="h-4.5 w-4.5" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">KNOCKOUTS PIPELINE PREVIEW</span>
                </div>
                
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Arranging teams dynamically updates the Round of 32 slots. Group Winners (1st) and Runners-Up (2nd) secure automatic qualification. The remaining 8 slots are distributed to the selected top 3rd-placed wildcard teams.
                </p>

                <button
                  onClick={handleProceedToBracket}
                  className="w-full py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Build Interactive Bracket</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right side detailed editor: Group details and reorder drag & dropping */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Core active group box */}
              {(() => {
                const activeGroup = state.groups.find(g => g.groupName === currentGroupTab);
                if (!activeGroup) return null;

                return (
                  <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <h4 className="font-display text-xl font-black text-white uppercase flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-400" />
                          <span>Group {currentGroupTab} Predicted standings</span>
                        </h4>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] mt-0.5">
                          REORDER TEAMS TO CONFIGURE GROUP OUTCOMES
                        </p>
                      </div>
                      
                      <div className="text-[10px] font-mono border border-slate-800 bg-slate-950/60 py-1 px-3 rounded-md text-slate-400 shrink-0 self-start sm:self-center">
                        Drag items or use arrow keys
                      </div>
                    </div>

                    {/* Standing lists */}
                    <div className="space-y-3">
                      {activeGroup.teams.map((tName, idx) => {
                        const details = getLocalTeamDetails(tName);
                        
                        // Standings styles/badges
                        let rankBorder = "border-slate-800/70";
                        let rankBg = "bg-slate-900/60";
                        let rankTag = "4th place";
                        let badgeColor = "bg-slate-950 text-slate-500";

                        if (idx === 0) {
                          rankBorder = "border-yellow-500/30";
                          rankBg = "bg-gradient-to-r from-yellow-500/[0.04] to-transparent";
                          rankTag = "WINNER (R32)";
                          badgeColor = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
                        } else if (idx === 1) {
                          rankBorder = "border-[#3B82F6]/30";
                          rankBg = "bg-gradient-to-r from-blue-500/[0.04] to-transparent";
                          rankTag = "RUNNER-UP (R32)";
                          badgeColor = "bg-[#3B82F6]/10 text-[#60A5FA] border border-[#3B82F6]/20";
                        } else if (idx === 2) {
                          rankBorder = "border-amber-500/30";
                          rankBg = "bg-gradient-to-r from-amber-500/[0.02] to-transparent";
                          rankTag = "WILDCARD SLOT";
                          badgeColor = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                        } else {
                          rankBorder = "border-red-950/50";
                          rankBg = "bg-slate-950/35";
                          rankTag = "ELIMINATED";
                          badgeColor = "bg-red-500/5 text-red-500/70 border border-red-500/10";
                        }

                        return (
                          <div
                            key={tName}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx, 'group')}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, idx, 'group')}
                            className={`p-3.5 rounded-xl border ${rankBorder} ${rankBg} flex items-center justify-between gap-3 group/item hover:bg-slate-800/40 transition-all shadow`}
                          >
                            <div className="flex items-center gap-3.5">
                              {/* Grab handle placeholder */}
                              <div className="cursor-grab active:cursor-grabbing text-slate-600 group-hover/item:text-slate-400 p-1 hidden sm:block" title="Drag to reorder">
                                ☰
                              </div>

                              {/* Big Rank number */}
                              <span className="font-display font-black text-lg text-slate-500 w-6">
                                {idx + 1}
                              </span>

                              {/* Flag and names */}
                              {details.flagUrl ? (
                                <img
                                  src={details.flagUrl}
                                  alt={details.name}
                                  referrerPolicy="no-referrer"
                                  className="h-6 w-9 rounded-md object-cover shadow border border-slate-950 shrink-0"
                                />
                              ) : (
                                <div className="h-6 w-9 rounded bg-slate-800 flex items-center justify-center shrink-0">
                                  🏳️
                                </div>
                              )}

                              <div>
                                <span className="font-display font-bold text-sm text-[#F8FAFC]">
                                  {details.name}
                                </span>
                                <span className="inline-block text-[10px] font-mono bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 ml-2">
                                  {details.fifaCode}
                                </span>
                              </div>
                            </div>

                            {/* Buttons and actions */}
                            <div className="flex items-center gap-3">
                              <span className={`text-[9.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full ${badgeColor}`}>
                                {rankTag}
                              </span>

                              {/* Up/Down arrow shortcuts for bulletproof mobile accessibility */}
                              <div className="flex items-center bg-slate-950/40 p-1 rounded-lg border border-slate-800/85">
                                <button
                                  onClick={() => handleSwapTeams(currentGroupTab, idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                  title="Move Up"
                                >
                                  <ChevronUp className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  onClick={() => handleSwapTeams(currentGroupTab, idx, idx + 1)}
                                  disabled={idx === 3}
                                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                  title="Move Down"
                                >
                                  <ChevronDown className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* WILDCARD 3RD PLACES DISPENSARY PANEL */}
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-5 shadow-xl space-y-4">
                <div className="border-b border-slate-800/80 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="font-display text-xl font-black text-white uppercase flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      <span>WILDCARD RANKINGS (3rd Place Teams)</span>
                    </h4>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] mt-0.5">
                      DRAG AND PLACE THE CODES. HIGHEST 8 CODES QUALIFY FOR THE R32.
                    </p>
                  </div>
                </div>

                {/* Grid list showing 12 third places ranked */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {state.thirdPlaces.map((tName, idx) => {
                    const details = getLocalTeamDetails(tName);
                    const grp = teamToGroupMap[tName] || "A";
                    const isAdvancing = idx < 8;

                    let cardClass = "border-slate-800/50 bg-slate-950/50";
                    let stateBadge = "bg-slate-950 text-slate-500 border border-slate-800";
                    let tag = "Eliminated";

                    if (isAdvancing) {
                      cardClass = "border-emerald-600/30 bg-emerald-950/5 shadow-emerald-950/2";
                      stateBadge = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      tag = "QUALIFIED FOR R32";
                    }

                    return (
                      <div
                        key={tName}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx, 'third')}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, idx, 'third')}
                        className={`p-3.5 rounded-xl border ${cardClass} flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-all`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank indicator */}
                          <div className={`p-1.5 rounded-lg text-xs font-black min-w-8 text-center ${isAdvancing ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-950 text-slate-500'}`}>
                            #{idx + 1}
                          </div>

                          {/* Flag and Team Details */}
                          {details.flagUrl ? (
                            <img
                              src={details.flagUrl}
                              alt={details.name}
                              referrerPolicy="no-referrer"
                              className="h-5 w-7 rounded border border-slate-950 shrink-0"
                            />
                          ) : (
                            <div className="h-5 w-7 rounded bg-slate-800 shrink-0" />
                          )}

                          <div>
                            <span className="font-display font-extrabold text-sm text-[#F8FAFC] line-clamp-1">
                              {details.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#94A3B8] font-bold">
                              GROUP {grp} • 3rd Place
                            </span>
                          </div>
                        </div>

                        {/* Arrows controllers */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full ${stateBadge}`}>
                            {tag}
                          </span>

                          <div className="flex flex-col bg-slate-950/60 p-0.5 rounded border border-slate-800">
                            <button
                              onClick={() => handleMoveThirdPlace(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Rank Higher"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveThirdPlace(idx, 'down')}
                              disabled={idx === 11}
                              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Rank Lower"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: INTERACTIVE BRACKET VIEW */}
        {activeStep === 'bracket' && (
          <motion.div
            key="bracket-stage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Round Tab selector chips */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-4 backdrop-blur-md shadow-xl flex items-center justify-between gap-4 overflow-x-auto">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {[
                  { id: 'R32', name: 'Round of 32', count: 16 },
                  { id: 'R16', name: 'Round of 16', count: 8 },
                  { id: 'QF', name: 'Quarter-Finals', count: 4 },
                  { id: 'SF', name: 'Semi-Finals', count: 2 },
                  { id: 'Finals', name: 'Final & 3rd', count: 2 }
                ].map(round => (
                  <button
                    key={round.id}
                    onClick={() => setActiveBracketRound(round.id as any)}
                    className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                      activeBracketRound === round.id
                        ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#60A5FA]'
                        : 'border-slate-800/60 bg-slate-950/40 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <span>{round.name}</span>
                    <span className="ml-1.5 text-[9px] font-mono bg-slate-950 text-[#64748B] px-1 py-0.5 rounded-full font-bold">
                      {round.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Informative notification */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-[#94A3B8]">
                <Info className="h-4 w-4 text-[#3B82F6]" />
                <span>Tap a team card to predict winner and advance them down the ladder!</span>
              </div>
            </div>

            {/* Render selected round Matches lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeRoundMatches.map((m: KnockoutPrediction) => {
                const t1Details = getLocalTeamDetails(m.team1);
                const t2Details = getLocalTeamDetails(m.team2);

                const t1Winner = m.winner === m.team1;
                const t2Winner = m.winner === m.team2;

                const isPlaceholder1 = m.team1.startsWith("Winner Match") || m.team1.startsWith("Loser Match") || m.team1.startsWith("3rd Place Slot");
                const isPlaceholder2 = m.team2.startsWith("Winner Match") || m.team2.startsWith("Loser Match") || m.team2.startsWith("3rd Place Slot");

                return (
                  <div
                    key={m.matchNo}
                    className="bg-slate-900/50 rounded-2xl border border-slate-800/80 hover:border-slate-700/80 p-4 shadow-xl shadow-slate-950/20 hover:shadow-slate-950/40 transition-all flex flex-col justify-between"
                  >
                    {/* Header: Match ID, City, Venue info */}
                    <div className="flex items-center justify-between gap-1.5 border-b border-slate-800/60 pb-2 mb-3">
                      <span className="text-[10px] font-mono font-black text-[#60A5FA] uppercase tracking-wider">
                        {m.round.toUpperCase()} • MATCH {m.matchNo}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]/90 font-mono font-bold flex items-center gap-1">
                        <MapPin className="h-3 w-3 inline text-[#3B82F6]" />
                        {m.venue}
                      </span>
                    </div>

                    {/* Team selectors stacked */}
                    <div className="space-y-2.5 my-1 font-sans">
                      {/* TEAM 1 */}
                      <button
                        onClick={() => handleSelectBracketWinner(m.matchNo, m.team1)}
                        disabled={isPlaceholder1}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                          t1Winner
                            ? 'border-yellow-500 bg-gradient-to-r from-yellow-500/10 to-transparent'
                            : m.winner
                              ? 'border-slate-850 bg-slate-950/20 opacity-50'
                              : isPlaceholder1
                                ? 'border-slate-900/80 bg-slate-950/10 cursor-not-allowed opacity-40'
                                : 'border-slate-800/70 bg-slate-950/50 hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Flag render */}
                          {t1Details.flagUrl ? (
                            <img
                              src={t1Details.flagUrl}
                              alt={t1Details.name}
                              referrerPolicy="no-referrer"
                              className="h-5.5 w-8 rounded object-cover shadow-sm ring-1 ring-black shrink-0"
                            />
                          ) : (
                            <div className="h-5.5 w-8 rounded bg-slate-800 flex items-center justify-center font-mono text-[9px] font-extrabold text-[#64748B] shrink-0 border border-slate-900">
                              {t1Details.fifaCode}
                            </div>
                          )}

                          <div>
                            <span className="font-display font-extrabold text-xs text-[#F8FAFC]">
                              {t1Details.name}
                            </span>
                            {/* Qualification placeholder path */}
                            {isPlaceholder1 && (
                              <span className="block text-[8px] font-mono font-bold text-[#64748B] tracking-wider uppercase mt-0.5">
                                Awaiting match outcome
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tick/Winner status */}
                        {t1Winner && (
                          <span className="h-5 w-5 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center shadow-lg">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </button>

                      <div className="text-center text-[9px] font-mono font-black text-[#475569] uppercase tracking-widest my-1">- versus -</div>

                      {/* TEAM 2 */}
                      <button
                        onClick={() => handleSelectBracketWinner(m.matchNo, m.team2)}
                        disabled={isPlaceholder2}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                          t2Winner
                            ? 'border-yellow-500 bg-gradient-to-r from-yellow-500/10 to-transparent'
                            : m.winner
                              ? 'border-slate-850 bg-slate-950/20 opacity-50'
                              : isPlaceholder2
                                ? 'border-slate-900/80 bg-slate-950/10 cursor-not-allowed opacity-40'
                                : 'border-slate-800/70 bg-slate-950/50 hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Flag render */}
                          {t2Details.flagUrl ? (
                            <img
                              src={t2Details.flagUrl}
                              alt={t2Details.name}
                              referrerPolicy="no-referrer"
                              className="h-5.5 w-8 rounded object-cover shadow-sm ring-1 ring-black shrink-0"
                            />
                          ) : (
                            <div className="h-5.5 w-8 rounded bg-slate-800 flex items-center justify-center font-mono text-[9px] font-extrabold text-[#64748B] shrink-0 border border-slate-900">
                              {t2Details.fifaCode}
                            </div>
                          )}

                          <div>
                            <span className="font-display font-extrabold text-xs text-[#F8FAFC]">
                              {t2Details.name}
                            </span>
                            {/* Qualification placeholder path */}
                            {isPlaceholder2 && (
                              <span className="block text-[8px] font-mono font-bold text-[#64748B] tracking-wider uppercase mt-0.5">
                                Awaiting match outcome
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Tick/Winner status */}
                        {t2Winner && (
                          <span className="h-5 w-5 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center shadow-lg">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Footer: Calendar & Time */}
                    <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between text-[9px] font-mono font-semibold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {m.date}
                      </span>
                      <span className="flex items-center gap-1 text-[#60A5FA]">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {m.timeIST} IST
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Check if all matches completed up to finals */}
            {isBracketComplete && (
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 text-center space-y-4 max-w-xl mx-auto backdrop-blur-md">
                <Trophy className="h-10 w-10 text-yellow-400 animate-bounce mx-auto" />
                <h4 className="font-display font-black text-white text-lg uppercase">
                  Prediction Bracket Complete!
                </h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Congratulations! You have completed predicting the entire World Cup 2026. Review and celebrate your predicted world champion.
                </p>
                <button
                  onClick={() => setActiveStep('champion')}
                  className="px-8 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer"
                >
                  Celebrate Champion
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: CHAMPION CELEBRATION SHOWCASE VIEW */}
        {activeStep === 'champion' && (
          <motion.div
            key="champion-showcase"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Visual Confetti Golden Victory Card */}
            <div className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] border border-amber-500/30 p-8 rounded-3xl text-center shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
              
              {/* Glossy Spotlights overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.06)_0%,_transparent_70%)] pointer-events-none" />
              
              {/* Gold laurels circles */}
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-yellow-400 mb-2 relative animate-pulse shadow-xl shadow-amber-500/5">
                <Trophy className="h-12 w-12 text-yellow-400 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.45)]" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono font-black text-[#F59E0B] tracking-[0.3em] uppercase block">
                  🏆 MY PREDICTED CHAMPION 🏆
                </span>
                <h3 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-tight text-white uppercase">
                  {state.champion?.toUpperCase() || "TBD"}
                </h3>
              </div>

              {/* Show Champ Flag rendering */}
              {state.champion && (
                <div className="flex justify-center">
                  <div className="p-1 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] shadow-2xl shrink-0">
                    {getLocalTeamDetails(state.champion).flagUrl ? (
                      <img
                        src={getLocalTeamDetails(state.champion).flagUrl!}
                        alt={state.champion}
                        referrerPolicy="no-referrer"
                        className="h-24 w-38 rounded-xl object-cover shadow-2xl shrink-0"
                      />
                    ) : (
                      <div className="h-24 w-38 rounded-xl bg-slate-850 flex items-center justify-center font-mono text-3xl shrink-0">
                        🏳️
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Golden line rules */}
              <div className="h-0.5 w-32 bg-amber-500/30 mx-auto rounded-full" />

              {/* Runners and semi-finalists list */}
              <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-center select-none pt-4">
                {/* Runner-up */}
                <div className="p-4 bg-slate-950/45 rounded-2xl border border-slate-850 text-center">
                  <span className="inline-block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
                    🥈 RUNNER-UP
                  </span>
                  <div className="font-display font-extrabold text-sm text-white max-clamp-1">{state.runnerUp || "TBD"}</div>
                  {state.runnerUp && getLocalTeamDetails(state.runnerUp).flagUrl && (
                    <img
                      src={getLocalTeamDetails(state.runnerUp).flagUrl!}
                      alt={state.runnerUp}
                      referrerPolicy="no-referrer"
                      className="h-4.5 w-7 rounded object-cover shadow border border-slate-900 mx-auto mt-2"
                    />
                  )}
                </div>

                {/* Semi-finalists */}
                {semiFinalists.slice(0, 2).map((team, tIdx) => (
                  <div key={tIdx} className="p-4 bg-slate-950/45 rounded-2xl border border-slate-850 text-center">
                    <span className="inline-block text-[9px] font-bold text-[#60A5FA] uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
                      🥉 SEMI-FINALIST
                    </span>
                    <div className="font-display font-extrabold text-sm text-white max-clamp-1">{team}</div>
                    {team && getLocalTeamDetails(team).flagUrl && (
                      <img
                        src={getLocalTeamDetails(team).flagUrl!}
                        alt={team}
                        referrerPolicy="no-referrer"
                        className="h-4.5 w-7 rounded object-cover shadow border border-slate-900 mx-auto mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons to share predictions */}
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleGenerateShareImage}
                  disabled={isGeneratingShare}
                  className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4.5 w-4.5 stroke-[2.5]" />
                  <span>{isGeneratingShare ? 'Generating Board...' : 'Share Bracket (Generate PNG)'}</span>
                </button>
                <button
                  onClick={() => setActiveStep('bracket')}
                  className="cursor-pointer w-full sm:w-auto px-6 py-3.5 border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Back to brackets
                </button>
              </div>
            </div>

            {/* Generated projection board preview modal */}
            {sharingImage && (
              <div className="bg-slate-900/50 rounded-2xl border border-blue-500/20 p-5 shadow-2xl flex flex-col md:flex-row gap-5 items-center justify-between">
                <div className="max-w-md space-y-2">
                  <h4 className="font-display text-lg font-black text-white uppercase flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    <span>YOUR BRACKET IMAGE IS READY!</span>
                  </h4>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    A custom-styled prediction infographic with your Champion, Runner-up, and top Semi-finalists has been rendered directly in your browser. Download it now to share in your feed!
                  </p>
                  <button
                    onClick={handleDownloadImage}
                    className="cursor-pointer px-6 py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PNG Projection Board</span>
                  </button>
                </div>

                {/* Live Image teaser rendering */}
                <div className="w-full md:w-[350px] border border-slate-750 p-1.5 bg-slate-950 rounded-2xl shadow-xl shrink-0 transition-transform hover:scale-[1.01]">
                  <img
                    src={sharingImage}
                    alt="World Cup Daily Predictor Board Preview"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Canvas used for OpenGraph high-DPI image generation */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
