import './App.css';
import { useState } from 'react';
import GroupTable from './components/GroupTable';
import ThemeToggle from './components/ThemeToggle';
// import ThirdPlaceModal from './components/ThirdPlaceModal';
import ThirdPlacePage from './components/ThirdPlacePage';
import { worldCupGroups } from './data/groups';
import type { Team } from './types/worldcup';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoundOf32 from './components/RoundOf32';

function HomeContent() {
  const [groupTeamOrders, setGroupTeamOrders] = useState<Record<string, (Team & { uniqueId: string })[]>>({});
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
    setGroupTeamOrders(prev => ({
      ...prev,
      [groupName]: teams
    }));
  };

  

  const navigateToThirdPlace = () => {
    // persist draft so the page can read it
    try { localStorage.setItem('thirdPlaceDraft', JSON.stringify(thirdPlaceTeams)); } catch {}
    // navigate to dedicated page
    window.location.href = '/third-place';
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
        {worldCupGroups.map((group) => (
          <GroupTable
            key={group.name}
            group={group}
            onOrderChange={(teams) => handleGroupOrderChange(group.name, teams)}
          />
        ))}
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
    <Router>
      <Routes>
        <Route path="/" element={<HomeContent />} />
        <Route path="/third-place" element={<ThirdPlacePage />} />
        <Route path="/round-of-32" element={<RoundOf32 />} />
      </Routes>
    </Router>
  );
}

