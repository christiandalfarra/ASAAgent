# ASAAgent

**ASAAgent** is a JavaScript-based autonomous agent for the Deliveroo simulation. It adopts a **BDI (Belief-Desire-Intention)** architecture and uses **PDDL** for planning and goal execution.

---

## Project Structure

```plaintext
ASAAgent
├── belief/                         # Agent's internal model of the environment
│   ├── belief.js                   # Main interface to update beliefs from events
│   ├── agentData.js                # Class representing agent's internal state (parcels, enemies, etc.)
│   ├── mapData.js                  # Class modeling the map and utility map
│   ├── envData.js                  # Class modeling the environment and configuration settings
│
├── coordination/                    
│   ├── coordination.js             # class for manage the comunication strategy
├── intention/                      # Handles goal execution logic
│   ├── intention.js                # Defines the Intention class
│   ├── options.js                  # Computes actionable options based on current beliefs
│
├── planning/                       # Planning logic classical and using PDDL
│   ├── domain.pddl                 # PDDL domain definition
│   ├── pddUtils.js                 # script for PDDL utils
│   ├── plans.js                    # Plan implementations used by the BDI engine
│
├── main/                           # Runtime agent logic
│   ├── agent.js                    # Entry point for agent behavior
│   ├── index.js                    # script for the agent execution
│   ├── utils.js                    # General-purpose utilities
│
├── config.js                       # API client configuration
├── package.json                    # Project metadata and dependencies
```

---

## Getting Started

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/christiandalfarra/ASAAgent.git
   cd ASAAgent
   ```

2. **Install the dependencies**:

   ```bash
   npm install
   ```
3. **Run single agent**
   
   ```bash
   cd main
   node index.js mode=S pddl=F
   ```

4. **Run multi-agent**
   
   ```bash
   node index.js mode=M pddl=F
   ```
5. **Run single-agent with PDDL solver**
   
   ```bash
   node index.js mode=S pddl=F
   ```

---

## Agent Architecture

- **Beliefs**: Updated via the Deliveroo API (e.g., map, parcels, other agents).
- **Desires**: Derived from parcel utility and task scheduling logic.
- **Intentions**: Managed using custom plans and a planning engine.

---

## Dependencies

- [`@unitn-asa/deliveroo-js-client`](https://www.npmjs.com/package/@unitn-asa/deliveroo-js-client)
- [`@unitn-asa/pddl-client`](https://www.npmjs.com/package/@unitn-asa/pddl-client)

---

## Notes

- This project is a lab simulation developed for the Autonomous Software Agents course at the University of Trento.
- PDDL planning is handled via the `@unitn-asa/pddl-client` online solver.
