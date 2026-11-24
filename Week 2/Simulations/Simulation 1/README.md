# Robosa Simulation 1: Smart Pedestrian Crosswalk Controller

Interactive embedded systems simulation built for the **Robosa.io** learning platform.

Simulates an **Arduino Uno (ATmega328P)** running a real non-blocking state machine sketch that controls vehicle traffic lights and a pedestrian crosswalk request button, featuring full-stack cycle-accurate execution in the browser.

---

## 🌟 Key Features

1. **Cycle-Accurate Hardware Parity (`avr8js`)**:
   - 16 MHz instruction clock execution loop locked to real wall-clock time via `requestAnimationFrame`.
   - Real ATmega328P register parity:
     - Vehicle Red LED: `D13` (`PORTB` Bit 5 / `PB5`)
     - Vehicle Yellow LED: `D12` (`PORTB` Bit 4 / `PB4`)
     - Vehicle Green LED: `D11` (`PORTB` Bit 3 / `PB3`)
     - Crosswalk Pushbutton: `D2` (`PORTD` Bit 2 / `INT0`) with internal `INPUT_PULLUP`
     - Hardware UART: `D0`/`D1` (`PD0`/`PD1`) at 9600 baud
   - Dynamic peripheral binding and automatic internal pull-up handling.

2. **Interactive Student Wiring Workbench**:
   - Custom web components powered by `@wokwi/elements` (`<wokwi-arduino-uno>`, `<wokwi-led>`, `<wokwi-resistor>`, `<wokwi-pushbutton>`).
   - Magnetic snap rings and monospaced pin tooltips.
   - Click-to-wire Bezier orthogonal jumper wires with color palette selection (`Lime`, `Cyan`, `Amber`, `Red 5V`, `Black GND`).
   - Wire selection and deletion (`Backspace` / `Delete` / click).

3. **Electrical Netlist Graph Resolver & Fault Validation**:
   - Dynamic path tracing between Uno pins, resistors, LEDs, and pushbuttons.
   - Identifies open circuits, short circuits, reverse polarity, and missing current-limiting resistors.
   - Dynamic peripheral mounting: if a student wires an LED to another pin, the engine attaches the peripheral to the wired pin.

4. **In-Browser Code Editor & Local Docker Compiler Client**:
   - Syntax-highlighted, student-editable Arduino C++ sketch.
   - Compiles via local Docker backend (`POST http://localhost:8080/compile`).
   - Displays compiler diagnostics, durations, and cache status flags.

5. **Visual-Only "Quick Demo" Mode**:
   - Includes **⚡ Quick Demo** and **⚡ Load Reference Wiring** buttons allowing students to run the entire simulation visually without writing code.

---

## 📂 Project Structure

```
Simulations/
├── src/
│   ├── components/
│   │   ├── CodeEditor.tsx          # In-browser Arduino C++ code editor
│   │   ├── LeftIconRail.tsx        # Robosa tactical navigation rail
│   │   ├── MissionKitTray.tsx      # Palette of components with inventory counts
│   │   ├── MissionTasksDrawer.tsx  # Gamified mission progression drawer
│   │   ├── RobosaHeader.tsx        # Robosa header with telemetry & cache pill
│   │   ├── RobosaWorkspace.tsx     # Main integrated layout
│   │   ├── SerialMonitor.tsx       # Live UART serial monitor
│   │   ├── WireOverlay.tsx         # SVG Bezier jumper wire renderer
│   │   └── WorkbenchCanvas.tsx     # Interactive wiring canvas & wokwi elements
│   ├── simulator/
│   │   ├── core/
│   │   │   ├── AVRRunner.ts        # 16 MHz avr8js execution loop & peripherals manager
│   │   │   ├── circuitValidator.ts # Circuit netlist resolver & fault analyzer
│   │   │   ├── compileClient.ts    # Docker compilation backend client
│   │   │   ├── hexParser.ts        # Intel HEX parser into 32 KB flash words
│   │   │   ├── types.ts            # Uno pin types & VirtualPeripheral interface
│   │   │   └── unoPinMap.ts        # Uno header pin to ATmega328P register map
│   │   ├── peripherals/
│   │   │   ├── LedPeripheral.ts    # GPIO driven LED peripheral
│   │   │   ├── PushbuttonPeripheral.ts # Active-low switch peripheral
│   │   │   └── UartPeripheral.ts   # Hardware UART listener
│   │   └── simulations/
│   │       └── crosswalk/
│   │           ├── netlist.ts      # Reference crosswalk circuit netlist
│   │           └── starterSketch.ts# Non-blocking state machine sketch
│   ├── styles/
│   │   └── robosa.css              # Robosa dark-tactical theme & design tokens
│   ├── types/
│   │   └── wokwi.d.ts              # Web component JSX declarations
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (v18+ recommended)
2. **Docker** (to run the local compile backend container)

### 1. Start the Compiler Backend

Ensure the Arduino compilation container is running on port `8080`:

```bash
docker run -d -p 8080:8080 \
  -e ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173" \
  robosa-compile
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Build for Production

```bash
npm run build
```

---

## 🎮 How to Use

1. **Visual Quick Run**:
   - Click **⚡ Quick Demo** to automatically place all reference components, wire them up, compile the sketch, and run the simulation.
2. **Manual Wiring**:
   - Click components in the **Mission Kit** tray to place them on the workbench.
   - Click any pin on the Uno or placed components to start drawing a wire.
   - Click the destination pin to complete the connection (or press `Esc` to cancel).
3. **Trigger the Crosswalk**:
   - Once running and Green LED is active, click the blue **Pushbutton** to request crossing.
   - Watch the controller transition: `Green` → `Yellow (2s)` → `Red (5s)` → `Green`.
   - Monitor debug telemetry in the **UART Serial Monitor**.
