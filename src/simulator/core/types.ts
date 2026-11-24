import type { AVRRunner } from './AVRRunner';

export type UnoDigitalPin =
  | 'D0'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'D4'
  | 'D5'
  | 'D6'
  | 'D7'
  | 'D8'
  | 'D9'
  | 'D10'
  | 'D11'
  | 'D12'
  | 'D13';

export type UnoAnalogPin = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5';

export type UnoPin = UnoDigitalPin | UnoAnalogPin;

export interface PinMapping {
  pin: UnoPin;
  port: 'B' | 'C' | 'D';
  bit: number;
}

export interface VirtualPeripheral {
  id: string;
  mount(runner: AVRRunner): void;
  tick?(cpuCycles: number): void;
  unmount(): void;
}

export interface NetlistComponentPinConnection {
  componentPin: string;
  targetPin: UnoPin | '5V' | 'GND' | string;
}

export interface NetlistComponent {
  id: string;
  type: 'led' | 'pushbutton' | 'uart' | 'resistor' | string;
  name: string;
  connections: Record<string, string>; // e.g. { anode: 'D13', cathode: 'GND' }
  properties?: Record<string, unknown>;
}

export interface CircuitNetlist {
  id: string;
  name: string;
  description: string;
  powerRails: {
    vcc: string; // '5V'
    gnd: string; // 'GND'
  };
  components: NetlistComponent[];
}
