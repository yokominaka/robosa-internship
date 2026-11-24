import type * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wokwi-arduino-uno': React.HTMLAttributes<HTMLElement> & {
        ref?: React.Ref<any>;
        [key: string]: any;
      };
      'wokwi-led': React.HTMLAttributes<HTMLElement> & {
        color?: string;
        value?: boolean;
        brightness?: number;
        label?: string;
        flip?: boolean;
        ref?: React.Ref<any>;
        [key: string]: any;
      };
      'wokwi-pushbutton': React.HTMLAttributes<HTMLElement> & {
        color?: string;
        pressed?: boolean;
        label?: string;
        xray?: boolean;
        ref?: React.Ref<any>;
        [key: string]: any;
      };
      'wokwi-resistor': React.HTMLAttributes<HTMLElement> & {
        value?: string | number;
        ref?: React.Ref<any>;
        [key: string]: any;
      };
    }
  }
}

export {};
