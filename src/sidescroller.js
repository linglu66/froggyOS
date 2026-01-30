/**
 * Side-Scroller Mode - 2D platformer view for folder contents
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Side-scroller configuration
const CONFIG = {
    // Physics
    gravity: -30,
    jumpForce: 12,
    moveSpeed: 8,

    // World dimensions
    groundY: -5,
    worldWidth: 100,
    platformHeight: 0.5,

    // Camera
    cameraDistance: 20,
    cameraHeight: 5,

    // Player
    playerSize: { width: 1, height: 0.1 }
};

/**
 * Enter side-scroller mode for a folder
 */
export function enterSideScrollerMode(tank, folder) {
    console.log('Entering side-scroller mode for:', folder.userData.name);

    tank.sideScrollerMode = true;
    tank.currentFolder = folder;

    // Create side-scroller scene
    tank.sideScrollerScene = new THREE.Scene();
    tank.sideScrollerScene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Add fog for depth
    tank.sideScrollerScene.fog = new THREE.Fog(0x87CEEB, 30, 80);

    // Setup camera (orthographic for true 2D feel)
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 15;
    tank.sideScrollerCamera = new THREE.OrthographicCamera(
        -viewSize * aspect, viewSize * aspect,
        viewSize, -viewSize,
        0.1, 100
    );
    tank.sideScrollerCamera.position.set(0, CONFIG.cameraHeight, CONFIG.cameraDistance);
    tank.sideScrollerCamera.lookAt(0, CONFIG.cameraHeight, 0);

    // Initialize player state
    tank.sideScrollerPlayer = {
        position: new THREE.Vector3(0, CONFIG.groundY, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        isGrounded: true,
        jumpCount: 0,
        maxJumps: 2,
        mesh: null
    };

    // Initialize platforms array
    tank.sideScrollerPlatforms = [];
    tank.sideScrollerFiles = [];

    // Create the environment
    createSideScrollerEnvironment(tank);

    // Create player
    createPlayer(tank);

    // Generate and place folder contents using actual content
    const contents = generateFolderContents(folder, tank);
    placeFilesOnPlatforms(tank, contents);

    // Add lighting
    createSideScrollerLighting(tank);

    // Hide swimming tank UI elements
    hideSwimmingTankUI(folder.userData.name);

    console.log('Side-scroller mode initialized');
}

/**
 * Exit side-scroller mode and return to swimming tank
 */
export function exitSideScrollerMode(tank) {
    console.log('Exiting side-scroller mode');

    tank.sideScrollerMode = false;
    tank.currentFolder = null;

    // Clean up player mixer
    if (tank.sideScrollerPlayer && tank.sideScrollerPlayer.mixer) {
        tank.sideScrollerPlayer.mixer.stopAllAction();
        tank.sideScrollerPlayer.mixer = null;
    }

    // Dispose side-scroller scene
    if (tank.sideScrollerScene) {
        tank.sideScrollerScene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        tank.sideScrollerScene = null;
    }

    tank.sideScrollerCamera = null;
    tank.sideScrollerPlayer = null;
    tank.sideScrollerPlatforms = [];
    tank.sideScrollerFiles = [];

    // Show swimming tank UI
    showSwimmingTankUI();
}

/**
 * Create the side-scroller environment with placeholders
 */
function createSideScrollerEnvironment(tank) {
    const scene = tank.sideScrollerScene;

    // === GROUND ===
    const groundGeometry = new THREE.BoxGeometry(CONFIG.worldWidth, 2, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(0, CONFIG.groundY - 1, 0);
    ground.userData.isPlatform = true;
    ground.userData.isGround = true;
    ground.receiveShadow = true;
    scene.add(ground);
    tank.sideScrollerPlatforms.push(ground);

    // Grass layer on top of ground
    const grassGeometry = new THREE.BoxGeometry(CONFIG.worldWidth, 0.3, 10);
    const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.position.set(0, CONFIG.groundY, 0);
    grass.receiveShadow = true;
    scene.add(grass);

    // === PLATFORMS ===
    createPlatforms(tank);

    // === BACKGROUND ELEMENTS ===
    createClouds(tank);
    createTrees(tank);
    createTreeClusters(tank);
    createBushes(tank);
    createRocks(tank);
    createMountains(tank);
    createGrassPatches(tank);
    createFlowers(tank);
}

/**
 * Create floating platforms
 */
function createPlatforms(tank) {
    const scene = tank.sideScrollerScene;

    const platformPositions = [
        { x: -35, y: 1 },
        { x: -25, y: 3 },
        { x: -15, y: 0 },
        { x: -5, y: 4 },
        { x: 8, y: 1 },
        { x: 18, y: 5 },
        { x: 28, y: 2 },
        { x: 38, y: 4 },
        { x: 48, y: 1 },
        { x: -45, y: 3 },
    ];

    platformPositions.forEach((pos, i) => {
        const width = 6 + Math.random() * 4;
        const platformGeometry = new THREE.BoxGeometry(width, CONFIG.platformHeight, 4);
        const platformMaterial = new THREE.MeshLambertMaterial({
            color: 0x696969 // Gray
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(pos.x, CONFIG.groundY + pos.y + 3, 0);
        platform.userData.isPlatform = true;
        platform.userData.width = width;
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        tank.sideScrollerPlatforms.push(platform);

        // Add grass on top of platform
        const topGrass = new THREE.Mesh(
            new THREE.BoxGeometry(width, 0.2, 4),
            new THREE.MeshLambertMaterial({ color: 0x32CD32 }) // Lime green
        );
        topGrass.position.set(pos.x, CONFIG.groundY + pos.y + 3 + CONFIG.platformHeight / 2 + 0.1, 0);
        topGrass.receiveShadow = true;
        scene.add(topGrass);
    });
}

/**
 * Create cloud placeholders with varied sizes
 */
function createClouds(tank) {
    const scene = tank.sideScrollerScene;

    const cloudPositions = [
        // Big clouds
        { x: -20, y: 14, z: -15, scale: 3.5 },
        { x: 25, y: 16, z: -20, scale: 4.0 },
        { x: 50, y: 15, z: -18, scale: 3.2 },
        // Medium clouds
        { x: 0, y: 12, z: -22, scale: 2.0 },
        { x: -35, y: 13, z: -25, scale: 1.8 },
        { x: 40, y: 11, z: -20, scale: 2.2 },
        { x: -50, y: 14, z: -18, scale: 1.9 },
        // Small clouds
        { x: 10, y: 10, z: -12, scale: 0.8 },
        { x: -10, y: 11, z: -14, scale: 0.6 },
        { x: 30, y: 9, z: -10, scale: 0.7 },
        { x: -25, y: 10, z: -13, scale: 0.9 },
        { x: 55, y: 12, z: -16, scale: 0.5 },
    ];

    cloudPositions.forEach(pos => {
        const cloud = createCloudGroup(pos.scale);
        cloud.position.set(pos.x, pos.y, pos.z);
        cloud.userData.isCloud = true;
        // Smaller clouds drift faster
        cloud.userData.scrollSpeed = (0.3 + Math.random() * 0.4) * (1 / pos.scale);
        scene.add(cloud);
    });
}

/**
 * Create a cloud from spheres
 */
function createCloudGroup(scale) {
    const group = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Main body
    const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(1.5 * scale, 16, 16), cloudMaterial);
    group.add(sphere1);

    // Side puffs
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(1.2 * scale, 16, 16), cloudMaterial);
    sphere2.position.set(-1.5 * scale, -0.3, 0);
    group.add(sphere2);

    const sphere3 = new THREE.Mesh(new THREE.SphereGeometry(1.3 * scale, 16, 16), cloudMaterial);
    sphere3.position.set(1.5 * scale, -0.2, 0);
    group.add(sphere3);

    const sphere4 = new THREE.Mesh(new THREE.SphereGeometry(1.0 * scale, 16, 16), cloudMaterial);
    sphere4.position.set(0, 0.8 * scale, 0);
    group.add(sphere4);

    return group;
}

/**
 * Create tree placeholders
 */
function createTrees(tank) {
    const scene = tank.sideScrollerScene;

    const treePositions = [
        { x: -30, z: -5 },
        { x: -18, z: -3 },
        { x: -8, z: -6 },
        { x: 5, z: -4 },
        { x: 15, z: -7 },
        { x: 25, z: -3 },
        { x: 38, z: -5 },
        { x: -40, z: -8 },
    ];

    treePositions.forEach(pos => {
        const tree = createTreeGroup();
        const scale = 0.8 + Math.random() * 0.6;
        tree.scale.setScalar(scale);
        tree.position.set(pos.x, CONFIG.groundY, pos.z);
        scene.add(tree);
    });
}

/**
 * Create a tree from primitives
 */
function createTreeGroup() {
    const group = new THREE.Group();

    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Foliage (stacked cones)
    const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest green

    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 8), foliageMaterial);
    cone1.position.y = 4;
    cone1.castShadow = true;
    cone1.receiveShadow = true;
    group.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.5, 8), foliageMaterial);
    cone2.position.y = 5.5;
    cone2.castShadow = true;
    cone2.receiveShadow = true;
    group.add(cone2);

    const cone3 = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 8), foliageMaterial);
    cone3.position.y = 6.8;
    cone3.castShadow = true;
    cone3.receiveShadow = true;
    group.add(cone3);

    return group;
}

