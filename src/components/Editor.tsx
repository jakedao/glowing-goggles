import { useRef, useState } from 'react';
import { Point, Viewport, Wall } from '../types';
import { dist, SNAP_DIST, wallPolygon } from '../utils/geometry';
import './Editor.css';

interface EditorProps {
  walls: Wall[];
  selectedId: string | null;
  tool: 'select' | 'pan';
  onSelect: (id: string | null) => void;
  onMoveEndpoint: (id: string, which: 'start' | 'end', p: Point) => void;
}

// distance from a point to a wall segment, used for hit testing
function pointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
}

export function Editor({ walls, selectedId, tool, onSelect, onMoveEndpoint }: EditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 80, y: 80, scale: 28 });
  const [drag, setDrag] = useState<{ id: string; which: 'start' | 'end' } | null>(null);
  const [panning, setPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // convert a mouse event to world coordinates
  const toWorld = (e: any): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - viewport.x) / viewport.scale,
      y: (e.clientY - rect.top - viewport.y) / viewport.scale,
    };
  };

  // zoom towards the mouse cursor
  const handleWheel = (e: any) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setViewport({
      scale: viewport.scale * factor,
      x: mx - (mx - viewport.x) * factor,
      y: my - (my - viewport.y) * factor,
    });
  };

  // when mouse clicked
  const handlePointerDown = (e: any) => {
    console.log('pointer down',e)
    if (tool === 'pan') {
      setPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  // when mouse moved
  const handlePointerMove = (e: any) => {
    console.log('pointer move',e)
    if (panning) {
      setViewport({ 
        ...viewport,
        x: viewport.x + (e.clientX - lastPos.current.x),
        y: viewport.y + (e.clientY - lastPos.current.y),
      });
      lastPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (drag) {
      let p = toWorld(e);
      // snap to nearby endpoints of other walls
      for (const w of walls) {
        if (w.id === drag.id) continue;
        if (dist(p, w.start) < SNAP_DIST) {
          p = { x: w.start.x, y: w.start.y };
        }
        if (dist(p, w.end) < SNAP_DIST) {
          p = { x: w.end.x, y: w.end.y };
        }
      }
      onMoveEndpoint(drag.id, drag.which, p);
    }
  };

  const handlePointerUp = () => {
    setPanning(false);
    setDrag(null);
  };

  // figure out which wall was clicked
  const handleClick = (e: any) => {
    if (tool !== 'select' || drag) return;
    const p = toWorld(e);
    let hit: string | null = null;
    for (const w of walls) {
      const d = pointToSegment(p.x, p.y, w.start.x, w.start.y, w.end.x, w.end.y);
      if (d < w.thickness / 2 + 0.15) {
        hit = w.id;
        break;
      }
    }
    onSelect(hit);
  };

  const selected = walls.find((w) => w.id === selectedId);

  return (
    <div className="editor">
      <svg
        ref={svgRef}
        className="editor-svg"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
      >
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
          {walls.map((w, i) => (
            <polygon
              key={i}
              points={wallPolygon(w)}
              fill={w.id === selectedId ? '#4a90d9' : '#555b63'}
              stroke={w.id === selectedId ? '#2f6cb0' : 'none'}
              strokeWidth={0.05}
            />
          ))}
          {selected && (
            <>
              <circle
                cx={selected.start.x}
                cy={selected.start.y}
                r={0.35}
                fill="#ffffff"
                stroke="#2f6cb0"
                strokeWidth={0.08}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDrag({ id: selected.id, which: 'start' });
                }}
              />
              <circle
                cx={selected.end.x}
                cy={selected.end.y}
                r={0.35}
                fill="#ffffff"
                stroke="#2f6cb0"
                strokeWidth={0.08}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDrag({ id: selected.id, which: 'end' });
                }}
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
