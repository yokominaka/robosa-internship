import React, { useEffect } from 'react';
import type { CircuitWire } from '../simulator/core/circuitValidator';

export interface PinAnchor {
  componentId: string;
  pinName: string;
  x: number;
  y: number;
  label: string;
}

interface WireOverlayProps {
  wires: CircuitWire[];
  pins: Map<string, PinAnchor>;
  activeWireFrom: PinAnchor | null;
  mousePos: { x: number; y: number } | null;
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
  onDeleteWire: (id: string) => void;
  currentWireColor: string;
}

// Generate natural curved jumper wire path
function createWirePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);

  // Sag / bend offset proportional to distance
  const sag = Math.min(Math.max(dist * 0.25, 20), 80);

  // Control points
  const cx1 = x1 + dx * 0.25;
  const cy1 = y1 + dy * 0.25 + sag;
  const cx2 = x1 + dx * 0.75;
  const cy2 = y1 + dy * 0.75 + sag;

  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

export const WireOverlay: React.FC<WireOverlayProps> = ({
  wires,
  pins,
  activeWireFrom,
  mousePos,
  selectedWireId,
  onSelectWire,
  onDeleteWire,
  currentWireColor,
}) => {
  // Listen for delete/backspace key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedWireId) {
        onDeleteWire(selectedWireId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWireId, onDeleteWire]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'visible',
      }}
    >
      <defs>
        <filter id="robosa-wire-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Render Committed Wires */}
      {wires.map((wire) => {
        const keyA = `${wire.from.componentId}:${wire.from.pinName}`;
        const keyB = `${wire.to.componentId}:${wire.to.pinName}`;
        const pinA = pins.get(keyA);
        const pinB = pins.get(keyB);

        if (!pinA || !pinB) return null;

        const pathD = createWirePath(pinA.x, pinA.y, pinB.x, pinB.y);
        const isSelected = selectedWireId === wire.id;

        return (
          <g key={wire.id} style={{ pointerEvents: 'stroke', cursor: 'pointer' }}>
            {/* Click hit area */}
            <path
              d={pathD}
              stroke="transparent"
              strokeWidth="14"
              fill="none"
              onClick={(e) => {
                e.stopPropagation();
                onSelectWire(isSelected ? null : wire.id);
              }}
            />

            {/* Wire Shadow */}
            <path
              d={pathD}
              stroke="#000000"
              strokeWidth="5.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Main Wire Conductor */}
            <path
              d={pathD}
              stroke={wire.color}
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
              filter="url(#robosa-wire-glow)"
              onClick={(e) => {
                e.stopPropagation();
                onSelectWire(isSelected ? null : wire.id);
              }}
            />

            {/* Selection Highlight */}
            {isSelected && (
              <path
                d={pathD}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="4,4"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}

      {/* Live In-Progress Wire Drawing */}
      {activeWireFrom && mousePos && (
        <g style={{ pointerEvents: 'none' }}>
          <path
            d={createWirePath(activeWireFrom.x, activeWireFrom.y, mousePos.x, mousePos.y)}
            stroke="#000000"
            strokeWidth="5"
            fill="none"
            opacity="0.7"
          />
          <path
            d={createWirePath(activeWireFrom.x, activeWireFrom.y, mousePos.x, mousePos.y)}
            stroke={currentWireColor}
            strokeWidth="3.5"
            strokeDasharray="5,3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
};
