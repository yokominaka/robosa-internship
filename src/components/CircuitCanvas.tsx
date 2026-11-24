import React, { useState } from 'react';
import '@wokwi/elements';

export interface CircuitState {
  ledRed: boolean;
  ledYellow: boolean;
  ledGreen: boolean;
  d2PinLevel: boolean;
  buttonPressed: boolean;
}

interface CircuitCanvasProps {
  state: CircuitState;
  onButtonPressChange: (pressed: boolean) => void;
  cpuCycles?: number;
  isRunning: boolean;
}

interface PinTooltip {
  title: string;
  pin: string;
  port: string;
  mode: string;
  voltage: string;
  status: string;
  x: number;
  y: number;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  state,
  onButtonPressChange,
  cpuCycles = 0,
  isRunning,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<PinTooltip | null>(null);

  const showTooltip = (
    e: React.MouseEvent,
    info: Omit<PinTooltip, 'x' | 'y'>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.closest('.circuit-container')?.getBoundingClientRect();
    const offsetX = parentRect ? rect.left - parentRect.left + rect.width / 2 : rect.left;
    const offsetY = parentRect ? rect.top - parentRect.top : rect.top;

    setActiveTooltip({
      ...info,
      x: offsetX,
      y: Math.max(offsetY - 80, 10),
    });
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  return (
    <div
      className="circuit-container"
      style={{
        position: 'relative',
        backgroundColor: '#12171e',
        borderRadius: '8px',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        minHeight: '520px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with Parity & Simulation Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: '#182029',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isRunning ? 'var(--success)' : 'var(--muted)',
              boxShadow: isRunning ? '0 0 8px var(--success)' : 'none',
            }}
          />
          <strong style={{ color: 'var(--text)' }}>
            Arduino Uno Parity Circuit (16 MHz)
          </strong>
        </div>
        <div style={{ color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>
          CPU Cycles: <span style={{ color: 'var(--accent)' }}>{cpuCycles.toLocaleString()}</span> |{' '}
          Status: <span style={{ color: isRunning ? 'var(--success)' : 'var(--warn)' }}>{isRunning ? 'RUNNING' : 'STOPPED'}</span>
        </div>
      </div>

      {/* Main Interactive Circuit Space */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          minHeight: '480px',
          background: 'radial-gradient(circle at 50% 50%, #171f28 0%, #0d1217 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          userSelect: 'none',
        }}
      >
        {/* SVG Wire Overlay */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
          viewBox="0 0 740 480"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="wire-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* D13 Red LED Wire (Red) */}
          <path
            d="M 283 125 C 330 80, 420 80, 520 105"
            stroke="#1a0505"
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M 283 125 C 330 80, 420 80, 520 105"
            stroke="#ff3b30"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            filter="url(#wire-shadow)"
          />

          {/* D12 Yellow LED Wire (Yellow) */}
          <path
            d="M 283 138 C 340 110, 420 120, 520 165"
            stroke="#1a1505"
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M 283 138 C 340 110, 420 120, 520 165"
            stroke="#ffcc00"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            filter="url(#wire-shadow)"
          />

          {/* D11 Green LED Wire (Green) */}
          <path
            d="M 283 151 C 340 140, 420 160, 520 225"
            stroke="#051a08"
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M 283 151 C 340 140, 420 160, 520 225"
            stroke="#34c759"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            filter="url(#wire-shadow)"
          />

          {/* D2 Pushbutton Wire (Cyan) */}
          <path
            d="M 283 268 C 340 260, 420 290, 520 330"
            stroke="#051520"
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M 283 268 C 340 260, 420 290, 520 330"
            stroke="#00b0ff"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            filter="url(#wire-shadow)"
          />

          {/* GND Return Bus Wire (Black / Dark Grey) */}
          <path
            d="M 283 99 C 320 50, 460 50, 640 90 L 640 370 C 640 390, 580 380, 550 360"
            stroke="#000000"
            strokeWidth="5"
            fill="none"
          />
          <path
            d="M 283 99 C 320 50, 460 50, 640 90 L 640 370 C 640 390, 580 380, 550 360"
            stroke="#2c3440"
            strokeWidth="3"
            strokeDasharray="6,2"
            fill="none"
            strokeLinecap="round"
            filter="url(#wire-shadow)"
          />

          {/* Resistors Ground Links */}
          <line x1="580" y1="110" x2="640" y2="110" stroke="#2c3440" strokeWidth="2.5" />
          <line x1="580" y1="170" x2="640" y2="170" stroke="#2c3440" strokeWidth="2.5" />
          <line x1="580" y1="230" x2="640" y2="230" stroke="#2c3440" strokeWidth="2.5" />
        </svg>

        {/* Scaled Board Viewport */}
        <div
          style={{
            position: 'relative',
            width: '740px',
            height: '460px',
            zIndex: 2,
          }}
        >
          {/* Arduino Uno Board */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '40px',
              transform: 'scale(0.88)',
              transformOrigin: 'top left',
            }}
          >
            <wokwi-arduino-uno />

            {/* Interactive Pin Hover Targets on Uno Header */}
            {/* D13 Pin Target */}
            <div
              title="Uno Pin D13"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: 'Header Pin D13 (SCK)',
                  pin: 'D13',
                  port: 'PORTB Bit 5 (PB5)',
                  mode: 'OUTPUT',
                  voltage: state.ledRed ? '5.0V (HIGH)' : '0.0V (LOW)',
                  status: state.ledRed ? 'LED LIT' : 'OFF',
                })
              }
              onMouseLeave={hideTooltip}
              style={{
                position: 'absolute',
                top: '55px',
                right: '18px',
                width: '18px',
                height: '14px',
                cursor: 'pointer',
                backgroundColor: state.ledRed ? 'rgba(255, 59, 48, 0.4)' : 'transparent',
                borderRadius: '2px',
              }}
            />

