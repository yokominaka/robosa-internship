/**
 * WorkbenchCanvas.tsx
 *
 * Interactive student wiring workbench.
 * - Arduino Uno pre-mounted, anchored at fixed canvas position
 * - PlacedComponents rendered at their (x,y) slots as @wokwi/elements web components
 * - Pin anchors computed from pinInfo (1 unit = 0.254 mm for Uno, 1 unit ≈ 1 px for LED/etc.)
 * - Hover → snap ring + tooltip; Click Pin A → Click Pin B → commit wire
 * - Escape cancels in-progress wire
 * - Validation faults rendered as top-of-canvas banners
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type MouseEvent,
} from 'react';
import '@wokwi/elements';
import type {
  PlacedComponent,
  CircuitWire,
  CircuitValidationResult,
} from '../simulator/core/circuitValidator';
import { WireOverlay, type PinAnchor } from './WireOverlay';

// ─── Pin-info types (returned by @wokwi/elements web components) ──────────────

interface WokwiPinInfo {
  name: string;
  x: number;
  y: number;
  signals?: unknown[];
  description?: string;
}

interface WokwiElement extends HTMLElement {
  pinInfo?: WokwiPinInfo[];
}

// ─── Component layout constants ───────────────────────────────────────────────

/** Arduino Uno top-left position (px) in the canvas */
const UNO_LEFT = 24;
const UNO_TOP = 56;
/** Rendered Uno size in px — aspect matches viewBox "-4 0 72.58 53.34" (mm) */
const UNO_W_PX = 320;
const UNO_H_PX = Math.round((53.34 / 72.58) * UNO_W_PX); // ≈ 235 px

/** Uno viewBox: "-4 0 72.58 53.34" (mm) */
const UNO_VB_X = -4;   // left offset in mm
const UNO_VB_W = 72.58; // total mm width
const UNO_VB_H = 53.34; // total mm height

/** LED rendered size (px). ViewBox "0 0 40 54" — keep 1 unit ≈ 1.6 px */
const LED_W_PX = 40;
const LED_H_PX = 54;

/** Resistor rendered size (px). ViewBox "0 0 15.645 3" — wider is clearer */
const RES_W_PX = 76;
const RES_H_PX = 20;

/** Pushbutton rendered size (px). ViewBox "-3 0 18 12" */
const BTN_W_PX = 60;
const BTN_H_PX = 42;