/**
 * Create distant mountains
 */
function createMountains(tank) {
    const scene = tank.sideScrollerScene;

    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x4a6741 }); // Muted green

    const mountainPositions = [
        { x: -40, scale: 15 },
        { x: -15, scale: 20 },
        { x: 10, scale: 18 },
        { x: 35, scale: 22 },
        { x: 55, scale: 16 },
    ];

    mountainPositions.forEach(pos => {
        const mountain = new THREE.Mesh(
            new THREE.ConeGeometry(pos.scale, pos.scale * 1.5, 4),
            mountainMaterial
        );
        mountain.position.set(pos.x, CONFIG.groundY + pos.scale * 0.5, -40);
        mountain.rotation.y = Math.PI / 4;
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        scene.add(mountain);
    });
}

/**
 * Create tree clusters (groups of trees together)
 */
function createTreeClusters(tank) {
    const scene = tank.sideScrollerScene;

    const clusterPositions = [
        { x: -45, z: -4 },
        { x: 20, z: -5 },
        { x: 45, z: -6 },
    ];

    clusterPositions.forEach(pos => {
        const cluster = new THREE.Group();

        // Create 3-5 trees in a cluster
        const treeCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < treeCount; i++) {
            const tree = createTreeGroup();
            const scale = 0.6 + Math.random() * 0.5;
            tree.scale.setScalar(scale);
            tree.position.set(
                (Math.random() - 0.5) * 6,
                0,
                (Math.random() - 0.5) * 3
            );
            cluster.add(tree);
        }

        cluster.position.set(pos.x, CONFIG.groundY, pos.z);
        scene.add(cluster);
    });
}

