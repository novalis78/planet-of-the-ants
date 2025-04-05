import * as THREE from 'three';

let scene, surfaceCamera, undergroundCamera, activeCamera, renderer, clock;
let groundPlane, queenMesh = null;
let raycaster, mouse;
let queenGridX = -1; // Queen's current grid X coordinate (underground)
let queenGridY = -1; // Queen's current grid Y coordinate (underground)
let isQueenSelected = false;
let holeMesh = null; 

// Texture and sprite system
let spriteLoader = {
    textures: {},
    spriteSheets: {
        ant: { file: 'sprite_sheet_ant.png', rows: 3, cols: 2, frames: 6 },
        queen: { file: 'sprite_sheet_queen.png', rows: 3, cols: 2, frames: 6 },
        seedling: { file: 'sprite_sheet_seedling.png', rows: 1, cols: 4, frames: 4 },
        pupae: { file: 'sprite_sheet_pupae.png', rows: 4, cols: 3, frames: 12 },
        food: { file: 'sprite_sheet_food.png', rows: 4, cols: 3, frames: 12 },
        spider: { file: 'sprite_sheet_spider.png', rows: 3, cols: 3, frames: 9 },
        beetle: { file: 'sprite_sheet_beetle.png', rows: 3, cols: 3, frames: 9 }
    },
    loaded: false
};

// Ant lifecycle variables
let eggs = []; // Array to store egg data { mesh: eggMesh, hatchTimer: time }
let larvae = []; // Array to store larvae data (between egg and pupae)
let pupae = []; // Array to store pupae data (final stage before worker)
const EGG_LAY_INTERVAL = 5.0; // Seconds between laying eggs
const EGG_HATCH_TIME = 10.0; // Seconds for egg to become larva
const LARVA_PUPATION_TIME = 15.0; // Seconds for larva to become pupa
const PUPA_HATCH_TIME = 15.0; // Seconds for pupa to become adult
let timeSinceLastEgg = 0;
let eggGeometry, eggMaterial; // Shared resources for efficiency

// Worker ant variables (global declaration)
let workers = []; // Array to store worker ant data
const WORKER_SPEED = 0.5; // Movement speed of worker ants

// Pheromone system
let pheromones = []; // Array to store pheromone data
const PHEROMONE_TYPES = {
    HOME: { color: 0x0000ff, strength: 1.0, decayRate: 0.05 },  // Blue
    FOOD: { color: 0x00ff00, strength: 1.0, decayRate: 0.05 },  // Green
    DANGER: { color: 0xff0000, strength: 1.0, decayRate: 0.08 } // Red (decays faster)
};
const PHEROMONE_INFLUENCE_RADIUS = 1.5; // How far ants can detect pheromones

// Food system
let foodSources = []; // Array to store food sources
const FOOD_TYPES = {
    SEEDLING: { value: 50, frames: 4, frameStart: 0, sheet: 'seedling' },
    LEAF: { value: 30, frames: 3, frameStart: 0, sheet: 'food' },
    SEED: { value: 20, frames: 4, frameStart: 3, sheet: 'food' },
    INSECT: { value: 80, frames: 3, frameStart: 6, sheet: 'food' },
    DECAYED_LEAF: { value: 15, frames: 2, frameStart: 9, sheet: 'food' }
};
const FOOD_GROWTH_STAGES = 4; // Number of growth stages for plants
const FOOD_GROWTH_TIME = 30.0; // Time to grow to next stage
const FOOD_SPAWN_INTERVAL = 15.0; // Seconds between spawning new food (on surface)
const FOOD_SPAWN_RADIUS = 15.0; // Max distance from center to spawn food
const FOOD_INITIAL_AMOUNT = 50; // Initial food amount per source
const FOOD_CARRY_CAPACITY = 5; // How much food a worker can carry
let timeSinceLastFoodSpawn = 0;
let colonyFoodReserve = 0; // Total food stored in the colony

// Predator system
let predators = []; // Array to store predators (spiders, beetles)
const PREDATOR_TYPES = {
    SPIDER: { damage: 2, speed: 0.7, health: 10, sheet: 'spider' },
    BEETLE: { damage: 1, speed: 0.4, health: 15, sheet: 'beetle' }
};
const PREDATOR_SPAWN_INTERVAL = 60.0; // Seconds between spawning predators
const PREDATOR_SPAWN_RADIUS = 20.0; // Max distance from center to spawn predators
let timeSinceLastPredatorSpawn = 0;

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

    // Load textures
    loadTextures(() => {
        console.log("All textures loaded!");
        spriteLoader.loaded = true;
        
        // Create initial food sources after textures are loaded
        createInitialFoodSources(5); // Start with 5 food sources
    });
    
    // Start the animation loop
    animate();
}

// Texture loading function
function loadTextures(callback) {
    const textureLoader = new THREE.TextureLoader();
    const totalTextures = Object.keys(spriteLoader.spriteSheets).length;
    let loadedTextures = 0;
    
    // Load each sprite sheet
    for (const [key, sheet] of Object.entries(spriteLoader.spriteSheets)) {
        textureLoader.load(
            sheet.file,
            (texture) => {
                // Store the loaded texture
                spriteLoader.textures[key] = texture;
                
                // Check if all textures are loaded
                loadedTextures++;
                if (loadedTextures === totalTextures) {
                    if (callback) callback();
                }
            },
            undefined, // onProgress not supported
            (error) => {
                console.error(`Error loading texture ${sheet.file}:`, error);
            }
        );
    }
}

// Update sprite frame in animation
function updateSpriteFrame(spriteMesh, spriteType, frameIndex) {
    if (!spriteLoader.loaded || !spriteMesh || !spriteMesh.geometry) {
        return;
    }
    
    const sheet = spriteLoader.spriteSheets[spriteType];
    const frameWidth = 1 / sheet.cols;
    const frameHeight = 1 / sheet.rows;
    
    // Calculate frame position in the texture
    const colIndex = frameIndex % sheet.cols;
    const rowIndex = Math.floor(frameIndex / sheet.cols);
    
    const frameX = colIndex * frameWidth;
    const frameY = rowIndex * frameHeight;
    
    // Update UV coordinates
    const geo = spriteMesh.geometry;
    
    geo.faceVertexUvs[0][0][0].x = frameX;
    geo.faceVertexUvs[0][0][0].y = 1 - frameY;
    geo.faceVertexUvs[0][0][1].x = frameX;
    geo.faceVertexUvs[0][0][1].y = 1 - (frameY + frameHeight);
    geo.faceVertexUvs[0][0][2].x = frameX + frameWidth;
    geo.faceVertexUvs[0][0][2].y = 1 - frameY;
    
    geo.faceVertexUvs[0][1][0].x = frameX;
    geo.faceVertexUvs[0][1][0].y = 1 - (frameY + frameHeight);
    geo.faceVertexUvs[0][1][1].x = frameX + frameWidth;
    geo.faceVertexUvs[0][1][1].y = 1 - (frameY + frameHeight);
    geo.faceVertexUvs[0][1][2].x = frameX + frameWidth;
    geo.faceVertexUvs[0][1][2].y = 1 - frameY;
    
    geo.uvsNeedUpdate = true;
}

// --- Queen ---

