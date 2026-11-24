import { type AVRIOPort, type GPIOListener } from 'avr8js';
import type { AVRRunner } from '../core/AVRRunner';
import type { UnoPin, VirtualPeripheral } from '../core/types';
import { resolvePin } from '../core/unoPinMap';

export class PushbuttonPeripheral implements VirtualPeripheral {
  public readonly id: string;
  public readonly pin: UnoPin;
  private onPinStateChange?: (isHigh: boolean) => void;

  private runner: AVRRunner | null = null;
  private port: AVRIOPort | null = null;
  private bit = 0;
  private pressed = false;
  private listener: GPIOListener | null = null;

  constructor(id: string, pin: UnoPin, onPinStateChange?: (isHigh: boolean) => void) {
    this.id = id;
    this.pin = pin;
    this.onPinStateChange = onPinStateChange;
  }

  public mount(runner: AVRRunner): void {
    this.runner = runner;
    const resolved = resolvePin(runner, this.pin);
    this.port = resolved.port;
    this.bit = resolved.bit;

    // ─── Critical fix: immediately drive the pin HIGH (released / not pressed) ───
    //
    // On a fresh ATmega328P, all DDR bits = 0 (INPUT, floating). The firmware's
    // setup() calls:  pinMode(PIN_BUTTON, INPUT_PULLUP)
    //
    // However setup() runs AFTER mount() completes. If we don't set the pin HIGH
    // right now, avr8js will see D2 = LOW as soon as the first loop() tick runs —
    // before INPUT_PULLUP is configured — and the state machine will immediately
    // see a "button pressed" event and start looping the crosswalk cycle.
    //
    // We unconditionally hold the pin HIGH here (simulating the external pull-up /
    // open switch condition) so the sketch reads HIGH = not pressed until the user
    // actually clicks the button in the UI.
    this.port.setPin(this.bit, true);

    // React to MCU register writes (e.g. pinMode switches between INPUT and INPUT_PULLUP)
    // so we can re-apply the correct electrical state if the firmware reconfigures the pin.
    this.listener = () => {
      this.applyElectricalState();
    };
    this.port.addListener(this.listener);
  }

  public unmount(): void {
    if (this.port && this.listener) {
      this.port.removeListener(this.listener);
      this.listener = null;
    }
    this.port = null;
    this.runner = null;
  }

  /**
   * Sets the physical button press state from the UI.
   *
   * - pressed = true  → switch shorted to GND  → pin driven LOW  → firmware reads LOW
   * - pressed = false → switch open             → pin driven HIGH → firmware reads HIGH
   */
  public setPressed(pressed: boolean): void {
    this.pressed = pressed;
    this.applyElectricalState();
  }

  public isPressed(): boolean {
    return this.pressed;
  }

  /**
   * Returns the current logical level on the pin.
   */
  public getPinLevel(): boolean {
    if (!this.runner || !this.port) return true; // default HIGH (not pressed)
    const pinRegVal = this.runner.cpu.data[this.port.portConfig.PIN];
    return (pinRegVal & (1 << this.bit)) !== 0;
  }

  /**
   * Drives the physical pin to the correct voltage:
   *   pressed → LOW  (shorted to GND — active-low button)
   *   released → HIGH (open switch; external/internal pull-up holds HIGH)
   *
   * We always drive HIGH when released instead of trying to detect INPUT_PULLUP
   * state from pinState(), which is unreliable before the sketch calls
   * pinMode(pin, INPUT_PULLUP) in setup().
   */
  private applyElectricalState(): void {
    if (!this.port) return;

    if (this.pressed) {
      // Active-low: short to GND
      this.port.setPin(this.bit, false);
    } else {
      // Released: hold HIGH (models open switch + pull-up resistor)
      // This is correct for INPUT_PULLUP (internal) and INPUT + external pull-up.
      this.port.setPin(this.bit, true);
    }

    this.onPinStateChange?.(this.getPinLevel());
  }
}
