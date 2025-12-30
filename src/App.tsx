import './App.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThirdPlace } from './contexts/ThirdPlaceContext';
import GroupTable from './components/GroupTable';
import ThemeToggle from './components/ThemeToggle';
// import ThirdPlaceModal from './components/ThirdPlaceModal';
import ThirdPlacePage from './components/ThirdPlacePage';
import { worldCupGroups } from './data/groups';
import type { Team } from './types/worldcup';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoundOf32 from './components/RoundOf32';

function HomeContent() {
  const [groupTeamOrders, setGroupTeamOrders] = useState<Record<string, (Team & { uniqueId: string })[]>>(() => {
    try {
      const raw = localStorage.getItem('groupTeamOrders');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  // modal removed in favor of full page selector

  const defaultThirdPlaceTeams = worldCupGroups
    .map(group => {
      const orderedTeams = groupTeamOrders[group.name];
      if (orderedTeams && orderedTeams.length >= 3) {
        return { ...orderedTeams[2], groupName: group.name };
      }
      return group.teams.length >= 3 ? { ...group.teams[2], groupName: group.name } : null;
    })
    .filter(Boolean) as (Team & { groupName: string })[];

  const thirdPlaceTeams = defaultThirdPlaceTeams;

  const handleGroupOrderChange = (groupName: string, teams: (Team & { uniqueId: string })[]) => {
    setGroupTeamOrders(prev => {
      const next = { ...prev, [groupName]: teams };
      // compute current third-place teams from updated orders
      try {
        const updatedThirds = worldCupGroups
          .map(g => {
            const ordered = next[g.name];
            if (ordered && ordered.length >= 3) return { ...ordered[2], groupName: g.name };
            return g.teams.length >= 3 ? { ...g.teams[2], groupName: g.name } : null;
          })
          .filter(Boolean) as (Team & { groupName: string })[];
        // update context immediately so Third Place selector reads latest
        try { setDraft(updatedThirds); setOrder(updatedThirds); } catch {}
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  

  const navigate = useNavigate();
  const { setDraft, setOrder } = useThirdPlace();

  // persist group orders so they survive route navigation
  useEffect(() => {
    try { localStorage.setItem('groupTeamOrders', JSON.stringify(groupTeamOrders)); } catch {}
  }, [groupTeamOrders]);

  const navigateToThirdPlace = () => {
    // write current third-place teams into context so the selector always has data
    try {
      setDraft(thirdPlaceTeams);
      setOrder(thirdPlaceTeams);
      // also keep localStorage backup for compatibility
      localStorage.setItem('thirdPlaceDraft', JSON.stringify(thirdPlaceTeams));
    } catch (e) {
      // ignore
    }
    navigate('/third-place');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>FIFA World Cup 2026 Groups</h1>
            <p className="subtitle">Group Stage Draw - Drag to Reorder Teams!</p>
          </div>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="groups-grid">
        {worldCupGroups.map((group) => {
          const overriddenTeams = groupTeamOrders[group.name] || group.teams;
          return (
            <GroupTable
              key={group.name}
              group={{ ...group, teams: overriddenTeams }}
              onOrderChange={(teams) => handleGroupOrderChange(group.name, teams)}
            />
          );
        })}
      </div>

      <div className="navigation-section bottom-nav">
        <button className="nav-button" onClick={navigateToThirdPlace}>
          Third Place Table →
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HomeContent />} />
        <Route path="/third-place" element={<ThirdPlacePage />} />
        <Route path="/round-of-32" element={<RoundOf32 />} />
      </Routes>
    </Router>
  );
}

