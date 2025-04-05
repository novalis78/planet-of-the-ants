import * as THREE from 'three';

let scene, surfaceCamera, undergroundCamera, activeCamera, renderer, clock;
let groundPlane, queenMesh = null;
let raycaster, mouse;
let queenGridX = -1; // Queen's current grid X coordinate (underground)
let queenGridY = -1; // Queen's current grid Y coordinate (underground)
let isQueenSelected = false;
let holeMesh = null; 

// NEW: Egg variables
let eggs = []; // Array to store egg data { mesh: eggMesh, hatchTimer: time }
const EGG_LAY_INTERVAL = 5.0; // Seconds between laying eggs
const EGG_HATCH_TIME = 10.0; // Seconds for an egg to hatch
let timeSinceLastEgg = 0;
let eggGeometry, eggMaterial; // Shared resources for efficiency

// NEW: Underground representation
const undergroundWidth = 20; // How many voxels wide (X axis)
const undergroundHeight = 10; // How many voxels high (Y axis)
const undergroundDepth = 1; // How many voxels deep (Z axis) - Start simple (like 2D)
const voxelSize = 1; // Size of each soil block
const soilColor = 0x654321; // Darker brown for soil
let voxelGrid = []; // To store references to the soil meshes
let undergroundGroup = new THREE.Group(); // Group to hold all voxels

let currentView = 'surface'; // 'surface' or 'underground'

// --- Initialization ---

function init() {
    // Basic Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    clock = new THREE.Clock();

    // Camera (Surface View)
    const aspect = window.innerWidth / window.innerHeight;
    surfaceCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    surfaceCamera.position.set(0, 15, 10);
    surfaceCamera.lookAt(0, 0, 0);
    scene.add(surfaceCamera);

    const holeGeo = new THREE.CircleGeometry(voxelSize * 0.4, 16); // Small circle
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x1A110A, side: THREE.DoubleSide }); // Very dark brown/black
    holeMesh = new THREE.Mesh(holeGeo, holeMat);
    holeMesh.rotation.x = -Math.PI / 2; // Lay flat on the ground
    holeMesh.position.y = 0.01; // Slightly above ground to prevent z-fighting
    holeMesh.visible = false; // Start hidden until queen is placed
    scene.add(holeMesh); // Add directly to scene, not underground group

    // NEW: Camera (Underground Side View - Orthographic)
    const width = window.innerWidth / 50; // Adjust divisor for zoom level
    const height = window.innerHeight / 50;
    undergroundCamera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.1, 1000);
    // Position it looking along the Z axis from the front, with a bit more space
    undergroundCamera.position.set(undergroundWidth * voxelSize / 2, undergroundHeight * voxelSize / 2, 20); // Centered roughly, further back
    undergroundCamera.lookAt(undergroundWidth * voxelSize / 2, undergroundHeight * voxelSize / 2, 0); // Look towards the voxels
    scene.add(undergroundCamera);

    // Set initial active camera
    activeCamera = surfaceCamera;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        side: THREE.DoubleSide
    });
    groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = 0;
    scene.add(groundPlane);

    eggGeometry = new THREE.SphereGeometry(0.3, 8, 6); // Slightly larger sphere
    eggMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFA0, // Light yellow
        emissive: 0x555500, // Slight glow
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.2
    });

    // NEW: Create Underground Voxels
    createUnderground();
    scene.add(undergroundGroup);
    undergroundGroup.visible = false; // Start hidden

    // Raycaster for Mouse Interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown); // NEW: Listener for key presses

    // Start the animation loop
    animate();
}

// --- Queen ---

