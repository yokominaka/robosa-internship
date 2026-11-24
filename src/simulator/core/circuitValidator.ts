import type { UnoPin } from './types';

export interface PlacedComponent {
  id: string;
  type: 'led' | 'resistor' | 'pushbutton';
  color?: string; // For LED ('red' | 'yellow' | 'green') or button
  value?: string | number; // e.g. 220 for resistor
  x: number;
  y: number;
  rotation?: number; // 0, 90, 180, 270
}

export interface CircuitWire {
  id: string;
  from: { componentId: string; pinName: string };
  to: { componentId: string; pinName: string };
  color: string;
}

export interface LedBinding {
  componentId: string;
  color: 'red' | 'yellow' | 'green';
  boundPin?: UnoPin;
  hasResistor: boolean;
  isReversePolarity: boolean;
  status: 'valid' | 'overcurrent' | 'reverse_polarity' | 'disconnected';
  message?: string;
}

export interface PushbuttonBinding {
  componentId: string;
  boundPin?: UnoPin;
  hasGndReturn: boolean;
  status: 'valid' | 'missing_gnd' | 'disconnected';
  message?: string;
}

export interface CircuitValidationResult {
  isValid: boolean;
  leds: LedBinding[];
  pushbuttons: PushbuttonBinding[];
  faults: string[];
  warnings: string[];
  task1Complete: boolean; // Red, Yellow, Green wired to D13, D12, D11 with resistors
  task2Complete: boolean; // Button wired to D2 and GND
}

// Helper to normalize Uno pin names (e.g. '13' -> 'D13', 'GND.1' -> 'GND')
function normalizeUnoPin(pinName: string): { isUnoDigital: boolean; pin?: UnoPin; isGnd: boolean; isVcc: boolean } {
  if (pinName.startsWith('GND')) {
    return { isUnoDigital: false, isGnd: true, isVcc: false };
  }
  if (pinName === '5V') {
    return { isUnoDigital: false, isGnd: false, isVcc: true };
  }
  const digitalMatch = pinName.match(/^D?(\d+)$/);
  if (digitalMatch) {
    const num = parseInt(digitalMatch[1], 10);
    if (num >= 0 && num <= 13) {
      return { isUnoDigital: true, pin: `D${num}` as UnoPin, isGnd: false, isVcc: false };
    }
  }
  return { isUnoDigital: false, isGnd: false, isVcc: false };
}

/**
 * Builds an undirected adjacency graph of the student's wiring and placed components,
 * validating real electronics physics:
 * - Dynamic pin binding
 * - Series resistor (220Ω) overcurrent check
 * - LED polarity verification
 * - Pushbutton switched path to GND verification
 */
