import { Wall } from '../types';

interface ThicknessFieldProps {
  wall: Wall;
  onThickness: (id: string, thickness: number) => void;
}

export function ThicknessField({ wall, onThickness }: ThicknessFieldProps) {
  return (
    <input
      className="thickness-input"
      type="number"
      step="0.05"
      value={wall.thickness}
      onChange={(e) => onThickness(wall.id, parseFloat(e.target.value) || 0)}
    />
  );
}
