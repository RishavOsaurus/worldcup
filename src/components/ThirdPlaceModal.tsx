import type { Team } from '../types/worldcup';
import GroupTable from './GroupTable';
import './ThirdPlaceModal.css';

interface ThirdPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  thirdPlaceTeams: (Team & { groupName: string })[];
  onOrderChange?: (teams: (Team & { uniqueId: string })[]) => void;
}

export default function ThirdPlaceModal({
  isOpen,
  onClose,
  thirdPlaceTeams,
  onOrderChange,
}: ThirdPlaceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Third Place Table</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {thirdPlaceTeams.length > 0 ? (
            <GroupTable
              group={{
                name: 'Third Place Table',
                teams: thirdPlaceTeams
              }}
              onOrderChange={onOrderChange}
            />
          ) : (
            <div className="empty-state">
              <p>No teams available. Teams will appear here based on their position in group tables.</p>
              <p>Drag teams in the group tables above to change their rankings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}