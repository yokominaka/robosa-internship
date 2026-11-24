/**
 * LeftIconRail.tsx
 *
 * 52px vertical navigation rail — Robosa authentic design.
 * Pure visual: no routing. Just icon buttons with active state.
 */
import React, { useState } from 'react';

type NavId = 'missions' | 'workbench' | 'labs' | 'leaderboard';

interface NavItem {
  id: NavId;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'missions',
    label: 'Mission Board',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'workbench',
    label: 'Workbench',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="18" cy="14" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M21 17l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'labs',
    label: 'Labs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 3h6v8l4 10H5L9 11V3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7 16h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="13" width="5" height="9" rx="1" stroke="currentColor" strokeWidth="1.8" />
        <rect x="9.5" y="8" width="5" height="14" rx="1" stroke="currentColor" strokeWidth="1.8" />
        <rect x="17" y="4" width="5" height="18" rx="1" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
];

export const LeftIconRail: React.FC = () => {
  const [active, setActive] = useState<NavId>('workbench');

  return (
    <nav
      style={{
        width: '52px',
        flexShrink: 0,
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '12px',
        paddingBottom: '12px',
        gap: '4px',
      }}
    >
      {/* Top Nav Items */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              title={item.label}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'rgba(198, 255, 0, 0.1)' : 'transparent',
                color: isActive ? 'var(--volt-lime)' : 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              {/* Active left indicator bar */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    height: '60%',
                    width: '2px',
                    backgroundColor: 'var(--volt-lime)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Bottom: User avatar + streak */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Divider */}
        <div style={{ width: '28px', height: '1px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Avatar circle */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#1a2819',
              border: '1.5px solid var(--border-active)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 800,
              color: 'var(--volt-lime)',
              cursor: 'pointer',
            }}
            title="Your Profile"
          >
            R
          </div>

          {/* Streak badge */}
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              backgroundColor: '#facc15',
              color: '#080a08',
              borderRadius: '50%',
              width: 14,
              height: 14,
              fontSize: 8,
              fontWeight: 900,
              fontFamily: 'var(--font-mono)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid var(--bg-panel)',
            }}
          >
            0
          </div>
        </div>
      </div>
    </nav>
  );
};