/**
 * Create bushes
 */
function createBushes(tank) {
    const scene = tank.sideScrollerScene;

    const bushPositions = [
        { x: -35, z: -2 },
        { x: -22, z: -1 },
        { x: -12, z: -2 },
        { x: 2, z: -1.5 },
        { x: 12, z: -2 },
        { x: 22, z: -1 },
        { x: 32, z: -2 },
        { x: 42, z: -1.5 },
        { x: -5, z: -3 },
        { x: 28, z: -2.5 },
    ];

    bushPositions.forEach(pos => {
        const bush = createBushGroup();
        const scale = 0.5 + Math.random() * 0.5;
        bush.scale.setScalar(scale);
        bush.position.set(pos.x, CONFIG.groundY + 0.3, pos.z);
        scene.add(bush);
    });
}

/**
 * Create a bush from spheres
 */
function createBushGroup() {
    const group = new THREE.Group();

    // Vary the green color slightly
    const greenVariation = Math.random() * 0.2;
    const bushColor = new THREE.Color(0.1 + greenVariation, 0.4 + greenVariation * 0.5, 0.1);
    const bushMaterial = new THREE.MeshLambertMaterial({ color: bushColor });

    // Main body
    const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), bushMaterial);
    sphere1.position.y = 0.4;
    sphere1.castShadow = true;
    sphere1.receiveShadow = true;
    group.add(sphere1);

    // Side puffs
    const sphere2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), bushMaterial);
    sphere2.position.set(-0.5, 0.3, 0);
    sphere2.castShadow = true;
    group.add(sphere2);

    const sphere3 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), bushMaterial);
    sphere3.position.set(0.5, 0.35, 0);
    sphere3.castShadow = true;
    group.add(sphere3);

    const sphere4 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), bushMaterial);
    sphere4.position.set(0, 0.25, 0.4);
    sphere4.castShadow = true;
    group.add(sphere4);

    return group;
}

/**
 * Create rocks
 */
