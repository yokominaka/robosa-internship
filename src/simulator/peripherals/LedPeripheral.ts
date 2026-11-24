import { PinState, type AVRIOPort, type GPIOListener } from 'avr8js';
import type { AVRRunner } from '../core/AVRRunner';
import type { UnoPin, VirtualPeripheral } from '../core/types';
import { resolvePin } from '../core/unoPinMap';

export class LedPeripheral implements VirtualPeripheral {
  public readonly id: string;
  public readonly pin: UnoPin;
  private onChange: (isLit: boolean) => void;

  private port: AVRIOPort | null = null;
  private bit = 0;
  private listener: GPIOListener | null = null;
  private lastState = false;

  constructor(id: string, pin: UnoPin, onChange: (isLit: boolean) => void) {
    this.id = id;
    this.pin = pin;
    this.onChange = onChange;
  }

  /**
   * A real LED only lights when:
   *   1. The MCU has configured the pin as OUTPUT  (DDR bit = 1)
   *   2. The MCU is driving the pin HIGH            (PORT bit = 1 → PinState.High)
   *
   * Before setup() runs, all DDR bits are 0 (INPUT), so no LED should ever
   * appear lit immediately on mount — this prevents the "all LEDs on at start"
   * race-condition where pinState() fires before the sketch initialises.
   */
  private computeLit(): boolean {
    if (!this.port) return false;
    return this.port.pinState(this.bit) === PinState.High;
  }

  public mount(runner: AVRRunner): void {
    const resolved = resolvePin(runner, this.pin);
    this.port = resolved.port;
    this.bit = resolved.bit;

    // Start dark — sketch setup() will drive the correct initial state
    // (avoids the "all LEDs lit" glitch before DDR is configured as OUTPUT)
    this.lastState = false;
    this.onChange(false);

    // Subscribe to GPIO port register updates
    this.listener = () => {
      if (!this.port) return;
      const currentState = this.computeLit();
      if (currentState !== this.lastState) {
        this.lastState = currentState;
        this.onChange(currentState);
      }
    };

    this.port.addListener(this.listener);
  }

  public unmount(): void {
    if (this.port && this.listener) {
      this.port.removeListener(this.listener);
      this.listener = null;
    }
    // Notify off when unmounted so React state clears cleanly
    this.onChange(false);
    this.lastState = false;
    this.port = null;
  }

  public isLit(): boolean {
    return this.lastState;
  }
}
