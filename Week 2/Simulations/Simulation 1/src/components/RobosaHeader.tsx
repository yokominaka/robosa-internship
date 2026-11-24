import React from 'react';

interface RobosaHeaderProps {
  compileState: {
    state: 'idle' | 'compiling' | 'success' | 'error';
    cached?: boolean;
    duration?: number;
  };
  isRunning: boolean;
  cpuCycles?: number;
}

export const RobosaHeader: React.FC<RobosaHeaderProps> = ({
  compileState,
  isRunning,
  cpuCycles = 0,
}) => {
  return (
    <header
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      {/* Left: Brand Wordmark + Mission Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Radar Icon & Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--volt-lime)" strokeWidth="1.5" strokeOpacity="0.4" />
            <circle cx="12" cy="12" r="6" stroke="var(--volt-lime)" strokeWidth="1.5" strokeOpacity="0.7" />
            <circle cx="12" cy="12" r="2" fill="var(--volt-lime)" />
            <line x1="12" y1="2" x2="12" y2="22" stroke="var(--volt-lime)" strokeWidth="1" strokeOpacity="0.2" />
            <line x1="2" y1="12" x2="22" y2="12" stroke="var(--volt-lime)" strokeWidth="1" strokeOpacity="0.2" />
          </svg>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '15px', letterSpacing: '0.08em' }}>
            <span style={{ color: '#ffffff' }}>ROBO</span>
            <span style={{ color: 'var(--volt-lime)' }}>SA</span>
          </div>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Mission Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            C1-M6 • SMART CROSSWALK
          </span>
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: '#182216',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              fontSize: '10px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            HIL SIMULATION
          </span>
        </div>
      </div>

      {/* Middle: Badges (XP & Cadet Rank) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* XP Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(250, 204, 21, 0.08)',
            border: '1px solid rgba(250, 204, 21, 0.3)',
            padding: '3px 9px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--amber-xp)',
          }}
        >
          <span>★</span>
          <span>XP 400</span>
        </div>

        {/* Rank Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '3px 9px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--cyan-telemetry)',
          }}
        >
          <span style={{ fontSize: '9px', opacity: 0.7 }}>RANK</span>
          <span>Circuit Cadet</span>
        </div>
      </div>

      {/* Right: Telemetry & Compiler Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Engine Hertz / Cycles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isRunning ? 'var(--volt-lime)' : 'var(--text-dim)',
              boxShadow: isRunning ? '0 0 6px var(--volt-lime)' : 'none',
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>16 MHz</span>
          <span style={{ color: 'var(--text-dim)' }}>|</span>
          <span style={{ color: 'var(--text-muted)' }}>{cpuCycles.toLocaleString()} cycles</span>
        </div>

        {/* Compiler Cache Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            backgroundColor:
              compileState.state === 'error'
                ? 'rgba(239, 68, 68, 0.12)'
                : compileState.state === 'success'
                ? 'rgba(198, 255, 0, 0.1)'
                : compileState.state === 'compiling'
                ? 'rgba(56, 189, 248, 0.12)'
                : '#141a13',
            border: `1px solid ${
              compileState.state === 'error'
                ? 'var(--crimson-fault)'
                : compileState.state === 'success'
                ? 'var(--volt-lime)'
                : compileState.state === 'compiling'
                ? 'var(--cyan-telemetry)'
                : 'var(--border-subtle)'
            }`,
            color:
              compileState.state === 'error'
                ? 'var(--crimson-fault)'
                : compileState.state === 'success'
                ? 'var(--volt-lime)'
                : compileState.state === 'compiling'
                ? 'var(--cyan-telemetry)'
                : 'var(--text-muted)',
          }}
        >
          {compileState.state === 'compiling' && 'COMPILING...'}
          {compileState.state === 'success' && (
            <span>
              {compileState.cached ? '⚡ CACHED' : '🔨 FRESH'}
              {compileState.duration !== undefined ? ` • ${compileState.duration}ms` : ''}
            </span>
          )}
          {compileState.state === 'error' && 'BUILD ERROR'}
          {compileState.state === 'idle' && 'SYSTEM READY'}
        </div>
      </div>
    </header>
  );
};
