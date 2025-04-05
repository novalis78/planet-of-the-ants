# Project: Planet of the Ants (Working Title)

## 1. Vision Statement

To create the definitive ant colony simulation game, blending deep, realistic micro-simulation with grand-scale strategic conquest. Starting from a single queen, players will guide their colony's growth, manage resources, navigate environmental challenges, overcome rivals (both ant and human), and ultimately strive to establish their supercolony as the dominant life form on Earth – achieving the "Planet of the Ants."

## 2. Core Concept

**Genre:** Strategic Simulation / Colony Management / Grand Strategy

**Inspiration:** A modern, significantly expanded reimagining of the core concepts pioneered by Maxis's *SimAnt*, infused with deeper biological simulation, modern 3D graphics, intuitive controls, and a vastly larger strategic scope.

**The Pitch:** Players take control of a fledgling ant colony, beginning with a lone queen. They must manage the intricate details of nest construction, brood care, foraging, and defense within a local environment (grid square). Success allows for expansion, founding new nests, and managing a growing network of colonies across a strategic map representing larger regions, eventually scaling to a global view. The ultimate goal is planetary domination, facing challenges from rival ant supercolonies, environmental hazards, and the pervasive, often destructive, influence of humans.

**Key Differentiators:**
*   **Micro-Macro Link:** Seamlessly transition between detailed micro-management of individual ants/nests and high-level strategic decision-making across territories.
*   **Simulation Depth:** Aim for realistic simulation of ant behavior, life cycles, pheromone communication, environmental factors (weather, temperature, seasons), and inter-species interactions.
*   **Strategic Scale:** Progress from a single grid square to regional control, continental supercolonies, and ultimately, global conquest.
*   **The Human Factor:** Humans are not just background elements but a dynamic, map-altering strategic force presenting unique challenges and opportunities (food sources vs. pesticides, habitat destruction vs. new expansion routes).

## 3. Gameplay Pillars

The gameplay revolves around interconnected layers and core loops:

*   **A. Nest Simulation & Management (Micro - Underground View):**
    *   **Voxel-Based Digging:** Direct or AI-controlled excavation of tunnels and chambers using a 2D side-view perspective (rendered in 3D). Soil types may affect digging speed/stability.
    *   **Chamber Specialization:** Designating areas for specific purposes (Nursery, Food Storage, Queen's Chamber, Waste Disposal, Barracks) potentially providing bonuses.
    *   **Brood Care:** Managing the egg -> larva -> pupa -> adult cycle. Requires resource allocation (food for larvae), tending (cleaning), and environmental control (temperature/humidity influences).
    *   **Internal Logistics:** Efficient nest layout is key for movement and resource distribution.
    *   **Resource Management:** Balancing food intake, consumption (brood, queen, workers), and storage.

*   **B. Local Environment Interaction (Micro - Surface View):**
    *   **Exploration & Foraging:** Guiding individual ants or relying on AI to explore the local grid square (potentially with fog of war), discover dynamic food sources (crumbs, dead insects, nectar), and return resources to the nest.
    *   **Pheromone Communication:** Laying and following pheromone trails (e.g., Food, Nest, Patrol, Danger). Trails decay over time and require reinforcement. Forms the basis of emergent colony behavior.
    *   **Hazard Avoidance:** Navigating local threats like predators (spiders, birds), environmental dangers (rain puddles, pesticides), and hostile ants.
    *   **Local Defense:** Engaging in small-scale combat with intruders or competing foragers near the nest entrance or resource nodes.
    *   **Multiple Views:** Switching between a top-down or isometric 3D view for surface actions and the 2D side-view for underground actions.

*   **C. Colony Expansion & Strategic Management (Macro - Strategic Map View):**
    *   **Territory Acquisition:** Expanding influence by conquering adjacent grid squares on a larger strategic map.
    *   **Founding New Nests:** Producing alates (winged reproductives) and launching nuptial flights to establish new colonies in unclaimed or contested territory.
    *   **Multi-Colony Management:** Overseeing multiple interconnected (or independent) nests. Jumping between controlling individual colonies directly or setting automated priorities.
    *   **Automation:** Defining high-level goals for established colonies (e.g., "Focus Food," "Prioritize Soldiers," "Expand Territory North," "Send Resources to Nest Beta") for AI execution.
    *   **Resource Valuation:** Identifying and prioritizing territories based on resource richness, strategic location, defensibility, or unique environmental factors.
    *   **Logistics Network:** Potentially visualizing or managing abstract connections (e.g., major pheromone routes) between colonies for resource sharing or defense coordination.

*   **D. Factional Warfare & Global Conquest (Macro - Strategic & Earth Views):**
    *   **Rival Supercolonies:** Competing against major AI-controlled ant factions with distinct species traits, behaviors, and expansionist goals.
    *   **Large-Scale Conflict:** Engaging in battles spanning multiple grid squares, requiring strategic unit composition (workers vs. soldiers) and potentially coordinated attacks/defense.
    *   **Human Interaction Strategy:** Adapting to human activities – exploiting urban food waste, avoiding pesticide zones, navigating infrastructure, potentially even influencing human environments subtly (long-term goal).
    *   **Planetary Overview:** An abstracted Earth view showing the spread of your supercolony versus rivals and human influence, serving as a progress indicator and potentially allowing high-level strategic focus.

## 4. Key Features (Current & Planned)

*   **Detailed Ant Life Cycle:** Egg -> Larva -> Pupa -> Adult (Worker, Soldier, Alate, specialized castes).
*   **Realistic Pheromone System:** Multiple trail types (Food, Home, Danger, Patrol), trail strength, decay over time, probabilistic following by AI.
*   **Voxel-Based Underground Construction:** Intuitive digging and nest design.
*   **Multiple, Interconnected Views:** Underground (2D Side-View), Local Surface (Top-Down/Isometric 3D), Strategic Map (Abstracted Grid), Earth View (Abstracted Global).
*   **Direct & Indirect Control:** Manually control the queen or individual ants; jump between ants; set tasks and rely on emergent AI behavior driven by needs and pheromones.
*   **Dynamic Environment:** Time of day, weather effects (rain, heat), seasons influencing food availability, ant activity, and hazards.
*   **Emergent AI:** Ants driven by internal needs (hunger, task priority) and external stimuli (pheromones, threats), leading to complex colony behavior without excessive scripting.
*   **Strategic Territory Control:** Grid-based map with varying resource values and strategic importance.
*   **The Human Factor:** Cities, suburbs, forests offering different challenges/rewards; pesticides, habitat destruction as dynamic map events.
*   **Rival Ant Supercolonies:** AI opponents with distinct characteristics and expansionist drives.
*   **Colony Automation:** Setting high-level tasks for mature colonies.
*   **Progression System:** Grow from a single queen to a massive, interconnected empire.
*   **(Planned) Diverse Ant Species:** Introduce multiple playable ant species with unique abilities, units, and strategies (e.g., Leafcutters, Army Ants, Honeypot Ants).
*   **(Planned) Multiplayer:** Co-op colony management, competitive colony vs. colony modes.

## 5. Target Platform & Technology

*   **Primary Target:** Desktop (PC, Mac, Linux) via downloadable application.
*   **Initial Prototyping:** Web-based using **Three.js** (JavaScript) to rapidly develop and test the core loop (Phase 1).
*   **Future Technology:** Likely migration to a more robust game engine (e.g., **Godot Engine**, **Unity**) will be necessary to handle the complexity, performance demands (thousands of ants, large worlds), physics, advanced AI, and asset pipeline required for later phases and the full vision.

## 6. Development Roadmap (Phased Approach)

1.  **Phase 1: Core Loop Prototype (In Progress)**
    *   Goal: Prove the fundamental gameplay is engaging.
    *   Features: Basic Three.js scene (surface/underground), Queen placement, voxel digging (manual click), Queen movement underground (arrows), basic Egg laying & hatching (timers, visual placeholders), view switching (Tab).
2.  **Phase 2: Basic Automation & Worker Ants**
    *   Goal: Make the colony feel partially self-sufficient.
    *   Features: Spawn basic Worker ants upon hatching. Implement basic ant AI (idle wander, maybe follow simple scent). Implement basic manual foraging loop (player controls worker to surface, finds food, returns). Introduce Pheromone laying (manual) and basic following AI.
3.  **Phase 3: Introducing Challenge & Refinement**
    *   Goal: Add risk and basic interaction.
    *   Features: Simple surface predator (e.g., spider). Basic combat mechanic (ant vs predator). Danger pheromones. Worker AI for digging. Basic Larva feeding requirement (manual drop-off?). UI improvements (colony status).
4.  **Phase 4: Deepening Simulation**
    *   Goal: Add strategic depth to micro-management.
    *   Features: Different soil types, functional nest chambers, different food types, weather effects, basic ant castes (Worker/Soldier), more sophisticated AI needs/task allocation.
5.  **Phase 5: Grid Expansion & Strategic Map V1**
    *   Goal: Introduce the strategic expansion layer.
    *   Features: Implement strategic grid map. Allow founding new colonies (Alate production/launch). Basic rival colony presence/interaction. Basic territory value display. Basic colony automation settings.
6.  **Phase 6: Species Diversity & Multiplayer Prep**
    *   Goal: Add variety and prepare for network play.
    *   Features: Introduce a second playable ant species with distinct traits. Refine combat/AI interactions. Build foundational systems for multiplayer (data structures, potential server logic).
7.  **Phase 7 & Beyond: Multiplayer, Planetary Scale & Polish**
    *   Goal: Realize the full vision.
    *   Features: Implement multiplayer modes. Scale up world generation/management. Refine all systems (AI, UI, graphics, performance). Add deeper simulation layers (disease, genetics, advanced human interactions). Implement global events. Achieve "Planet of the Ants."

## 7. Long-Term Scope & Future Ideas

*   Full planetary simulation with diverse biomes influencing gameplay.
*   Dozens of unique ant species with specialized mechanics.
*   Complex ecological simulation (plant life cycles, detailed predator/prey chains).
*   Advanced AI for rival colonies (diplomacy, treaties, complex strategies).
*   Deeper human interaction (influencing city planning, dealing with exterminators, exploiting infrastructure).
*   Underground ecosystems (springtails, mites, fungi).
*   Genetic drift and colony evolution mechanics.
*   Scenario modes and specific challenges.
*   Robust modding support.

## 8. Monetization (Consideration)

*   If implemented, focus on optional purchases that respect the player's time and the simulation's integrity.
*   Examples: Cosmetic options for the colony/queen, optional time-saving boosts (e.g., slightly faster hatching/digging) that do not replace core gameplay or create hard paywalls. Must be carefully balanced.

## 9. Development & Debugging Tools

This project includes several tools to help with development and visualization:

### Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm start

# In another terminal, take basic screenshots
npm run screenshot

# Or launch the debug helper
npm run debug

# Or run the complete monitoring tool
npm run monitor

# For the best development experience
npm run dev
```

### Available Tools

- **Basic Screenshots (`npm run screenshot`)**: Captures both surface and underground views
- **Game Monitor (`npm run monitor`)**: Advanced tool for capturing game state and interactions
- **Debug Helper (`npm run debug`)**: Interactive debug panel with real-time game information
- **Development Mode (`npm run dev`)**: Runs the server and debug tools together

### Debug Console Tools

When using the debug helper, the following functions are available in the browser console:

```javascript
// Get position of any object
window.debug.positionOf(object) 

// Print game state to console
window.debug.dumpState() 

// Toggle wireframe rendering for better visualization
window.debug.toggleWireframe() 
```

### Screenshots

Screenshots are saved in the `screenshots` directory with timestamped filenames.