function createRocks(tank) {
    const scene = tank.sideScrollerScene;

    const rockPositions = [
        { x: -28, z: -1, scale: 1.2 },
        { x: -15, z: -0.5, scale: 0.6 },
        { x: -3, z: -1, scale: 0.8 },
        { x: 7, z: -0.5, scale: 0.5 },
        { x: 18, z: -1.5, scale: 1.0 },
        { x: 33, z: -1, scale: 0.7 },
        { x: 48, z: -0.5, scale: 0.9 },
        { x: -42, z: -1, scale: 1.1 },
        { x: 55, z: -1.5, scale: 0.8 },
    ];

    rockPositions.forEach(pos => {
        const rock = createRockGroup(pos.scale);
        rock.position.set(pos.x, CONFIG.groundY, pos.z);
        scene.add(rock);
    });
}

/**
 * Create a rock from irregular geometry
 */
function createRockGroup(scale) {
    const group = new THREE.Group();

    // Vary the gray color
    const grayValue = 0.3 + Math.random() * 0.2;
    const rockMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(grayValue, grayValue * 0.95, grayValue * 0.9)
    });

    // Main rock body (dodecahedron for irregular shape)
    const mainRock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.5 * scale, 0),
        rockMaterial
    );
    mainRock.position.y = 0.3 * scale;
    mainRock.rotation.set(
        Math.random() * 0.5,
        Math.random() * Math.PI,
        Math.random() * 0.3
    );
    mainRock.scale.set(1, 0.7, 0.9); // Flatten slightly
    mainRock.castShadow = true;
    mainRock.receiveShadow = true;
    group.add(mainRock);

    // Sometimes add smaller rocks nearby
    if (Math.random() > 0.5) {
        const smallRock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.25 * scale, 0),
            rockMaterial
        );
        smallRock.position.set(0.4 * scale, 0.15 * scale, 0.2 * scale);
        smallRock.rotation.y = Math.random() * Math.PI;
        smallRock.castShadow = true;
        group.add(smallRock);
    }

    return group;
}

/**
 * Create grass patches on the ground
 */
function createGrassPatches(tank) {
    const scene = tank.sideScrollerScene;

    // Create scattered grass tufts
    for (let i = 0; i < 40; i++) {
        const x = (Math.random() - 0.5) * CONFIG.worldWidth * 0.9;
        const z = -1 + Math.random() * -3;

        const grass = createGrassTuft();
        grass.position.set(x, CONFIG.groundY, z);
        scene.add(grass);
    }
}

/**
 * Create a grass tuft
 */
function createGrassTuft() {
    const group = new THREE.Group();

    const grassColors = [0x228B22, 0x32CD32, 0x2E8B57, 0x3CB371];
    const color = grassColors[Math.floor(Math.random() * grassColors.length)];
    const grassMaterial = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });

    // Create several blades
    const bladeCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < bladeCount; i++) {
        const height = 0.3 + Math.random() * 0.4;
        const blade = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, height, 4),
            grassMaterial
        );
        blade.position.set(
            (Math.random() - 0.5) * 0.3,
            height / 2,
            (Math.random() - 0.5) * 0.3
        );
        blade.rotation.x = (Math.random() - 0.5) * 0.3;
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(blade);
    }

    return group;
}

/**
 * Create flowers scattered around
 */
function createFlowers(tank) {
    const scene = tank.sideScrollerScene;

    const flowerColors = [0xFF69B4, 0xFFD700, 0xFF6347, 0xDA70D6, 0x00CED1, 0xFFFFFF];

    // Create scattered flowers
    for (let i = 0; i < 25; i++) {
        const x = (Math.random() - 0.5) * CONFIG.worldWidth * 0.85;
        const z = -0.5 + Math.random() * -2;

        const flower = createFlower(flowerColors[Math.floor(Math.random() * flowerColors.length)]);
        const scale = 0.3 + Math.random() * 0.4;
        flower.scale.setScalar(scale);
        flower.position.set(x, CONFIG.groundY, z);
        scene.add(flower);
    }
}

/**
 * Create a simple flower
 */
