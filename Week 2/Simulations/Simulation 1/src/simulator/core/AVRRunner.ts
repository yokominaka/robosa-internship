import {
  CPU,
  AVRIOPort,
  portBConfig,
  portCConfig,
  portDConfig,
  AVRTimer,
  timer0Config,
  timer1Config,
  timer2Config,
  AVRUSART,
  usart0Config,
  avrInstruction,
} from 'avr8js';
import type { VirtualPeripheral } from './types';

export class AVRRunner {
  readonly CPU_FREQ_HZ = 16_000_000;
  private flash: Uint16Array;

  public cpu!: CPU;
  public portB!: AVRIOPort;
  public portC!: AVRIOPort;
  public portD!: AVRIOPort;
  public timer0!: AVRTimer;
  public timer1!: AVRTimer;
  public timer2!: AVRTimer;
  public usart!: AVRUSART;

  private peripherals: VirtualPeripheral[] = [];
  private running = false;
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;

  constructor(flash?: Uint16Array) {
    this.flash = flash ?? new Uint16Array(0x4000);
    this.initHardware();
  }

  private initHardware(): void {
    // 1. CPU with 0x4000 flash words (32 KB program flash for ATmega328P)
    this.cpu = new CPU(this.flash);

    // 2. GPIO Ports: Port B (0x25), Port C (0x28), Port D (0x2B)
    this.portB = new AVRIOPort(this.cpu, portBConfig);
    this.portC = new AVRIOPort(this.cpu, portCConfig);
    this.portD = new AVRIOPort(this.cpu, portDConfig);

    // Auto-pullup handler: In ATmega328P, pinMode(pin, INPUT_PULLUP) enables internal pullup resistors.
    // In avr8js, if an external peripheral hasn't set the pin, an InputPullUp pin's PIN register bit
    // remains 0 (LOW) unless setPin(bit, true) is called.
    const setupPullups = (port: AVRIOPort) => {
      port.addListener(() => {
        for (let bit = 0; bit < 8; bit++) {
          if (port.pinState(bit) === 3 /* PinState.InputPullUp */) {
            port.setPin(bit, true);
          }
        }
      });
    };
    setupPullups(this.portB);
    setupPullups(this.portC);
    setupPullups(this.portD);

    // 3. Timers: timer0, timer1, timer2
    this.timer0 = new AVRTimer(this.cpu, timer0Config);
    this.timer1 = new AVRTimer(this.cpu, timer1Config);
    this.timer2 = new AVRTimer(this.cpu, timer2Config);

    // 4. USART: usart0 at 16 MHz
    this.usart = new AVRUSART(this.cpu, usart0Config, this.CPU_FREQ_HZ);
  }

  public mountPeripheral(peripheral: VirtualPeripheral): void {
    // Ensure no duplicate registration of the same peripheral ID
    this.unmountPeripheral(peripheral.id);
    this.peripherals.push(peripheral);
    peripheral.mount(this);
  }

  public unmountPeripheral(id: string): void {
    const index = this.peripherals.findIndex((p) => p.id === id);
    if (index >= 0) {
      const [peripheral] = this.peripherals.splice(index, 1);
      peripheral.unmount();
    }
  }

  public unmountAllPeripherals(): void {
    for (const peripheral of this.peripherals) {
      try {
        peripheral.unmount();
      } catch (err) {
        console.error(`Error unmounting peripheral ${peripheral.id}:`, err);
      }
    }
    this.peripherals = [];
  }

  public getPeripherals(): readonly VirtualPeripheral[] {
    return this.peripherals;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.scheduleFrame();
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      } else {
        clearTimeout(this.animationFrameId);
      }
      this.animationFrameId = null;
    }
  }

  /**
   * Resets the simulation CPU, timers, and USART registers.
   */
  public reset(): void {
    this.stop();
    this.cpu.reset();
    this.timer0.reset();
    this.timer1.reset();
    this.timer2.reset();
    this.usart.reset();
    // Zero out data SRAM
    this.cpu.data.fill(0);
    this.cpu.SP = this.cpu.data.length - 1;
    this.cpu.cycles = 0;
  }

  /**
   * Cleanly replaces the program flash, reinitializes CPU & peripherals,
   * completely unmounting old listeners to avoid any duplicate callbacks.
   */
  public loadProgram(flash: Uint16Array): void {
    this.stop();

    // Preserve mounted peripherals
    const currentPeripherals = [...this.peripherals];

    // Cleanly unmount all existing peripheral listeners
    for (const p of currentPeripherals) {
      try {
        p.unmount();
      } catch (err) {
        console.error(`Error unmounting peripheral ${p.id}:`, err);
      }
    }
    this.peripherals = [];

    // Reinitialize hardware with fresh flash memory
    this.flash = flash;
    this.initHardware();

    // Re-mount peripherals onto fresh hardware
    for (const p of currentPeripherals) {
      this.mountPeripheral(p);
    }
  }

  /**
   * Executes a specific number of CPU cycles synchronously.
   */
  public executeCycles(cyclesToExecute: number): void {
    const targetCycles = this.cpu.cycles + cyclesToExecute;
    while (this.cpu.cycles < targetCycles) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }

    for (const p of this.peripherals) {
      p.tick?.(this.cpu.cycles);
    }
  }

  private scheduleFrame(): void {
    if (!this.running) return;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(this.loopStep);
    } else {
      this.animationFrameId = setTimeout(() => this.loopStep(performance.now()), 16) as unknown as number;
    }
  }

  private loopStep = (currentTimestamp: number): void => {
    if (!this.running) return;

    const deltaMs = Math.min(Math.max(currentTimestamp - this.lastTimestamp, 0), 50); // Clamped to 50ms on tab switches
    this.lastTimestamp = currentTimestamp;

    // Compute cycles needed to match 16 MHz wall-clock time
    const cyclesToRun = Math.floor((deltaMs / 1000) * this.CPU_FREQ_HZ);
    const targetCycles = this.cpu.cycles + cyclesToRun;

    while (this.running && this.cpu.cycles < targetCycles) {
      avrInstruction(this.cpu);
      this.cpu.tick();
    }

    for (const p of this.peripherals) {
      p.tick?.(this.cpu.cycles);
    }

    if (this.running) {
      this.scheduleFrame();
    }
  };
}
