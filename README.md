# ASAAgent

**ASAAgent** is a JavaScript-based autonomous agent for the Deliveroo simulation. It adopts a **BDI (Belief-Desire-Intention)** architecture and uses **PDDL** for planning and goal execution.

---

## 📁 Project Structure

```plaintext
ASAAgent
├── belief/                         # Agent's internal model of the environment
│   ├── agentBelief.js              # Main interface to update beliefs from events
│   ├── agentData.js                # Class representing agent's internal state (parcels, enemies, etc.)
│   ├── map.js                      # Class modeling the map and utility map
│
├── intention/                      # Handles goal execution logic
│   ├── intention.js                # Defines the Intention class
│   ├── options.js                  # Computes actionable options based on current beliefs
│
├── planning/                       # Planning logic using PDDL
│   ├── domain.pddl                 # PDDL domain definition
│   ├── plans.js                    # Plan implementations used by the BDI engine
│   ├── utils.js                    # Utilities for planning and pathfinding
│
├── main/                           # Runtime agent logic
│   ├── agent.js                    # Entry point for agent behavior
│   ├── utils.js                    # General-purpose utilities (e.g., A*, distance calc)
│
├── config.js                       # API client configuration
├── package.json                    # Project metadata and dependencies
```

---

## 🚀 Getting Started

### 🛠 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/christiandalfarra/ASAAgent.git
   cd ASAAgent
   ```

2. **Install the dependencies**:

   ```bash
   npm install
   ```

---

## 🤖 Agent Architecture

- **Beliefs**: Updated via the Deliveroo API (e.g., map, parcels, other agents).
- **Desires**: Derived from parcel utility and task scheduling logic.
- **Intentions**: Managed using custom plans and a planning engine.

---

## 📦 Dependencies

- [`@unitn-asa/deliveroo-js-client`](https://www.npmjs.com/package/@unitn-asa/deliveroo-js-client)
- [`@unitn-asa/pddl-client`](https://www.npmjs.com/package/@unitn-asa/pddl-client)

---

## 🔧 Notes

- This project is a lab simulation developed for the Autonomous Software Agents course at the University of Trento.
- PDDL planning is handled via the `@unitn-asa/pddl-client` online solver.