function createFlower(petalColor) {
    const group = new THREE.Group();

    // Stem
    const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6),
        stemMaterial
    );
    stem.position.y = 0.25;
    group.add(stem);

    // Flower head (petals as a simple shape)
    const petalMaterial = new THREE.MeshLambertMaterial({ color: petalColor });

    // Center
    const center = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xFFD700 })
    );
    center.position.y = 0.55;
    group.add(center);

    // Petals (simplified as small spheres around center)
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petal = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            petalMaterial
        );
        petal.position.set(
            Math.cos(angle) * 0.12,
            0.55,
            Math.sin(angle) * 0.12
        );
        petal.scale.set(1, 0.5, 1);
        group.add(petal);
    }

    return group;
}

/**
 * Create player character using the frog model
 */
function createPlayer(tank) {
    const scene = tank.sideScrollerScene;
    const player = tank.sideScrollerPlayer;

    // Create a placeholder while loading
    const geometry = new THREE.BoxGeometry(
        CONFIG.playerSize.width,
        CONFIG.playerSize.height,
        CONFIG.playerSize.width
    );
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3 });
    player.mesh = new THREE.Mesh(geometry, material);
    player.mesh.position.copy(player.position);
    scene.add(player.mesh);

    // Load frog model
    const loader = new GLTFLoader();
    loader.load('./models/Frog_Swim.gltf', (gltf) => {
        const frogModel = gltf.scene;
        frogModel.scale.setScalar(1.5);
        // Rotate to face right (side-scroller direction)
        frogModel.rotation.y = Math.PI / 2;

        // Enable shadows on frog
        frogModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Remove placeholder and use frog
        scene.remove(player.mesh);
        player.mesh = frogModel;
        player.mesh.position.copy(player.position);
        scene.add(player.mesh);

        // Setup animation if available
        if (gltf.animations && gltf.animations.length > 0) {
            player.mixer = new THREE.AnimationMixer(frogModel);
            player.swimAction = player.mixer.clipAction(gltf.animations[0]);
            // Don't auto-play, will be controlled based on movement
            player.swimAction.stop();
        }

        console.log('Side-scroller frog loaded');
    }, undefined, (error) => {
        console.error('Error loading frog for side-scroller:', error);
    });
}

/**
 * Create lighting for side-scroller
 */
function createSideScrollerLighting(tank) {
    const scene = tank.sideScrollerScene;

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // Directional light (sun) with shadows
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(15, 30, 20);
    sun.castShadow = true;

    // Shadow map settings
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.001;

    scene.add(sun);

    // Hemisphere light for sky/ground color
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
    scene.add(hemi);
}

/**
 * Generate contents for a folder based on actual content
 */
function generateFolderContents(folder, tank) {
    const folderName = folder.userData.name.toLowerCase();
    const contents = [];

    // Get txtData from tank (passed from main)
    const txtData = tank.txtData || [];

    // Filter files that belong to this folder
    txtData.forEach(file => {
        if (file.path) {
            // Check if file path contains this folder name
            // e.g., 'content/downloads/readme.txt' contains 'downloads'
            const pathParts = file.path.split('/');
            // pathParts might be ['content', 'downloads', 'readme.txt']
            // Check if folder name is in the path (not in filename)
            const folderPath = pathParts.slice(0, -1).join('/').toLowerCase();

            if (folderPath.includes(folderName)) {
                contents.push({
                    name: file.name,
                    type: file.type || 'txt',
                    size: file.size || '1 KB',
                    path: file.path
                });
            }
        }
    });

    // If no files found, return a placeholder
    if (contents.length === 0) {
        contents.push({
            name: 'empty folder',
            type: 'txt',
            size: '0 KB'
        });
    }

    console.log(`Folder "${folderName}" contains ${contents.length} files:`, contents.map(f => f.name));
    return contents;
}

/**
 * Place files on platforms using actual models
 */
