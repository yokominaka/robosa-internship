import React from 'react';
import type { PlacedComponent } from '../simulator/core/circuitValidator';

interface MissionKitTrayProps {
  placedComponents: PlacedComponent[];
  onAddComponent: (type: 'led' | 'resistor' | 'pushbutton', color?: string) => void;
  onLoadReferenceWiring: () => void;
  onClearWorkbench: () => void;
}

export const MissionKitTray: React.FC<MissionKitTrayProps> = ({
  placedComponents,
  onAddComponent,
  onLoadReferenceWiring,
  onClearWorkbench,
}) => {
  // Compute remaining kit inventory
  const redPlaced = placedComponents.filter((c) => c.type === 'led' && c.color === 'red').length;
  const yellowPlaced = placedComponents.filter((c) => c.type === 'led' && c.color === 'yellow').length;
  const greenPlaced = placedComponents.filter((c) => c.type === 'led' && c.color === 'green').length;
  const resistorsPlaced = placedComponents.filter((c) => c.type === 'resistor').length;
  const buttonsPlaced = placedComponents.filter((c) => c.type === 'pushbutton').length;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      {/* Kit Title and Inventory Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            marginRight: '4px',
          }}
        >
          Mission Kit:
        </span>

        {/* Red LED Button */}
        <button
          onClick={() => onAddComponent('led', 'red')}
          disabled={redPlaced >= 1}
          title={redPlaced >= 1 ? 'Red LED already on workbench' : 'Click to place Red LED'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: redPlaced >= 1 ? '#141a13' : '#1c261a',
            border: `1px solid ${redPlaced >= 1 ? 'var(--border-subtle)' : '#ff5f5f66'}`,
            borderRadius: '4px',
            padding: '5px 10px',
            color: redPlaced >= 1 ? 'var(--text-dim)' : 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: redPlaced >= 1 ? 'not-allowed' : 'pointer',
            opacity: redPlaced >= 1 ? 0.5 : 1,
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff4d4d' }} />
          <span>Red LED</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            ({1 - redPlaced}/1)
          </span>
        </button>

        {/* Yellow LED Button */}
        <button
          onClick={() => onAddComponent('led', 'yellow')}
          disabled={yellowPlaced >= 1}
          title={yellowPlaced >= 1 ? 'Yellow LED already on workbench' : 'Click to place Yellow LED'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: yellowPlaced >= 1 ? '#141a13' : '#1c261a',
            border: `1px solid ${yellowPlaced >= 1 ? 'var(--border-subtle)' : '#ffc04d66'}`,
            borderRadius: '4px',
            padding: '5px 10px',
            color: yellowPlaced >= 1 ? 'var(--text-dim)' : 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: yellowPlaced >= 1 ? 'not-allowed' : 'pointer',
            opacity: yellowPlaced >= 1 ? 0.5 : 1,
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffc04d' }} />
          <span>Yellow LED</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            ({1 - yellowPlaced}/1)
          </span>
        </button>

        {/* Green LED Button */}
        <button
          onClick={() => onAddComponent('led', 'green')}
          disabled={greenPlaced >= 1}
          title={greenPlaced >= 1 ? 'Green LED already on workbench' : 'Click to place Green LED'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: greenPlaced >= 1 ? '#141a13' : '#1c261a',
            border: `1px solid ${greenPlaced >= 1 ? 'var(--border-subtle)' : '#5fd38d66'}`,
            borderRadius: '4px',
            padding: '5px 10px',
            color: greenPlaced >= 1 ? 'var(--text-dim)' : 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: greenPlaced >= 1 ? 'not-allowed' : 'pointer',
            opacity: greenPlaced >= 1 ? 0.5 : 1,
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#5fd38d' }} />
          <span>Green LED</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            ({1 - greenPlaced}/1)
          </span>
        </button>

        {/* 220Ω Resistor Button */}
        <button
          onClick={() => onAddComponent('resistor')}
          disabled={resistorsPlaced >= 3}
          title={resistorsPlaced >= 3 ? 'All 3 resistors placed' : 'Click to place 220Ω Resistor'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: resistorsPlaced >= 3 ? '#141a13' : '#1c261a',
            border: `1px solid ${resistorsPlaced >= 3 ? 'var(--border-subtle)' : 'var(--border-active)'}`,
            borderRadius: '4px',
            padding: '5px 10px',
            color: resistorsPlaced >= 3 ? 'var(--text-dim)' : 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: resistorsPlaced >= 3 ? 'not-allowed' : 'pointer',
            opacity: resistorsPlaced >= 3 ? 0.5 : 1,
          }}
        >
          <span>⚡</span>
          <span>220Ω Resistor</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            ({3 - resistorsPlaced}/3)
          </span>
        </button>

        {/* Pushbutton */}
        <button
          onClick={() => onAddComponent('pushbutton', 'blue')}
          disabled={buttonsPlaced >= 1}
          title={buttonsPlaced >= 1 ? 'Pushbutton already placed' : 'Click to place Crosswalk Pushbutton'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: buttonsPlaced >= 1 ? '#141a13' : '#1c261a',
            border: `1px solid ${buttonsPlaced >= 1 ? 'var(--border-subtle)' : '#38bdf866'}`,
            borderRadius: '4px',
            padding: '5px 10px',
            color: buttonsPlaced >= 1 ? 'var(--text-dim)' : 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: buttonsPlaced >= 1 ? 'not-allowed' : 'pointer',
            opacity: buttonsPlaced >= 1 ? 0.5 : 1,
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#38bdf8' }} />
          <span>Pushbutton</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            ({1 - buttonsPlaced}/1)
          </span>
        </button>
      </div>

      {/* Instructor / Testing Helper Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onLoadReferenceWiring}
          title="Instructor Test Helper: Instantly assemble and wire verified reference crosswalk circuit"
          style={{
            backgroundColor: 'rgba(198, 255, 0, 0.08)',
            border: '1px solid rgba(198, 255, 0, 0.3)',
            borderRadius: '4px',
            padding: '5px 10px',
            color: 'var(--volt-lime)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ⚡ Load Reference Wiring
        </button>

        <button
          onClick={onClearWorkbench}
          title="Remove all placed components and wires from workbench"
          style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '5px 8px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};