function createQueen(position) {
    // Create the ant queen with a more distinctive appearance
    if (queenMesh) return; // Only one queen for now

    // Create a group for the queen (body + head)
    queenMesh = new THREE.Group();
    queenMesh.name = "QUEEN";
    
    // Body (elongated ellipsoid)
    const bodyGeo = new THREE.SphereGeometry(0.5, 12, 12);
    bodyGeo.scale(1, 0.6, 1.8); // Scale to make it ant-like
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color: 0x333333,  // Dark gray/black
        roughness: 0.7,
        metalness: 0.2
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    queenMesh.add(bodyMesh);
    
    // Head (smaller sphere, slightly offset)
    const headGeo = new THREE.SphereGeometry(0.3, 10, 10);
    const headMat = new THREE.MeshStandardMaterial({ 
        color: 0x222222,  // Slightly darker than body
        roughness: 0.6,
        metalness: 0.3
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 0, 0.8); // Position at front of body
    queenMesh.add(headMesh);

    // Position slightly above the ground intersection point
    queenMesh.position.copy(position);
    queenMesh.position.y += 0.4; // Half the height of the box

    queenMesh.name = "QUEEN"; // Add a name for easier identification later
    scene.add(queenMesh);

    console.log("Queen placed at:", queenMesh.position);

    if (holeMesh) {
        holeMesh.position.x = position.x;
        holeMesh.position.z = position.z; // Use Z for surface plane
        holeMesh.visible = true;
        console.log("Hole placed at:", holeMesh.position);
    }

}

// NEW: --- Underground ---

function createUnderground() {
    const voxelGeo = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
    const voxelMat = new THREE.MeshStandardMaterial({ color: soilColor });

    for (let y = 0; y < undergroundHeight; y++) {
        voxelGrid[y] = []; // Initialize row
        for (let x = 0; x < undergroundWidth; x++) {
            // For now, make a solid block of soil
            const voxelMesh = new THREE.Mesh(voxelGeo, voxelMat);

            // Calculate position: Center the grid around X=0, Y=0 underground
            // Voxel centers will be at 0.5, 1.5, 2.5 etc.
            voxelMesh.position.set(
                (x * voxelSize) + voxelSize / 2, // X position
                (-y * voxelSize) - voxelSize / 2, // Y position (negative Y is down)
                 0 // Z position (keep it flat for now)
            );
            voxelMesh.userData = { x: x, y: y, isSoil: true }; // Store grid coords
            undergroundGroup.add(voxelMesh);
            voxelGrid[y][x] = voxelMesh; // Store reference
        }
    }
    // Adjust group position if needed, e.g., to align X=0 with surface 0
     undergroundGroup.position.x = -(undergroundWidth * voxelSize / 2) + voxelSize / 2;
     undergroundGroup.position.y = -voxelSize/2; // align top row just below y=0

     // Adjust underground camera based on final group position
     undergroundCamera.position.set(0, -(undergroundHeight * voxelSize / 2), 10);
     undergroundCamera.lookAt(0, -(undergroundHeight * voxelSize / 2), 0);


}


// --- Event Handlers ---

function onWindowResize() {
    // Update Surface Camera
    surfaceCamera.aspect = window.innerWidth / window.innerHeight;
    surfaceCamera.updateProjectionMatrix();

    // Update Underground Camera
    const width = window.innerWidth / 50; // Keep zoom factor consistent
    const height = window.innerHeight / 50;
    undergroundCamera.left = width / -2;
    undergroundCamera.right = width / 2;
    undergroundCamera.top = height / 2;
    undergroundCamera.bottom = height / -2;
    undergroundCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the ACTIVE camera and mouse position
    raycaster.setFromCamera(mouse, activeCamera); // Use activeCamera!

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children); // Check scene first

    if (!queenMesh) {
        // Placing the queen (Surface view only)
        if (currentView === 'surface') {
            for (let i = 0; i < intersects.length; i++) {
                if (intersects[i].object === groundPlane) {
                    createQueen(intersects[i].point);
                    break;
                }
            }
        }
    } else {
        // Queen exists - potential interactions
        if (currentView === 'surface') {
             const intersectsQueen = raycaster.intersectObject(queenMesh);
             if (intersectsQueen.length > 0) {
                 console.log("Clicked the Queen on the surface!");
                 // TODO: Select Queen (visual feedback)
             }
            } else {
                // Queen exists - potential interactions
                if (currentView === 'surface') {
                     const intersectsQueen = raycaster.intersectObject(queenMesh);
                     if (intersectsQueen.length > 0) {
                         console.log("Clicked the Queen on the surface!");
                         // TODO: Select Queen (visual feedback)
                     }
                } else if (currentView === 'underground') {
                    // Clicking in underground view - DIGGING LOGIC
                    const intersectsSoil = raycaster.intersectObjects(undergroundGroup.children);
                     if (intersectsSoil.length > 0) {
                         // The first intersected object is the closest one
                         const clickedVoxelMesh = intersectsSoil[0].object;
                         const voxelData = clickedVoxelMesh.userData;
        
                         // Check if it's actually soil we clicked on (it should be, but good practice)
                         if (voxelData && voxelData.isSoil) {
                             console.log(`Digging voxel at: [${voxelData.x}, ${voxelData.y}]`);
        
                             // 1. Remove the mesh from the scene/group
                             undergroundGroup.remove(clickedVoxelMesh);
                             // Optional but good cleanup: dispose of geometry/material if not reusing
                             // clickedVoxelMesh.geometry.dispose();
                             // clickedVoxelMesh.material.dispose();
        
                             // 2. Update our logical grid representation
                             voxelGrid[voxelData.y][voxelData.x] = null; // Mark as empty in our array
        
                             // (Later we'll add checks: can the Queen reach this? Is it adjacent?)
        
                         } else {
                             console.log("Clicked on something underground, but it wasn't marked as soil:", clickedVoxelMesh);
                         }
                     }
                }
            }
        }
    }


    function moveQueenUnderground(dx, dy) {
        if (!queenMesh || queenGridX === -1 || queenGridY === -1) {
            console.warn("Cannot move queen, she's not positioned underground.");
            return;
        }
    
        const targetX = queenGridX + dx;
        const targetY = queenGridY + dy;
    
        // 1. Boundary Check: Ensure target is within the grid limits
        if (targetX < 0 || targetX >= undergroundWidth || targetY < 0 || targetY >= undergroundHeight) {
            console.log("Move blocked: Boundary");
            return; // Hit the edge of the defined underground area
        }
    
        // 2. Collision Check: Ensure target voxel is empty (not soil)
        // Need to safely access the grid array
        if (!voxelGrid[targetY] || voxelGrid[targetY][targetX] !== null) {
             // Checking voxelGrid[targetY] first prevents error if targetY is out of bounds vertically
             // Then check if the specific voxel at [targetY][targetX] is NOT null (meaning it's soil)
            console.log(`Move blocked: Soil at [${targetX}, ${targetY}]`);
            return; // Hit a wall (soil)
        }
    
        // 3. Valid Move: Update Queen's logical position
        queenGridX = targetX;
        queenGridY = targetY;
    
        // 4. Update Queen's 3D visual position
        const queenVisualX = (queenGridX * voxelSize) + undergroundGroup.position.x;
        const queenVisualY = (-queenGridY * voxelSize) + undergroundGroup.position.y; // Y is inverted
    
        // Optional: Animate the movement smoothly later instead of jumping
        queenMesh.position.set(queenVisualX, queenVisualY, 0);
    
        console.log(`Queen moved to grid [${queenGridX}, ${queenGridY}]`);
    }

    function layEgg() {
        // Only lay eggs if queen is underground and positioned
        if (currentView !== 'underground' || !queenMesh || queenGridX === -1) {
            return;
        }
    
        console.log("Queen laying egg...");
        const eggMesh = new THREE.Mesh(eggGeometry, eggMaterial);
    
        const eggVisualX = (queenGridX * voxelSize) + undergroundGroup.position.x;
        const eggVisualY = (-queenGridY * voxelSize) + undergroundGroup.position.y;
        const eggVisualZ = 0.2; // Z position slightly in front of the soil blocks
        // Add slight random offset for multiple eggs
        const offsetX = (Math.random() - 0.5) * voxelSize * 0.4;
        const offsetY = (Math.random() - 0.5) * voxelSize * 0.4;
        eggMesh.position.set(eggVisualX + offsetX, eggVisualY + offsetY, eggVisualZ);

        //eggMesh.position.set(eggVisualX + offsetX, eggVisualY + offsetY, 0);
    
        console.log(`  Egg mesh 3D position: X=${eggMesh.position.x.toFixed(2)}, Y=${eggMesh.position.y.toFixed(2)}, Z=${eggMesh.position.z.toFixed(2)}`);
        undergroundGroup.add(eggMesh); // Add to the group
    
        // Store egg data
        const eggData = {
            mesh: eggMesh,
            hatchTimer: EGG_HATCH_TIME
        };
        eggs.push(eggData);
    
        console.log(`Egg laid at [${queenGridX}, ${queenGridY}]. Total eggs: ${eggs.length}`);
    }

    function hatchEgg(eggData, index) {
        console.log("Egg hatching!");
    
        // 1. Remove visual mesh
        undergroundGroup.remove(eggData.mesh);
        // Optional cleanup
        // eggData.mesh.geometry.dispose(); // Don't dispose shared geometry!
        // eggData.mesh.material.dispose(); // Don't dispose shared material!
    
        // 2. Remove from our tracking array
        // Splice is safe here if we iterate backwards or adjust index after removal
        eggs.splice(index, 1);
    
        // TODO: Spawn a worker ant here!
        console.log(`Hatched. Remaining eggs: ${eggs.length}`);
    
    }


    function onKeyDown(event) {
        if (event.key === 'Tab') {
            event.preventDefault();
            switchView();
        }
    
        // NEW: Handle arrow key movement for Queen underground
        if (currentView === 'underground' && queenMesh && queenMesh.visible) { // Only if underground and queen exists/is visible
            let dx = 0;
            let dy = 0;
            switch (event.key) {
                case 'ArrowUp':
                    dy = -1; // Move up in the grid (negative Y direction visually)
                    break;
                case 'ArrowDown':
                    dy = 1;  // Move down in the grid (positive Y direction visually)
                    break;
                case 'ArrowLeft':
                    dx = -1; // Move left
                    break;
                case 'ArrowRight':
                    dx = 1;  // Move right
                    break;
            }
    
            if (dx !== 0 || dy !== 0) {
                moveQueenUnderground(dx, dy);
            }
        }
    }

    function switchView() {
        if (currentView === 'surface') {
            // --- Switching TO Underground ---
            currentView = 'underground';
            activeCamera = undergroundCamera;
            groundPlane.visible = false; // Hide surface
    
            if (queenMesh) {
                // If queen hasn't been positioned underground yet, find a starting spot
                if (queenGridX === -1 || queenGridY === -1) {
                     // Find the first empty space near the top center to place her
                     // Or dig one manually if needed for the start
                     const startX = Math.floor(undergroundWidth / 2);
                     let startY = 0;
    
                     // **Crucial:** Make sure there's an initial empty space!
                     // Let's manually dig the block at [startX, startY] if it exists
                     if (voxelGrid[startY] && voxelGrid[startY][startX]) {
                          const initialVoxelMesh = voxelGrid[startY][startX];
                          if (initialVoxelMesh) { // Check if it wasn't already dug
                             undergroundGroup.remove(initialVoxelMesh);
                             voxelGrid[startY][startX] = null; // Mark as empty
                             console.log(`Creating initial entry at [${startX}, ${startY}]`);
                          }
                     } else {
                         console.error("Cannot find valid starting voxel for queen!");
                         // Handle error - maybe don't switch view or place queen?
                     }
    
    
                    queenGridX = startX;
                    queenGridY = startY;
                }
    
                // Calculate 3D position from grid coordinates
                const queenX = (queenGridX * voxelSize) + undergroundGroup.position.x;
                const queenY = (-queenGridY * voxelSize) + undergroundGroup.position.y; // Y is inverted
    
                queenMesh.position.set(queenX, queenY, 0.3); // Z=0.3 for better visibility in side view
                queenMesh.rotation.set(0, 0, 0); // Reset rotation for side view if needed
                queenMesh.visible = true; // Make sure she's visible underground
            }
    
            undergroundGroup.visible = true; // Show soil
            scene.background.set(0x333333); // Dark background
            console.log("Switched to Underground View");
    
        } else {
            // --- Switching TO Surface ---
            currentView = 'surface';
            activeCamera = surfaceCamera;
            if (holeMesh) holeMesh.visible = true; // Show surface hole marker

            // NEW: Keep queen hidden when switching back to surface
            if (queenMesh) {
                queenMesh.visible = false; // Queen is underground, don't show her surface mesh
            }
    
            undergroundGroup.visible = false; // Hide soil
            scene.background.set(0x87CEEB); // Sky blue background
            console.log("Switched to Surface View");
        }
         // Deselect queen when switching views for simplicity
         isQueenSelected = false;
         // Add visual deselection feedback later (e.g., outline)
    }


