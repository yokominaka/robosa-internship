import type { AVRIOPort } from 'avr8js';
import type { AVRRunner } from './AVRRunner';
import type { PinMapping, UnoPin } from './types';

export const UNO_PIN_MAP: Record<UnoPin, PinMapping> = {
  // Digital Pins 0 to 7 -> PORTD bits 0 to 7
  D0: { pin: 'D0', port: 'D', bit: 0 },
  D1: { pin: 'D1', port: 'D', bit: 1 },
  D2: { pin: 'D2', port: 'D', bit: 2 },
  D3: { pin: 'D3', port: 'D', bit: 3 },
  D4: { pin: 'D4', port: 'D', bit: 4 },
  D5: { pin: 'D5', port: 'D', bit: 5 },
  D6: { pin: 'D6', port: 'D', bit: 6 },
  D7: { pin: 'D7', port: 'D', bit: 7 },

  // Digital Pins 8 to 13 -> PORTB bits 0 to 5
  D8: { pin: 'D8', port: 'B', bit: 0 },
  D9: { pin: 'D9', port: 'B', bit: 1 },
  D10: { pin: 'D10', port: 'B', bit: 2 },
  D11: { pin: 'D11', port: 'B', bit: 3 },
  D12: { pin: 'D12', port: 'B', bit: 4 },
  D13: { pin: 'D13', port: 'B', bit: 5 },

  // Analog Pins A0 to A5 -> PORTC bits 0 to 5
  A0: { pin: 'A0', port: 'C', bit: 0 },
  A1: { pin: 'A1', port: 'C', bit: 1 },
  A2: { pin: 'A2', port: 'C', bit: 2 },
  A3: { pin: 'A3', port: 'C', bit: 3 },
  A4: { pin: 'A4', port: 'C', bit: 4 },
  A5: { pin: 'A5', port: 'C', bit: 5 },
};

export interface ResolvedPin {
  port: AVRIOPort;
  bit: number;
  mapping: PinMapping;
}

export function resolvePin(runner: AVRRunner, pin: UnoPin): ResolvedPin {
  const mapping = UNO_PIN_MAP[pin];
  if (!mapping) {
    throw new Error(`Unknown Uno pin: ${pin}`);
  }

  let port: AVRIOPort;
  switch (mapping.port) {
    case 'B':
      port = runner.portB;
      break;
    case 'C':
      port = runner.portC;
      break;
    case 'D':
      port = runner.portD;
      break;
    default:
      throw new Error(`Unsupported port: ${mapping.port}`);
  }

  return { port, bit: mapping.bit, mapping };
}
