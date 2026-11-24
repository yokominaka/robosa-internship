import React, { useState } from 'react';

interface MissionTasksDrawerProps {
  task1Complete: boolean; // LEDs + Resistors on D13, D12, D11
  task2Complete: boolean; // Button on D2 and GND
  task3Complete: boolean; // Full crosswalk cycle executed
}

export const MissionTasksDrawer: React.FC<MissionTasksDrawerProps> = ({
  task1Complete,
  task2Complete,
  task3Complete,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = (task1Complete ? 1 : 0) + (task2Complete ? 1 : 0) + (task3Complete ? 1 : 0);

  const tasks = [
    {
      num: 1,
      title: 'Wire Vehicle LEDs & Resistors',
      desc: 'Place & wire Red, Yellow, and Green LEDs with 220Ω series resistors to D13, D12, D11 (and GND).',
      completed: task1Complete,
      active: !task1Complete,
      xp: '+150 XP',
    },
    {
      num: 2,
      title: 'Wire Crosswalk Pushbutton',
      desc: 'Wire the Crosswalk Pushbutton between pin D2 and Uno GND.',
      completed: task2Complete,
      active: task1Complete && !task2Complete,
      xp: '+150 XP',
    },
    {
      num: 3,
      title: 'Execute Crossing Cycle',
      desc: 'Compile firmware and press the button to execute a full Green → Yellow → Red crossing cycle.',
      completed: task3Complete,
      active: task1Complete && task2Complete && !task3Complete,
      xp: '+200 XP',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
        borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* Drawer Toggle Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#111710',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px' }}>📋</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
            }}
          >
            Mission Progression ({completedCount}/3 Completed)
          </span>

          {/* Mini Progress Bar */}
          <div
            style={{
              width: '80px',
              height: '6px',
              backgroundColor: '#1d271b',
              borderRadius: '3px',
              overflow: 'hidden',
              marginLeft: '6px',
            }}
          >
            <div
              style={{
                width: `${(completedCount / 3) * 100}%`,
                height: '100%',
                backgroundColor: 'var(--volt-lime)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          {collapsed ? '▲ Show Tasks' : '▼ Hide Tasks'}
        </button>
      </div>

      {/* Task Cards Grid */}
      {!collapsed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#0c100b',
          }}
        >
          {tasks.map((task) => {
            return (
              <div
                key={task.num}
                style={{
                  backgroundColor: task.completed
                    ? 'rgba(198, 255, 0, 0.04)'
                    : task.active
                    ? 'rgba(56, 189, 248, 0.05)'
                    : '#111510',
                  border: `1px solid ${
                    task.completed
                      ? 'rgba(198, 255, 0, 0.3)'
                      : task.active
                      ? 'var(--cyan-telemetry)'
                      : 'var(--border-subtle)'
                  }`,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Circle badge */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 'bold',
                        backgroundColor: task.completed
                          ? 'var(--volt-lime)'
                          : task.active
                          ? 'var(--cyan-telemetry)'
                          : '#202b1e',
                        color: task.completed || task.active ? '#080a08' : 'var(--text-muted)',
                      }}
                    >
                      {task.completed ? '✓' : task.num}
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: task.completed ? 'var(--volt-lime)' : 'var(--text-primary)',
                      }}
                    >
                      {task.title}
                    </span>
                  </div>

                  {/* Status pill or XP */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: task.completed
                        ? 'var(--volt-lime)'
                        : task.active
                        ? 'var(--cyan-telemetry)'
                        : 'var(--amber-xp)',
                    }}
                  >
                    {task.completed ? 'DONE' : task.active ? 'IN PROGRESS' : task.xp}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '15px' }}>
                  {task.desc}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
