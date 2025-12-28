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
  const handleClose = () => {
    try {
      // persist the current third place order so Round of 32 can read it
        localStorage.setItem('thirdPlaceOrder', JSON.stringify(thirdPlaceTeams));
        // also determine combo mapping from available combinations
        (async () => {
          try {
            const res = await fetch('/group_combinations.csv');
            const text = await res.text();
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const header = lines[0].split(',').slice(1).map(h => h.trim()); // e.g. ["1A","1B",...]
            // selected tokens from modal (e.g. "3E")
            const selectedTokens = thirdPlaceTeams.map(t => {
              const g = t.groupName || '';
              const m = g.match(/([A-L])\s*$/);
              return m ? `3${m[1]}` : `3${g.slice(-1)}`;
            });

            // find first row where the multiset of tokens equals selectedTokens (order ignored)
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').slice(1).map(c => c.trim());
              // compare as multisets
              const a = cols.slice().sort().join(',');
              const b = selectedTokens.slice().sort().join(',');
              if (a === b) {
                // build mapping header->token
                const mapping: Record<string, string> = {};
                header.forEach((h, idx) => mapping[h] = cols[idx]);
                localStorage.setItem('round32_mapping', JSON.stringify(mapping));
                break;
              }
            }
          } catch (e) {
            // ignore
          }
        })();
    } catch (e) {
    console.log(e)
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Third Place Table</h2>
          <button className="close-button" onClick={handleClose}>×</button>
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