// Pre-defined canvas slot positions for placed components
// (component top-left in canvas-local px)
const COMPONENT_SLOTS: Record<string, { x: number; y: number }> = {
  'led-red':    { x: 388, y: 60  },
  'led-yellow': { x: 388, y: 145 },
  'led-green':  { x: 388, y: 230 },
  'res-1':      { x: 490, y: 80  },
  'res-2':      { x: 490, y: 162 },
  'res-3':      { x: 490, y: 244 },
  'btn-1':      { x: 388, y: 320 },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WorkbenchCanvasProps {
  placedComponents: PlacedComponent[];
  wires: CircuitWire[];
  validation: CircuitValidationResult | null;
  onRemoveComponent: (id: string) => void;
  onAddWire: (wire: CircuitWire) => void;
  onRemoveWire: (id: string) => void;
  /** States of LEDs driven by avr8js (keyed by component id) */
  ledStates: Record<string, boolean>;
  /** Called when user presses/releases the pushbutton */
  onButtonPressChange: (pressed: boolean) => void;
  /** Current active button press state (for rendering) */
  buttonPressed: boolean;
  /** Wire color chosen in the tray */
  currentWireColor: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uniqueWireId() {
  return `wire-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Convert Uno pinInfo coordinates → canvas-local pixels */
function unoAnchor(pin: WokwiPinInfo): { x: number; y: number } {
  // pin.x, pin.y are in 10-mil units (1 unit = 0.254 mm)
  // mm → canvas-px: (mm_offset_from_vb_left / VB_W_mm) * UNO_W_PX + UNO_LEFT
  const mmX = pin.x * 0.254;
  const mmY = pin.y * 0.254;
  const canvasX = ((mmX - UNO_VB_X) / UNO_VB_W) * UNO_W_PX + UNO_LEFT;
  const canvasY = (mmY / UNO_VB_H) * UNO_H_PX + UNO_TOP;
  return { x: Math.round(canvasX), y: Math.round(canvasY) };
}

/**
 * Compute pin anchors for a placed component, returning PinAnchor entries.
 * Uses known pinInfo values from wokwi element specs.
 */
function placedComponentAnchors(comp: PlacedComponent): PinAnchor[] {
  const slot = COMPONENT_SLOTS[comp.id];
  if (!slot) return [];

  const { x: ox, y: oy } = slot;

  if (comp.type === 'led') {
    // ViewBox "0 0 40 54" — coordinates in px at LED_W_PX / LED_H_PX scale
    // A: x=25, y=42; C: x=15, y=42 (in viewBox units = px)
    const scaleX = LED_W_PX / 40;
    const scaleY = LED_H_PX / 54;
    return [
      { componentId: comp.id, pinName: 'A', label: `${comp.color?.toUpperCase() ?? 'LED'} · A (Anode)`, x: ox + 25 * scaleX, y: oy + 42 * scaleY },
      { componentId: comp.id, pinName: 'C', label: `${comp.color?.toUpperCase() ?? 'LED'} · C (Cathode)`, x: ox + 15 * scaleX, y: oy + 42 * scaleY },
    ];
  }

  if (comp.type === 'resistor') {
    // ViewBox "0 0 15.645 3" — rendered at RES_W_PX × RES_H_PX
    // Pin 1: x=0, y=5.65 (in original units); Pin 2: x=58.8, y=5.65
    // The original viewBox is 0–15.645 wide (mm), pins are at 0 and 58.8/10 ≈ 5.88 mm
    // But Wokwi actually uses: pin 1 at left edge, pin 2 at right edge of rendered resistor
    const midY = oy + RES_H_PX / 2;
    return [
      { componentId: comp.id, pinName: '1', label: `RES · 1`, x: ox, y: midY },
      { componentId: comp.id, pinName: '2', label: `RES · 2`, x: ox + RES_W_PX, y: midY },
    ];
  }

  if (comp.type === 'pushbutton') {
    // ViewBox "-3 0 18 12" rendered at BTN_W_PX × BTN_H_PX
    // 1.l x=0, y=13; 1.r x=67, y=13; 2.l x=0, y=32; 2.r x=67, y=32 (10-mil units)
    // 1 unit = 0.254 mm; button original width = 17.802 mm
    const btnOrigW = 17.802; // mm
    const btnOrigH = 12.0;   // mm (ViewBox height)
    const scaleX = BTN_W_PX / btnOrigW;
    const scaleY = BTN_H_PX / btnOrigH;
    // mm values: 0*0.254=0, 67*0.254=17.018, 13*0.254=3.302, 32*0.254=8.128
    const lx = ox + 0 * scaleX;
    const rx = ox + 17.018 * scaleX;
    const y1 = oy + 3.302 * scaleY;
    const y2 = oy + 8.128 * scaleY;
    return [
      { componentId: comp.id, pinName: '1.l', label: `BTN · 1.L`, x: lx, y: y1 },
      { componentId: comp.id, pinName: '1.r', label: `BTN · 1.R`, x: rx, y: y1 },
      { componentId: comp.id, pinName: '2.l', label: `BTN · 2.L`, x: lx, y: y2 },
      { componentId: comp.id, pinName: '2.r', label: `BTN · 2.R`, x: rx, y: y2 },
    ];
  }

  return [];
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SNAP_RADIUS = 22; // px

export const WorkbenchCanvas: React.FC<WorkbenchCanvasProps> = ({
  placedComponents,
  wires,
  validation,
  onRemoveComponent,
  onAddWire,
  onRemoveWire,
  ledStates,
  onButtonPressChange,
  buttonPressed,
  currentWireColor,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const unoRef = useRef<WokwiElement | null>(null);

  // Map: "componentId:pinName" → PinAnchor
  const [pinAnchors, setPinAnchors] = useState<Map<string, PinAnchor>>(new Map());

  // Wire interaction state
  const [activeWireFrom, setActiveWireFrom] = useState<PinAnchor | null>(null);
  const [hoveredPin, setHoveredPin] = useState<PinAnchor | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // ── Build pin anchor map whenever components or Uno ref changes ──────────────
  const rebuildAnchors = useCallback(() => {
    const map = new Map<string, PinAnchor>();

    // Uno pins from live pinInfo
    if (unoRef.current?.pinInfo) {
      for (const p of unoRef.current.pinInfo) {
        const { x, y } = unoAnchor(p);
        // Friendly label
        let label = `UNO · ${p.name}`;
        if (p.name.startsWith('GND')) label = `UNO · GND`;
        else if (p.name === '5V') label = `UNO · 5V`;
        else if (/^\d+$/.test(p.name)) label = `UNO · D${p.name}`;
        map.set(`uno:${p.name}`, { componentId: 'uno', pinName: p.name, x, y, label });
      }
    } else {
      // Fallback: hardcoded anchors based on verified pinInfo values
      const UNO_STATIC_PINS: { name: string; x: number; y: number }[] = [
        { name: 'GND.1',  x: 115.5, y: 9     },
        { name: '13',     x: 125,   y: 9     },
        { name: '12',     x: 134.5, y: 9     },
        { name: '11',     x: 144,   y: 9     },
        { name: '10',     x: 153.5, y: 9     },
        { name: '9',      x: 163,   y: 9     },
        { name: '8',      x: 172.5, y: 9     },
        { name: '7',      x: 191,   y: 9     },
        { name: '6',      x: 200.5, y: 9     },
        { name: '5',      x: 210,   y: 9     },
        { name: '4',      x: 219.5, y: 9     },
        { name: '3',      x: 229,   y: 9     },
        { name: '2',      x: 236.5, y: 9     },
        { name: '1',      x: 248,   y: 9     },
        { name: '0',      x: 257.5, y: 9     },
        { name: 'GND.2',  x: 169.5, y: 191.5 },
        { name: '5V',     x: 160,   y: 191.5 },
        { name: 'GND.3',  x: 179,   y: 191.5 },
        { name: 'RESET',  x: 150,   y: 191.5 },
        { name: '3.3V',   x: 141,   y: 191.5 },
        { name: 'VIN',    x: 131.5, y: 191.5 },
        { name: 'A0',     x: 198,   y: 191.5 },
        { name: 'A1',     x: 207.5, y: 191.5 },
        { name: 'A2',     x: 217,   y: 191.5 },
        { name: 'A3',     x: 226.5, y: 191.5 },
        { name: 'A4',     x: 236,   y: 191.5 },
        { name: 'A5',     x: 245.5, y: 191.5 },
      ];
      for (const p of UNO_STATIC_PINS) {
        const { x, y } = unoAnchor(p);
        let label = `UNO · ${p.name}`;
        if (p.name.startsWith('GND')) label = `UNO · GND`;
        else if (p.name === '5V') label = `UNO · 5V`;
        else if (/^\d+$/.test(p.name)) label = `UNO · D${p.name}`;
        map.set(`uno:${p.name}`, { componentId: 'uno', pinName: p.name, x, y, label });
      }
    }

    // Placed component pins
    for (const comp of placedComponents) {
      for (const anchor of placedComponentAnchors(comp)) {
        map.set(`${anchor.componentId}:${anchor.pinName}`, anchor);
      }
    }

    setPinAnchors(map);
  }, [placedComponents]);

  // Initial anchor build + re-build when Uno mounts
  useEffect(() => {
    // Small delay to let the Wokwi custom element hydrate and populate pinInfo
    const timer = setTimeout(rebuildAnchors, 120);
    return () => clearTimeout(timer);
  }, [rebuildAnchors]);

  // ResizeObserver: re-compute anchors if canvas resizes
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(rebuildAnchors);
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [rebuildAnchors]);

  // Escape key → cancel active wire
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveWireFrom(null);
        setMousePos(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Mouse tracking ────────────────────────────────────────────────────────────
  const getCanvasPos = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const findNearestPin = useCallback(
    (pos: { x: number; y: number }): PinAnchor | null => {
      let best: PinAnchor | null = null;
      let bestDist = SNAP_RADIUS;
      for (const anchor of pinAnchors.values()) {
        const d = Math.hypot(anchor.x - pos.x, anchor.y - pos.y);
        if (d < bestDist) {
          bestDist = d;
          best = anchor;
        }
      }
      return best;
    },
    [pinAnchors],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const pos = getCanvasPos(e);
      setMousePos(pos);
      setHoveredPin(findNearestPin(pos));
    },
    [getCanvasPos, findNearestPin],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPin(null);
    setMousePos(null);
  }, []);

  const handleCanvasClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const pos = getCanvasPos(e);
      const nearPin = findNearestPin(pos);

      if (!nearPin) {
        // Clicked empty space → cancel wire
        setActiveWireFrom(null);
        setSelectedWireId(null);
        return;
      }

      if (!activeWireFrom) {
        // Start wire
        setActiveWireFrom(nearPin);
        setSelectedWireId(null);
      } else {
        // Complete wire — don't allow self-connection
        const isSame =
          nearPin.componentId === activeWireFrom.componentId &&
          nearPin.pinName === activeWireFrom.pinName;

        if (!isSame) {
          const newWire: CircuitWire = {
            id: uniqueWireId(),
            from: { componentId: activeWireFrom.componentId, pinName: activeWireFrom.pinName },
            to:   { componentId: nearPin.componentId, pinName: nearPin.pinName },
            color: currentWireColor,
          };
          onAddWire(newWire);
        }
        setActiveWireFrom(null);
      }
    },
    [activeWireFrom, currentWireColor, findNearestPin, getCanvasPos, onAddWire],
  );

  // ── LED color helpers ─────────────────────────────────────────────────────────
  const ledColorName = (color?: string) => {
    if (color === 'red') return 'red';
    if (color === 'yellow') return 'yellow';
    if (color === 'green') return 'green';
    return 'red';
  };

  // Find validation binding for LED
  const getLedBinding = (compId: string) =>
    validation?.leds.find((l) => l.componentId === compId);

  // Find validation binding for button
  const getBtnBinding = (compId: string) =>
    validation?.pushbuttons.find((p) => p.componentId === compId);

  // ── Canvas height ─────────────────────────────────────────────────────────────
  const canvasHeight = Math.max(UNO_H_PX + UNO_TOP + 40, 420);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '6px',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── Fault / Warning Banners ───────────────────────────────────────────── */}
      {validation && (validation.faults.length > 0 || validation.warnings.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {validation.faults.map((msg, i) => (
            <div
              key={`fault-${i}`}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--crimson-fault)',
              }}
            >
              <span>⚡</span>
              <span>{msg}</span>
            </div>
          ))}
          {validation.warnings.map((msg, i) => (
            <div
              key={`warn-${i}`}
              style={{
                backgroundColor: 'rgba(250, 204, 21, 0.07)',
                borderBottom: '1px solid rgba(250, 204, 21, 0.3)',
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--amber-xp)',
              }}
            >
              <span>⚠</span>
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main Workbench Canvas ─────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        style={{
          position: 'relative',
          width: '100%',
          height: `${canvasHeight}px`,
          cursor: activeWireFrom ? 'crosshair' : hoveredPin ? 'pointer' : 'default',
          overflow: 'hidden',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleCanvasClick}
      >
        {/* ── Arduino Uno ───────────────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: UNO_LEFT,
            top: UNO_TOP,
            width: UNO_W_PX,
            height: UNO_H_PX,
          }}
        >
          <wokwi-arduino-uno
            ref={(el: WokwiElement | null) => {
              unoRef.current = el;
              // Rebuild once element has connected and populated pinInfo
              if (el) setTimeout(rebuildAnchors, 200);
            }}
            style={{ width: '100%', height: '100%', display: 'block' } as unknown as CSSStyleDeclaration}
          />
        </div>

        {/* ── Placed Components ─────────────────────────────────────────────── */}
        {placedComponents.map((comp) => {
          const slot = COMPONENT_SLOTS[comp.id];
          if (!slot) return null;

          if (comp.type === 'led') {
            const isLit = !getLedBinding(comp.id)?.isReversePolarity && (ledStates[comp.id] ?? false);
            const binding = getLedBinding(comp.id);
            const hasOvercurrent = binding?.status === 'overcurrent';

            return (
              <div
                key={comp.id}
                style={{
                  position: 'absolute',
                  left: slot.x,
                  top: slot.y,
                  width: LED_W_PX,
                  height: LED_H_PX,
                }}
                title={`${comp.color?.toUpperCase()} LED — ${binding?.status ?? 'disconnected'}`}
              >
                <wokwi-led
                  color={ledColorName(comp.color)}
                  ref={(el: any) => {
                    if (el) {
                      el.value = isLit;
                      el.brightness = isLit ? 1 : 0;
                    }
                  }}
                  style={{ width: '100%', height: '100%', display: 'block' } as unknown as CSSStyleDeclaration}
                />
                {/* Overcurrent amber badge */}
                {hasOvercurrent && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      backgroundColor: 'var(--amber-xp)',
                      color: '#080a08',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                  >
                    !
                  </div>
                )}
                {/* Remove button */}
                <RemoveBtn onClick={() => onRemoveComponent(comp.id)} />
              </div>
            );
          }

          if (comp.type === 'resistor') {
            return (
              <div
                key={comp.id}
                style={{
                  position: 'absolute',
                  left: slot.x,
                  top: slot.y,
                  width: RES_W_PX,
                  height: RES_H_PX,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={`220Ω Resistor`}
              >
                <wokwi-resistor
                  value="220"
                  style={{ width: '100%', height: '100%', display: 'block' } as unknown as CSSStyleDeclaration}
                />
                <RemoveBtn onClick={() => onRemoveComponent(comp.id)} />
              </div>
            );
          }

          if (comp.type === 'pushbutton') {
            const binding = getBtnBinding(comp.id);
            const isMissingGnd = binding?.status === 'missing_gnd';

            return (
              <div
                key={comp.id}
                style={{
                  position: 'absolute',
                  left: slot.x,
                  top: slot.y,
                  width: BTN_W_PX,
                  height: BTN_H_PX,
                  cursor: 'pointer',
                }}
                title={`Crosswalk Pushbutton — ${binding?.status ?? 'disconnected'}`}
                onMouseDown={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  // Only fire if this button is validly wired (gated to prevent phantom presses)
                  if (binding?.status === 'valid') onButtonPressChange(true);
                }}
                onMouseUp={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (binding?.status === 'valid') onButtonPressChange(false);
                }}
                onMouseLeave={() => {
                  if (binding?.status === 'valid') onButtonPressChange(false);
                }}
              >
                <wokwi-pushbutton
                  color="blue"
                  pressed={buttonPressed ? (true as unknown as boolean) : (false as unknown as boolean)}
                  style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' } as unknown as CSSStyleDeclaration}
                />
                {isMissingGnd && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      backgroundColor: 'var(--crimson-fault)',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      fontSize: 10,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      zIndex: 20,
                    }}
                  >
                    !
                  </div>
                )}
                <RemoveBtn onClick={() => onRemoveComponent(comp.id)} />
              </div>
            );
          }

          return null;
        })}

        {/* ── Pin Snap Ring + Tooltip ───────────────────────────────────────── */}
        {hoveredPin && mousePos && (
          <>
            {/* Magnetic snap ring */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 15,
                overflow: 'visible',
              }}
            >
              <circle
                cx={hoveredPin.x}
                cy={hoveredPin.y}
                r={9}
                fill="none"
                stroke={activeWireFrom ? '#38bdf8' : '#c6ff00'}
                strokeWidth={2}
                opacity={0.9}
                style={{ filter: 'drop-shadow(0 0 5px #c6ff00)' }}
              />
              <circle
                cx={hoveredPin.x}
                cy={hoveredPin.y}
                r={3}
                fill={activeWireFrom ? '#38bdf8' : '#c6ff00'}
                opacity={0.9}
              />
            </svg>

            {/* Pin label tooltip */}
            <div
              style={{
                position: 'absolute',
                left: hoveredPin.x + 14,
                top: hoveredPin.y - 12,
                backgroundColor: '#0d1409',
                border: '1px solid var(--border-active)',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--volt-lime)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 30,
              }}
            >
              {hoveredPin.label}
            </div>
          </>
        )}

        {/* Active wire start indicator */}
        {activeWireFrom && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 14,
              overflow: 'visible',
            }}
          >
            <circle
              cx={activeWireFrom.x}
              cy={activeWireFrom.y}
              r={6}
              fill={currentWireColor}
              opacity={0.8}
              style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
            />
          </svg>
        )}

        {/* ── SVG Wire Overlay (renders committed + live wires) ─────────────── */}
        <WireOverlay
          wires={wires}
          pins={pinAnchors}
          activeWireFrom={activeWireFrom}
          mousePos={mousePos}
          selectedWireId={selectedWireId}
          onSelectWire={setSelectedWireId}
          onDeleteWire={onRemoveWire}
          currentWireColor={currentWireColor}
        />

        {/* ── Empty-state hint ──────────────────────────────────────────────── */}
        {placedComponents.length === 0 && (
          <div
            style={{
              position: 'absolute',
              right: 24,
              top: '50%',
              transform: 'translateY(-50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
                lineHeight: '1.6',
              }}
            >
              Select parts from the
              <br />
              Mission Kit tray above
              <br />
              then click pins to wire them.
            </div>
          </div>
        )}

        {/* ── Active wire label ─────────────────────────────────────────────── */}
        {activeWireFrom && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid var(--cyan-telemetry)',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--cyan-telemetry)',
              pointerEvents: 'none',
              zIndex: 25,
            }}
          >
            Wiring from <strong>{activeWireFrom.label}</strong> — click target pin or Esc to cancel
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Remove button overlay ────────────────────────────────────────────────────

const RemoveBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    title="Remove component"
    style={{
      position: 'absolute',
      top: -8,
      left: -8,
      width: 16,
      height: 16,
      borderRadius: '50%',
      backgroundColor: '#ef4444',
      color: '#fff',
      border: 'none',
      fontSize: 10,
      fontWeight: 900,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      lineHeight: 1,
      padding: 0,
    }}
  >
    ×
  </button>
);
