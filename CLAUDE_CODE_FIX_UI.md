This is current layout:
+====================================================================================================+
|  PATIENT: [▼ John Carter]   |  Mode: [ Patient ☐ ] [ ☑ Clinician ]   |  [ View Rationale ▾ ]  [☀] |
+====================================================================================================+

+-----------------------------------------------+  +-----------------------------------------------+
| [ CARD ] Symptom Intake                       |  | [ CARD ] Risk Assessment                      |
|-----------------------------------------------|  |-----------------------------------------------|
|  Describe the symptoms... (textarea)          |  |  BAND: [ IMMEDIATE ]   p(urgent): 92%         |
|  [ Triage ]   [ Clear ]                       |  |  • severe chest pain > 15m                    |
+-----------------------------------------------+  |  • abnormal vitals (BP 160/100)               |
                                                    |  • diaphoresis, nausea                        |
                                                    +-----------------------------------------------+

+-----------------------------------------------+  +-----------------------------------------------+
| [ CARD ] Timeline                             |  | [ CARD ] Plan & Next Steps                    |
|-----------------------------------------------|  |-----------------------------------------------|
|  • Yesterday 14:10 | mild pain; trop normal   |  | Disposition: Go to Emergency Dept now         |
|  • Today 08:55     | severe pain; GTN; ECG    |  | Why: severe pain; abnormal BP + symptoms      |
+-----------------------------------------------+  | What to expect: ECG, serial troponin          |
                                                   | Safety-net: call 999 if syncope/worsening     |
                                                   +-----------------------------------------------+



Here is the desired layout:
Desktop (≥1024px)
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ PATIENT: [▼ John Carter]   │  Mode: [ Patient ○ ] [ ● Clinician ]   │  [ View Rationale ▾ ]  [☀] ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [ CARD ] Symptom Intake                      ┃  ┃ [ CARD ] Risk Assessment                     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Describe the symptoms… (textarea)           ┃  ┃  BAND: [ IMMEDIATE ]    p(urgent): 92%       ┃
┃                                              ┃  ┃  • severe chest pain > 15m                   ┃
┃  [ Triage ]   [ Clear ]                      ┃  ┃  • abnormal vitals (BP 160/100)              ┃
┃                                              ┃  ┃  • diaphoresis, nausea                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [ CARD ] Timeline                            ┃  ┃ [ CARD ] Plan & Next Steps                   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  • Yesterday 14:10  | mild pain; trop normal ┃  ┃  Disposition: Go to Emergency Dept now       ┃
┃  • Today 08:55      | severe pain; GTN; ECG  ┃  ┃  Why:                                        ┃
┃                                              ┃  ┃    - severe persistent chest pain            ┃
┃                                              ┃  ┃    - abnormal BP + autonomic symptoms        ┃
┃                                              ┃  ┃  What to expect: ECG, serial troponin        ┃
┃                                              ┃  ┃  Safety-net: call 999 if syncope/worsening   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

(Toast notifications appear top-right for clarifiers/errors)

Rationale Drawer (on click):
╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
║ AUDIT TRAIL (Drawer)                                                                             ║
║ ──────────────────────────────────────────────────────────────────────────────────────────────── ║
║ • Citations (source ids + snippets)                                                              ║
║ • Evidence JSON (pretty)                                                                          ║
║ • Trace ID / timings                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════╝

Mobile / Narrow
┌──────────────────────────────────────────────────────────────────────────────┐
│ PATIENT: [▼ John Carter]                                                     │
│ Mode: Patient ( )  Clinician (x)                       [ View Rationale ▾ ]  │
└──────────────────────────────────────────────────────────────────────────────┘

[ CARD ] Symptom Intake
────────────────────────────────────────────────────
Describe the symptoms… (textarea)
[ Triage ]  [ Clear ]

[ CARD ] Risk Assessment
────────────────────────────────────────────────────
BAND: [ IMMEDIATE ]   p(urgent): 92%
• severe chest pain > 15m
• abnormal vitals
• diaphoresis, nausea

[ CARD ] Plan & Next Steps
────────────────────────────────────────────────────
Disposition: ED now
Why:
 - severe persistent chest pain
 - abnormal BP + autonomic symptoms
What to expect: ECG, troponin
Safety-net: call 999 if worsening

[ CARD ] Timeline
────────────────────────────────────────────────────
• Yesterday 14:10 | mild pain; trop normal
• Today 08:55     | severe pain; GTN; ECG


