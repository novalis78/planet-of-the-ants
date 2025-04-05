# Claude Development Notes

## Project Overview
Planet of the Ants is a realistic ant colony simulation game with the following features:
- Blend of micro-simulation and strategic conquest
- Starting from a single queen, guide colony growth
- Multiple views: surface (top-down) and underground (side view)
- Voxel-based digging system for nest construction
- Egg laying and hatching mechanics
- Pheromone communication system

## Development Commands
- `npm start` - Start the development server
- `npm run screenshot` - Take screenshots (runs separately from server)
- `npm run capture` - Start server and take screenshots in one command
- `npm run debug` - Launch debug helper
- `npm run monitor` - Run game monitoring tool
- `npm run dev` - Run server and debug tools together

## Important Code Notes
- Queen placement occurs on surface view
- Underground view uses voxel grid system
- Tab key switches between views
- Arrow keys move the queen underground
- Eggs automatically spawn when queen is underground

## Screenshot Functionality
- Do NOT use `killall node` as it will terminate the terminal process
- Use `npm run capture` for safer screenshot capture
- Screenshots are saved to `screenshots/` with timestamped filenames
- Three views captured: surface, underground, and queen placement

## Debug Tools
- Debug console functions available through browser:
  - `window.debug.positionOf(object)` - Get position of any object
  - `window.debug.dumpState()` - Print game state to console
  - `window.debug.toggleWireframe()` - Toggle wireframe rendering

## Current Development Phase
Currently in Phase 1: Core Loop Prototype with the following implemented:
- Basic Three.js scene (surface/underground)
- Queen placement
- Voxel digging (manual click)
- Queen movement underground (arrows)
- Basic Egg laying & hatching
- View switching (Tab)

## Known Issues
- Z-coordinate positioning may affect visibility of objects
- Eggs positioned at Z=100 might be outside camera view