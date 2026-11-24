/**
 * RobosaWorkspace.tsx
 *
 * Phase 2 — Full integrated layout:
 *   RobosaHeader (52px)
 *   LeftIconRail (52px) | CodeEditor + Toolbar | WorkbenchCanvas + MissionKitTray
 *   SerialMonitor (collapsible, bottom)
 *   MissionTasksDrawer (bottom strip)
 *
 * Phase 1 engine intact: AVRRunner, parseHex, compileSketch.
 * Dynamic peripheral binding: validates wiring on every wire/component change,
 * then mounts/unmounts LedPeripherals and PushbuttonPeripheral accordingly.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';

// ── Core engine (Phase 1 — untouched) ───────────────────────────────────────
import { AVRRunner } from '../simulator/core/AVRRunner';
import { parseHex } from '../simulator/core/hexParser';
import { compileSketch } from '../simulator/core/compileClient';

// ── Peripherals ──────────────────────────────────────────────────────────────
import { LedPeripheral } from '../simulator/peripherals/LedPeripheral';
import { PushbuttonPeripheral } from '../simulator/peripherals/PushbuttonPeripheral';
import { UartPeripheral } from '../simulator/peripherals/UartPeripheral';

// ── Starter sketch ───────────────────────────────────────────────────────────
import { STARTER_SKETCH } from '../simulator/simulations/crosswalk/starterSketch';

// ── Validator ────────────────────────────────────────────────────────────────
import {
  validateCircuit,
  type PlacedComponent,
  type CircuitWire,
  type CircuitValidationResult,
} from '../simulator/core/circuitValidator';

// ── Components ────────────────────────────────────────────────────────────────
import { RobosaHeader } from './RobosaHeader';
import { LeftIconRail } from './LeftIconRail';
import { CodeEditor, type CompilerDiagnostic } from './CodeEditor';
import { WorkbenchCanvas } from './WorkbenchCanvas';
import { MissionKitTray } from './MissionKitTray';
import { SerialMonitor } from './SerialMonitor';
import { MissionTasksDrawer } from './MissionTasksDrawer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompileStatus {
  state: 'idle' | 'compiling' | 'success' | 'error';
  message: string;
  cached?: boolean;
  duration?: number;
  diagnostics?: CompilerDiagnostic[];
  rawOutput?: string;
}

// ─── Reference wiring preset ──────────────────────────────────────────────────

function buildReferenceWiring(): { components: PlacedComponent[]; wires: CircuitWire[] } {
  const components: PlacedComponent[] = [
    { id: 'led-red',    type: 'led',        color: 'red',    x: 0, y: 0 },
    { id: 'led-yellow', type: 'led',        color: 'yellow', x: 0, y: 0 },
    { id: 'led-green',  type: 'led',        color: 'green',  x: 0, y: 0 },
    { id: 'res-1',      type: 'resistor',   value: 220,      x: 0, y: 0 },
    { id: 'res-2',      type: 'resistor',   value: 220,      x: 0, y: 0 },
    { id: 'res-3',      type: 'resistor',   value: 220,      x: 0, y: 0 },
    { id: 'btn-1',      type: 'pushbutton', color: 'blue',   x: 0, y: 0 },
  ];

  function wire(id: string, fromComp: string, fromPin: string, toComp: string, toPin: string, color: string): CircuitWire {
    return { id, from: { componentId: fromComp, pinName: fromPin }, to: { componentId: toComp, pinName: toPin }, color };
  }

  const wires: CircuitWire[] = [
    // Red LED: D13 → LED_Red:A, LED_Red:C → Res1:1, Res1:2 → GND.2
    wire('w-r1', 'uno', '13',    'led-red',    'A',   '#c6ff00'),
    wire('w-r2', 'led-red',    'C', 'res-1',    '1',   '#c6ff00'),
    wire('w-r3', 'res-1', '2', 'uno', 'GND.2', '#000'),

    // Yellow LED: D12 → LED_Yellow:A, LED_Yellow:C → Res2:1, Res2:2 → GND.2
    wire('w-y1', 'uno', '12',    'led-yellow', 'A',   '#facc15'),
    wire('w-y2', 'led-yellow', 'C', 'res-2',   '1',   '#facc15'),
    wire('w-y3', 'res-2', '2', 'uno', 'GND.2', '#000'),

    // Green LED: D11 → LED_Green:A, LED_Green:C → Res3:1, Res3:2 → GND.3
    wire('w-g1', 'uno', '11',    'led-green',  'A',   '#5fd38d'),
    wire('w-g2', 'led-green',  'C', 'res-3',   '1',   '#5fd38d'),
    wire('w-g3', 'res-3', '2', 'uno', 'GND.3', '#000'),

    // Pushbutton: D2 → btn:1.l, btn:2.l → GND.1
    wire('w-b1', 'uno', '2',   'btn-1', '1.l', '#38bdf8'),
    wire('w-b2', 'btn-1', '2.l', 'uno', 'GND.1', '#000'),
  ];

  return { components, wires };
}

// ─── Wire color palette ───────────────────────────────────────────────────────

const WIRE_COLORS = [
  { label: 'Lime',      value: '#c6ff00' },
  { label: 'Cyan',      value: '#38bdf8' },
  { label: 'Amber',     value: '#facc15' },
  { label: 'Red (5V)',  value: '#ef4444' },
  { label: 'Black GND', value: '#1a1a1a' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const RobosaWorkspace: React.FC = () => {
  // ── Sketch / Compiler ─────────────────────────────────────────────────────
  const [code, setCode] = useState<string>(STARTER_SKETCH);
  const [compileStatus, setCompileStatus] = useState<CompileStatus>({
    state: 'idle',
    message: 'Ready to compile',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [cpuCycles, setCpuCycles] = useState(0);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);

  // ── Circuit ───────────────────────────────────────────────────────────────
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<CircuitWire[]>([]);
  const [validation, setValidation] = useState<CircuitValidationResult | null>(null);

  // LED states keyed by component ID (driven by avr8js via LedPeripheral callbacks)
  const [ledStates, setLedStates] = useState<Record<string, boolean>>({});
  const [buttonPressed, setButtonPressed] = useState(false);

  // Wire color
  const [currentWireColor, setCurrentWireColor] = useState('#c6ff00');

  // ── Task 3 completion ─────────────────────────────────────────────────────
  const [task3Complete, setTask3Complete] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const runnerRef = useRef<AVRRunner | null>(null);
  const uartRef = useRef<UartPeripheral | null>(null);
  // Track dynamically mounted peripherals by component ID
  const mountedLedsRef = useRef<Map<string, LedPeripheral>>(new Map());
  const mountedBtnRef = useRef<PushbuttonPeripheral | null>(null);

  // ── Task 3: watch serial log for cycle completion ─────────────────────────
  useEffect(() => {
    if (!task3Complete && serialLogs.some((l) => l.includes('returning to Vehicle Green'))) {
      setTask3Complete(true);
    }
  }, [serialLogs, task3Complete]);

  // ── Validation & dynamic peripheral re-binding ────────────────────────────
  useEffect(() => {
    const result = validateCircuit(placedComponents, wires);
    setValidation(result);

    const runner = runnerRef.current;
    if (!runner) return;

    // ── Re-bind LED peripherals based on validated circuit ──────────────────
    // 1. Unmount any LEDs that are no longer valid
    for (const [compId, _led] of mountedLedsRef.current) {
      const stillValid = result.leds.some(
        (b) => b.componentId === compId && b.status === 'valid',
      );
      if (!stillValid) {
        runner.unmountPeripheral(`led-${compId}`);
        mountedLedsRef.current.delete(compId);
        setLedStates((prev) => {
          const copy = { ...prev };
          delete copy[compId];
          return copy;
        });
      }
    }

    // 2. Mount newly valid LEDs
    for (const binding of result.leds) {
      if (binding.status === 'valid' && binding.boundPin && !mountedLedsRef.current.has(binding.componentId)) {
        const capturedId = binding.componentId;
        const capturedPin = binding.boundPin;
        const led = new LedPeripheral(`led-${capturedId}`, capturedPin, (isLit) => {
          setLedStates((prev) => ({ ...prev, [capturedId]: isLit }));
        });
        runner.mountPeripheral(led);
        mountedLedsRef.current.set(capturedId, led);
      }
    }

    // ── Re-bind pushbutton peripheral ───────────────────────────────────────
    const validBtn = result.pushbuttons.find((p) => p.status === 'valid' && p.boundPin);

    if (mountedBtnRef.current) {
      // Check if still valid and same pin
      const stillValid =
        validBtn && validBtn.componentId === mountedBtnRef.current.id.replace('btn-', '');
      if (!stillValid) {
        runner.unmountPeripheral(mountedBtnRef.current.id);
        mountedBtnRef.current = null;
      }
    }

    if (validBtn && !mountedBtnRef.current && validBtn.boundPin) {
      const capturedId = validBtn.componentId;
      const capturedPin = validBtn.boundPin;
      const btn = new PushbuttonPeripheral(`btn-${capturedId}`, capturedPin);
      runner.mountPeripheral(btn);
      mountedBtnRef.current = btn;
    }
  }, [placedComponents, wires]);

  // ── Button press → feeds into the currently mounted peripheral ───────────
  const handleButtonPressChange = useCallback((pressed: boolean) => {
    setButtonPressed(pressed);
    mountedBtnRef.current?.setPressed(pressed);
  }, []);

  // ── Initialize AVRRunner + UART (always mounted) ──────────────────────────
  useEffect(() => {
    const runner = new AVRRunner();
    runnerRef.current = runner;

    const uart = new UartPeripheral('uart0', (line) => {
      setSerialLogs((prev) => [...prev, line]);
    });
    uartRef.current = uart;
    runner.mountPeripheral(uart);

    // CPU cycle telemetry
    const intervalId = setInterval(() => {
      if (runnerRef.current) setCpuCycles(runnerRef.current.cpu.cycles);
    }, 100);

    return () => {
      clearInterval(intervalId);
      runner.stop();
      runner.unmountAllPeripherals();
      runnerRef.current = null;
      mountedLedsRef.current.clear();
      mountedBtnRef.current = null;
    };
  }, []);

  // ── Compile & Run ─────────────────────────────────────────────────────────
  const handleCompileAndRun = async () => {
    if (!runnerRef.current) return;

    setCompileStatus({ state: 'compiling', message: 'Compiling sketch on Docker backend...' });

    const result = await compileSketch(code);

    if (!result.success || !result.hex) {
      const rawText = result.error ?? 'Compilation failed';
      const diagnostics: CompilerDiagnostic[] = [];
      const regex = /sketch\.ino:(\d+):(\d+):\s+(error|fatal error|warning):\s+(.+)/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(rawText)) !== null) {
        diagnostics.push({
          line: parseInt(m[1], 10),
          column: parseInt(m[2], 10),
          severity: m[3].includes('error') ? 'error' : 'warning',
          message: m[4].trim(),
        });
      }
      setCompileStatus({
        state: 'error',
        message: 'Compilation Failed',
        cached: result.cached,
        duration: result.duration,
        diagnostics,
        rawOutput: rawText,
      });
      return;
    }

    setCompileStatus({
      state: 'success',
      message: result.cached ? 'Build complete (Cache Hit)' : 'Build complete',
      cached: result.cached,
      duration: result.duration,
      diagnostics: [],
    });

    try {
      const flash = parseHex(result.hex);
      setSerialLogs([]);
      uartRef.current?.clear();
      runnerRef.current.loadProgram(flash);
      runnerRef.current.start();
      setIsRunning(true);
    } catch (err: unknown) {
      setCompileStatus({
        state: 'error',
        message: 'Program Load Error',
        rawOutput: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleStop = () => {
    runnerRef.current?.stop();
    setIsRunning(false);
  };

  const handleReset = () => {
    if (runnerRef.current) {
      runnerRef.current.reset();
      setIsRunning(false);
      setCpuCycles(0);
      setLedStates({});
      setButtonPressed(false);
      setSerialLogs((prev) => [...prev, '--- SIMULATOR RESET ---']);
    }
  };

  // ── Circuit management ────────────────────────────────────────────────────

  const handleAddComponent = useCallback(
    (type: 'led' | 'resistor' | 'pushbutton', color?: string) => {
      setPlacedComponents((prev) => {
        // Determine unique slot ID
        let id: string;
        if (type === 'led') {
          const target = color ?? 'red';
          id = `led-${target}`;
          if (prev.some((c) => c.id === id)) return prev; // already placed
        } else if (type === 'resistor') {
          const count = prev.filter((c) => c.type === 'resistor').length;
          if (count >= 3) return prev;
          id = `res-${count + 1}`;
        } else {
          id = 'btn-1';
          if (prev.some((c) => c.id === id)) return prev;
        }
        return [...prev, { id, type, color, value: type === 'resistor' ? 220 : undefined, x: 0, y: 0 }];
      });
    },
    [],
  );

  const handleRemoveComponent = useCallback((id: string) => {
    // Also remove wires connected to this component
    setWires((prev) =>
      prev.filter((w) => w.from.componentId !== id && w.to.componentId !== id),
    );
    setPlacedComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleAddWire = useCallback((wire: CircuitWire) => {
    setWires((prev) => [...prev, wire]);
  }, []);

  const handleRemoveWire = useCallback((id: string) => {
    setWires((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const handleLoadReferenceWiring = useCallback(() => {
    const { components, wires: refWires } = buildReferenceWiring();
    setPlacedComponents(components);
    setWires(refWires);
  }, []);

  const handleClearWorkbench = useCallback(() => {
    setPlacedComponents([]);
    setWires([]);
    setLedStates({});
  }, []);

  // ── Quick Demo: auto-wire + compile + run (no code editing needed) ────────
  const handleQuickDemo = useCallback(async () => {
    // Step 1: load reference wiring
    const { components, wires: refWires } = buildReferenceWiring();
    setPlacedComponents(components);
    setWires(refWires);

    // Step 2: small delay so React re-renders and validation effect runs
    await new Promise<void>((r) => setTimeout(r, 150));

    // Step 3: compile & run the starter sketch (unchanged code)
    if (!runnerRef.current) return;
    setCompileStatus({ state: 'compiling', message: 'Quick Demo — compiling sketch...' });

    const result = await compileSketch(code);

    if (!result.success || !result.hex) {
      setCompileStatus({
        state: 'error',
        message: 'Quick Demo compile failed',
        rawOutput: result.error ?? 'Unknown error',
      });
      return;
    }

    setCompileStatus({
      state: 'success',
      message: result.cached ? 'Quick Demo ready (Cache Hit)' : 'Quick Demo ready',
      cached: result.cached,
      duration: result.duration,
      diagnostics: [],
    });

    try {
      const flash = parseHex(result.hex);
      setSerialLogs([]);
      uartRef.current?.clear();
      runnerRef.current.loadProgram(flash);
      runnerRef.current.start();
      setIsRunning(true);
    } catch (err: unknown) {
      setCompileStatus({
        state: 'error',
        message: 'Quick Demo load error',
        rawOutput: err instanceof Error ? err.message : String(err),
      });
    }
  }, [code]);

  // ─── Layout ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-canvas)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header (52px) ────────────────────────────────────────────────── */}
      <RobosaHeader
        compileState={compileStatus}
        isRunning={isRunning}
        cpuCycles={cpuCycles}
      />

      {/* ── Body Row: left rail + main content ───────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Left Icon Rail (52px) ───────────────────────────────────────────── */}
        <LeftIconRail />

        {/* ── Main Content Area ───────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* ── Two-Pane Workspace Grid ─────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'minmax(420px, 1.05fr) minmax(460px, 1.2fr)',
              gap: '14px',
              padding: '14px',
              overflowY: 'auto',
              minHeight: 0,
              alignItems: 'start',
            }}
          >
            {/* ── LEFT: Code Editor + Toolbar ──────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', minHeight: '440px' }}>
              {/* Editor card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                }}
              >
                {/* Toolbar row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#0e1310',
                    borderBottom: '1px solid var(--border-subtle)',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* File tab */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px' }}>📄</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      crosswalk.ino
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        backgroundColor: '#182216',
                        borderRadius: '4px',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      Arduino C++
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Primary CTA */}
                    <button
                      className="robosa-btn-chamfered"
                      onClick={handleCompileAndRun}
                      disabled={compileStatus.state === 'compiling'}
                      style={{
                        opacity: compileStatus.state === 'compiling' ? 0.6 : 1,
                        cursor: compileStatus.state === 'compiling' ? 'wait' : 'pointer',
                      }}
                    >
                      {compileStatus.state === 'compiling' ? '⟳ COMPILING...' : '▶ COMPILE & RUN'}
                    </button>

                    <button
                      onClick={handleStop}
                      disabled={!isRunning}
                      style={{
                        backgroundColor: '#1a2219',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '7px 12px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: isRunning ? 'var(--crimson-fault)' : 'var(--text-dim)',
                        cursor: isRunning ? 'pointer' : 'default',
                        opacity: isRunning ? 1 : 0.5,
                      }}
                    >
                      ■ Stop
                    </button>

                    <button
                      onClick={handleReset}
                      style={{
                        backgroundColor: '#1a2219',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '7px 12px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      ↺ Reset
                    </button>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)' }} />

                    {/* Quick Demo button — auto-wires & runs without touching code */}
                    <button
                      onClick={handleQuickDemo}
                      disabled={compileStatus.state === 'compiling'}
                      title="Auto-wire the circuit and run the simulation — no code editing needed!"
                      style={{
                        backgroundColor: 'rgba(198, 255, 0, 0.08)',
                        border: '1px solid rgba(198, 255, 0, 0.35)',
                        borderRadius: '4px',
                        padding: '7px 12px',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--volt-lime)',
                        cursor: compileStatus.state === 'compiling' ? 'wait' : 'pointer',
                        opacity: compileStatus.state === 'compiling' ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⚡ Quick Demo
                    </button>
                  </div>
                </div>

                {/* Editor body */}
                <div style={{ padding: '10px', flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                  <CodeEditor
                    code={code}
                    onChange={setCode}
                    diagnostics={compileStatus.diagnostics}
                  />
                </div>
              </div>

              {/* Compiler diagnostics */}
              {compileStatus.rawOutput && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--crimson-fault)',
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: '6px', display: 'flex', gap: '6px' }}>
                    <span>⚠</span> Compiler Diagnostics
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#ff8a80' }}>
                    {compileStatus.rawOutput}
                  </pre>
                </div>
              )}

              {/* Wire color picker */}
              <div
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  Wire Color:
                </span>
                {WIRE_COLORS.map((wc) => (
                  <button
                    key={wc.value}
                    onClick={() => setCurrentWireColor(wc.value)}
                    title={wc.label}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: wc.value,
                      border:
                        currentWireColor === wc.value
                          ? '2px solid var(--volt-lime)'
                          : '2px solid transparent',
                      cursor: 'pointer',
                      outline: currentWireColor === wc.value ? '1px solid var(--volt-lime)' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-dim)',
                    marginLeft: 'auto',
                  }}
                >
                  Click two pins to wire · Esc to cancel · Select wire + Del to remove
                </span>
              </div>
            </div>

            {/* ── RIGHT: Mission Kit Tray + WorkbenchCanvas ─────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Mission Kit Tray */}
              <MissionKitTray
                placedComponents={placedComponents}
                onAddComponent={handleAddComponent}
                onLoadReferenceWiring={handleLoadReferenceWiring}
                onClearWorkbench={handleClearWorkbench}
              />

              {/* Interactive Workbench Canvas */}
              <WorkbenchCanvas
                placedComponents={placedComponents}
                wires={wires}
                validation={validation}
                onRemoveComponent={handleRemoveComponent}
                onAddWire={handleAddWire}
                onRemoveWire={handleRemoveWire}
                ledStates={ledStates}
                onButtonPressChange={handleButtonPressChange}
                buttonPressed={buttonPressed}
                currentWireColor={currentWireColor}
              />
            </div>
          </div>

          {/* ── Serial Monitor ───────────────────────────────────────────────── */}
          <div style={{ padding: '0 14px', paddingBottom: '0' }}>
            <SerialMonitor
              logs={serialLogs}
              onClear={() => {
                setSerialLogs([]);
                uartRef.current?.clear();
              }}
              baudRate={9600}
            />
          </div>

          {/* ── Mission Tasks Drawer ─────────────────────────────────────────── */}
          <MissionTasksDrawer
            task1Complete={validation?.task1Complete ?? false}
            task2Complete={validation?.task2Complete ?? false}
            task3Complete={task3Complete}
          />
        </div>
      </div>
    </div>
  );
};
