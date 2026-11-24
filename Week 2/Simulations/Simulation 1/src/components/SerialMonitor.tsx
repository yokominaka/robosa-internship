import React, { useState, useEffect, useRef } from 'react';

interface SerialMonitorProps {
  logs: string[];
  onClear: () => void;
  baudRate?: number;
}

export const SerialMonitor: React.FC<SerialMonitorProps> = ({
  logs,
  onClear,
  baudRate = 9600,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && !collapsed) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, collapsed]);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {/* Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: '#111710',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
          fontSize: '12px',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>📟</span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.04em' }}>
            UART Serial Monitor
          </strong>
          <span
            style={{
              padding: '2px 6px',
              backgroundColor: '#1b2619',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              fontSize: '10px',
              color: 'var(--cyan-telemetry)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {baudRate} baud
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
            ({logs.length} line{logs.length === 1 ? '' : 's'})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!collapsed && (
            <>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Autoscroll
              </label>

              <button
                onClick={onClear}
                style={{
                  backgroundColor: '#222b35',
                  color: 'var(--text)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand Serial Monitor' : 'Collapse Serial Monitor'}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              padding: '2px 6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {collapsed ? '▲ Expand' : '▼ Collapse'}
          </button>
        </div>
      </div>

      {/* Terminal Content Box */}
      {!collapsed && (
        <pre
          style={{
            margin: 0,
            padding: '12px 14px',
            height: '160px',
            overflowY: 'auto',
            backgroundColor: 'var(--serial-bg)',
            color: '#4af688',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: '12.5px',
            lineHeight: '19px',
            boxSizing: 'border-box',
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
              [Serial Monitor ready at {baudRate} baud. Awaiting UART transmission...]
            </span>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ wordBreak: 'break-all' }}>
                <span style={{ color: '#556575', marginRight: '8px', userSelect: 'none' }}>
                  {String(index + 1).padStart(3, ' ')} |
                </span>
                {log}
              </div>
            ))
          )}
          <div ref={endRef} />
        </pre>
      )}
    </div>
  );
};
