## ASAAgent

**ASAAgent** is a JavaScript-based agent that can play autonomous the game of deliveroo, using the BDI architecture and PDDL as planning module

## 📁 Project Structure

```plaintext
ASAAgent
├── belief/
│   ├── agentBelief.js           # maintain the belief of the agent updated
│   ├── agentData.js             # class that models the agent data (parcels, enemies...)
│   ├── map.js                   # class that models the map data
│
├── intention
│   ├── intention.js             # Handles intention execution
|
├── planning
|   ├── domain.pddl
|   ├── plans.js
|   ├── utils.js

|
├── main/
│   ├── agent.js                 # agent esecution
|
├── config.js                  # Configuration parameters
```

## 🚀 Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/christiandalfarra/ASAAgent.git
2. Intall the dependencies
   ```bash
   npm install
