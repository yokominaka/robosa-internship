/**
 * Parses an Intel HEX formatted string into a 16-bit word array (Uint16Array)
 * suitable for the ATmega328P program flash in avr8js (0x4000 words = 32KB).
 */
export function parseHex(hex: string): Uint16Array {
  // ATmega328P has 32KB of flash = 32768 bytes = 0x8000 bytes (0x4000 16-bit words)
  const FLASH_SIZE_BYTES = 0x8000;
  const FLASH_SIZE_WORDS = 0x4000;
  const flashBytes = new Uint8Array(FLASH_SIZE_BYTES);

  const lines = hex.split(/\r?\n/);
  let baseAddress = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith(':')) {
      continue;
    }

    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);
    const dataStr = line.substring(9, 9 + byteCount * 2);

    if (recordType === 0x00) {
      // Data record
      for (let i = 0; i < byteCount; i++) {
        const byteVal = parseInt(dataStr.substring(i * 2, i * 2 + 2), 16);
        const targetByteAddr = baseAddress + address + i;
        if (targetByteAddr < FLASH_SIZE_BYTES) {
          flashBytes[targetByteAddr] = byteVal;
        }
      }
    } else if (recordType === 0x01) {
      // End Of File record
      break;
    } else if (recordType === 0x02) {
      // Extended Segment Address record
      baseAddress = parseInt(dataStr, 16) << 4;
    } else if (recordType === 0x04) {
      // Extended Linear Address record
      baseAddress = parseInt(dataStr, 16) << 16;
    }
  }

  // Construct 16-bit little-endian instruction words
  const flashWords = new Uint16Array(FLASH_SIZE_WORDS);
  for (let i = 0; i < FLASH_SIZE_WORDS; i++) {
    const lowByte = flashBytes[i * 2];
    const highByte = flashBytes[i * 2 + 1];
    flashWords[i] = (highByte << 8) | lowByte;
  }

  return flashWords;
}
