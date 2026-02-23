# Velum Mobile — Maestro Smoke Tests

Four flows covering the core user journeys. Run locally against a connected device or emulator, or in CI via the `mobile-smoke.yml` workflow.

## Flows

| File | What it tests |
|---|---|
| `00_app_launch.yaml` | App boots, all tab bar labels visible |
| `01_tab_navigation.yaml` | Every tab renders without crashing |
| `02_nutrition_add_entry.yaml` | Manual nutrition log entry saved end-to-end |
| `03_sync_check.yaml` | Profile tab loads; Force Sync triggers Syncing... state |

## Running locally

```bash
# Install Maestro CLI (once)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run all flows
cd velum-mobile
maestro test .maestro/

# Run a single flow
maestro test .maestro/01_tab_navigation.yaml
```

## Adding new flows

1. Add a `NN_description.yaml` file in `.maestro/`
2. Use `appId: com.velum.mobile`
3. Prefer `assertVisible:` with the exact text labels from the UI
4. Add `testID` props to React Native elements when text matching is ambiguous
