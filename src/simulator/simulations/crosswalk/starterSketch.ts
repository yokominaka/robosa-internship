export const STARTER_SKETCH = `// Robosa Simulation 1: Smart Pedestrian Crosswalk Controller
// Hardware Pin Mapping (Arduino Uno 1-to-1 parity):
// - D13: Vehicle Red LED (PORTB bit 5)
// - D12: Vehicle Yellow LED (PORTB bit 4)
// - D11: Vehicle Green LED (PORTB bit 3)
// - D2:  Crosswalk Pushbutton (PORTD bit 2, INT0) -> INPUT_PULLUP
// - D0/D1: Hardware UART Serial (9600 baud)

const int PIN_RED = 13;
const int PIN_YELLOW = 12;
const int PIN_GREEN = 11;
const int PIN_BUTTON = 2;

enum CrosswalkState {
  STATE_VEHICLE_GREEN,
  STATE_WAIT_BEFORE_YELLOW,
  STATE_VEHICLE_YELLOW,
  STATE_PEDESTRIAN_RED
};

CrosswalkState currentState = STATE_VEHICLE_GREEN;
unsigned long stateTimer = 0;

void setup() {
  Serial.begin(9600);

  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);

  // Default state: Green ON, Yellow OFF, Red OFF
  digitalWrite(PIN_RED, LOW);
  digitalWrite(PIN_YELLOW, LOW);
  digitalWrite(PIN_GREEN, HIGH);

  Serial.println("[BOOT] Crosswalk Controller initialized. Vehicle GREEN active.");
}

void loop() {
  unsigned long now = millis();

  switch (currentState) {
    case STATE_VEHICLE_GREEN:
      if (digitalRead(PIN_BUTTON) == LOW) {
        Serial.println("[EVENT] Button pressed (D2 LOW). Transitioning in 500ms...");
        stateTimer = now;
        currentState = STATE_WAIT_BEFORE_YELLOW;
      }
      break;

    case STATE_WAIT_BEFORE_YELLOW:
      if (now - stateTimer >= 500) {
        Serial.println("[STATE] Green OFF, Yellow (D12) ON for 2000ms.");
        digitalWrite(PIN_GREEN, LOW);
        digitalWrite(PIN_YELLOW, HIGH);
        stateTimer = now;
        currentState = STATE_VEHICLE_YELLOW;
      }
      break;

    case STATE_VEHICLE_YELLOW:
      if (now - stateTimer >= 2000) {
        Serial.println("[STATE] Yellow OFF, Red (D13) ON for 5000ms. Pedestrian walk active.");
        digitalWrite(PIN_YELLOW, LOW);
        digitalWrite(PIN_RED, HIGH);
        stateTimer = now;
        currentState = STATE_PEDESTRIAN_RED;
      }
      break;

    case STATE_PEDESTRIAN_RED:
      if (now - stateTimer >= 5000) {
        Serial.println("[STATE] Red OFF, returning to Vehicle Green (D11) ON.");
        digitalWrite(PIN_RED, LOW);
        digitalWrite(PIN_GREEN, HIGH);
        currentState = STATE_VEHICLE_GREEN;
      }
      break;
  }
}
`;
