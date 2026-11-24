import type { AVRRunner } from '../core/AVRRunner';
import type { VirtualPeripheral } from '../core/types';

export class UartPeripheral implements VirtualPeripheral {
  public readonly id: string;
  private onLineCallback?: (line: string) => void;
  private onCharCallback?: (char: string) => void;

  private runner: AVRRunner | null = null;
  private lineBuffer = '';
  private history: string[] = [];

  constructor(
    id: string = 'uart0',
    onLineCallback?: (line: string) => void,
    onCharCallback?: (char: string) => void
  ) {
    this.id = id;
    this.onLineCallback = onLineCallback;
    this.onCharCallback = onCharCallback;
  }

  public mount(runner: AVRRunner): void {
    this.runner = runner;
    this.runner.usart.onByteTransmit = this.handleByteTransmit;
  }

  public unmount(): void {
    if (this.runner) {
      this.runner.usart.onByteTransmit = null;
    }
    this.runner = null;
  }

  public clear(): void {
    this.lineBuffer = '';
    this.history = [];
  }

  public getHistory(): readonly string[] {
    return this.history;
  }

  private handleByteTransmit = (byte: number): void => {
    const char = String.fromCharCode(byte);
    this.onCharCallback?.(char);

    if (char === '\n') {
      // Complete line arrived (strip any trailing carriage return \r)
      const completeLine = this.lineBuffer.replace(/\r$/, '');
      this.history.push(completeLine);
      this.onLineCallback?.(completeLine);
      this.lineBuffer = '';
    } else {
      this.lineBuffer += char;
    }
  };
}
