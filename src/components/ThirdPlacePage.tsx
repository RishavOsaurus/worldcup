import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GroupTable from './GroupTable';
import type { Team } from '../types/worldcup';

export default function ThirdPlacePage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<(Team & { groupName?: string })[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('thirdPlaceDraft');
      if (raw) setTeams(JSON.parse(raw));
    } catch (e) {
      setTeams([]);
    }
  }, []);

  const handleOrderChange = (newTeams: (Team & { groupName?: string })[]) => {
    setTeams(newTeams);
    try { localStorage.setItem('thirdPlaceDraft', JSON.stringify(newTeams)); } catch {}
  };

  const saveAndProceed = async () => {
    try {
      localStorage.setItem('thirdPlaceOrder', JSON.stringify(teams));
      // try to match combo mapping like before
      const res = await fetch('/group_combinations.csv');
      const text = await res.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const header = lines[0].split(',').slice(1).map(h => h.trim());
      const selectedTokens = teams.map(t => {
        const g = t.groupName || '';
        const m = g.match(/([A-L])\s*$/);
        return m ? `3${m[1]}` : `3${g.slice(-1)}`;
      });
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').slice(1).map(c => c.trim());
        const a = cols.slice().sort().join(',');
        const b = selectedTokens.slice().sort().join(',');
        if (a === b) {
          const mapping: Record<string,string> = {};
          header.forEach((h, idx) => mapping[h] = cols[idx]);
          localStorage.setItem('round32_mapping', JSON.stringify(mapping));
          break;
        }
      }
    } catch (e) {
      // ignore
    }
    navigate('/round-of-32');
  };

  return (
    <div className="replica-page">
      <header className="replica-header">
        <div className="replica-left">
          <h2 className="replica-title">Third Place Selector</h2>
          <p className="replica-sub">Reorder third-place teams for Round of 32 assignment.</p>
        </div>
        <div style={{display:'flex', gap:12}}>
          <Link to="/" className="replica-cta">Back</Link>
        </div>
      </header>

      <main style={{ marginTop: 20 }}>
        {teams.length > 0 ? (
          <GroupTable
            group={{ name: 'Third Place Table', teams }}
            onOrderChange={handleOrderChange}
          />
        ) : (
          <div className="card">
            <p>No third-place teams found — go back and open the Third Place selector from the groups page.</p>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <button className="nav-button" onClick={saveAndProceed}>Save & Proceed to Round of 32</button>
          <Link to="/" className="nav-button">Cancel</Link>
        </div>
      </main>
    </div>
  );
}