// --- Animation Loop ---

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

     // --- Updates ---

    // 1. Egg Laying Timer (only when underground)
    if (currentView === 'underground' && queenMesh && queenMesh.visible) {
        timeSinceLastEgg += deltaTime;
        if (timeSinceLastEgg >= EGG_LAY_INTERVAL) {
            layEgg();
            timeSinceLastEgg = 0; // Reset timer
        }
    }

    // 2. Egg Hatching Timer
    // Iterate backwards through the array is safer when removing elements
    for (let i = eggs.length - 1; i >= 0; i--) {
        const egg = eggs[i];
        egg.hatchTimer -= deltaTime;

        if (egg.hatchTimer <= 0) {
            hatchEgg(egg, i);
            // Since we removed element 'i', the next element is now at 'i'
            // But because we iterate backwards, this is fine.
        }
    }

    // Render the scene using the ACTIVE camera
    renderer.render(scene, activeCamera);
}

// --- Start ---
init();

// Expose key variables to window for debugging
window.currentView = currentView;
window.queenMesh = queenMesh;
window.queenGridX = queenGridX;
window.queenGridY = queenGridY;
window.eggs = eggs;
window.undergroundWidth = undergroundWidth;
window.undergroundHeight = undergroundHeight;
window.scene = scene;
window.activeCamera = activeCamera;