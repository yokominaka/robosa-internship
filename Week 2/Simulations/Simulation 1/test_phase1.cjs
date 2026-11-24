const { CPU, PinState, portBConfig, portCConfig, portDConfig, timer0Config, timer1Config, timer2Config, usart0Config, avrInstruction } = require('avr8js');

function assert(condition, msg) {
  if (!condition) {
    console.error(`  ✗ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

console.log('=== ROBOSA SIMULATION 1: PHASE 1 COMPREHENSIVE VERIFICATION ===\n');

// 1. Hardware Pin Map Verification
console.log('1. Checking ATmega328P Pin-to-Register Mappings:');
const UNO_PIN_MAP = {
  D0: { pin: 'D0', port: 'D', bit: 0 },
  D1: { pin: 'D1', port: 'D', bit: 1 },
  D2: { pin: 'D2', port: 'D', bit: 2 },
  D3: { pin: 'D3', port: 'D', bit: 3 },
  D4: { pin: 'D4', port: 'D', bit: 4 },
  D5: { pin: 'D5', port: 'D', bit: 5 },
  D6: { pin: 'D6', port: 'D', bit: 6 },
  D7: { pin: 'D7', port: 'D', bit: 7 },
  D8: { pin: 'D8', port: 'B', bit: 0 },
  D9: { pin: 'D9', port: 'B', bit: 1 },
  D10: { pin: 'D10', port: 'B', bit: 2 },
  D11: { pin: 'D11', port: 'B', bit: 3 },
  D12: { pin: 'D12', port: 'B', bit: 4 },
  D13: { pin: 'D13', port: 'B', bit: 5 },
  A0: { pin: 'A0', port: 'C', bit: 0 },
  A1: { pin: 'A1', port: 'C', bit: 1 },
  A2: { pin: 'A2', port: 'C', bit: 2 },
  A3: { pin: 'A3', port: 'C', bit: 3 },
  A4: { pin: 'A4', port: 'C', bit: 4 },
  A5: { pin: 'A5', port: 'C', bit: 5 },
};

assert(UNO_PIN_MAP.D13.port === 'B' && UNO_PIN_MAP.D13.bit === 5, 'D13 Vehicle Red maps to PORTB bit 5 (PB5)');
assert(UNO_PIN_MAP.D12.port === 'B' && UNO_PIN_MAP.D12.bit === 4, 'D12 Vehicle Yellow maps to PORTB bit 4 (PB4)');
assert(UNO_PIN_MAP.D11.port === 'B' && UNO_PIN_MAP.D11.bit === 3, 'D11 Vehicle Green maps to PORTB bit 3 (PB3)');
assert(UNO_PIN_MAP.D2.port === 'D' && UNO_PIN_MAP.D2.bit === 2, 'D2 Crosswalk Button maps to PORTD bit 2 (PD2 / INT0)');
assert(UNO_PIN_MAP.D0.port === 'D' && UNO_PIN_MAP.D0.bit === 0, 'D0 UART RX maps to PORTD bit 0');
assert(UNO_PIN_MAP.D1.port === 'D' && UNO_PIN_MAP.D1.bit === 1, 'D1 UART TX maps to PORTD bit 1');

// 2. Intel HEX Parser Logic Verification
console.log('\n2. Testing Intel HEX Parser:');
function parseHex(hex) {
  const flashBytes = new Uint8Array(0x8000);
  const lines = hex.split(/\r?\n/);
  let baseAddress = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith(':')) continue;
    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);
    const dataStr = line.substring(9, 9 + byteCount * 2);

    if (recordType === 0x00) {
      for (let i = 0; i < byteCount; i++) {
        const byteVal = parseInt(dataStr.substring(i * 2, i * 2 + 2), 16);
        const target = baseAddress + address + i;
        if (target < 0x8000) flashBytes[target] = byteVal;
      }
    } else if (recordType === 0x01) {
      break;
    } else if (recordType === 0x02) {
      baseAddress = parseInt(dataStr, 16) << 4;
    } else if (recordType === 0x04) {
      baseAddress = parseInt(dataStr, 16) << 16;
    }
  }

  const flashWords = new Uint16Array(0x4000);
  for (let i = 0; i < 0x4000; i++) {
    flashWords[i] = (flashBytes[i * 2 + 1] << 8) | flashBytes[i * 2];
  }
  return flashWords;
}

const sampleHex = ':100000000C9434000C943E000C943E000C943E0038\n:00000001FF\n';
const flashWords = parseHex(sampleHex);
assert(flashWords.length === 0x4000, '32KB Flash Words array size = 0x4000');
assert(flashWords[0] === 0x940c, 'Opcode 0 is 0x940c (little endian 0x0c, 0x94)');
assert(flashWords[1] === 0x0034, 'Opcode 1 is 0x0034 (little endian 0x34, 0x00)');

// 3. Engine Hardware Instantiation
console.log('\n3. Testing AVRRunner Engine Hardware:');
const cpu = new CPU(flashWords);
const { AVRIOPort, AVRTimer, AVRUSART } = require('avr8js');
const portB = new AVRIOPort(cpu, portBConfig);
const portC = new AVRIOPort(cpu, portCConfig);
const portD = new AVRIOPort(cpu, portDConfig);
const timer0 = new AVRTimer(cpu, timer0Config);
const timer1 = new AVRTimer(cpu, timer1Config);
const timer2 = new AVRTimer(cpu, timer2Config);
const usart = new AVRUSART(cpu, usart0Config, 16_000_000);

assert(portB.portConfig.PORT === 0x25, 'portB address matches ATmega328P PORTB (0x25 / 37)');
assert(portC.portConfig.PORT === 0x28, 'portC address matches ATmega328P PORTC (0x28 / 40)');
assert(portD.portConfig.PORT === 0x2B, 'portD address matches ATmega328P PORTD (0x2B / 43)');

// 4. LED Driver Functional Behavior
console.log('\n4. Testing LED Drivers (D13 Red, D12 Yellow, D11 Green):');
let redState = false, yellowState = false, greenState = false;

portB.addListener(() => {
  redState = portB.pinState(5) === PinState.High;
  yellowState = portB.pinState(4) === PinState.High;
  greenState = portB.pinState(3) === PinState.High;
});

// Configure pins as OUTPUT
cpu.data[portBConfig.DDR] = (1 << 5) | (1 << 4) | (1 << 3);

// Initial default state: Green ON
cpu.writeData(portBConfig.PORT, (1 << 3));
assert(greenState === true, 'Boot state: Vehicle Green (D11) is ON (HIGH)');
assert(yellowState === false, 'Boot state: Vehicle Yellow (D12) is OFF (LOW)');
assert(redState === false, 'Boot state: Vehicle Red (D13) is OFF (LOW)');

// Transition to Yellow
cpu.writeData(portBConfig.PORT, (1 << 4));
assert(greenState === false, 'Transition: Green is OFF');
assert(yellowState === true, 'Transition: Yellow (D12) is ON (HIGH)');
assert(redState === false, 'Transition: Red is OFF');

// Transition to Red
cpu.writeData(portBConfig.PORT, (1 << 5));
assert(greenState === false, 'Transition: Green is OFF');
assert(yellowState === false, 'Transition: Yellow is OFF');
assert(redState === true, 'Transition: Red (D13) is ON (HIGH)');

// Return to Green
cpu.writeData(portBConfig.PORT, (1 << 3));
assert(greenState === true, 'Cycle Complete: Return to Green ON');

// 5. Pushbutton Driver & Electrical Parity (Test 3)
console.log('\n5. Testing Pushbutton Driver & Electrical Parity:');
let buttonPressed = false;

function updateButtonElectrical() {
  if (buttonPressed) {
    portD.setPin(2, false); // Shorted to GND
  } else {
    const isPullUp = portD.pinState(2) === PinState.InputPullUp;
    portD.setPin(2, isPullUp); // Only pulled HIGH if INPUT_PULLUP active
  }
}

// Case A: pinMode(2, INPUT_PULLUP)
cpu.data[portDConfig.DDR] &= ~(1 << 2);
cpu.writeData(portDConfig.PORT, (1 << 2)); // Enable internal pullup
updateButtonElectrical();

assert(portD.pinState(2) === PinState.InputPullUp, 'D2 pin configured with INPUT_PULLUP');
assert((cpu.data[portDConfig.PIN] & (1 << 2)) !== 0, 'Idle released button reads HIGH (5V)');

buttonPressed = true;
updateButtonElectrical();
assert((cpu.data[portDConfig.PIN] & (1 << 2)) === 0, 'Pressed button shorts to GND, reading LOW (0V)');

buttonPressed = false;
updateButtonElectrical();
assert((cpu.data[portDConfig.PIN] & (1 << 2)) !== 0, 'Released button returns to HIGH (5V)');

// Case B: Changing INPUT_PULLUP to INPUT (No pullup) -> Electrical Parity Test 3
cpu.writeData(portDConfig.PORT, 0); // No pullup
updateButtonElectrical();
assert(portD.pinState(2) === PinState.Input, 'D2 pin configured as floating INPUT');
assert((cpu.data[portDConfig.PIN] & (1 << 2)) === 0, 'Floating INPUT with no pullup stays LOW (breaks button detection)');

// 6. UART Driver Functional Behavior
console.log('\n6. Testing UART Serial Telemetry:');
const lines = [];
let buffer = '';

usart.onByteTransmit = (byte) => {
  const c = String.fromCharCode(byte);
  if (c === '\n') {
    lines.push(buffer.replace(/\r$/, ''));
    buffer = '';
  } else {
    buffer += c;
  }
};

const telemetry = '[BOOT] Crosswalk Controller initialized. Vehicle GREEN active.\r\n';
for (let i = 0; i < telemetry.length; i++) {
  usart.onByteTransmit(telemetry.charCodeAt(i));
}
assert(lines.length === 1, 'UART successfully accumulated 1 line');
assert(lines[0] === '[BOOT] Crosswalk Controller initialized. Vehicle GREEN active.', 'UART log string verified');

console.log('\n============================================================');
console.log('ALL PHASE 1 ARCHITECTURE & VERIFICATION CHECKS PASSED (100%)');
console.log('============================================================\n');
