# Development Notes

## 2025-04-05 - Screenshot Functionality and Initial Observations

### Screenshot Functionality
- Successfully created and tested screenshot.js script
- Screenshots are being saved to the /screenshots directory with timestamped filenames
- The script takes multiple views: surface, underground, and after queen placement

### Current Issues
- Queen is being placed but might not be visible in the underground view
- Potential issue with Z-coordinates in the 3D space:
  - Eggs are positioned at Z=100 (main.js line 311)
  - This might be placing objects outside the camera's viewing frustum
  - The same issue could be affecting the queen's visibility

### Observations from Screenshots
1. Surface view shows the brown ground plane correctly
2. Underground view shows solid brown blocks (soil)
3. Queen placement is happening but the queen may not be visible due to Z-position issues

### Next Steps
1. Fix the Z-coordinate issue for queen and eggs to make them visible
   - Modify the Z values in main.js to ensure objects are within camera view
2. Implement basic worker ant spawning from eggs (Phase 2 of roadmap)
3. Add basic pheromone system for ants to follow
4. Begin implementing basic ant AI for movement and tasks

### Technical Structure
- ThreeJS for 3D rendering
- Underground uses a voxel-based system for digging
- Two main views: surface (top-down) and underground (side view)
- Debug tools available for development

### Remember
- Run `npm run debug` to use the debug overlay and inspector tools
- Use `window.debug.dumpState()` in browser console to see object positions
- Current development focus is on Phase 1: Core Loop Prototype