            {/* D12 Pin Target */}
            <div
              title="Uno Pin D12"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: 'Header Pin D12 (MISO)',
                  pin: 'D12',
                  port: 'PORTB Bit 4 (PB4)',
                  mode: 'OUTPUT',
                  voltage: state.ledYellow ? '5.0V (HIGH)' : '0.0V (LOW)',
                  status: state.ledYellow ? 'LED LIT' : 'OFF',
                })
              }
              onMouseLeave={hideTooltip}
              style={{
                position: 'absolute',
                top: '70px',
                right: '18px',
                width: '18px',
                height: '14px',
                cursor: 'pointer',
                backgroundColor: state.ledYellow ? 'rgba(255, 204, 0, 0.4)' : 'transparent',
                borderRadius: '2px',
              }}
            />

            {/* D11 Pin Target */}
            <div
              title="Uno Pin D11"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: 'Header Pin D11 (MOSI)',
                  pin: 'D11',
                  port: 'PORTB Bit 3 (PB3)',
                  mode: 'OUTPUT',
                  voltage: state.ledGreen ? '5.0V (HIGH)' : '0.0V (LOW)',
                  status: state.ledGreen ? 'LED LIT' : 'OFF',
                })
              }
              onMouseLeave={hideTooltip}
              style={{
                position: 'absolute',
                top: '85px',
                right: '18px',
                width: '18px',
                height: '14px',
                cursor: 'pointer',
                backgroundColor: state.ledGreen ? 'rgba(52, 199, 89, 0.4)' : 'transparent',
                borderRadius: '2px',
              }}
            />

            {/* D2 Pin Target */}
            <div
              title="Uno Pin D2"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: 'Header Pin D2 (INT0)',
                  pin: 'D2',
                  port: 'PORTD Bit 2 (PD2)',
                  mode: 'INPUT_PULLUP',
                  voltage: state.d2PinLevel ? '5.0V (HIGH)' : '0.0V (GND)',
                  status: state.buttonPressed ? 'PRESSED (SHORTED)' : 'RELEASED (PULLUP)',
                })
              }
              onMouseLeave={hideTooltip}
              style={{
                position: 'absolute',
                top: '215px',
                right: '18px',
                width: '18px',
                height: '14px',
                cursor: 'pointer',
                backgroundColor: !state.d2PinLevel ? 'rgba(0, 176, 255, 0.4)' : 'transparent',
                borderRadius: '2px',
              }}
            />

            {/* GND Pin Target */}
            <div
              title="Uno Header Pin GND"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  title: 'Power Rail GND',
                  pin: 'GND',
                  port: '0V Reference',
                  mode: 'POWER RAIL',
                  voltage: '0.0V',
                  status: 'GROUND BUS',
                })
              }
              onMouseLeave={hideTooltip}
              style={{
                position: 'absolute',
                top: '28px',
                right: '18px',
                width: '18px',
                height: '14px',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Right Circuit Breadboard Module: Traffic Lights & Button */}
          <div
            style={{
              position: 'absolute',
              top: '30px',
              left: '490px',
              width: '210px',
              backgroundColor: 'rgba(26, 33, 41, 0.95)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--muted)',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Pedestrian Signal</span>
              <span style={{ color: 'var(--accent)' }}>Netlist Parity</span>
            </div>

            {/* Vehicle LEDs Tower */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                backgroundColor: '#11161c',
                padding: '12px 6px',
                borderRadius: '6px',
                border: '1px solid #232c37',
              }}
            >
              {/* Red LED */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: 'Vehicle Red LED',
                    pin: 'D13',
                    port: 'PORTB.5',
                    mode: 'OUTPUT (via 220Ω)',
                    voltage: state.ledRed ? '5.0V' : '0.0V',
                    status: state.ledRed ? 'STOP (ON)' : 'OFF',
                  })
                }
                onMouseLeave={hideTooltip}
              >
                <wokwi-led color="red" value={state.ledRed} label="D13" />
                <span
                  style={{
                    fontSize: '11px',
                    color: state.ledRed ? '#ff5f5f' : 'var(--muted)',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                >
                  RED
                </span>
              </div>

              {/* Yellow LED */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: 'Vehicle Yellow LED',
                    pin: 'D12',
                    port: 'PORTB.4',
                    mode: 'OUTPUT (via 220Ω)',
                    voltage: state.ledYellow ? '5.0V' : '0.0V',
                    status: state.ledYellow ? 'CAUTION (ON)' : 'OFF',
                  })
                }
                onMouseLeave={hideTooltip}
              >
                <wokwi-led color="yellow" value={state.ledYellow} label="D12" />
                <span
                  style={{
                    fontSize: '11px',
                    color: state.ledYellow ? '#ffc04d' : 'var(--muted)',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                >
                  YEL
                </span>
              </div>

              {/* Green LED */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: 'Vehicle Green LED',
                    pin: 'D11',
                    port: 'PORTB.3',
                    mode: 'OUTPUT (via 220Ω)',
                    voltage: state.ledGreen ? '5.0V' : '0.0V',
                    status: state.ledGreen ? 'GO (ON)' : 'OFF',
                  })
                }
                onMouseLeave={hideTooltip}
              >
                <wokwi-led color="green" value={state.ledGreen} label="D11" />
                <span
                  style={{
                    fontSize: '11px',
                    color: state.ledGreen ? '#5fd38d' : 'var(--muted)',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                >
                  GRN
                </span>
              </div>
            </div>

            {/* Interactive Crosswalk Pushbutton Element */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#11161c',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #232c37',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  fontSize: '11px',
                  color: 'var(--muted)',
                  marginBottom: '8px',
                }}
              >
                <span>Crosswalk Button</span>
                <span style={{ color: !state.d2PinLevel ? '#00b0ff' : 'var(--muted)', fontWeight: 600 }}>
                  {!state.d2PinLevel ? 'LOW (Active)' : 'HIGH (Idle)'}
                </span>
              </div>

              {/* Wokwi Pushbutton Component with direct pointer interaction */}
              <div
                onPointerDown={() => onButtonPressChange(true)}
                onPointerUp={() => onButtonPressChange(false)}
                onPointerLeave={() => onButtonPressChange(false)}
                onMouseEnter={(e) =>
                  showTooltip(e, {
                    title: 'Crosswalk Pushbutton',
                    pin: 'D2',
                    port: 'PORTD.2 (INT0)',
                    mode: 'INPUT_PULLUP',
                    voltage: state.d2PinLevel ? '5.0V' : '0.0V',
                    status: state.buttonPressed ? 'PRESSED' : 'RELEASED',
                  })
                }
                style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
              >
                <wokwi-pushbutton color="blue" pressed={state.buttonPressed} />
              </div>

              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)' }}>
                Click &amp; hold to request crossing
              </div>
            </div>
          </div>
        </div>

        {/* Live Pin-State Inspection Tooltip Card */}
        {activeTooltip && (
          <div
            style={{
              position: 'absolute',
              top: `${activeTooltip.y}px`,
              left: `${activeTooltip.x}px`,
              transform: 'translateX(-50%)',
              zIndex: 10,
              backgroundColor: '#0a0d11',
              border: '1px solid var(--accent)',
              borderRadius: '6px',
              padding: '8px 12px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
              fontSize: '12px',
              minWidth: '180px',
            }}
          >
            <div style={{ fontWeight: 'bold', color: 'var(--accent)', marginBottom: '4px' }}>
              {activeTooltip.title}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '2px 8px', color: 'var(--text)' }}>
              <span style={{ color: 'var(--muted)' }}>Pin:</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{activeTooltip.pin}</span>
              <span style={{ color: 'var(--muted)' }}>Port / Bit:</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{activeTooltip.port}</span>
              <span style={{ color: 'var(--muted)' }}>Mode:</span>
              <span>{activeTooltip.mode}</span>
              <span style={{ color: 'var(--muted)' }}>Voltage:</span>
              <span style={{ fontWeight: 600 }}>{activeTooltip.voltage}</span>
              <span style={{ color: 'var(--muted)' }}>State:</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>{activeTooltip.status}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
