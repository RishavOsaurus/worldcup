import './App.css';
import { useState } from 'react';
import GroupTable from './components/GroupTable';
import ThemeToggle from './components/ThemeToggle';
import ThirdPlaceModal from './components/ThirdPlaceModal';
import { worldCupGroups } from './data/groups';
import type { Team } from './types/worldcup';

function App() {
  const [groupTeamOrders, setGroupTeamOrders] = useState<Record<string, (Team & { uniqueId: string })[]>>({});
  const [thirdPlaceTeamOrder, setThirdPlaceTeamOrder] = useState<(Team & { groupName: string; uniqueId: string })[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get third place teams from current group orders
  const defaultThirdPlaceTeams = worldCupGroups
    .map(group => {
      const orderedTeams = groupTeamOrders[group.name];
      if (orderedTeams && orderedTeams.length >= 3) {
        return { ...orderedTeams[2], groupName: group.name }; // 3rd place (index 2)
      }
      // Default to original 3rd place if no reordering has happened
      return group.teams.length >= 3 ? { ...group.teams[2], groupName: group.name } : null;
    })
    .filter(Boolean) as (Team & { groupName: string })[];

  // Use custom order if available, otherwise use default
  const thirdPlaceTeams = thirdPlaceTeamOrder.length > 0 
    ? thirdPlaceTeamOrder
    : defaultThirdPlaceTeams;

  const handleGroupOrderChange = (groupName: string, teams: (Team & { uniqueId: string })[]) => {
    setGroupTeamOrders(prev => ({
      ...prev,
      [groupName]: teams
    }));
  };

  const handleThirdPlaceOrderChange = (teams: (Team & { uniqueId: string })[]) => {
    // Since we're not formatting the names anymore, we can directly use the teams
    // but we need to preserve the groupName information
    const teamsWithGroupInfo = teams.map(team => {
      // Find the original team data to get the groupName
      const originalTeam = defaultThirdPlaceTeams.find(t => t.name === team.name);
      return {
        ...team,
        groupName: originalTeam?.groupName || ''
      };
    });
    setThirdPlaceTeamOrder(teamsWithGroupInfo);
  };

  const handleNext = () => {
    setIsModalOpen(true);
  };
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>FIFA World Cup 2026 Groups</h1>
            <p className="subtitle">Group Stage Draw - Drag to Reorder Teams!</p>
          </div>
          <ThemeToggle />
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
        <button className="nav-button" onClick={handleNext}>
          Third Place Table →
        </button>
      </div>

      <ThirdPlaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        thirdPlaceTeams={thirdPlaceTeams}
        onOrderChange={handleThirdPlaceOrderChange}
      />
    </div>
  );
}

export default App;