export function validateCircuit(
  components: PlacedComponent[],
  wires: CircuitWire[]
): CircuitValidationResult {
  // 1. Build adjacency list of connected pin keys: "componentId:pinName"
  const adj = new Map<string, Set<string>>();

  function addEdge(a: string, b: string) {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }

  // Add internal component continuity
  for (const comp of components) {
    if (comp.type === 'resistor') {
      // Pin 1 connects to Pin 2 through resistance
      addEdge(`${comp.id}:1`, `${comp.id}:2`);
    } else if (comp.type === 'pushbutton') {
      // 1.l connects to 1.r (terminal pair 1)
      addEdge(`${comp.id}:1.l`, `${comp.id}:1.r`);
      // 2.l connects to 2.r (terminal pair 2)
      addEdge(`${comp.id}:2.l`, `${comp.id}:2.r`);
    }
  }

  // Uno internal ground continuity (GND.1, GND.2, GND.3 all connect to common ground)
  addEdge('uno:GND.1', 'uno:GND.2');
  addEdge('uno:GND.2', 'uno:GND.3');

  // Add jumper wires
  for (const wire of wires) {
    const keyA = `${wire.from.componentId}:${wire.from.pinName}`;
    const keyB = `${wire.to.componentId}:${wire.to.pinName}`;
    addEdge(keyA, keyB);
  }

  // Graph traversal helper to find all reachable pins from a starting pin key
  function getReachableNodes(startKey: string): { visited: Set<string>; pathComponents: Set<string> } {
    const visited = new Set<string>();
    const pathComponents = new Set<string>();
    const queue: string[] = [startKey];
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const [compId] = current.split(':');
      pathComponents.add(compId);

      const neighbors = adj.get(current);
      if (neighbors) {
        for (const next of neighbors) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
    }

    return { visited, pathComponents };
  }

  const faults: string[] = [];
  const warnings: string[] = [];
  const ledBindings: LedBinding[] = [];
  const pushbuttonBindings: PushbuttonBinding[] = [];

  // 2. Validate LEDs
  const ledComponents = components.filter((c) => c.type === 'led');

  for (const led of ledComponents) {
    const color = (led.color || 'red') as 'red' | 'yellow' | 'green';
    const anodeKey = `${led.id}:A`;
    const cathodeKey = `${led.id}:C`;

    // Trace from Anode (A)
    const { visited: fromAnode, pathComponents: anodeComponents } = getReachableNodes(anodeKey);
    // Trace from Cathode (C)
    const { visited: fromCathode, pathComponents: cathodeComponents } = getReachableNodes(cathodeKey);

    // Look for Uno pins on each side
    let anodeDigitalPin: UnoPin | undefined;
    let cathodeDigitalPin: UnoPin | undefined;
    let anodeHasGnd = false;
    let cathodeHasGnd = false;

    for (const key of fromAnode) {
      if (key.startsWith('uno:')) {
        const pinName = key.split(':')[1];
        const norm = normalizeUnoPin(pinName);
        if (norm.isUnoDigital) anodeDigitalPin = norm.pin;
        if (norm.isGnd) anodeHasGnd = true;
      }
    }

    for (const key of fromCathode) {
      if (key.startsWith('uno:')) {
        const pinName = key.split(':')[1];
        const norm = normalizeUnoPin(pinName);
        if (norm.isUnoDigital) cathodeDigitalPin = norm.pin;
        if (norm.isGnd) cathodeHasGnd = true;
      }
    }

    // Check for Series Resistors (220Ω) along the combined path
    const hasResistor =
      Array.from(anodeComponents).some((id) => components.find((c) => c.id === id && c.type === 'resistor')) ||
      Array.from(cathodeComponents).some((id) => components.find((c) => c.id === id && c.type === 'resistor'));

    if (anodeDigitalPin && cathodeHasGnd) {
      // Correct forward bias: Dx -> LED:A, and LED:C -> GND
      if (!hasResistor) {
        const warnMsg = `OVERCURRENT WARNING: ${color.toUpperCase()} LED connected directly to ${anodeDigitalPin} without a 220Ω series resistor. Add a resistor to prevent burnout.`;
        warnings.push(warnMsg);
        ledBindings.push({
          componentId: led.id,
          color,
          boundPin: anodeDigitalPin,
          hasResistor: false,
          isReversePolarity: false,
          status: 'overcurrent',
          message: warnMsg,
        });
      } else {
        ledBindings.push({
          componentId: led.id,
          color,
          boundPin: anodeDigitalPin,
          hasResistor: true,
          isReversePolarity: false,
          status: 'valid',
        });
      }
    } else if (cathodeDigitalPin && anodeHasGnd) {
      // Reverse polarity: Dx -> LED:C, and LED:A -> GND
      const faultMsg = `REVERSE POLARITY: ${color.toUpperCase()} LED is reverse-biased (Cathode to ${cathodeDigitalPin}, Anode to GND). Current will be blocked.`;
      faults.push(faultMsg);
      ledBindings.push({
        componentId: led.id,
        color,
        boundPin: cathodeDigitalPin,
        hasResistor,
        isReversePolarity: true,
        status: 'reverse_polarity',
        message: faultMsg,
      });
    } else {
      ledBindings.push({
        componentId: led.id,
        color,
        hasResistor,
        isReversePolarity: false,
        status: 'disconnected',
        message: `${color.toUpperCase()} LED is not fully wired (needs Uno digital pin and GND).`,
      });
    }
  }

  // 3. Validate Pushbuttons
  const pbComponents = components.filter((c) => c.type === 'pushbutton');

  for (const pb of pbComponents) {
    // Group 1 pins: 1.l, 1.r
    const { visited: fromGroup1 } = getReachableNodes(`${pb.id}:1.l`);
    // Group 2 pins: 2.l, 2.r
    const { visited: fromGroup2 } = getReachableNodes(`${pb.id}:2.l`);

    let g1DigitalPin: UnoPin | undefined;
    let g1HasGnd = false;
    let g2DigitalPin: UnoPin | undefined;
    let g2HasGnd = false;

    for (const key of fromGroup1) {
      if (key.startsWith('uno:')) {
        const pinName = key.split(':')[1];
        const norm = normalizeUnoPin(pinName);
        if (norm.isUnoDigital) g1DigitalPin = norm.pin;
        if (norm.isGnd) g1HasGnd = true;
      }
    }

    for (const key of fromGroup2) {
      if (key.startsWith('uno:')) {
        const pinName = key.split(':')[1];
        const norm = normalizeUnoPin(pinName);
        if (norm.isUnoDigital) g2DigitalPin = norm.pin;
        if (norm.isGnd) g2HasGnd = true;
      }
    }

    const boundPin = g1DigitalPin || g2DigitalPin;
    const hasGndReturn = (g1DigitalPin && g2HasGnd) || (g2DigitalPin && g1HasGnd);

    if (boundPin && hasGndReturn) {
      pushbuttonBindings.push({
        componentId: pb.id,
        boundPin,
        hasGndReturn: true,
        status: 'valid',
      });
    } else if (boundPin && !hasGndReturn) {
      const faultMsg = `OPEN CIRCUIT: Pushbutton on ${boundPin} is missing its GND return connection.`;
      faults.push(faultMsg);
      pushbuttonBindings.push({
        componentId: pb.id,
        boundPin,
        hasGndReturn: false,
        status: 'missing_gnd',
        message: faultMsg,
      });
    } else {
      pushbuttonBindings.push({
        componentId: pb.id,
        hasGndReturn: false,
        status: 'disconnected',
        message: 'Pushbutton is not connected to a digital pin.',
      });
    }
  }

  // 4. Mission Task Evaluation
  // Task 1: Red on D13, Yellow on D12, Green on D11 with resistors
  const redOk = ledBindings.some((l) => l.color === 'red' && l.boundPin === 'D13' && l.hasResistor && !l.isReversePolarity);
  const yellowOk = ledBindings.some((l) => l.color === 'yellow' && l.boundPin === 'D12' && l.hasResistor && !l.isReversePolarity);
  const greenOk = ledBindings.some((l) => l.color === 'green' && l.boundPin === 'D11' && l.hasResistor && !l.isReversePolarity);
  const task1Complete = redOk && yellowOk && greenOk;

  // Task 2: Pushbutton on D2 with GND return
  const buttonOk = pushbuttonBindings.some((p) => p.boundPin === 'D2' && p.hasGndReturn);
  const task2Complete = buttonOk;

  return {
    isValid: faults.length === 0,
    leds: ledBindings,
    pushbuttons: pushbuttonBindings,
    faults,
    warnings,
    task1Complete,
    task2Complete,
  };
}
