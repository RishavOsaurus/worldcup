import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Group, Team } from '../types/worldcup';
import './GroupTable.css';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GroupTableProps {
  group: Group;
}

interface SortableTeamRowProps {
  team: Team;
  index: number;
  id: string;
}

const DragHandle = ({ style }: { style?: CSSProperties }) => (
  <span style={{ ...style, cursor: 'move', userSelect: 'none' }}>⠿</span>
);

const SortableTeamRow = ({ team, index, id }: SortableTeamRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={team.isPlayoff ? 'playoff-row' : ''}
    >
      <td className="position">{index + 1}</td>
      <td className="drag-handle" {...attributes} {...listeners}>
        <DragHandle />
      </td>
      <td className="team-name">
        {team.flag && <span className="flag">{team.flag}</span>}
        <span className={team.isPlayoff ? 'playoff-text' : ''}>
          {team.name}
        </span>
      </td>
    </tr>
  );
};

export default function GroupTable({ group }: GroupTableProps) {
  // Add stable IDs to teams when component mounts
  const [teams, setTeams] = useState<(Team & { uniqueId: string })[]>(() =>
    group.teams.map((team, idx) => ({ ...team, uniqueId: `${group.name}-${idx}` }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setTeams((items) => {
      const oldIndex = items.findIndex((item) => item.uniqueId === active.id);
      const newIndex = items.findIndex((item) => item.uniqueId === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return (
    <div className="group-card">
      <div className="group-header">
        <h2>{group.name}</h2>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="group-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th style={{ width: '50px' }}>⠿</th>
              <th>Team</th>
            </tr>
          </thead>
          <SortableContext
            items={teams.map((team) => team.uniqueId)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {teams.map((team, index) => (
                <SortableTeamRow
                  key={team.uniqueId}
                  id={team.uniqueId}
                  team={team}
                  index={index}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}
