import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { worldCupGroups } from '../data/groups';
import type { Team } from '../types/worldcup';
import './RoundOf32.css';

type StoredTeam = Team & { groupName?: string };

const slotOrder = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'];

function getGroupWinner(letter: string) {
  const group = worldCupGroups.find(g => g.name.endsWith(letter));
  return group?.teams?.[0] || { name: `Winner ${letter}`, flag: '' };
}

export default function RoundOf32() {
  const [thirdPlaces, setThirdPlaces] = useState<StoredTeam[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('thirdPlaceOrder');
      if (raw) {
        setThirdPlaces(JSON.parse(raw));
      }
    } catch (e) {
      setThirdPlaces([]);
    }
  }, []);

  // Redirect back to home if user hasn't selected third-place teams yet
  useEffect(() => {
    const raw = localStorage.getItem('thirdPlaceOrder');
    if (!raw) {
      // small delay so users see a message briefly if they navigated manually
      const t = setTimeout(() => navigate('/'), 50);
      return () => clearTimeout(t);
    }
  }, [navigate]);

  // Load mapping if present (header -> token like '3E')
  const [mapping, setMapping] = useState<Record<string,string> | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('round32_mapping');
      if (raw) setMapping(JSON.parse(raw));
    } catch { setMapping(null); }
  }, []);

  // Build matches using mapping if available, otherwise fallback to naive index pairing
  const matches = slotOrder.map((slot, idx) => {
    const winner = getGroupWinner(slot.slice(1));
    let opponent: StoredTeam | { name: string; flag?: string } = { name: 'TBD', flag: '' };
    if (mapping && mapping[slot]) {
      const token = mapping[slot]; // e.g. '3E'
      const letter = token.replace(/[^A-Z]/g, '');
      const found = thirdPlaces.find(t => (t.groupName || '').includes(letter));
      if (found) opponent = found;
      else opponent = { name: token, flag: '' };
    } else {
      opponent = thirdPlaces[idx] || { name: 'TBD', flag: '' };
    }
    return { slot, winner, opponent };
  });

  return (
    <div className="replica-page">
      <header className="replica-header">
        <div className="replica-left">
          <h2 className="replica-title">Round of 32</h2>
          <p className="replica-sub">Matches generated from the third-place table (stored order).</p>
        </div>
      </header>

      <main style={{ marginTop: 20 }}>
        <section className="card-list">
          {matches.map((m, i) => (
            <div key={i} className="card">
              <h3>Match {i + 1} — {m.slot}</h3>
              <p><strong>{m.winner.flag || ''} {m.winner.name}</strong> vs <strong>{m.opponent.flag || ''} {m.opponent.name}</strong></p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
