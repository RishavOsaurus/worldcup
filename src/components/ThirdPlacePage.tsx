import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GroupTable from './GroupTable';
import type { Team } from '../types/worldcup';
import { worldCupGroups } from '../data/groups';
import { useThirdPlace } from '../contexts/ThirdPlaceContext';
import Seo from './Seo';

const SLOT_ORDER = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'];

export default function ThirdPlacePage() {
  const navigate = useNavigate();
  const { draft, setDraft, setOrder, setMapping, setOption, setMatchups } = useThirdPlace();
  const [teams, setTeams] = useState<(Team & { groupName?: string })[]>(() => draft || []);
  const [locked, setLocked] = useState(false);

  // Helper: determine whether the group stage has been completed (persisted orders exist)
  function isGroupStageComplete() {
    try {
      const raw = localStorage.getItem('groupTeamOrders');
      if (!raw) return false;
      const orders = JSON.parse(raw) as Record<string, (Team & { uniqueId: string })[]>;
      // require an entry for every configured group with at least 3 teams ordered
      for (const g of worldCupGroups) {
        const arr = orders[g.name];
        if (!arr || !Array.isArray(arr) || arr.length < 3) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // slot order used elsewhere (Round of 32 expects these winners)

  // helper to get group winner by letter
  function getGroupWinner(letter: string) {
    const group = worldCupGroups.find(g => g.name.endsWith(letter));
    return group?.teams?.[0] || { name: `Winner ${letter}`, flag: '' };
  }

  // Resolve a token like '1A' or '3H' into the actual team object (if available).
  function resolveTokenToTeam(token: string, fallbackThirds: (Team & { groupName?: string })[] = []) {
    const t = String(token || '').trim().toUpperCase();
    const m = t.match(/^([1-3])([A-L])$/);
    if (!m) return null;
    const pos = Number(m[1]);
    const letter = m[2];
    const groupName = `Group ${letter}`;
    // try persisted group orders first
    try {
      const raw = localStorage.getItem('groupTeamOrders');
      if (raw) {
        const orders = JSON.parse(raw) as Record<string, (Team & { uniqueId: string })[]>;
        const ordered = orders[groupName];
        if (ordered && ordered.length >= pos) return ordered[pos - 1];
      }
    } catch {
      /* ignore parse/storage errors */
    }

    // For third-place tokens prefer the provided fallback third-place list (live third place selection)
    if (pos === 3 && fallbackThirds && fallbackThirds.length > 0) {
      const found = fallbackThirds.find(ft => (ft.groupName || '').toUpperCase().includes(letter));
      if (found) return found;
    }

    // fallback to worldCupGroups static data for pos 1/2/3
    const group = worldCupGroups.find(g => g.name.endsWith(letter));
    if (group && group.teams && group.teams.length >= pos) return group.teams[pos - 1];

    return null;
  }

  // helper to get current winner from persisted group orders (if available)
  const getCurrentGroupWinner = useCallback((letter: string) => {
    try {
      const raw = localStorage.getItem('groupTeamOrders');
      if (raw) {
        const orders = JSON.parse(raw) as Record<string, (Team & { uniqueId: string })[]>;
        const groupName = `Group ${letter}`;
        const ordered = orders[groupName];
        if (ordered && ordered.length > 0) return ordered[0];
      }
    } catch {
      /* ignore and fallback */
    }
    return getGroupWinner(letter);
  }, []);

  // Use context for draft/order/matchups instead of relying on localStorage
  // (we destructured above so state init can inspect current draft)

  // On mount: compute qualified top-8 (winners for the slotOrder), log them,
  // then try to find a mapping in group_combo.json that matches current third-place tokens
  useEffect(() => {
    // enforce flow: if group-stage isn't done, send user back to groups page
    if (!isGroupStageComplete()) {
      navigate('/');
      return;
    }
    // compute winners for the 8 slots (use current persisted orders when available)
    const winners = SLOT_ORDER.map(slot => ({ slot, team: getCurrentGroupWinner(slot.slice(1)) }));

    // Log qualified top-8 winners
    try {
      console.log('Qualified Top-8 Winners (slot -> team):', winners.map(w => ({ slot: w.slot, name: w.team.name })));
      // persist a simple log in localStorage for later inspection
      localStorage.setItem('round32_qualified_top8', JSON.stringify(winners.map(w => ({ slot: w.slot, name: w.team.name, flag: w.team.flag || '' }))));
    } catch {
      /* ignore storage errors */
    }

    // Attempt to read third-place draft (from context) and match mapping from group_combo.json
    (async () => {
      try {
        const draftTeams: (Team & { groupName?: string })[] = draft || [];
        if (!draftTeams || draftTeams.length === 0) return; // nothing to map yet

        // Build selected tokens like '3E' from draft team.groupName
        // Use only the first 8 teams from the draft as the qualified third-place teams
        const draftTop8 = draftTeams.slice(0, 8);
        const selectedTokens = draftTop8.map(t => {
          const g = (t.groupName || '').trim();
          const m = g.match(/([A-L])\s*$/i);
          const letter = m ? m[1].toUpperCase() : (g.slice(-1) || '').toUpperCase();
          return `3${letter}`;
        }).map(s => s.trim().toUpperCase());
        console.log('Using top 8 third-place teams for mapping:', selectedTokens);

        // fetch the JSON mapping (pre-generated from CSV)
        const res = await fetch(`${import.meta.env.BASE_URL}group_combo.json`);
        if (!res.ok) return;
        const combos = await res.json(); // array of objects

        // Find a combo row that matches the multiset of selectedTokens
        let foundMapping: Record<string, string> | null = null;
        let foundOption: string | null = null;
        const targetSorted = selectedTokens.slice().map(s => s.trim().toUpperCase()).sort().join(',');
        for (const row of combos) {
          const cols = Object.keys(row).filter(k => k !== 'Option').map(k => String(row[k] || '').trim().toUpperCase());
          const a = cols.slice().sort().join(',');
          // exact token multiset match
          if (a === targetSorted) {
            // build mapping header -> token
            const mapping: Record<string, string> = {};
            Object.keys(row).forEach(k => {
              if (k !== 'Option') mapping[k] = row[k] as string;
            });
            foundMapping = mapping;
            foundOption = String(row.Option || '') || null;
            break;
          }
        }

        if (foundMapping) {
          // Build matchups: for each key (e.g., '1A') map winner team vs mapped token (opponent)
          const matchups: Array<{ slot: string; winner: { name: string; flag?: string }; opponent: { name: string; flag?: string } }>
            = [];

          // Build matchups in canonical slot order so UI and consumers see a consistent ordering
          for (const slot of SLOT_ORDER) {
            if (!foundMapping[slot]) continue;
            const token = String(foundMapping[slot] || '').trim().toUpperCase(); // e.g., '3E'
            const winnerObj = winners.find(w => w.slot === slot) || { slot, team: { name: slot, flag: '' } };
                const resolved = resolveTokenToTeam(token, draftTop8 as (Team & { groupName?: string })[]);
              matchups.push({
                slot,
                winner: { name: winnerObj.team.name, flag: winnerObj.team.flag || '' },
                opponent: resolved ? { name: resolved.name, flag: (resolved as Team).flag || '' } : { name: token, flag: '' }
              });
          }

          // Log and persist mapping + option + matchups in context
          console.log('Round-of-32 mapping found (Option):', foundOption, foundMapping);
          try {
            console.group('ThirdPlacePage - mapping resolution');
            console.log('draftTop8 (third-place candidates):', draftTop8);
            Object.keys(foundMapping).forEach(slot => {
              const token = String(foundMapping[slot]).trim().toUpperCase();
              const resolved = resolveTokenToTeam(token, draftTop8 as (Team & { groupName?: string })[]);
              console.log(slot, '->', token, '=>', resolved ? resolved.name + ' (' + (resolved as unknown as { groupName?: string }).groupName + ')' : 'UNRESOLVED');
            });
            console.groupEnd();
          } catch {
            /* ignore logging errors */
          }
          console.log('Generated matchups:', matchups);
          setMapping(foundMapping);
          setOption(foundOption);
          setMatchups(matchups);
        } else {
          console.log('No matching group_combo mapping found for selected third-place tokens:', selectedTokens);
        }
      } catch (e) {
        console.log('Error while attempting to build round-of-32 mapping:', e);
      }
    })();
  }, [draft, setMapping, setOption, setMatchups, getCurrentGroupWinner]);

  const handleOrderChange = (newTeams: (Team & { groupName?: string })[]) => {
    setTeams(newTeams);
    setDraft(newTeams);
  };

  const saveAndProceed = async () => {
    try {
      // Use the current React state `teams` as the source of truth and update context
      const draftTeams = teams;
      setDraft(draftTeams);
      setOrder(draftTeams);
      // persist immediate order so RoundOf32 can read it synchronously
      try { localStorage.setItem('thirdPlaceOrder', JSON.stringify(draftTeams)); } catch {
        /* ignore */
      }

      // try to match combo mapping from precomputed JSON
      const res = await fetch(`${import.meta.env.BASE_URL}group_combo.json`);
      const combos = res.ok ? await res.json() : null;
      // Use only the first 8 teams as the qualified third-place teams
      const top8 = (draftTeams || teams).slice(0, 8);
      const selectedTokens = top8.map(t => {
        const g = (t.groupName || '').trim();
        const m = g.match(/([A-L])\s*$/i);
        const letter = m ? m[1].toUpperCase() : (g.slice(-1) || '').toUpperCase();
        return `3${letter}`;
      }).map(s => s.trim().toUpperCase());
      console.log('Save: using top 8 third-place tokens for mapping:', selectedTokens);
      if (combos) {
        // find matching row in combos
        let matched: { mapping: Record<string,string>; option: string } | null = null;
        for (const row of combos) {
          const cols = Object.keys(row).filter(k => k !== 'Option').map(k => row[k] as string);
          const a = cols.slice().sort().join(',');
          const b = selectedTokens.slice().sort().join(',');
          if (a === b) {
            const mapping: Record<string,string> = {};
            Object.keys(row).forEach(k => { if (k !== 'Option') mapping[k] = row[k] as string; });
            matched = { mapping, option: String(row.Option || '') };
            break;
          }
        }

        if (matched) {
          setMapping(matched.mapping);
          setOption(matched.option);
          const winners = SLOT_ORDER.map(slot => ({ slot, team: getCurrentGroupWinner(slot.slice(1)) }));
          const matchups = SLOT_ORDER.filter(s => !!matched.mapping[s]).map(slot => {
              const token = String(matched.mapping[slot] || '').trim().toUpperCase();
                const resolvedOpponent = resolveTokenToTeam(token, draftTeams.slice(0,8));
              const winnerObj = winners.find(w => w.slot === slot) || { slot, team: { name: slot, flag: '' } };
                return { slot, winner: { name: winnerObj.team.name, flag: winnerObj.team.flag || '' }, opponent: resolvedOpponent ? { name: (resolvedOpponent as Team).name, flag: (resolvedOpponent as Team).flag || '' } : { name: token, flag: '' } };
            });
            setMatchups(matchups);
            try { localStorage.setItem('round32_matchups', JSON.stringify({ option: matched.option, mapping: matched.mapping, matchups })); } catch {
              /* ignore */
            }
            navigate('/round-of-32', { state: { matchups, mapping: matched.mapping, option: matched.option } });
            return;
          }
      }
    } catch (e) {
      // ignore runtime errors
      console.debug('saveAndProceed error', e);
    }
    // Fallback: if we didn't find a mapping above, build naive matchups
    const winners = SLOT_ORDER.map(slot => ({ slot, team: getGroupWinner(slot.slice(1)) }));
    const naive = (teams || []).slice(0, 8).map((t, idx) => ({ slot: SLOT_ORDER[idx], winner: winners[idx], opponent: { name: t.name, flag: t.flag || '' } }));
    try { localStorage.setItem('round32_matchups', JSON.stringify({ option: null, mapping: null, matchups: naive })); } catch {
      /* ignore */
    }
    navigate('/round-of-32', { state: { matchups: naive, mapping: null, option: null } });
  };

  return (
    <div className="replica-page">
      <Seo
        title="Third Place — WorldCup 2026"
        description="Reorder and pin third-place teams to build the Round-of-32 bracket for the World Cup 2026 replica."
        url="/third-place"
        image="/image.png"
        keywords="third place, World Cup, bracket, round of 32"
        tags={["worldcup","third place","world cup predictor","soccer","football bracket"]}
      />
      <header className="replica-header">
        <div className="replica-left">
          <Link to="/" className="back-link">
            <span className="back-icon">←</span>
            <span className="back-text">Back</span>
          </Link>
          <div>
            <h2 className="replica-title">Third Place</h2>
            <p className="replica-sub">Reorder third-place teams</p>
          </div>
        </div>
      </header>

      <main style={{ marginTop: 20 }}>
        {teams.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              <button className="nav-button" onClick={() => setLocked(s => !s)}>{locked ? 'Unlock Table' : 'Pin Third-Place Teams'}</button>
              <span style={{ alignSelf: 'center', color: '#666' }}>{locked ? 'Third-place teams are pinned.' : 'Teams are reorderable.'}</span>
            </div>
            <GroupTable
              group={{ name: 'Third Place Table', teams }}
              onOrderChange={handleOrderChange}
              lockAll={locked}
            />
          </>
        ) : (
          <div className="card">
            <p>No third-place teams found — go back and open the Third Place selector from the groups page.</p>
          </div>
        )}

        <div className="nav-actions" style={{ marginTop: 16 }}>
          <button className="nav-button" onClick={saveAndProceed}>Save & Proceed to Round of 32</button>
          <Link to="/" className="nav-button">Cancel</Link>
        </div>
      </main>
    </div>
  );
}