function placeFilesOnPlatforms(tank, contents) {
    const scene = tank.sideScrollerScene;
    const platforms = tank.sideScrollerPlatforms;
    const loader = new GLTFLoader();

    // Model paths for each file type
    const modelPaths = {
        pdf: './models/pdf3.glb',
        txt: './models/txt.glb',
        jpeg: './models/image.glb',
        png: './models/image.glb',
        folder: './models/Folder.glb'
    };

    // Fallback colors for placeholder boxes
    const colors = {
        pdf: 0xff4444,
        txt: 0x4444ff,
        jpeg: 0xff8800,
        png: 0x44ff44,
        folder: 0xffff00
    };

    // Load each model type once and clone for instances
    const loadedModels = {};
    const modelPromises = [];

    // Get unique file types
    const uniqueTypes = [...new Set(contents.map(f => f.type))];

    uniqueTypes.forEach(type => {
        const path = modelPaths[type];
        if (path) {
            const promise = new Promise((resolve) => {
                loader.load(path, (gltf) => {
                    loadedModels[type] = gltf.scene;
                    resolve();
                }, undefined, (error) => {
                    console.warn(`Failed to load ${path}:`, error);
                    resolve(); // Continue even if model fails to load
                });
            });
            modelPromises.push(promise);
        }
    });

    // Wait for all models to load, then place files
    Promise.all(modelPromises).then(() => {
        // Track used positions to avoid overlap
        const usedPositions = [];
        const minSpacing = 4; // Minimum distance between files

        contents.forEach((file, index) => {
            // Pick a platform, distribute more evenly
            const platformIndex = index % platforms.length;
            const platform = platforms[platformIndex];
            const platformWidth = platform.userData.width || 10;

            // Find a position that doesn't overlap too much
            let x, y, attempts = 0;
            const maxAttempts = 10;

            do {
                // Spread files more evenly across platform
                const slot = Math.floor(index / platforms.length);
                const baseOffset = ((slot % 3) - 1) * (platformWidth / 3);
                const randomOffset = (Math.random() - 0.5) * 2;
                x = platform.position.x + baseOffset + randomOffset;
                y = platform.position.y + CONFIG.platformHeight / 2 + 1.8;
                attempts++;
            } while (
                attempts < maxAttempts &&
                usedPositions.some(pos => Math.abs(pos.x - x) < minSpacing && Math.abs(pos.y - y) < 2)
            );

            usedPositions.push({ x, y });

            let fileMesh;

            if (loadedModels[file.type]) {
                // Clone the loaded model
                fileMesh = loadedModels[file.type].clone();

                // Normalize scale based on bounding box
                const bbox = new THREE.Box3().setFromObject(fileMesh);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const targetSize = 3.0; // Target size for files (bigger)
                const scale = targetSize / maxDim;
                fileMesh.scale.setScalar(scale);

                // Face toward the camera (front) with slight variation
                fileMesh.rotation.y = (Math.random() - 0.5) * 0.3; // Small variation around forward

                // Enable shadows on all meshes in the model
                fileMesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            } else {
                // Fallback to colored box
                const geometry = new THREE.BoxGeometry(0.8, 1, 0.3);
                const material = new THREE.MeshLambertMaterial({
                    color: colors[file.type] || 0xcccccc
                });
                fileMesh = new THREE.Mesh(geometry, material);
                fileMesh.castShadow = true;
                fileMesh.receiveShadow = true;
            }

            // Give each file a unique Z position to prevent z-fighting
            const z = (index * 0.15) - (contents.length * 0.15 / 2);
            fileMesh.position.set(x, y, z);
            fileMesh.userData = { ...file };
            fileMesh.userData.isFile = true;

            scene.add(fileMesh);
            tank.sideScrollerFiles.push(fileMesh);
        });

        console.log(`Placed ${contents.length} files on platforms`);
    });
}

/**
 * Update side-scroller each frame
 */