function createQueen(position) {
    // Check if the queen already exists
    if (queenMesh) return; // Only one queen for now
    
    // Wait until textures are loaded
    if (!spriteLoader.loaded) {
        console.log("Waiting for textures to load before creating queen...");
        setTimeout(() => createQueen(position), 500); // Try again in 500ms
        return;
    }

    // Create a group for the queen
    queenMesh = new THREE.Group();
    queenMesh.name = "QUEEN";
    
    // Create a plane for the sprite
    const queenGeo = new THREE.PlaneGeometry(2.0, 2.0); // Larger than worker ants
    const queenMat = new THREE.MeshBasicMaterial({
        map: spriteLoader.textures.queen,
        transparent: true,
        alphaTest: 0.5
    });
    
    // Set up UV coordinates for the first frame in sprite sheet
    const sheet = spriteLoader.spriteSheets.queen;
    const frameWidth = 1 / sheet.cols;
    const frameHeight = 1 / sheet.rows;
    
    // Use the first frame
    queenGeo.faceVertexUvs[0][0][0].x = 0;
    queenGeo.faceVertexUvs[0][0][0].y = 1;
    queenGeo.faceVertexUvs[0][0][1].x = 0;
    queenGeo.faceVertexUvs[0][0][1].y = 1 - frameHeight;
    queenGeo.faceVertexUvs[0][0][2].x = frameWidth;
    queenGeo.faceVertexUvs[0][0][2].y = 1;
    
    queenGeo.faceVertexUvs[0][1][0].x = 0;
    queenGeo.faceVertexUvs[0][1][0].y = 1 - frameHeight;
    queenGeo.faceVertexUvs[0][1][1].x = frameWidth;
    queenGeo.faceVertexUvs[0][1][1].y = 1 - frameHeight;
    queenGeo.faceVertexUvs[0][1][2].x = frameWidth;
    queenGeo.faceVertexUvs[0][1][2].y = 1;
    
    queenGeo.uvsNeedUpdate = true;
    
    // Create the sprite mesh
    const queenSpriteMesh = new THREE.Mesh(queenGeo, queenMat);
    queenSpriteMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
    
    // Add the sprite to the group
    queenMesh.add(queenSpriteMesh);
    
    // Position slightly above the ground intersection point
    queenMesh.position.copy(position);
    queenMesh.position.y += 0.05; // Slightly above ground to prevent z-fighting
    
    // Add to scene
    scene.add(queenMesh);

    console.log("Queen placed at:", queenMesh.position);

    if (holeMesh) {
        holeMesh.position.x = position.x;
        holeMesh.position.z = position.z; // Use Z for surface plane
        holeMesh.visible = true;
        console.log("Hole placed at:", holeMesh.position);
    }
    
    // Store animation details for the queen
    queenMesh.userData = {
        frameIndex: 0,
        frameTime: 0,
        frameDuration: 0.25 // 4 frames per second
    };
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

    // --- Predator System Functions ---
    
function createPredator(position, predatorType) {
    // If no predator type specified, randomly pick one
    if (!predatorType) {
        predatorType = Math.random() < 0.7 ? 'SPIDER' : 'BEETLE';
    }
    
    // Get predator configuration
    const predatorConfig = PREDATOR_TYPES[predatorType];
    if (!predatorConfig) {
        console.error(`Invalid predator type: ${predatorType}`);
        return null;
    }
    
    // Make sure textures are loaded
    if (!spriteLoader.loaded) {
        console.log("Waiting for textures to load before creating predator...");
        setTimeout(() => createPredator(position, predatorType), 500);
        return null;
    }
    
    // Create a plane for the sprite
    const predGeo = new THREE.PlaneGeometry(2.0, 1.5);
    const predMat = new THREE.MeshBasicMaterial({
        map: spriteLoader.textures[predatorConfig.sheet],
        transparent: true,
        alphaTest: 0.5
    });
    
    // Set up UV coordinates for the first frame in sprite sheet
    const sheet = spriteLoader.spriteSheets[predatorConfig.sheet];
    const frameWidth = 1 / sheet.cols;
    const frameHeight = 1 / sheet.rows;
    
    // Use the first frame
    predGeo.faceVertexUvs[0][0][0].x = 0;
    predGeo.faceVertexUvs[0][0][0].y = 1;
    predGeo.faceVertexUvs[0][0][1].x = 0;
    predGeo.faceVertexUvs[0][0][1].y = 1 - frameHeight;
    predGeo.faceVertexUvs[0][0][2].x = frameWidth;
    predGeo.faceVertexUvs[0][0][2].y = 1;
    
    predGeo.faceVertexUvs[0][1][0].x = 0;
    predGeo.faceVertexUvs[0][1][0].y = 1 - frameHeight;
    predGeo.faceVertexUvs[0][1][1].x = frameWidth;
    predGeo.faceVertexUvs[0][1][1].y = 1 - frameHeight;
    predGeo.faceVertexUvs[0][1][2].x = frameWidth;
    predGeo.faceVertexUvs[0][1][2].y = 1;
    
    predGeo.uvsNeedUpdate = true;
    
    // Create the mesh
    const predMesh = new THREE.Mesh(predGeo, predMat);
    predMesh.position.copy(position);
    predMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
    
    // Scale based on type
    if (predatorType === 'BEETLE') {
        predMesh.scale.set(1.5, 1.5, 1);
    }
    
    // Add to scene (only visible on surface)
    scene.add(predMesh);
    
    // Store animation details
    predMesh.userData = {
        frameIndex: 0,
        frameTime: 0,
        frameDuration: 0.2, // Fast animation for predators
        totalFrames: 9 // Both predator types have 9 frames
    };
    
    // Store predator data
    const predatorData = {
        mesh: predMesh,
        position: position.clone(),
        predatorType: predatorType,
        health: predatorConfig.health,
        damage: predatorConfig.damage,
        speed: predatorConfig.speed,
        active: true,
        state: 'hunting', // hunting, attacking, fleeing
        target: null,
        timeToNextAction: Math.random() * 2 // Random initial delay before first action
    };
    
    predators.push(predatorData);
    console.log(`Predator (${predatorType}) created at ${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
    
    return predatorData;
}

function updatePredator(predator, deltaTime) {
    if (!predator.active) return;
    
    // Update animation
    if (predator.mesh && predator.mesh.userData) {
        predator.mesh.userData.frameTime += deltaTime;
        if (predator.mesh.userData.frameTime >= predator.mesh.userData.frameDuration) {
            // Advance to next frame
            predator.mesh.userData.frameTime = 0;
            predator.mesh.userData.frameIndex = (predator.mesh.userData.frameIndex + 1) % predator.mesh.userData.totalFrames;
            
            // Update the sprite frame
            updateSpriteFrame(predator.mesh, PREDATOR_TYPES[predator.predatorType].sheet, predator.mesh.userData.frameIndex);
        }
    }
    
    // Update action timer
    predator.timeToNextAction -= deltaTime;
    if (predator.timeToNextAction <= 0) {
        // Time for a new action
        
        // For now, just move randomly
        const angle = Math.random() * Math.PI * 2;
        const distance = predator.speed * 2;
        const newX = predator.position.x + Math.cos(angle) * distance;
        const newZ = predator.position.z + Math.sin(angle) * distance;
        
        // Ensure we stay within bounds
        const boundedX = Math.max(-PREDATOR_SPAWN_RADIUS, Math.min(PREDATOR_SPAWN_RADIUS, newX));
        const boundedZ = Math.max(-PREDATOR_SPAWN_RADIUS, Math.min(PREDATOR_SPAWN_RADIUS, newZ));
        
        // Update position
        predator.position.x = boundedX;
        predator.position.z = boundedZ;
        predator.mesh.position.x = boundedX;
        predator.mesh.position.z = boundedZ;
        
        // Rotate to face movement direction
        const angle2D = Math.atan2(boundedZ - predator.mesh.position.z, boundedX - predator.mesh.position.x);
        predator.mesh.rotation.z = angle2D + Math.PI/2;
        
        // Reset action timer
        predator.timeToNextAction = 1 + Math.random() * 3;
    }
}
    
    // --- Food System Functions ---
    
function createInitialFoodSources(count) {
    if (!spriteLoader.loaded) {
        console.error("Cannot create food sources: textures not loaded");
        return;
    }
    
    for (let i = 0; i < count; i++) {
        // Random position on surface
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * FOOD_SPAWN_RADIUS;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        createFoodSource(new THREE.Vector3(x, 0.01, z));
    }
    
    console.log(`Created ${count} initial food sources`);
}

function createFoodSource(position, foodType) {
    // If no food type specified, pick a random one with a preference for plant-based food
    if (!foodType) {
        const rand = Math.random();
        if (rand < 0.4) {
            foodType = 'SEEDLING';
        } else if (rand < 0.6) {
            foodType = 'LEAF';
        } else if (rand < 0.8) {
            foodType = 'SEED';
        } else if (rand < 0.95) {
            foodType = 'DECAYED_LEAF';
        } else {
            foodType = 'INSECT';
        }
    }
    
    // Get food data
    const foodConfig = FOOD_TYPES[foodType];
    if (!foodConfig) {
        console.error(`Invalid food type: ${foodType}`);
        return null;
    }
    
    // Make sure textures are loaded
    if (!spriteLoader.loaded) {
        console.log("Waiting for textures to load before creating food...");
        setTimeout(() => createFoodSource(position, foodType), 500);
        return null;
    }
    
    // Create a plane for the sprite
    const foodGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const foodMat = new THREE.MeshBasicMaterial({
        map: spriteLoader.textures[foodConfig.sheet],
        transparent: true,
        alphaTest: 0.5
    });
    
    // Set up UV coordinates for the first frame in sprite sheet
    const sheet = spriteLoader.spriteSheets[foodConfig.sheet];
    const frameWidth = 1 / sheet.cols;
    const frameHeight = 1 / sheet.rows;
    
    // Calculate the frame coordinates based on frameStart
    const frameIndex = foodConfig.frameStart;
    const colIndex = frameIndex % sheet.cols;
    const rowIndex = Math.floor(frameIndex / sheet.cols);
    
    const frameX = colIndex * frameWidth;
    const frameY = rowIndex * frameHeight;
    
    // Set UV coordinates for the selected frame
    foodGeo.faceVertexUvs[0][0][0].x = frameX;
    foodGeo.faceVertexUvs[0][0][0].y = 1 - frameY;
    foodGeo.faceVertexUvs[0][0][1].x = frameX;
    foodGeo.faceVertexUvs[0][0][1].y = 1 - (frameY + frameHeight);
    foodGeo.faceVertexUvs[0][0][2].x = frameX + frameWidth;
    foodGeo.faceVertexUvs[0][0][2].y = 1 - frameY;
    
    foodGeo.faceVertexUvs[0][1][0].x = frameX;
    foodGeo.faceVertexUvs[0][1][0].y = 1 - (frameY + frameHeight);
    foodGeo.faceVertexUvs[0][1][1].x = frameX + frameWidth;
    foodGeo.faceVertexUvs[0][1][1].y = 1 - (frameY + frameHeight);
    foodGeo.faceVertexUvs[0][1][2].x = frameX + frameWidth;
    foodGeo.faceVertexUvs[0][1][2].y = 1 - frameY;
    
    foodGeo.uvsNeedUpdate = true;
    
    // Create the mesh
    const foodMesh = new THREE.Mesh(foodGeo, foodMat);
    foodMesh.position.copy(position);
    foodMesh.rotation.x = -Math.PI / 2; // Lay flat on ground
    foodMesh.rotation.z = Math.random() * Math.PI * 2; // Random rotation
    
    // Scale mesh based on food type
    if (foodType === 'SEEDLING') {
        foodMesh.scale.set(1.2, 1.2, 1);
    } else if (foodType === 'INSECT') {
        foodMesh.scale.set(1.3, 1.3, 1);
    } else if (foodType === 'SEED') {
        foodMesh.scale.set(0.7, 0.7, 1); // Seeds smaller
    }
    
    // Add to the scene (only visible on surface)
    scene.add(foodMesh);
    
    // Store animation details for growth if applicable
    const hasAnimation = (foodType === 'SEEDLING');
    foodMesh.userData = {
        frameIndex: foodConfig.frameStart,
        frameTime: 0,
        frameDuration: 1.0, // Slow animation for plants
        totalFrames: foodConfig.frames
    };
    
    // Store food data
    const foodData = {
        mesh: foodMesh,
        position: position.clone(),
        foodType: foodType,
        growthStage: 0,
        growthProgress: 0,
        maxGrowthStage: foodConfig.frames - 1,
        amount: foodType === 'SEEDLING' ? FOOD_INITIAL_AMOUNT : foodConfig.value,
        active: true,
        canGrow: (foodType === 'SEEDLING') // Only seedlings can grow
    };
    
    foodSources.push(foodData);
    console.log(`Food source (${foodType}) created at ${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
    
    return foodData;
}

function updateFoodSource(food, deltaTime) {
    if (!food.active) return;
    
    // Update growth
    if (food.growthStage < FOOD_GROWTH_STAGES - 1) {
        food.growthProgress += deltaTime / FOOD_GROWTH_TIME;
        
        if (food.growthProgress >= 1.0) {
            // Advance to next growth stage
            food.growthStage++;
            food.growthProgress = 0;
            
            // Update the sprite frame
            updateFoodSourceFrame(food);
            
            console.log(`Food source advanced to growth stage ${food.growthStage}`);
        }
    }
}

function updateFoodSourceFrame(food) {
    if (!food.mesh || !food.mesh.geometry) return;
    
    const sheet = spriteLoader.spriteSheets.seedling;
    const frameWidth = 1 / sheet.cols;
    const frameHeight = 1 / sheet.rows;
    
    // Calculate frame X position in the texture (growth stage determines the frame)
    const frameX = (food.growthStage % sheet.cols) * frameWidth;
    const frameY = Math.floor(food.growthStage / sheet.cols) * frameHeight;
    
    // Update UV coordinates for sprite
    const geo = food.mesh.geometry;
    
    geo.faceVertexUvs[0][0][0].x = frameX;
    geo.faceVertexUvs[0][0][0].y = 1 - frameY;
    geo.faceVertexUvs[0][0][1].x = frameX;
    geo.faceVertexUvs[0][0][1].y = 1 - (frameY + frameHeight);
    geo.faceVertexUvs[0][0][2].x = frameX + frameWidth;
    geo.faceVertexUvs[0][0][2].y = 1 - frameY;
    
    geo.faceVertexUvs[0][1][0].x = frameX;
    geo.faceVertexUvs[0][1][0].y = 1 - (frameY + frameHeight);
    geo.faceVertexUvs[0][1][1].x = frameX + frameWidth;
    geo.faceVertexUvs[0][1][1].y = 1 - (frameY + frameHeight);
    geo.faceVertexUvs[0][1][2].x = frameX + frameWidth;
    geo.faceVertexUvs[0][1][2].y = 1 - frameY;
    
    geo.uvsNeedUpdate = true;
}

function harvestFood(food, amount) {
    if (!food.active || food.amount <= 0) return 0;
    
    // Only fully grown plants can be harvested
    if (food.growthStage < FOOD_GROWTH_STAGES - 1) {
        return 0;
    }
    
    // Calculate how much food to take (limited by what's available)
    const harvestedAmount = Math.min(amount, food.amount);
    food.amount -= harvestedAmount;
    
    // If the food source is depleted, mark it as inactive and remove it
    if (food.amount <= 0) {
        food.active = false;
        scene.remove(food.mesh);
        console.log("Food source depleted");
    }
    
    console.log(`Harvested ${harvestedAmount} food. Remaining: ${food.amount}`);
    return harvestedAmount;
}

    // --- Digging Functions ---

function findAdjacentSoil(gridX, gridY) {
    // Check the four adjacent cells (up, down, left, right) for soil
    const directions = [
        { dx: 0, dy: -1, name: 'up' },    // Up
        { dx: 0, dy: 1, name: 'down' },   // Down
        { dx: -1, dy: 0, name: 'left' },  // Left
        { dx: 1, dy: 0, name: 'right' }   // Right
    ];
    
    // Shuffle directions for more natural-looking behavior
    for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
    }
    
    // Check each direction
    for (const dir of directions) {
        const targetX = gridX + dir.dx;
        const targetY = gridY + dir.dy;
        
        // Check bounds
        if (targetX < 0 || targetX >= undergroundWidth || targetY < 0 || targetY >= undergroundHeight) {
            continue; // Skip out of bounds
        }
        
        // Check if soil exists here
        if (voxelGrid[targetY] && voxelGrid[targetY][targetX]) {
            return {
                x: targetX,
                y: targetY,
                direction: dir.name,
                voxel: voxelGrid[targetY][targetX]
            };
        }
    }
    
    // No soil found
    return null;
}

function startDigging(worker, targetSoil) {
    if (worker.state === 'digging') {
        return false; // Already digging
    }
    
    // Set the worker's state to digging
    worker.state = 'digging';
    worker.diggingTarget = targetSoil;
    worker.diggingProgress = 0;
    
    // Change worker's color to indicate digging state
    const bodyMesh = worker.mesh.children[0]; // First child is body
    if (bodyMesh && bodyMesh.material) {
        // Store original color for resetting later
        worker.originalBodyColor = bodyMesh.material.color.getHex();
        bodyMesh.material.color.set(0x8B4513); // Brown while digging
    }
    
    // Position worker facing the soil
    switch(targetSoil.direction) {
        case 'up':
            worker.mesh.rotation.z = Math.PI / 2; // Rotate to face up
            break;
        case 'down':
            worker.mesh.rotation.z = -Math.PI / 2; // Rotate to face down
            break;
        case 'left':
            worker.mesh.rotation.y = Math.PI; // Rotate to face left
            break;
        case 'right':
            worker.mesh.rotation.y = 0; // Rotate to face right
            break;
    }
    
    console.log(`Worker at [${worker.gridX}, ${worker.gridY}] started digging ${targetSoil.direction} to [${targetSoil.x}, ${targetSoil.y}]`);
    return true;
}

function completeDigging(worker) {
    if (!worker.diggingTarget) {
        return false; // No digging target
    }
    
    // Get the target voxel
    const targetX = worker.diggingTarget.x;
    const targetY = worker.diggingTarget.y;
    const voxelMesh = voxelGrid[targetY][targetX];
    
    if (!voxelMesh) {
        // Target already dug by another worker
        worker.state = 'idle';
        worker.diggingTarget = null;
        worker.diggingProgress = 0;
        return false;
    }
    
    // Remove the soil voxel
    undergroundGroup.remove(voxelMesh);
    voxelGrid[targetY][targetX] = null; // Mark as empty in grid
    
    // Create a HOME pheromone at the newly dug area
    const pheromonePos = new THREE.Vector3(
        (targetX * voxelSize) + undergroundGroup.position.x,
        (-targetY * voxelSize) + undergroundGroup.position.y,
        0.01
    );
    createPheromone(pheromonePos, 'HOME', 0.8);
    
    // Reset worker state
    worker.state = 'idle';
    worker.diggingTarget = null;
    worker.diggingProgress = 0;
    
    // Reset worker appearance
    if (worker.mesh && worker.mesh.material && worker.mesh.userData && worker.mesh.userData.originalMaterial) {
        worker.mesh.material = worker.mesh.userData.originalMaterial.clone();
    }
    
    console.log(`Worker at [${worker.gridX}, ${worker.gridY}] completed digging to [${targetX}, ${targetY}]`);
    return true;
}

    // --- Pheromone System Functions ---
    
function createPheromone(position, type, initialStrength = 1.0) {
    // Create visual representation
    const pheroGeo = new THREE.CircleGeometry(0.2, 8); // Small circle
    const pheroMat = new THREE.MeshBasicMaterial({ 
        color: PHEROMONE_TYPES[type].color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const pheroMesh = new THREE.Mesh(pheroGeo, pheroMat);
    
    // Position slightly above ground to prevent z-fighting
    pheroMesh.position.copy(position);
    pheroMesh.position.z = 0.01;
    pheroMesh.rotation.x = -Math.PI / 2; // Lay flat
    
    undergroundGroup.add(pheroMesh);
    
    // Convert to grid coordinates for logic
    const gridX = Math.round((position.x - undergroundGroup.position.x) / voxelSize);
    const gridY = Math.round(-(position.y - undergroundGroup.position.y) / voxelSize);
    
    // Store pheromone data
    const pheromoneData = {
        mesh: pheroMesh,
        type: type,
        gridX: gridX,
        gridY: gridY,
        strength: initialStrength,
        decayRate: PHEROMONE_TYPES[type].decayRate
    };
    
    pheromones.push(pheromoneData);
    console.log(`Pheromone (${type}) created at [${gridX}, ${gridY}]`);
    
    return pheromoneData;
}

function findNearbyPheromones(gridX, gridY, type = null, radius = PHEROMONE_INFLUENCE_RADIUS) {
    // Find all pheromones of the specified type (or any type if null) within radius
    return pheromones.filter(pheromone => {
        // Skip if looking for specific type and this isn't it
        if (type && pheromone.type !== type) return false;
        
        // Calculate grid distance
        const distance = Math.sqrt(
            Math.pow(pheromone.gridX - gridX, 2) + 
            Math.pow(pheromone.gridY - gridY, 2)
        );
        
        return distance <= radius;
    });
}

function getStrongestPheromoneDirection(gridX, gridY, type) {
    const nearbyPheromones = findNearbyPheromones(gridX, gridY, type);
    
    if (nearbyPheromones.length === 0) return null;
    
    // Find the strongest pheromone weighted by distance
    let strongestPheromone = null;
    let highestScore = 0;
    
    for (const pheromone of nearbyPheromones) {
        const distance = Math.sqrt(
            Math.pow(pheromone.gridX - gridX, 2) + 
            Math.pow(pheromone.gridY - gridY, 2)
        );
        
        // Avoid division by zero
        const effectiveDistance = Math.max(0.1, distance);
        
        // Score based on strength and inverse distance
        const score = pheromone.strength / effectiveDistance;
        
        if (score > highestScore) {
            highestScore = score;
            strongestPheromone = pheromone;
        }
    }
    
    if (!strongestPheromone) return null;
    
    // Calculate direction toward pheromone
    return {
        dx: Math.sign(strongestPheromone.gridX - gridX),
        dy: Math.sign(strongestPheromone.gridY - gridY)
    };
}

    // --- Worker Ant Functions ---

function createWorkerAnt(position) {
    // Ensure textures are loaded
    if (!spriteLoader.loaded) {
        console.log("Waiting for textures to load before creating worker...");
        setTimeout(() => {
            const worker = createWorkerAnt(position);
            // If this was from egg hatching, we need to complete that process
            if (typeof eggData !== 'undefined' && typeof index !== 'undefined') {
                eggs.splice(index, 1);
            }
        }, 500);
        return null;
    }
    
    // Create worker ant group
    const workerGroup = new THREE.Group();
    workerGroup.name = "WORKER";
    
    // Create a plane for the sprite
    const workerGeo = new THREE.PlaneGeometry(1.2, 0.9); // Smaller than queen
    const workerMat = new THREE.MeshBasicMaterial({
        map: spriteLoader.textures.ant,
        transparent: true,
        alphaTest: 0.5
    });
    
    // Set up UV coordinates for the first frame in sprite sheet
    const sheet = spriteLoader.spriteSheets.ant;
    const frameWidth = 1 / sheet.cols;
    const frameHeight = 1 / sheet.rows;
    
    // Use the first frame
    workerGeo.faceVertexUvs[0][0][0].x = 0;
    workerGeo.faceVertexUvs[0][0][0].y = 1;
    workerGeo.faceVertexUvs[0][0][1].x = 0;
    workerGeo.faceVertexUvs[0][0][1].y = 1 - frameHeight;
    workerGeo.faceVertexUvs[0][0][2].x = frameWidth;
    workerGeo.faceVertexUvs[0][0][2].y = 1;
    
    workerGeo.faceVertexUvs[0][1][0].x = 0;
    workerGeo.faceVertexUvs[0][1][0].y = 1 - frameHeight;
    workerGeo.faceVertexUvs[0][1][1].x = frameWidth;
    workerGeo.faceVertexUvs[0][1][1].y = 1 - frameHeight;
    workerGeo.faceVertexUvs[0][1][2].x = frameWidth;
    workerGeo.faceVertexUvs[0][1][2].y = 1;
    
    workerGeo.uvsNeedUpdate = true;
    
    // Create the sprite mesh
    const workerSpriteMesh = new THREE.Mesh(workerGeo, workerMat);
    workerSpriteMesh.rotation.x = -Math.PI / 2; // Lay flat
    
    // Add the sprite to the group
    workerGroup.add(workerSpriteMesh);
    
    // Position at the given location
    workerGroup.position.copy(position);
    workerGroup.position.z = 0.05; // Slightly above ground to prevent z-fighting
    
    // Store animation details
    workerGroup.userData = {
        frameIndex: 0,
        frameTime: 0,
        frameDuration: 0.2, // 5 frames per second
        originalMaterial: workerMat.clone() // Store original material for resetting after digging
    };
    
    // Add to scene/group
    undergroundGroup.add(workerGroup);
    
    // Store worker data
    const workerData = {
        mesh: workerGroup,
        gridX: Math.round((position.x - undergroundGroup.position.x) / voxelSize),
        gridY: Math.round(-(position.y - undergroundGroup.position.y) / voxelSize), // Convert Y to grid coordinate
        state: 'idle', // Initial state: idle, carrying, digging, feeding, foraging, etc.
        target: null,
        timeSinceLastPheromone: 0, // Timer for laying pheromones
        pheromoneCooldown: 1.0 + Math.random() * 0.5, // Random cooldown between 1-1.5 seconds
        diggingProgress: 0, // Progress for digging (0-1)
        diggingSpeed: 0.5 + Math.random() * 0.3, // Random digging speed
        diggingTarget: null, // Target soil voxel for digging
        foodAmount: 0, // How much food the worker is carrying
        targetFoodSource: null, // Reference to targeted food source when foraging
        targetLarva: null, // Reference to targeted larva when feeding
        forageTimer: 0, // Timer for foraging actions
        feedingProgress: 0, // Progress for feeding larvae (0-1)
        feedingSpeed: 0.7 + Math.random() * 0.3 // Random feeding speed
    };
    
    workers.push(workerData);
    console.log(`Worker ant created at [${workerData.gridX}, ${workerData.gridY}]. Total workers: ${workers.length}`);
    
    return workerData;
}

function hatchEgg(eggData, index) {
    console.log("Egg hatching into larva!");
    
    // 1. Get position before removing egg
    const eggPosition = eggData.mesh.position.clone();
    
    // 2. Remove visual egg mesh
    undergroundGroup.remove(eggData.mesh);
    
    // 3. Remove from our tracking array
    // Splice is safe here if we iterate backwards or adjust index after removal
    eggs.splice(index, 1);
    
    // 4. Create a larva at the egg's position
    createLarva(eggPosition);
    
    console.log(`Egg hatched into larva. Remaining eggs: ${eggs.length}`);
}

function createLarva(position) {
    // Ensure textures are loaded
    if (!spriteLoader.loaded) {
        console.log("Waiting for textures to load before creating larva...");
        setTimeout(() => createLarva(position), 500);
        return null;
    }
    
    // Create larva mesh
    const larvaGeo = new THREE.PlaneGeometry(0.9, 0.6);
    const larvaMat = new THREE.MeshBasicMaterial({
        map: spriteLoader.textures.pupae,
        transparent: true,
        alphaTest: 0.5
    });
    
    // Set up UV coordinates for the first larva frame (first row)
    const sheet = spriteLoader.spriteSheets.pupae;
    const frameWidth = 1 / sheet.cols;
    const frameHeight = 1 / sheet.rows;
    
    // Use the first frame - larvae are in the top row
    larvaGeo.faceVertexUvs[0][0][0].x = 0;
    larvaGeo.faceVertexUvs[0][0][0].y = 1;
    larvaGeo.faceVertexUvs[0][0][1].x = 0;
    larvaGeo.faceVertexUvs[0][0][1].y = 1 - frameHeight;
    larvaGeo.faceVertexUvs[0][0][2].x = frameWidth;
    larvaGeo.faceVertexUvs[0][0][2].y = 1;
    
    larvaGeo.faceVertexUvs[0][1][0].x = 0;
    larvaGeo.faceVertexUvs[0][1][0].y = 1 - frameHeight;
    larvaGeo.faceVertexUvs[0][1][1].x = frameWidth;
    larvaGeo.faceVertexUvs[0][1][1].y = 1 - frameHeight;
    larvaGeo.faceVertexUvs[0][1][2].x = frameWidth;
    larvaGeo.faceVertexUvs[0][1][2].y = 1;
    
    larvaGeo.uvsNeedUpdate = true;
    
    // Create mesh
    const larvaMesh = new THREE.Mesh(larvaGeo, larvaMat);
    larvaMesh.position.copy(position);
    larvaMesh.rotation.x = -Math.PI / 2; // Lay flat
    larvaMesh.position.z = 0.05; // Slightly above ground
    
    // Store animation details
    larvaMesh.userData = {
        frameIndex: 0,
        frameTime: 0,
        frameDuration: 0.6, // Slower animation for larvae (less active)
        stageFrames: 3, // Use first 3 frames for larvae (curled shapes)
        pupating: false
    };
    
    // Add to scene
    undergroundGroup.add(larvaMesh);
    
    // Store larva data
    const larvaData = {
        mesh: larvaMesh,
        position: position.clone(),
        pupationTimer: LARVA_PUPATION_TIME,
        fedAmount: 0, // How much the larva has been fed (needs to be fed to pupate)
        needsFood: true, // Flag to indicate if larva needs food
        gridX: Math.round((position.x - undergroundGroup.position.x) / voxelSize),
        gridY: Math.round(-(position.y - undergroundGroup.position.y) / voxelSize)
    };
    
    larvae.push(larvaData);
    console.log(`Larva created. Total larvae: ${larvae.length}`);
    
    return larvaData;
}

function pupatelarva(larvaData, index) {
    console.log("Larva pupating!");
    
    // Get position before removing larva
    const larvaPosition = larvaData.mesh.position.clone();
    
    // Remove larva mesh (we'll reuse it for the pupa with different frame)
    // Instead of removing, we'll just change the frame to a pupa frame
    const larvaMesh = larvaData.mesh;
    
    // Remove from larvae array
    larvae.splice(index, 1);
    
    // Create pupa data
    const pupaData = {
        mesh: larvaMesh, // Reuse the mesh
        position: larvaPosition.clone(),
        hatchTimer: PUPA_HATCH_TIME,
        gridX: larvaData.gridX,
        gridY: larvaData.gridY,
        antType: 'worker' // Default to worker, could determine different types later
    };
    
    // Change frame to pupa appearance (frames 6-8 in the sprite sheet)
    larvaMesh.userData.frameIndex = 6; // Start at pupa frames
    larvaMesh.userData.stageFrames = 3; // Use 3 frames for pupae
    updateSpriteFrame(larvaMesh, 'pupae', 6);
    
    // Add to pupae array
    pupae.push(pupaData);
    console.log(`Pupa created. Total pupae: ${pupae.length}`);
    
    return pupaData;
}

function hatchPupa(pupaData, index) {
    console.log("Pupa hatching into adult!");
    
    // Get position before removing pupa
    const pupaPosition = pupaData.mesh.position.clone();
    
    // Remove pupa mesh
    undergroundGroup.remove(pupaData.mesh);
    
    // Remove from pupae array
    pupae.splice(index, 1);
    
    // Create adult ant based on type
    if (pupaData.antType === 'worker') {
        createWorkerAnt(pupaPosition);
    }
    // Add other ant types here later (soldier, etc.)
    
    console.log(`Pupa hatched into adult. Remaining pupae: ${pupae.length}`);
}

// --- Feeding System ---

function findHungryLarva() {
    // Find a larva that needs feeding
    for (const larva of larvae) {
        if (larva.needsFood && larva.fedAmount < 10) {
            return larva;
        }
    }
    return null;
}

function startFeeding(worker, larva) {
    if (worker.state === 'feeding') {
        return false; // Already feeding
    }
    
    if (worker.foodAmount <= 0) {
        return false; // No food to give
    }
    
    // Set worker state to feeding
    worker.state = 'feeding';
    worker.targetLarva = larva;
    worker.feedingProgress = 0;
    
    // Position worker near larva
    const larvaPos = larva.mesh.position;
    
    // Create position vector with slight offset from larva
    const feedingPos = new THREE.Vector3(
        larvaPos.x + (Math.random() * 0.4 - 0.2),
        larvaPos.y + (Math.random() * 0.4 - 0.2),
        larvaPos.z
    );
    
    // Update worker position
    worker.mesh.position.copy(feedingPos);
    
    // Visual feedback - change worker appearance
    // Nothing to change with sprite sheets, but could add an indicator
    
    console.log(`Worker starting to feed larva. Worker food: ${worker.foodAmount}`);
    return true;
}

function completeFeeding(worker) {
    if (!worker.targetLarva) {
        console.log("Cannot complete feeding: no target larva");
        worker.state = 'idle';
        worker.feedingProgress = 0;
        return false;
    }
    
    // Calculate how much food to give (between 1-5 units)
    const feedAmount = Math.min(5, worker.foodAmount);
    
    // Transfer food from worker to larva
    worker.foodAmount -= feedAmount;
    worker.targetLarva.fedAmount += feedAmount;
    
    // Update larva's need status
    if (worker.targetLarva.fedAmount >= 10) {
        worker.targetLarva.needsFood = false;
        console.log("Larva fully fed! Ready to pupate.");
    }
    
    // Reset worker state
    worker.state = 'idle';
    worker.targetLarva = null;
    worker.feedingProgress = 0;
    
    console.log(`Worker fed larva ${feedAmount} food units. Worker food remaining: ${worker.foodAmount}`);
    return true;
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
        
        // Debug keys for pheromones and digging
        if (currentView === 'underground') {
            // Use number keys to place different pheromone types at the queen's position
            if (queenMesh && queenMesh.visible) {
                const queenPos = new THREE.Vector3().copy(queenMesh.position);
                
                switch (event.key) {
                    case '1': // HOME pheromone
                        createPheromone(queenPos, 'HOME', 1.0);
                        console.log("Manual HOME pheromone placed at queen");
                        break;
                    case '2': // FOOD pheromone
                        createPheromone(queenPos, 'FOOD', 1.0);
                        console.log("Manual FOOD pheromone placed at queen");
                        break;
                    case '3': // DANGER pheromone
                        createPheromone(queenPos, 'DANGER', 1.0);
                        console.log("Manual DANGER pheromone placed at queen");
                        break;
                    case 'd': // Manual digging command for all nearby workers
                        // Find workers near the queen and command them to dig
                        const nearbyWorkers = workers.filter(worker => {
                            // Calculate distance to queen
                            const distance = Math.sqrt(
                                Math.pow(worker.gridX - queenGridX, 2) + 
                                Math.pow(worker.gridY - queenGridY, 2)
                            );
                            // Only workers within 3 grid cells of the queen and who are idle
                            return distance <= 3 && worker.state === 'idle';
                        });
                        
                        // Command each worker to dig if possible
                        let diggingStarted = 0;
                        for (const worker of nearbyWorkers) {
                            const adjacentSoil = findAdjacentSoil(worker.gridX, worker.gridY);
                            if (adjacentSoil) {
                                startDigging(worker, adjacentSoil);
                                diggingStarted++;
                            }
                        }
                        console.log(`Commanded ${diggingStarted} of ${nearbyWorkers.length} nearby workers to start digging`);
                        break;
                        
                    case 'f': // Spawn a new food source near mouse position
                        if (currentView === 'surface') {
                            // Use the raycaster to find where the mouse is pointing on the ground
                            raycaster.setFromCamera(mouse, activeCamera);
                            const intersects = raycaster.intersectObject(groundPlane);
                            if (intersects.length > 0) {
                                createFoodSource(intersects[0].point);
                                console.log("Manual food source created at mouse position");
                            }
                        }
                        break;
                        
                    case 'p': // Spawn a predator near mouse position
                        if (currentView === 'surface') {
                            // Use the raycaster to find where the mouse is pointing on the ground
                            raycaster.setFromCamera(mouse, activeCamera);
                            const intersects = raycaster.intersectObject(groundPlane);
                            if (intersects.length > 0) {
                                // Spider is default
                                createPredator(intersects[0].point, 'SPIDER');
                                console.log("Spider created at mouse position");
                            }
                        }
                        break;
                        
                    case 'b': // Spawn a beetle predator near mouse position
                        if (currentView === 'surface') {
                            // Use the raycaster to find where the mouse is pointing on the ground
                            raycaster.setFromCamera(mouse, activeCamera);
                            const intersects = raycaster.intersectObject(groundPlane);
                            if (intersects.length > 0) {
                                createPredator(intersects[0].point, 'BEETLE');
                                console.log("Beetle created at mouse position");
                            }
                        }
                        break;
                }
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
    
    // 3. Ant Lifecycle Updates
    // 3a. Larvae Updates
    for (let i = larvae.length - 1; i >= 0; i--) {
        const larva = larvae[i];
        
        // Update animation if mesh exists
        if (larva.mesh && larva.mesh.userData) {
            larva.mesh.userData.frameTime += deltaTime;
            if (larva.mesh.userData.frameTime >= larva.mesh.userData.frameDuration) {
                // Advance to next frame within larva range (first 3 frames)
                larva.mesh.userData.frameTime = 0;
                larva.mesh.userData.frameIndex = (larva.mesh.userData.frameIndex + 1) % larva.mesh.userData.stageFrames;
                
                // Update the sprite frame - keep in larva frames (0-2)
                updateSpriteFrame(larva.mesh, 'pupae', larva.mesh.userData.frameIndex);
            }
        }
        
        // Check if this larva has been fed enough and timer is up
        if (larva.fedAmount >= 10 && !larva.mesh.userData.pupating) { // Need at least 10 food units to pupate
            larva.pupationTimer -= deltaTime;
            if (larva.pupationTimer <= 0) {
                pupatelarva(larva, i);
                continue; // Skip to next larva
            }
        }
        
        // Indicate larva needs food if it hasn't been fed enough
        if (larva.fedAmount < 10 && !larva.needsFood) {
            larva.needsFood = true;
            // Could add visual indicator for hungry larvae here
        }
    }
    
    // 3b. Pupae Updates
    for (let i = pupae.length - 1; i >= 0; i--) {
        const pupa = pupae[i];
        
        // Update animation if mesh exists
        if (pupa.mesh && pupa.mesh.userData) {
            pupa.mesh.userData.frameTime += deltaTime;
            if (pupa.mesh.userData.frameTime >= pupa.mesh.userData.frameDuration) {
                // Advance to next frame within pupa range (frames 6-8)
                pupa.mesh.userData.frameTime = 0;
                pupa.mesh.userData.frameIndex = 6 + ((pupa.mesh.userData.frameIndex - 6 + 1) % pupa.mesh.userData.stageFrames);
                
                // Update the sprite frame
                updateSpriteFrame(pupa.mesh, 'pupae', pupa.mesh.userData.frameIndex);
            }
        }
        
        // Check if pupa is ready to hatch
        pupa.hatchTimer -= deltaTime;
        if (pupa.hatchTimer <= 0) {
            hatchPupa(pupa, i);
        }
    }
    
    // 4. Food Source Spawning and Growth
    // Only spawn and grow food on the surface
    timeSinceLastFoodSpawn += deltaTime;
    if (timeSinceLastFoodSpawn >= FOOD_SPAWN_INTERVAL) {
        if (foodSources.filter(f => f.active).length < 10) { // Limit total active food sources
            // Random position on surface
            const angle = Math.random() * Math.PI * 2;
            const distance = FOOD_SPAWN_RADIUS * 0.3 + Math.random() * FOOD_SPAWN_RADIUS * 0.7;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            createFoodSource(new THREE.Vector3(x, 0.01, z));
        }
        timeSinceLastFoodSpawn = 0;
    }
    
    // Update all food sources (growth stages)
    for (let i = foodSources.length - 1; i >= 0; i--) {
        const food = foodSources[i];
        updateFoodSource(food, deltaTime);
        
        // Clean up depleted food sources
        if (!food.active && food.mesh) {
            scene.remove(food.mesh);
            food.mesh = null;
            
            // Remove from array (optional)
            // foodSources.splice(i, 1);
        }
    }
    
    // 5. Predator Spawning and Updates
    timeSinceLastPredatorSpawn += deltaTime;
    if (timeSinceLastPredatorSpawn >= PREDATOR_SPAWN_INTERVAL) {
        if (predators.filter(p => p.active).length < 3) { // Limit total active predators
            // Random position on surface, further from the center
            const angle = Math.random() * Math.PI * 2;
            const distance = PREDATOR_SPAWN_RADIUS * 0.7 + Math.random() * PREDATOR_SPAWN_RADIUS * 0.3;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            createPredator(new THREE.Vector3(x, 0.05, z));
        }
        timeSinceLastPredatorSpawn = PREDATOR_SPAWN_INTERVAL * (0.8 + Math.random() * 0.4); // Vary the interval slightly
    }
    
    // Update all predators
    for (let i = predators.length - 1; i >= 0; i--) {
        const predator = predators[i];
        updatePredator(predator, deltaTime);
        
        // Clean up dead predators
        if (!predator.active && predator.mesh) {
            scene.remove(predator.mesh);
            predator.mesh = null;
            
            // Remove from array
            predators.splice(i, 1);
        }
    }
    
    // 3. Pheromone Decay
    for (let i = pheromones.length - 1; i >= 0; i--) {
        const pheromone = pheromones[i];
        
        // Reduce strength over time
        pheromone.strength -= pheromone.decayRate * deltaTime;
        
        // Update visual appearance (opacity)
        if (pheromone.mesh && pheromone.mesh.material) {
            pheromone.mesh.material.opacity = Math.min(0.6, pheromone.strength * 0.5);
            
            // Scale based on strength
            const scale = 0.2 + (pheromone.strength * 0.1);
            pheromone.mesh.scale.set(scale, scale, 1);
        }
        
        // Remove pheromone if it's too weak
        if (pheromone.strength <= 0.1) {
            undergroundGroup.remove(pheromone.mesh);
            pheromones.splice(i, 1);
        }
    }
    
    // 4. Sprite Animations
    // Update queen animation if exists and visible
    if (queenMesh && queenMesh.visible && queenMesh.userData) {
        queenMesh.userData.frameTime += deltaTime;
        if (queenMesh.userData.frameTime >= queenMesh.userData.frameDuration) {
            // Advance to next frame
            queenMesh.userData.frameTime = 0;
            queenMesh.userData.frameIndex = (queenMesh.userData.frameIndex + 1) % spriteLoader.spriteSheets.queen.frames;
            
            // Update the sprite frame
            updateSpriteFrame(queenMesh.children[0], 'queen', queenMesh.userData.frameIndex);
        }
    }
    
    // 5. Worker Ant Behavior
    for (let i = 0; i < workers.length; i++) {
        const worker = workers[i];
        
        // Update worker animation
        if (worker.mesh && worker.mesh.userData) {
            worker.mesh.userData.frameTime += deltaTime;
            if (worker.mesh.userData.frameTime >= worker.mesh.userData.frameDuration) {
                // Advance to next frame
                worker.mesh.userData.frameTime = 0;
                worker.mesh.userData.frameIndex = (worker.mesh.userData.frameIndex + 1) % spriteLoader.spriteSheets.ant.frames;
                
                // Update the sprite frame
                updateSpriteFrame(worker.mesh.children[0], 'ant', worker.mesh.userData.frameIndex);
            }
        }
        
        // Update pheromone laying cooldown
        worker.timeSinceLastPheromone += deltaTime;
        
        // Handle different worker states
        if (worker.state === 'digging') {
            // Update digging progress
            worker.diggingProgress += worker.diggingSpeed * deltaTime;
            
            // Visual feedback - slight bobbing motion while digging
            if (worker.mesh) {
                const bobAmount = Math.sin(Date.now() * 0.01) * 0.05;
                worker.mesh.position.z = 0.2 + bobAmount;
            }
            
            // Check if digging is complete
            if (worker.diggingProgress >= 1.0) {
                completeDigging(worker);
            }
        }
        else if (worker.state === 'feeding') {
            // Update feeding progress
            worker.feedingProgress += worker.feedingSpeed * deltaTime;
            
            // Visual feedback - slight movement while feeding
            if (worker.mesh) {
                const moveAmount = Math.sin(Date.now() * 0.02) * 0.03;
                worker.mesh.position.x += moveAmount;
                worker.mesh.position.y += moveAmount;
            }
            
            // Check if feeding is complete
            if (worker.feedingProgress >= 1.0) {
                completeFeeding(worker);
            }
        }
        else if (worker.state === 'idle') {
            // Check if carrying food and there are hungry larvae - opportunity to feed
            if (worker.foodAmount > 0 && larvae.length > 0) {
                // Random chance to look for larvae to feed (10% per second)
                if (Math.random() < 0.1 * deltaTime) {
                    const hungryLarva = findHungryLarva();
                    if (hungryLarva) {
                        startFeeding(worker, hungryLarva);
                        continue; // Skip to next worker
                    }
                }
            }
            // Lay HOME pheromone if enough time has passed
            if (worker.timeSinceLastPheromone >= worker.pheromoneCooldown) {
                // Create position vector
                const pheromonePos = new THREE.Vector3(
                    (worker.gridX * voxelSize) + undergroundGroup.position.x,
                    (-worker.gridY * voxelSize) + undergroundGroup.position.y,
                    0.01
                );
                
                // 15% chance to lay HOME pheromone when idle
                if (Math.random() < 0.15) {
                    createPheromone(pheromonePos, 'HOME', 0.7 + Math.random() * 0.3);
                    worker.timeSinceLastPheromone = 0;
                }
            }
            
            // Check for digging opportunities (25% chance per worker per second)
            if (Math.random() < 0.25 * deltaTime) {
                const adjacentSoil = findAdjacentSoil(worker.gridX, worker.gridY);
                if (adjacentSoil) {
                    // Start digging
                    startDigging(worker, adjacentSoil);
                    continue; // Skip movement this frame
                }
            }
            
            // Decide how to move - 70% chance to follow pheromones if any, otherwise random movement
            let movementDirection = null;
            
            // Try to detect pheromones (small chance to ignore them to encourage exploration)
            if (Math.random() < 0.7) {
                // First try FOOD pheromones (higher priority)
                movementDirection = getStrongestPheromoneDirection(worker.gridX, worker.gridY, 'FOOD');
                
                // If no FOOD pheromones, try HOME pheromones with lower probability (ants shouldn't always go home)
                if (!movementDirection && Math.random() < 0.3) {
                    movementDirection = getStrongestPheromoneDirection(worker.gridX, worker.gridY, 'HOME');
                }
                
                // If no HOME pheromones, check DANGER and avoid them
                if (!movementDirection && Math.random() < 0.8) {
                    const dangerDirection = getStrongestPheromoneDirection(worker.gridX, worker.gridY, 'DANGER');
                    if (dangerDirection) {
                        // Move away from danger (opposite direction)
                        movementDirection = {
                            dx: -dangerDirection.dx,
                            dy: -dangerDirection.dy
                        };
                    }
                }
            }
            
            // If no pheromone influence or decided to move randomly
            if (!movementDirection && Math.random() < 0.1 * deltaTime) {
                // Pick a random direction
                const directions = [
                    { dx: 1, dy: 0 },  // Right
                    { dx: -1, dy: 0 }, // Left
                    { dx: 0, dy: 1 },  // Down
                    { dx: 0, dy: -1 }  // Up
                ];
                
                movementDirection = directions[Math.floor(Math.random() * directions.length)];
            }
            
            // If we have a direction to move, try moving
            if (movementDirection) {
                const targetX = worker.gridX + movementDirection.dx;
                const targetY = worker.gridY + movementDirection.dy;
                
                // Check if move is valid (within bounds and not into soil)
                if (targetX >= 0 && targetX < undergroundWidth && 
                    targetY >= 0 && targetY < undergroundHeight &&
                    (!voxelGrid[targetY] || voxelGrid[targetY][targetX] === null)) {
                    
                    // Update grid position
                    worker.gridX = targetX;
                    worker.gridY = targetY;
                    
                    // Update visual position
                    const visualX = (targetX * voxelSize) + undergroundGroup.position.x;
                    const visualY = (-targetY * voxelSize) + undergroundGroup.position.y;
                    
                    // Reset rotation to normal
                    worker.mesh.rotation.z = 0;
                    
                    // Simple lerp for smooth movement could be added here
                    worker.mesh.position.set(visualX, visualY, worker.mesh.position.z);
                    
                    // Update orientation based on movement direction
                    if (movementDirection.dx !== 0) {
                        // Moving horizontally, rotate to face direction
                        worker.mesh.rotation.y = movementDirection.dx > 0 ? 0 : Math.PI;
                    }
                }
            }
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
window.larvae = larvae;
window.pupae = pupae;
window.workers = workers;
window.pheromones = pheromones;
window.foodSources = foodSources;
window.predators = predators;
window.PHEROMONE_TYPES = PHEROMONE_TYPES;
window.FOOD_TYPES = FOOD_TYPES;
window.PREDATOR_TYPES = PREDATOR_TYPES;
window.createPheromone = createPheromone;
window.createFoodSource = createFoodSource;
window.createPredator = createPredator;
window.harvestFood = harvestFood;
window.findAdjacentSoil = findAdjacentSoil;
window.startDigging = startDigging;
window.startFeeding = startFeeding;
window.findHungryLarva = findHungryLarva;
window.colonyFoodReserve = colonyFoodReserve;
window.voxelGrid = voxelGrid;
window.undergroundWidth = undergroundWidth;
window.undergroundHeight = undergroundHeight;
window.scene = scene;
window.activeCamera = activeCamera;