import { Wall } from '../types';
import './SidePanel.css';

interface SidePanelProps {
  walls: Wall[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onThickness: (id: string, thickness: number) => void;
}

export function SidePanel({ walls, selectedId, onSelect, onThickness }: SidePanelProps) {
  const selected = walls.find((w) => w.id === selectedId);

  // input for editing the thickness of the selected wall
  const ThicknessField = () => {
    if (!selected) return null;
    return (
      <input
        type="number"
        step="0.05"
        value={selected.thickness}
        onChange={(e) => onThickness(selected.id, parseFloat(e.target.value) || 0)}
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid #ccc',
          borderRadius: 4,
          boxSizing: 'border-box',
          background: '#ffffff',
        }}
      />
    );
  };

  return (
    <div className="panel" style={{ background: '#ececec', paddingTop: 6 }}>
      <h2>Walls</h2>
      <div>
        {walls.map((w, i) => (
          <div
            key={i}
            className={w.id === selectedId ? 'row selected' : 'row'}
            onClick={() => onSelect(w.id)}
          >
            {w.id} — {w.length.toFixed(1)} ft
          </div>
        ))}
      </div>
      {selected && (
        <div>
          <div className="field-label">LENGTH</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
            {selected.length.toFixed(1)} ft
          </div>
          <div className="field-label">THICKNESS (FT)</div>
          <ThicknessField />
        </div>
      )}
    </div>
  );
}
