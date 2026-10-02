import { useRef, useState } from 'react';
import { Point, Viewport, Wall } from '../types';
import { dist, projectPointOnSegment, wallPolygon } from '../utils/geometry';
import { ENDPOINT_SNAP_PX, TJUNCTION_SNAP_PX } from '../constants/snapping';
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
    if (panning) {
      setViewport({ 
        ...viewport,
        x: viewport.x + (e.clientX - lastPos.current.x),
        y: viewport.y + (e.clientY - lastPos.current.y),
      });
      lastPos.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (!drag) return;
    onMoveEndpoint(drag.id, drag.which, snapDrag(toWorld(e)));
  };

  // Resolve the final world-space position for a dragged endpoint: snap to a
  // nearby endpoint if any is in range, otherwise fall back to a T-junction
  // snap onto the nearest wall centerline. Thresholds are in screen pixels
  // and converted to world units via the current zoom so snapping behaves
  // the same at any zoom level. The wall being dragged never snaps to itself.
  const snapDrag = (p: Point): Point => {
    if (!drag) return p;
    const endpointSnap = ENDPOINT_SNAP_PX / viewport.scale;
    const tjunctionSnap = TJUNCTION_SNAP_PX / viewport.scale;

    let bestEndpoint: { point: Point; distance: number } | null = null;
    let bestCenterline: { point: Point; distance: number } | null = null;

    for (const w of walls) {
      if (w.id === drag.id) continue;

      const dStart = dist(p, w.start);
      if (dStart < endpointSnap && (!bestEndpoint || dStart < bestEndpoint.distance)) {
        bestEndpoint = { point: { x: w.start.x, y: w.start.y }, distance: dStart };
      }

      const dEnd = dist(p, w.end);
      if (dEnd < endpointSnap && (!bestEndpoint || dEnd < bestEndpoint.distance)) {
        bestEndpoint = { point: { x: w.end.x, y: w.end.y }, distance: dEnd };
      }

      // skip centerline work once an endpoint is in range; endpoints win
      if (bestEndpoint) continue;

      const proj = projectPointOnSegment(p, w.start, w.end);
      if (proj.distance < tjunctionSnap && (!bestCenterline || proj.distance < bestCenterline.distance)) {
        bestCenterline = proj;
      }
    }

    if (bestEndpoint) return bestEndpoint.point;
    if (bestCenterline) return bestCenterline.point;
    return p;
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
        className={drag ? 'editor-svg dragging' : 'editor-svg'}
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
                className="drag-handle"
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
                className="drag-handle"
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