export function updateSideScroller(tank, delta) {
    if (!tank.sideScrollerMode) return;

    const player = tank.sideScrollerPlayer;
    const input = tank.sideScrollerInput;

    // Process input continuously
    // Horizontal movement
    player.velocity.x = 0;
    if (input.left) {
        player.velocity.x = -CONFIG.moveSpeed;
    }
    if (input.right) {
        player.velocity.x = CONFIG.moveSpeed;
    }

    // Jump (double jump allowed)
    if (input.jump && !player.jumpPressed && !input.down && player.jumpCount < player.maxJumps) {
        player.velocity.y = CONFIG.jumpForce;
        player.isGrounded = false;
        player.jumpCount++;
        player.jumpPressed = true; // Prevent holding jump
    }

    // Track jump key release for double jump
    if (!input.jump) {
        player.jumpPressed = false;
    }

    // Drop through platform
    if (input.down && player.isGrounded && !player.isOnGround) {
        player.position.y -= 0.5; // Drop below platform
        player.isGrounded = false;
        player.droppingThrough = true;
    }

    // Reset dropping state when no longer pressing down
    if (!input.down) {
        player.droppingThrough = false;
    }

    // Apply gravity
    if (!player.isGrounded) {
        player.velocity.y += CONFIG.gravity * delta;
    }

    // Apply velocity
    player.position.add(player.velocity.clone().multiplyScalar(delta));

    // Check platform collisions
    checkPlatformCollisions(tank);

    // Update player mesh position and rotation
    if (player.mesh) {
        player.mesh.position.copy(player.position);

        // Face direction of movement
        if (player.velocity.x > 0.1) {
            player.mesh.rotation.y = Math.PI / 2; // Face right
        } else if (player.velocity.x < -0.1) {
            player.mesh.rotation.y = -Math.PI / 2; // Face left
        }
    }

    // Update frog animation - only play when moving
    if (player.mixer && player.swimAction) {
        const isMoving = Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.y) > 0.5;

        if (isMoving && !player.swimAction.isRunning()) {
            player.swimAction.play();
        } else if (!isMoving && player.swimAction.isRunning()) {
            player.swimAction.stop();
        }

        if (isMoving) {
            player.mixer.update(delta);
        }
    }

    // Update camera to follow player
    updateSideScrollerCamera(tank);

    // Animate clouds
    animateClouds(tank, delta);

    // Animate files (bobbing)
    animateFiles(tank, delta);

    // Highlight nearest file
    highlightNearestFile(tank);
}

/**
 * Check collisions with platforms
 */
function checkPlatformCollisions(tank) {
    const player = tank.sideScrollerPlayer;
    const playerBottom = player.position.y;
    const playerLeft = player.position.x - CONFIG.playerSize.width / 2;
    const playerRight = player.position.x + CONFIG.playerSize.width / 2;

    player.isGrounded = false;
    player.isOnGround = false;

    // Skip platform collision if dropping through
    if (!player.droppingThrough) {
        tank.sideScrollerPlatforms.forEach(platform => {
            // Skip the main ground - it's handled separately
            if (platform.userData.isGround) return;

            const platTop = platform.position.y + CONFIG.platformHeight / 2;
            const platWidth = platform.userData.width || platform.geometry.parameters.width;
            const platLeft = platform.position.x - platWidth / 2;
            const platRight = platform.position.x + platWidth / 2;

            // Check if player is above platform and falling
            if (player.velocity.y <= 0 &&
                playerRight > platLeft &&
                playerLeft < platRight &&
                playerBottom <= platTop + 0.5 &&
                playerBottom >= platTop - 1.5) {

                player.position.y = platTop;
                player.velocity.y = 0;
                player.isGrounded = true;
                player.jumpCount = 0; // Reset double jump
            }
        });
    }

    // Ground collision (failsafe) - frog sits right on ground, can't drop through
    if (player.position.y < CONFIG.groundY) {
        player.position.y = CONFIG.groundY;
        player.velocity.y = 0;
        player.isGrounded = true;
        player.isOnGround = true; // Can't drop through the ground
        player.jumpCount = 0; // Reset double jump
    }
}

/**
 * Update camera to follow player
 */
function updateSideScrollerCamera(tank) {
    const player = tank.sideScrollerPlayer;
    const camera = tank.sideScrollerCamera;

    // Smooth follow on X axis
    const targetX = player.position.x;
    camera.position.x += (targetX - camera.position.x) * 0.1;

    // Keep camera looking at player height area
    const targetY = Math.max(player.position.y + 2, CONFIG.cameraHeight);
    camera.position.y += (targetY - camera.position.y) * 0.05;
}

/**
 * Animate clouds (slow drift)
 */
function animateClouds(tank, delta) {
    tank.sideScrollerScene.traverse((object) => {
        if (object.userData.isCloud) {
            object.position.x += object.userData.scrollSpeed * delta;
            // Wrap around
            if (object.position.x > 60) {
                object.position.x = -60;
            }
        }
    });
}

/**
 * Animate files (gentle bobbing and wobble)
 */
function animateFiles(tank, delta) {
    const time = Date.now() * 0.002;
    tank.sideScrollerFiles.forEach((file, i) => {
        // Store initial values
        if (!file.userData.baseY) file.userData.baseY = file.position.y;
        if (file.userData.baseRotY === undefined) file.userData.baseRotY = file.rotation.y;

        // Gentle vertical bobbing
        file.position.y = file.userData.baseY + Math.sin(time + i) * 0.15;

        // Gentle rotation wobble (not full rotation)
        file.rotation.y = file.userData.baseRotY + Math.sin(time * 0.8 + i * 0.5) * 0.3;
    });
}

