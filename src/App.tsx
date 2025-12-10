import './App.css';
import GroupTable from './components/GroupTable';
import { worldCupGroups } from './data/groups';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>FIFA World Cup 2026 Groups</h1>
        <p className="subtitle">Group Stage Draw - Drag to Reorder Teams!</p>
      </header>
      
      <div className="groups-grid">
        {worldCupGroups.map((group) => (
          <GroupTable key={group.name} group={group} />
        ))}
      </div>
    </div>
  );
}

export default App;
