// ===================================
// IMPORTS SECTION
// ===================================

// LESSON: Only import what you use! Modern React doesn't need React imported for JSX
// We use 'useState' hook for state management
import { useState } from 'react';

// LESSON: When verbatimModuleSyntax is enabled in tsconfig, types must be imported separately
// This helps bundlers remove types at compile time
import type { CSSProperties } from 'react';

// LESSON: MUI v5 uses @mui/material (not 'material-ui')
// These are the modern table components from Material-UI v5
import {
  Table,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
  Paper,
  ThemeProvider,
  createTheme,
} from '@mui/material';

// LESSON: Colors in MUI v5 come from @mui/material/colors
import { blue } from '@mui/material/colors';

// LESSON: @dnd-kit is the modern replacement for react-sortable-hoc
// It's actively maintained and works with React 18/19
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

// ===================================
// THEME CONFIGURATION
// ===================================

// LESSON: createTheme replaces getMuiTheme in MUI v5
// The API is cleaner - use 'main' instead of 'primary1Color'
const theme = createTheme({
  palette: {
    primary: {
      main: blue[500],
    },
  },
});

// ===================================
// TYPE DEFINITIONS
// ===================================

// LESSON: Define interfaces for your data structures
// This gives you autocomplete and catches errors at compile time
interface Person {
  id: number;
  name: string;
  status: string;
}

// LESSON: Define props for components that receive data
interface SortableRowProps {
  person: Person;
}

// ===================================
// DRAG HANDLE COMPONENT
// ===================================

// LESSON: Explicit type for style prop prevents 'any' type errors
// CSSProperties is React's built-in type for inline styles
const DragHandle = ({ style }: { style?: CSSProperties }) => (
  <span style={{ ...style, cursor: 'move' }}>:::::</span>
);

// ===================================
// SORTABLE ROW COMPONENT
// ===================================

// LESSON: Modern functional component using @dnd-kit hooks
// useSortable provides all drag-and-drop functionality
const SortableRow = ({ person }: SortableRowProps) => {
  // This hook gives us drag capabilities for this row
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: person.id });

  // LESSON: CSS.Transform converts the transform object to a CSS string
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Make the row slightly transparent while dragging
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      {/* Drag handle cell - clicking here allows dragging */}
      <TableCell style={{ width: '5%' }} {...attributes} {...listeners}>
        <DragHandle />
      </TableCell>
      <TableCell>{person.id}</TableCell>
      <TableCell>{person.name}</TableCell>
      <TableCell>{person.status}</TableCell>
    </TableRow>
  );
};

// ===================================
// SORTABLE TABLE WRAPPER WITH DND
// ===================================

// LESSON: We need a functional component wrapper to use hooks (useSensors)
// Class components can't use hooks directly
const SortableTableWithDnd = () => {
  // This component holds the state now
  const [peoples, setPeoples] = useState<Person[]>([
    { id: 1, name: 'People 1', status: 'enabled' },
    { id: 2, name: 'People 2', status: 'disabled' },
    { id: 3, name: 'People 3', status: 'enabled' },
  ]);

  // LESSON: Sensors detect different input types (mouse, touch, keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // LESSON: Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setPeoples((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return (
    <Paper elevation={3} sx={{ padding: 2 }}>
      {/* LESSON: DndContext provides drag-and-drop functionality to children */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ width: '5%' }}>&nbsp;</TableCell>
              <TableCell>Id</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          {/* LESSON: SortableContext manages the sortable items */}
          {/* It needs an array of IDs and a sorting strategy */}
          <SortableContext
            items={peoples.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <TableBody>
              {peoples.map((person) => (
                <SortableRow key={person.id} person={person} />
              ))}
            </TableBody>
          </SortableContext>
        </Table>
      </DndContext>
    </Paper>
  );
};

// ===================================
// MAIN COMPONENT (DEFAULT EXPORT)
// ===================================

// LESSON: This is the main component exported from this file
// It wraps everything in ThemeProvider to apply MUI theme
const TableComponent = () => {
  return (
    <ThemeProvider theme={theme}>
      <div style={{ padding: '20px' }}>
        <h3>Material-UI Sortable Table with Drag-n-Drop Support</h3>
        <SortableTableWithDnd />
      </div>
    </ThemeProvider>
  );
};

export default TableComponent;