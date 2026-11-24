import React, { useState, useEffect, useRef } from 'react';
import { AVRRunner } from '../simulator/core/AVRRunner';
import { parseHex } from '../simulator/core/hexParser';
import { compileSketch } from '../simulator/core/compileClient';
import { LedPeripheral } from '../simulator/peripherals/LedPeripheral';
import { PushbuttonPeripheral } from '../simulator/peripherals/PushbuttonPeripheral';
import { UartPeripheral } from '../simulator/peripherals/UartPeripheral';
import { STARTER_SKETCH } from '../simulator/simulations/crosswalk/starterSketch';

interface CompileState {
  status: 'idle' | 'compiling' | 'success' | 'error';
  message: string;
  cached?: boolean;
  duration?: number;
  errorDetails?: string;
}

export const DebugHarness: React.FC = () => {
  const [code, setCode] = useState<string>(STARTER_SKETCH);
  const [compileState, setCompileState] = useState<CompileState>({
    status: 'idle',
    message: 'Ready to compile',
  });
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);

  // Exact electrical pin states
  const [pinStates, setPinStates] = useState({
    d13Red: false,
    d12Yellow: false,
    d11Green: false,
    d2PinLevel: true, // Idle with INPUT_PULLUP = HIGH (5V)
    buttonPhysicalPressed: false,
  });

  const runnerRef = useRef<AVRRunner | null>(null);
  const ledRedRef = useRef<LedPeripheral | null>(null);
  const ledYellowRef = useRef<LedPeripheral | null>(null);
  const ledGreenRef = useRef<LedPeripheral | null>(null);
  const buttonRef = useRef<PushbuttonPeripheral | null>(null);
  const uartRef = useRef<UartPeripheral | null>(null);
  const serialEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize runner and peripherals on mount
  useEffect(() => {
    const runner = new AVRRunner();
    runnerRef.current = runner;

    const ledRed = new LedPeripheral('led-d13', 'D13', (isLit) => {
      setPinStates((prev) => ({ ...prev, d13Red: isLit }));
    });

    const ledYellow = new LedPeripheral('led-d12', 'D12', (isLit) => {
      setPinStates((prev) => ({ ...prev, d12Yellow: isLit }));
    });

    const ledGreen = new LedPeripheral('led-d11', 'D11', (isLit) => {
      setPinStates((prev) => ({ ...prev, d11Green: isLit }));
    });

    const button = new PushbuttonPeripheral('btn-d2', 'D2', (isHigh) => {
      setPinStates((prev) => ({ ...prev, d2PinLevel: isHigh }));
    });

    const uart = new UartPeripheral('uart0', (line) => {
      setSerialLogs((prev) => [...prev, line]);
    });

    ledRedRef.current = ledRed;
    ledYellowRef.current = ledYellow;
    ledGreenRef.current = ledGreen;
    buttonRef.current = button;
    uartRef.current = uart;

    runner.mountPeripheral(ledRed);
    runner.mountPeripheral(ledYellow);
    runner.mountPeripheral(ledGreen);
    runner.mountPeripheral(button);
    runner.mountPeripheral(uart);

    return () => {
      runner.stop();
      runner.unmountAllPeripherals();
      runnerRef.current = null;
    };
  }, []);

  // Auto-scroll serial monitor to bottom on new log
  useEffect(() => {
    serialEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serialLogs]);

  const handleCompileAndRun = async () => {
    if (!runnerRef.current) return;

    setCompileState({
      status: 'compiling',
      message: 'Compiling sketch via http://localhost:8080/compile...',
    });

    const result = await compileSketch(code);

    if (!result.success || !result.hex) {
      setCompileState({
        status: 'error',
        message: 'Compilation Failed',
        cached: result.cached,
        duration: result.duration,
        errorDetails: result.error || 'Unknown compilation error',
      });
      return;
    }

    setCompileState({
      status: 'success',
      message: `Compilation Succeeded (${result.cached ? 'CACHED' : 'FRESH'} in ${result.duration}ms)`,
      cached: result.cached,
      duration: result.duration,
      errorDetails: undefined,
    });

    try {
      const flash = parseHex(result.hex);
      setSerialLogs([]);
      uartRef.current?.clear();

      // Cleanly load fresh flash and restart execution
      runnerRef.current.loadProgram(flash);
      runnerRef.current.start();
      setIsRunning(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCompileState({
        status: 'error',
        message: 'HEX Parsing / Runner Load Error',
        errorDetails: msg,
      });
    }
  };

  const handleStop = () => {
    if (runnerRef.current) {
      runnerRef.current.stop();
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    if (runnerRef.current) {
      runnerRef.current.reset();
      setIsRunning(false);
      setPinStates({
        d13Red: false,
        d12Yellow: false,
        d11Green: false,
        d2PinLevel: true,
        buttonPhysicalPressed: false,
      });
      setSerialLogs((prev) => [...prev, '--- SIMULATOR RESET ---']);
    }
  };

  const handleClearSerial = () => {
    setSerialLogs([]);
    uartRef.current?.clear();
  };

  const handleButtonPressStart = () => {
    if (buttonRef.current) {
      buttonRef.current.setPressed(true);
      setPinStates((prev) => ({
        ...prev,
        buttonPhysicalPressed: true,
        d2PinLevel: buttonRef.current?.getPinLevel() ?? false,
      }));
    }
  };

  const handleButtonPressEnd = () => {
    if (buttonRef.current) {
      buttonRef.current.setPressed(false);
      setPinStates((prev) => ({
        ...prev,
        buttonPhysicalPressed: false,
        d2PinLevel: buttonRef.current?.getPinLevel() ?? true,
      }));
    }
  };

  const handleMomentaryClick = () => {
    handleButtonPressStart();
    setTimeout(() => {
      handleButtonPressEnd();
    }, 300);
  };

  return (
    <div style={{ fontFamily: 'monospace', padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Robosa Simulation 1 — Phase 1 Debug Verification Harness</h1>
      <p style={{ color: '#555' }}>
        Headless <code>avr8js</code> ATmega328P engine with real pin-to-register parity (16 MHz wall-clock loop).
      </p>

      {/* Toolbar Controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={handleCompileAndRun}
          disabled={compileState.status === 'compiling'}
          style={{ padding: '8px 16px', fontWeight: 'bold' }}
        >
          {compileState.status === 'compiling' ? 'Compiling...' : 'Compile & Run'}
        </button>
        <button onClick={handleStop} disabled={!isRunning} style={{ padding: '8px 16px' }}>
          Stop
        </button>
        <button onClick={handleReset} style={{ padding: '8px 16px' }}>
          Reset
        </button>
        <span style={{ alignSelf: 'center', marginLeft: '12px' }}>
          Simulation Engine Status: <strong>{isRunning ? 'RUNNING (16 MHz)' : 'STOPPED'}</strong>
        </span>
      </div>

      {/* Live Compile Status Diagnostic */}
      <div
        style={{
          padding: '10px',
          marginBottom: '16px',
          border: '1px solid #ccc',
          background:
            compileState.status === 'error'
              ? '#ffebee'
              : compileState.status === 'success'
              ? '#e8f5e9'
              : '#f5f5f5',
        }}
      >
        <div>
          <strong>Compile Status: </strong>
          <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{compileState.status}</span> —{' '}
          {compileState.message}
        </div>
        {compileState.duration !== undefined && (
          <div>
            <strong>Build Duration: </strong> {compileState.duration} ms |{' '}
            <strong>Cache Hit: </strong> {compileState.cached ? 'YES (Cached)' : 'NO (Fresh Build)'}
          </div>
        )}
        {compileState.errorDetails && (
          <pre
            style={{
              color: '#c62828',
              whiteSpace: 'pre-wrap',
              marginTop: '8px',
              padding: '8px',
              background: '#fff',
              border: '1px solid #ffcdd2',
            }}
          >
            {compileState.errorDetails}
          </pre>
        )}
      </div>

      {/* Electrical Netlist & Pin State Indicators */}
      <div
        style={{
          border: '2px solid #333',
          padding: '12px',
          marginBottom: '16px',
          background: '#fafafa',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0' }}>Electrical Pin State Verification (ATmega328P Parity)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* D13 Red LED */}
          <div
            style={{
              padding: '10px',
              border: '1px solid #999',
              background: pinStates.d13Red ? '#ffcdd2' : '#fff',
            }}
          >
            <div>
              <strong>D13 (PORTB Bit 5):</strong>
            </div>
            <div>Component: Vehicle Red LED</div>
            <div>
              Logic State: <strong>{pinStates.d13Red ? 'HIGH (5V - ON)' : 'LOW (0V - OFF)'}</strong>
            </div>
          </div>

          {/* D12 Yellow LED */}
          <div
            style={{
              padding: '10px',
              border: '1px solid #999',
              background: pinStates.d12Yellow ? '#fff9c4' : '#fff',
            }}
          >
            <div>
              <strong>D12 (PORTB Bit 4):</strong>
            </div>
            <div>Component: Vehicle Yellow LED</div>
            <div>
              Logic State: <strong>{pinStates.d12Yellow ? 'HIGH (5V - ON)' : 'LOW (0V - OFF)'}</strong>
            </div>
          </div>

          {/* D11 Green LED */}
          <div
            style={{
              padding: '10px',
              border: '1px solid #999',
              background: pinStates.d11Green ? '#c8e6c9' : '#fff',
            }}
          >
            <div>
              <strong>D11 (PORTB Bit 3):</strong>
            </div>
            <div>Component: Vehicle Green LED</div>
            <div>
              Logic State: <strong>{pinStates.d11Green ? 'HIGH (5V - ON)' : 'LOW (0V - OFF)'}</strong>
            </div>
          </div>

          {/* D2 Pushbutton */}
          <div
            style={{
              padding: '10px',
              border: '1px solid #999',
              background: !pinStates.d2PinLevel ? '#b3e5fc' : '#fff',
            }}
          >
            <div>
              <strong>D2 (PORTD Bit 2 / INT0):</strong>
            </div>
            <div>Component: Crosswalk Button (INPUT_PULLUP)</div>
            <div>
              Electrical Pin Level:{' '}
              <strong>{pinStates.d2PinLevel ? 'HIGH (5V - Released)' : 'LOW (GND - Shorted)'}</strong>
            </div>
            <div>
              Switch Physical State:{' '}
              <strong>{pinStates.buttonPhysicalPressed ? 'PRESSED' : 'RELEASED'}</strong>
            </div>
          </div>
        </div>

        {/* Button Interaction Controls */}
        <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <strong>Pedestrian Button Control: </strong>
          <button
            onMouseDown={handleButtonPressStart}
            onMouseUp={handleButtonPressEnd}
            onMouseLeave={handleButtonPressEnd}
            onTouchStart={handleButtonPressStart}
            onTouchEnd={handleButtonPressEnd}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: pinStates.buttonPhysicalPressed ? '#0288d1' : '#e0e0e0',
              color: pinStates.buttonPhysicalPressed ? '#fff' : '#000',
              userSelect: 'none',
            }}
          >
            Press & Hold Crosswalk Button (D2)
          </button>
          <button onClick={handleMomentaryClick} style={{ padding: '10px 14px', cursor: 'pointer' }}>
            Click (300ms Pulse)
          </button>
        </div>
      </div>

      {/* Code Editor and Serial Monitor Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Sketch Editor */}
        <div>
          <h3>Arduino C++ Sketch Editor</h3>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            rows={28}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '8px',
              background: '#222',
              color: '#f8f8f2',
              borderRadius: '4px',
            }}
          />
        </div>

        {/* Serial Monitor */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>UART Serial Monitor (9600 Baud)</h3>
            <button onClick={handleClearSerial} style={{ padding: '4px 10px' }}>
              Clear
            </button>
          </div>
          <pre
            style={{
              height: '430px',
              overflowY: 'auto',
              background: '#111',
              color: '#00ff66',
              padding: '10px',
              boxSizing: 'border-box',
              margin: 0,
              borderRadius: '4px',
              fontSize: '13px',
              border: '1px solid #444',
            }}
          >
            {serialLogs.length === 0 ? (
              <span style={{ color: '#777' }}>[Serial Monitor Idle - Waiting for UART output...]</span>
            ) : (
              serialLogs.map((log, index) => <div key={index}>{log}</div>)
            )}
            <div ref={serialEndRef} />
          </pre>
        </div>
      </div>
    </div>
  );
};