/**
 * Highlight the nearest file to the player
 */
function highlightNearestFile(tank) {
    const player = tank.sideScrollerPlayer;
    const selectionRadius = 2;

    // Reset all files to normal scale
    tank.sideScrollerFiles.forEach(file => {
        if (!file.userData.originalScale) {
            file.userData.originalScale = file.scale.clone();
        }
        file.scale.copy(file.userData.originalScale);
    });

    // Find and highlight nearest file
    let nearest = null;
    let nearestDist = selectionRadius;

    tank.sideScrollerFiles.forEach(file => {
        const dist = player.position.distanceTo(file.position);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = file;
        }
    });

    if (nearest) {
        // Pulse scale effect
        const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.1;
        nearest.scale.copy(nearest.userData.originalScale).multiplyScalar(pulse * 1.2);

        // Show file name hint
        showFileHint(nearest.userData.name, nearest.userData.type);
    } else {
        hideFileHint();
    }
}

/**
 * Show file name hint near selection
 */
function showFileHint(name, type) {
    let hint = document.getElementById('file-select-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'file-select-hint';
        hint.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 20, 40, 0.9);
            color: #fff;
            padding: 10px 20px;
            border-radius: 12px;
            border: 1px solid rgba(0, 255, 255, 0.3);
            font-family: 'Geist Mono', monospace;
            font-size: 13px;
            z-index: 1000;
            text-align: center;
            pointer-events: none;
        `;
        document.body.appendChild(hint);
    }
    hint.innerHTML = `<span style="color: #00ffff; font-weight: 600;">${name}</span><br><span style="color: #88aaaa; font-size: 11px;"><span style="color: #00ffff;">Enter</span> to open</span>`;
    hint.style.display = 'block';
}

/**
 * Hide file name hint
 */
function hideFileHint() {
    const hint = document.getElementById('file-select-hint');
    if (hint) hint.style.display = 'none';
}

/**
 * Handle side-scroller movement input (legacy - input now processed in updateSideScroller)
 */
export function handleSideScrollerInput(tank, input) {
    // Input is now processed continuously in updateSideScroller
}

/**
 * Hide swimming tank UI elements
 */
function hideSwimmingTankUI(folderName) {
    const elements = ['controls', 'selection-hint', 'light-panel', 'crosshair', 'fileInfoPanel', 'controls-panel'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Show side-scroller hint
    let hint = document.getElementById('sidescroller-hint');
    if (!hint) {
        hint = document.createElement('div');
        hint.id = 'sidescroller-hint';
        document.body.appendChild(hint);
    }
    hint.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 20, 40, 0.85);
            color: #00ffff;
            padding: 10px 25px;
            border-radius: 20px;
            border: 1px solid rgba(0, 255, 255, 0.4);
            font-family: 'Geist Mono', monospace;
            font-size: 16px;
            font-weight: 600;
            z-index: 1000;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
        ">${folderName || 'Folder'}</div>
        <div style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 20, 40, 0.85);
            color: #fff;
            padding: 8px 20px;
            border-radius: 20px;
            border: 1px solid rgba(0, 255, 255, 0.3);
            font-family: 'Geist Mono', monospace;
            font-size: 13px;
            z-index: 1000;
        ">
            <span style="color: #00ffff;">Esc</span> to go back
        </div>
    `;
    hint.style.display = 'block';
}

/**
 * Show swimming tank UI elements
 */
function showSwimmingTankUI() {
    const elements = ['controls', 'crosshair', 'controls-panel'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    });

    // Hide side-scroller hints
    const hint = document.getElementById('sidescroller-hint');
    if (hint) hint.style.display = 'none';

    const fileHint = document.getElementById('file-select-hint');
    if (fileHint) fileHint.style.display = 'none';
}

/**
 * Get selected file in side-scroller (if player is near one)
 */
export function getSelectedFile(tank) {
    if (!tank.sideScrollerMode) return null;

    const player = tank.sideScrollerPlayer;
    let closest = null;
    let closestDist = 2; // Selection radius

    tank.sideScrollerFiles.forEach(file => {
        const dist = player.position.distanceTo(file.position);
        if (dist < closestDist) {
            closestDist = dist;
            closest = file;
        }
    });

    return closest;
}
