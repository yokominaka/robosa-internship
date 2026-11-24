import type { CircuitNetlist } from '../../core/types';

export const CROSSWALK_NETLIST: CircuitNetlist = {
  id: 'crosswalk-controller',
  name: 'Smart Pedestrian Crosswalk Controller',
  description:
    '1-to-1 Arduino Uno parity circuit with 3 vehicle LEDs (Red D13, Yellow D12, Green D11), active-low pedestrian button (D2), and UART Serial telemetry.',
  powerRails: {
    vcc: '5V',
    gnd: 'GND',
  },
  components: [
    {
      id: 'led-red',
      type: 'led',
      name: 'Vehicle Red LED',
      connections: {
        anode: 'D13',
        cathode: 'GND',
      },
      properties: {
        color: 'red',
        resistorOhms: 220,
        mcuPort: 'PORTB',
        mcuBit: 5,
      },
    },
    {
      id: 'led-yellow',
      type: 'led',
      name: 'Vehicle Yellow LED',
      connections: {
        anode: 'D12',
        cathode: 'GND',
      },
      properties: {
        color: 'yellow',
        resistorOhms: 220,
        mcuPort: 'PORTB',
        mcuBit: 4,
      },
    },
    {
      id: 'led-green',
      type: 'led',
      name: 'Vehicle Green LED',
      connections: {
        anode: 'D11',
        cathode: 'GND',
      },
      properties: {
        color: 'green',
        resistorOhms: 220,
        mcuPort: 'PORTB',
        mcuBit: 3,
      },
    },
    {
      id: 'btn-crosswalk',
      type: 'pushbutton',
      name: 'Crosswalk Button',
      connections: {
        pin: 'D2',
        gnd: 'GND',
      },
      properties: {
        pullup: 'INPUT_PULLUP',
        mcuPort: 'PORTD',
        mcuBit: 2,
        activeLevel: 'LOW',
      },
    },
    {
      id: 'uart-telemetry',
      type: 'uart',
      name: 'UART Serial Telemetry',
      connections: {
        rx: 'D0',
        tx: 'D1',
      },
      properties: {
        baudRate: 9600,
        port: 'AVRUSART',
      },
    },
  ],
};
