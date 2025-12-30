import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { worldCupGroups } from '../data/groups';
import type { Team } from '../types/worldcup';
import './RoundOf32.css';
import { useThirdPlace } from '../contexts/ThirdPlaceContext';
import type { Matchup } from '../contexts/ThirdPlaceContext';
import Seo from './Seo';

type StoredTeam = Team & { groupName?: string };
type NameFlag = { name: string; flag?: string; groupName?: string };

// reuse Matchup type exported from context
// Base Round-of-32 slot keys (left-side slot token indicates which team fills that position)
const slotOrder = [
  '1E', '1I', '2A', '1F', '2K', '1H', '1D', '1G', '1C', '2E', '1A', '1L', '1J', '2D', '1B', '1K',
];

// Default mapping for slots with specified opponents
const defaultMapping: Record<string, string> = {
  '2A': '2B',
  '1F': '2C',
  '2K': '2L',
  '1H': '2J',
  '1C': '2F',
  '2E': '2I',
  '1J': '2H',
  '2D': '2G',
};

function getGroupWinner(letter: string) {
  const group = worldCupGroups.find(g => g.name.endsWith(letter));
  return group?.teams?.[0] || { name: `Winner ${letter}`, flag: '' };
}

export default function RoundOf32() {
  const { draft, order, mapping, matchups } = useThirdPlace();
  const thirdPlaces = useMemo(() => (order || draft || []) as StoredTeam[], [order, draft]);
  const [selectedWinners, setSelectedWinners] = useState<Record<number, 'left' | 'right'>>({});
  // Round of 16 / QF / SF / Final selections (transient only)
  const [selectedR16, setSelectedR16] = useState<Record<number, 'left' | 'right'>>({});
  const [selectedQF, setSelectedQF] = useState<Record<number, 'left' | 'right'>>({});
  const [selectedSF, setSelectedSF] = useState<Record<number, 'left' | 'right'>>({});
  const [selectedF, setSelectedF] = useState<'left' | 'right' | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '/round-of-32';

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect back to home if user hasn't selected third-place teams yet
  useEffect(() => {
    function isGroupStageComplete() {
      try {
        const raw = localStorage.getItem('groupTeamOrders');
        if (!raw) return false;
        const orders = JSON.parse(raw) as Record<string, (Team & { uniqueId: string })[]>;
        for (const g of worldCupGroups) {
          const arr = orders[g.name];
          if (!arr || !Array.isArray(arr) || arr.length < 3) return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    const rawThird = localStorage.getItem('thirdPlaceOrder');
    if (!isGroupStageComplete() || !rawThird) {
      // small delay so users see a message briefly if they navigated manually
      const t = setTimeout(() => navigate('/'), 50);
      return () => clearTimeout(t);
    }
  }, [navigate]);

  // selections are transient only; do NOT persist so refresh clears picks

  // Build matches using mapping if available, otherwise fallback to naive index pairing
  const matches: Matchup[] = useMemo(() => {
    const navState = location.state as unknown as { matchups?: Matchup[]; mapping?: Record<string,string>; option?: string } | null;
    console.log('RoundOf32 location.state:', navState);

    // If matchups present in context and they cover all expected slots and are fully resolved, prefer them.
    if (matchups && Array.isArray(matchups) && matchups.length >= slotOrder.length && matchups.every(m => m.opponent.name !== 'TBD')) {
      try { localStorage.setItem('round32_matchups', JSON.stringify({ option: localStorage.getItem('round32_option') || null, mapping: mapping || null, matchups: matchups })); } catch { /* ignore */ }
      console.log('Using matchups from ThirdPlaceContext:', matchups);
      try {
        console.group('Knockouts - resolved slots from context.matchups');
        (matchups as Matchup[]).forEach((m) => console.log(m.slot, '->', m.opponent?.name || m.opponent));
        console.groupEnd();
      } catch { /* ignore */ }
      return matchups;
    }

    // navigation state still allowed (e.g., immediate transition) but only if it's complete
    // otherwise fallthrough to build the full set from mapping/resolvers.
    if (navState && Array.isArray(navState.matchups) && (navState.matchups || []).length >= slotOrder.length) {
      try { localStorage.setItem('round32_matchups', JSON.stringify({ option: navState.option || null, mapping: navState.mapping || null, matchups: navState.matchups })); } catch { /* ignore */ }
      console.log('Using matchups from navigation state:', navState);
      try {
        console.group('Knockouts - resolved slots from navigation.state');
        (navState.matchups || []).forEach((m) => console.log(m.slot, '->', m.opponent?.name || m.opponent));
        console.groupEnd();
      } catch { /* ignore */ }
      return navState.matchups || [];
    }

    // Build matches using mapping if available, otherwise fallback to naive index pairing
    const resolveToken = (token: string) => {
      const t = String(token || '').trim().toUpperCase();
      const m = t.match(/^([1-3])([A-L])$/);
      if (!m) return null;
      const pos = Number(m[1]);
      const letter = m[2];
      const groupName = `Group ${letter}`;
      try {
        const raw = localStorage.getItem('groupTeamOrders');
        if (raw) {
          const orders = JSON.parse(raw) as Record<string, (Team & { uniqueId: string })[]>;
          const ordered = orders[groupName];
          if (ordered && ordered.length >= pos) return ordered[pos - 1];
        }
      } catch { /* ignore */ }
      // for third-place tokens prefer current thirdPlaces (live selection)
      if (pos === 3) {
        const foundThird = thirdPlaces.find(t => (t.groupName || '').toUpperCase().includes(letter));
        if (foundThird) return foundThird;
      }
      const group = worldCupGroups.find(g => g.name.endsWith(letter));
      if (group && group.teams && group.teams.length >= pos) return group.teams[pos - 1];
      return null;
    };

    const fullMapping = { ...defaultMapping, ...mapping };
    const built = slotOrder.map((slot) => {
      // Resolve left-side team from the slot token (can be 1X, 2X, etc.)
      const resolvedLeft = resolveToken(slot);
      const winner = resolvedLeft || getGroupWinner(slot.slice(1));

      let opponent: StoredTeam | NameFlag = { name: 'TBD', flag: '' };
      const token = fullMapping[slot];
      if (token) {
        const found = resolveToken(token);
        opponent = found ? (found as StoredTeam) : { name: token, flag: '' };
      }
      return { slot, winner, opponent } as Matchup;
    });

    try {
      // Diagnostic logging: mapping token -> resolved team
      console.group('Knockouts - mapping resolution');
      console.log('fullMapping:', fullMapping);
      console.log('thirdPlaces (current):', thirdPlaces);
      built.forEach(b => {
        console.log(b.slot, 'token->', fullMapping?.[b.slot], 'resolved->', (b.opponent as StoredTeam).name || b.opponent);
      });
      console.groupEnd();
    } catch { /* ignore */ }
    try {
      const option = localStorage.getItem('round32_option') || null;
      localStorage.setItem('round32_matchups', JSON.stringify({ option, mapping: fullMapping, matchups: built }));
    } catch { /* ignore */ }
    console.log('Built Round-of-32 matchups from mapping:', fullMapping, built);
    return built;
  }, [location.state, mapping, thirdPlaces, matchups]);

  // Helpers to derive winners and downstream matchups
  const pickTeam = (match: Matchup | undefined, choice?: 'left' | 'right') => {
    if (!match) return undefined;
    if (choice === 'left') return match.winner as StoredTeam | undefined;
    if (choice === 'right') return match.opponent as StoredTeam | undefined;
    return undefined;
  };

  // Round-of-32 winners (selected)
  const r32Winners = useMemo(() => matches.map((m, i) => pickTeam(m, selectedWinners[i])), [matches, selectedWinners]);

  // Build Round-of-16 pairings from R32 winners: (0 vs 1), (2 vs 3), ...
  const r16Matches = useMemo(() => {
    const pairs: Array<{ left?: StoredTeam | { name: string; flag?: string }; right?: StoredTeam | { name: string; flag?: string } }> = [];
    for (let i = 0; i < 8; i++) {
      pairs.push({ left: r32Winners[2 * i] || { name: 'TBD', flag: '' }, right: r32Winners[2 * i + 1] || { name: 'TBD', flag: '' } });
    }
    return pairs;
  }, [r32Winners]);

  const r16Winners = useMemo(() => r16Matches.map((m, i) => pickTeam({ slot: `R16-${i}`, winner: m.left as NameFlag, opponent: m.right as NameFlag } as Matchup, selectedR16[i])), [r16Matches, selectedR16]);

  const qfMatches = useMemo(() => {
    const pairs: Array<{ left?: StoredTeam | NameFlag; right?: StoredTeam | NameFlag }> = [];
    for (let i = 0; i < 4; i++) {
      pairs.push({ left: r16Winners[2 * i] || { name: 'TBD', flag: '' }, right: r16Winners[2 * i + 1] || { name: 'TBD', flag: '' } });
    }
    return pairs;
  }, [r16Winners]);

  const qfWinners = useMemo(() => qfMatches.map((m, i) => pickTeam({ slot: `QF-${i}`, winner: m.left as NameFlag, opponent: m.right as NameFlag } as Matchup, selectedQF[i])), [qfMatches, selectedQF]);

  const sfMatches = useMemo(() => [{ left: qfWinners[0] || { name: 'TBD' }, right: qfWinners[1] || { name: 'TBD' } }, { left: qfWinners[2] || { name: 'TBD' }, right: qfWinners[3] || { name: 'TBD' } }], [qfWinners]);

  const sfWinners = useMemo(() => sfMatches.map((m, i) => pickTeam({ slot: `SF-${i}`, winner: m.left as NameFlag, opponent: m.right as NameFlag } as Matchup, selectedSF[i])), [sfMatches, selectedSF]);

  const finalMatch = useMemo(() => ({ left: sfWinners[0] || { name: 'TBD' }, right: sfWinners[1] || { name: 'TBD' } }), [sfWinners]);

  const finalWinner = useMemo(() => pickTeam({ slot: 'F-0', winner: finalMatch.left as NameFlag, opponent: finalMatch.right as NameFlag } as Matchup, selectedF || undefined), [finalMatch, selectedF]);

  // Handlers that clear downstream selections when upstream changes
  const handleSelectR32 = (index: number, choice: 'left' | 'right') => {
    setSelectedWinners(prev => ({ ...prev, [index]: choice }));
    setSelectedR16({}); setSelectedQF({}); setSelectedSF({}); setSelectedF(null);
  };
  const handleSelectR16 = (index: number, choice: 'left' | 'right') => { setSelectedR16(prev => ({ ...prev, [index]: choice })); setSelectedQF({}); setSelectedSF({}); setSelectedF(null); };
  const handleSelectQF = (index: number, choice: 'left' | 'right') => { setSelectedQF(prev => ({ ...prev, [index]: choice })); setSelectedSF({}); setSelectedF(null); };
  const handleSelectSF = (index: number, choice: 'left' | 'right') => { setSelectedSF(prev => ({ ...prev, [index]: choice })); setSelectedF(null); };
  const handleSelectF = (choice: 'left' | 'right') => { setSelectedF(choice); setShowWinnerModal(true); };

  // auto-hide modal after 4s; allow close
  useEffect(() => {
    if (!showWinnerModal) return;
    const t = setTimeout(() => setShowWinnerModal(false), 4000);
    return () => clearTimeout(t);
  }, [showWinnerModal]);

  // Share helpers
  const getShareText = () => `${finalWinner?.flag || ''} I picked ${finalWinner?.name} as the winner in my Knockouts bracket!`;

  const handleShareNative = async () => {
    const text = getShareText();
    const navWithShare = navigator as unknown as { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> };
    try {
      if (navWithShare.share) {
        await navWithShare.share({ title: 'Knockouts - Bracket', text, url: shareUrl });
      } else {
        // fallback to copy if native not available
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        alert('Share text copied to clipboard');
      }
    } catch {
      try { await navigator.clipboard.writeText(`${text} ${shareUrl}`); alert('Share text copied to clipboard'); } catch { /* ignore */ }
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener');
  };

  const handleShareFacebook = () => {
    const quote = encodeURIComponent(getShareText());
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank', 'noopener');
  };

  const handleShareInstagram = async () => {
    // Instagram web doesn't support prefilled posts. Copy message and open instagram.
    try {
      await navigator.clipboard.writeText(`${getShareText()} ${shareUrl}`);
      window.open('https://www.instagram.com/', '_blank', 'noopener');
      alert('Share text copied to clipboard — paste into Instagram post');
    } catch {
      window.open('https://www.instagram.com/', '_blank', 'noopener');
    }
  };

  return (
    <div className="replica-page">
      <Seo
        title="Knockouts — WorldCup 2026"
        description="Build and interact with the Round-of-32 bracket based on group winners and selected third-place teams."
        url="/round-of-32"
        image="/image.png"
        keywords="round of 32, knockouts, World Cup, bracket"
        tags={["worldcup","knockouts","world cup predictor","bracket","soccer"]}
      />
      <header className="replica-header">
        <div className="replica-left">
          <button className="back-link" onClick={() => navigate('/third-place', { state: { refresh: Date.now() } })}>
            <span className="back-icon">←</span>
            <span className="back-text">Third Place</span>
          </button>
          <div>
            <h2 className="replica-title">Knockouts</h2>
          </div>
        </div>
      </header>

      <main style={{ marginTop: 20 }}>
        <section>
          <h3>Round of 32</h3>
          <div className="card-list">
            {matches.map((m, i) => (
              <div key={i} className="card">
                <h4>Match {i + 1}</h4>
                <div
                  className={`team-box ${selectedWinners[i] === 'left' ? 'selected' : ''} ${!m.winner ? 'disabled' : ''}`}
                  onClick={() => handleSelectR32(i, 'left')}
                >
                  {m.winner.flag || ''} {m.winner.name}
                </div>
                <div
                  className={`team-box ${selectedWinners[i] === 'right' ? 'selected' : ''} ${!m.opponent ? 'disabled' : ''}`}
                  onClick={() => handleSelectR32(i, 'right')}
                >
                  {m.opponent.flag || ''} {m.opponent.name}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Round of 16</h3>
          <div className="card-list">
            {r16Matches.map((m, i) => (
              <div key={`r16-${i}`} className="card">
                <h4>Match {i + 1}</h4>
                <div className={`team-box ${selectedR16[i] === 'left' ? 'selected' : ''} ${!m.left ? 'disabled' : ''}`} onClick={() => m.left && handleSelectR16(i, 'left')}>
                  {(m.left as NameFlag).flag || ''} {(m.left as NameFlag).name}
                </div>
                <div className={`team-box ${selectedR16[i] === 'right' ? 'selected' : ''} ${!m.right ? 'disabled' : ''}`} onClick={() => m.right && handleSelectR16(i, 'right')}>
                  {(m.right as NameFlag).flag || ''} {(m.right as NameFlag).name}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Quarterfinals</h3>
          <div className="card-list">
            {qfMatches.map((m, i) => (
              <div key={`qf-${i}`} className="card">
                <h4>Match {i + 1}</h4>
                <div className={`team-box ${selectedQF[i] === 'left' ? 'selected' : ''} ${!m.left ? 'disabled' : ''}`} onClick={() => m.left && handleSelectQF(i, 'left')}>
                  {(m.left as NameFlag).flag || ''} {(m.left as NameFlag).name}
                </div>
                <div className={`team-box ${selectedQF[i] === 'right' ? 'selected' : ''} ${!m.right ? 'disabled' : ''}`} onClick={() => m.right && handleSelectQF(i, 'right')}>
                  {(m.right as NameFlag).flag || ''} {(m.right as NameFlag).name}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Semifinals</h3>
          <div className="card-list">
            {sfMatches.map((m, i) => (
              <div key={`sf-${i}`} className="card">
                <h4>Match {i + 1}</h4>
                <div className={`team-box ${selectedSF[i] === 'left' ? 'selected' : ''} ${!m.left ? 'disabled' : ''}`} onClick={() => m.left && handleSelectSF(i, 'left')}>
                  {(m.left as NameFlag).flag || ''} {(m.left as NameFlag).name}
                </div>
                <div className={`team-box ${selectedSF[i] === 'right' ? 'selected' : ''} ${!m.right ? 'disabled' : ''}`} onClick={() => m.right && handleSelectSF(i, 'right')}>
                  {(m.right as NameFlag).flag || ''} {(m.right as NameFlag).name}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: 24 }}>Final</h3>
          <div className="card-list">
            <div className="card">
              <h4>Match 1</h4>
              <div className={`team-box ${selectedF === 'left' ? 'selected' : ''} ${!finalMatch.left ? 'disabled' : ''}`} onClick={() => finalMatch.left && handleSelectF('left')}>
                {(finalMatch.left as NameFlag).flag || ''} {(finalMatch.left as NameFlag).name}
              </div>
              <div className={`team-box ${selectedF === 'right' ? 'selected' : ''} ${!finalMatch.right ? 'disabled' : ''}`} onClick={() => finalMatch.right && handleSelectF('right')}>
                {(finalMatch.right as NameFlag).flag || ''} {(finalMatch.right as NameFlag).name}
              </div>
            </div>
          </div>

          {/* Winner modal */}
          {showWinnerModal && finalWinner && (
            <div className={`winner-modal show`} role="dialog" aria-live="polite">
              <div className="winner-card">
                <div className="winner-visual">
                  <div className="winner-flag">{finalWinner.flag || ''}</div>
                </div>
                <div className="winner-text">
                  <div className="winner-title">Winner</div>
                  <div className="winner-name">{finalWinner.name}</div>
                  <div className="winner-share">
                    <button className="share-btn" onClick={handleShareNative}>Share</button>
                    <button className="share-btn" onClick={handleShareTwitter}>Twitter</button>
                    <button className="share-btn" onClick={handleShareFacebook}>Facebook</button>
                    <button className="share-btn" onClick={handleShareInstagram}>Instagram</button>
                    <button className="share-btn" onClick={() => { navigator.clipboard?.writeText(`${getShareText()} ${shareUrl}`); alert('Copied to clipboard'); }}>Copy</button>
                  </div>
                </div>
                <button className="winner-close" onClick={() => setShowWinnerModal(false)} aria-label="Close winner dialog">✕</button>
                <div className="confetti" aria-hidden>
                  <span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
