/**
 * Scene setup, environment, lighting, and effects
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * Create the basic Three.js scene setup
 */
export function createScene(tank) {
    // Scene
    tank.scene = new THREE.Scene();

    // Camera - positioned for third-person view
    tank.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    tank.camera.position.set(0, 3, 6);

    // Renderer
    tank.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    tank.renderer.setSize(window.innerWidth, window.innerHeight);
    tank.renderer.setClearColor(0x4477aa);

    // Underwater fog effect
    tank.scene.fog = new THREE.Fog(0x4477aa, 16, 55);

    // Enable smooth shading
    tank.renderer.shadowMap.enabled = true;
    tank.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Enhanced renderer settings for caustics
    tank.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    tank.renderer.toneMappingExposure = 1.4;
    tank.renderer.outputColorSpace = THREE.SRGBColorSpace;

    document.getElementById('container').appendChild(tank.renderer.domElement);
}

/**
 * Create the underwater environment with lighting and particles
 */
export function createEnvironment(tank) {
    // Ambient Light
    tank.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    tank.scene.add(tank.ambientLight);

    // Main Directional Light
    tank.mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
    tank.mainLight.position.set(10, 20, 5);
    tank.mainLight.castShadow = true;
    // Configure shadow camera to cover the floor area where rocks are placed
    tank.mainLight.shadow.camera.left = -60;
    tank.mainLight.shadow.camera.right = 60;
    tank.mainLight.shadow.camera.top = 60;
    tank.mainLight.shadow.camera.bottom = -60;
    tank.mainLight.shadow.camera.near = 0.5;
    tank.mainLight.shadow.camera.far = 100;
    tank.mainLight.shadow.mapSize.width = 2048;
    tank.mainLight.shadow.mapSize.height = 2048;
    tank.scene.add(tank.mainLight);

    // Underwater tint light
    tank.underwaterLight = new THREE.DirectionalLight(0x88ccff, 0.4);
    tank.underwaterLight.position.set(-5, 10, -10);
    tank.scene.add(tank.underwaterLight);

    // Overhead light
    tank.overheadLight = new THREE.DirectionalLight(0xffffff, 0.8);
    tank.overheadLight.position.set(0, 25, 0);
    tank.overheadLight.castShadow = true;
    // Configure overhead shadow camera for floor coverage
    tank.overheadLight.shadow.camera.left = -60;
    tank.overheadLight.shadow.camera.right = 60;
    tank.overheadLight.shadow.camera.top = 60;
    tank.overheadLight.shadow.camera.bottom = -60;
    tank.overheadLight.shadow.camera.near = 0.5;
    tank.overheadLight.shadow.camera.far = 100;
    tank.overheadLight.shadow.mapSize.width = 2048;
    tank.overheadLight.shadow.mapSize.height = 2048;
    tank.scene.add(tank.overheadLight);

    // Create water caustics
    createWaterCaustics(tank);

    // Create sand floor
    createSandFloor(tank);

    // Create floor decorations (rocks, seaweed, starfish)
    createFloorDecorations(tank);

    // Create water particles
    createWaterParticles(tank);

    // Tank bounds on by default (press T to toggle)
    tank.tankBoundsVisible = true;
    createTankBounds(tank);
}

/**
 * Create water caustics lighting effects
 */
function createWaterCaustics(tank) {
    const causticsCanvas = createCausticsTexture();
    const causticsTexture = new THREE.CanvasTexture(causticsCanvas);
    causticsTexture.wrapS = THREE.RepeatWrapping;
    causticsTexture.wrapT = THREE.RepeatWrapping;
    causticsTexture.repeat.set(4, 4);

    createCausticsLights(tank, causticsTexture);
    createAnimatedCaustics(tank, causticsTexture);
}

/**
 * Create caustics texture using canvas
 */
function createCausticsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let layer = 0; layer < 3; layer++) {
        ctx.globalAlpha = 0.1 + layer * 0.05;
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth = 1 + layer * 0.5;

        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = 50 + Math.random() * 100;
            const startAngle = Math.random() * Math.PI * 2;
            const endAngle = startAngle + Math.PI * 0.5 + Math.random() * Math.PI;
            ctx.arc(x, y, radius, startAngle, endAngle);
            ctx.stroke();
        }

        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 30 + Math.random() * 20);

            for (let x = 0; x < canvas.width; x += 10) {
                const y = i * 30 + Math.sin(x * 0.02 + Math.random()) * 15;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    return canvas;
}

/**
 * Create caustic lights
 */
function createCausticsLights(tank, causticsTexture) {
    const causticLights = [];

    for (let i = 0; i < 5; i++) {
        const causticLight = new THREE.SpotLight(0x44aaff, 0.6);
        causticLight.position.set(
            (Math.random() - 0.5) * 40,
            15 + Math.random() * 10,
            (Math.random() - 0.5) * 40
        );

        causticLight.angle = 0.3;
        causticLight.penumbra = 0.5;
        causticLight.decay = 1.2;
        causticLight.distance = 35;
        causticLight.map = causticsTexture;

        tank.scene.add(causticLight);
        causticLights.push(causticLight);
    }

    tank.causticLights = causticLights;
}

/**
 * Create animated caustics mesh
 */
function createAnimatedCaustics(tank, causticsTexture) {
    const causticsGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);

    const causticsMaterial = new THREE.MeshBasicMaterial({
        map: causticsTexture,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });

    tank.causticsLayers = [];

    for (let i = 0; i < 3; i++) {
        const causticsMesh = new THREE.Mesh(causticsGeometry, causticsMaterial.clone());
        causticsMesh.position.y = 10 + i * 5;
        causticsMesh.rotation.x = -Math.PI / 2;

        causticsMesh.userData = {
            speed: 0.5 + Math.random() * 0.5,
            offset: Math.random() * Math.PI * 2,
            scale: 1.0 + Math.random() * 0.3
        };

        tank.scene.add(causticsMesh);
        tank.causticsLayers.push(causticsMesh);
    }
}

/**
 * Update caustics animation
 */
export function updateCausticsAnimation(tank) {
    if (!tank.causticsLayers) return;

    tank.causticsLayers.forEach((layer, index) => {
        const data = layer.userData;
        const time = tank.swimTime * data.speed + data.offset;

        layer.position.y = 10 + index * 5 + Math.sin(time * 0.5) * 0.5;
        layer.rotation.z += 0.001 * data.speed;

        const scaleVariation = 1.0 + Math.sin(time * 0.3) * 0.05;
        layer.scale.setScalar(data.scale * scaleVariation);

        if (layer.material.map) {
            layer.material.map.offset.x += 0.001 * data.speed;
            layer.material.map.offset.y += 0.0005 * data.speed;
        }
    });

    if (tank.causticLights) {
        tank.causticLights.forEach((light, index) => {
            const time = tank.swimTime * 0.3 + index * 0.5;
            light.position.x += Math.sin(time) * 0.01;
            light.position.z += Math.cos(time) * 0.01;
            light.intensity = 0.3 + Math.sin(time * 2) * 0.05;
        });
    }
}

/**
 * Create flat seafloor
 */
function createSandFloor(tank) {
    const sandGeometry = new THREE.PlaneGeometry(300, 300, 1, 1);

    const sandMaterial = new THREE.MeshLambertMaterial({
        color: 0x806247, // RGB(128, 98, 71)
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        fog: true
    });

    tank.sandFloor = new THREE.Mesh(sandGeometry, sandMaterial);
    tank.sandFloor.position.y = tank.config.tank.floorY;
    tank.sandFloor.rotation.x = -Math.PI / 2;
    tank.sandFloor.receiveShadow = true;

    tank.scene.add(tank.sandFloor);
}

/**
 * Create floor decorations with clusters for spatial memory
 * More concentrated at center, themed clusters for landmarks
 */
function createFloorDecorations(tank) {
    const loader = new GLTFLoader();
    const floorY = tank.config.tank.floorY;
    const spreadRadius = tank.config.tank.width * 3;

    tank.floorDecorations = [];

    // Helper: center-biased position (more objects near center)
    const getCenteredPosition = (maxRadius) => {
        const angle = Math.random() * Math.PI * 2;
        // sqrt makes distribution favor center
        const distance = Math.sqrt(Math.random()) * maxRadius;
        return {
            x: Math.cos(angle) * distance,
            z: Math.sin(angle) * distance
        };
    };

    // Helper: position in a cluster around a center point
    const getClusterPosition = (centerX, centerZ, radius) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        return {
            x: centerX + Math.cos(angle) * distance,
            z: centerZ + Math.sin(angle) * distance
        };
    };

    // Helper: position in a ring/circle pattern
    const getRingPosition = (centerX, centerZ, radius, index, total) => {
        const angle = (index / total) * Math.PI * 2 + Math.random() * 0.3;
        return {
            x: centerX + Math.cos(angle) * radius,
            z: centerZ + Math.sin(angle) * radius
        };
    };

    // Create outer bounds visualization
    const outerBoundsGeometry = new THREE.RingGeometry(spreadRadius - 0.5, spreadRadius + 0.5, 64);
    const outerBoundsMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
    });
    const outerBoundsRing = new THREE.Mesh(outerBoundsGeometry, outerBoundsMaterial);
    outerBoundsRing.rotation.x = -Math.PI / 2;
    outerBoundsRing.position.y = floorY + 0.2;
    outerBoundsRing.visible = false; // Hidden by default (debug)
    tank.scene.add(outerBoundsRing);
    tank.outerBoundsRing = outerBoundsRing;

    // Define cluster zones for spatial memory
    const clusters = {
        rockCircle: { x: 10, z: -8, type: 'ring' },  // Moved closer to center
        seaweedGrove: { x: -30, z: 15, type: 'dense' },
        starfishBeach: { x: 20, z: 30, type: 'scattered' },
        mixedGarden: { x: -20, z: -25, type: 'mixed' }
    };

    // Load sandcastle - one instance within tank bounds
    loader.load('./models/env/low_poly_sand_castle.glb', (gltf) => {
        const castle = gltf.scene;
        const tankWidth = tank.config.tank.width;
        castle.position.set(
            (Math.random() - 0.5) * tankWidth,
            floorY + 1,
            (Math.random() - 0.5) * tankWidth
        );
        castle.rotation.y = Math.random() * Math.PI * 2;

        castle.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        castle.userData.isCastle = true;
        tank.scene.add(castle);
        tank.floorDecorations.push(castle);
        console.log('Sandcastle placed');
    }, undefined, (error) => {
        console.warn('Could not load sandcastle:', error);
    });

    // Load rocks with InstancedMesh for RAM optimization
    loader.load('./models/env/low_poly_rocks.glb', (gltf) => {
        // Find the first mesh in the model to use for instancing
        let rockGeometry = null;
        let rockMaterial = null;

        gltf.scene.traverse((child) => {
            if (child.isMesh && !rockGeometry) {
                rockGeometry = child.geometry;
                rockMaterial = child.material;
            }
        });

        if (!rockGeometry) {
            console.warn('No mesh found in rock model');
            return;
        }

        // Collect all rock positions/transforms
        const rockTransforms = [];

        // Rock circle cluster (ring pattern)
        const rc = clusters.rockCircle;
        for (let i = 0; i < 8; i++) {  // Fewer rocks, smaller circle
            const pos = getRingPosition(rc.x, rc.z, 8, i, 8);
            rockTransforms.push({
                x: pos.x, z: pos.z,
                scale: 3 + Math.random() * 2,
                rotY: Math.random() * Math.PI * 2
            });
        }

        // Mixed garden rocks
        const mg = clusters.mixedGarden;
        for (let i = 0; i < 8; i++) {
            const pos = getClusterPosition(mg.x, mg.z, 12);
            rockTransforms.push({
                x: pos.x, z: pos.z,
                scale: 2 + Math.random() * 3,
                rotY: Math.random() * Math.PI * 2
            });
        }

        // Scattered rocks (center-biased, less dense outward)
        for (let i = 0; i < 40; i++) {
            const pos = getCenteredPosition(spreadRadius * 0.8);
            rockTransforms.push({
                x: pos.x, z: pos.z,
                scale: 2 + Math.random() * 4,
                rotY: Math.random() * Math.PI * 2
            });
        }

        // Create InstancedMesh
        const rockInstances = new THREE.InstancedMesh(
            rockGeometry,
            rockMaterial,
            rockTransforms.length
        );
        rockInstances.castShadow = true;
        rockInstances.receiveShadow = true;

        // Set instance matrices
        const dummy = new THREE.Object3D();
        rockTransforms.forEach((t, i) => {
            dummy.position.set(t.x, floorY + 1, t.z);
            dummy.rotation.set(0, t.rotY, 0);
            dummy.scale.setScalar(t.scale);
            dummy.updateMatrix();
            rockInstances.setMatrixAt(i, dummy.matrix);
        });

        rockInstances.instanceMatrix.needsUpdate = true;
        tank.scene.add(rockInstances);
        tank.rockInstances = rockInstances;

        console.log('Rocks placed with InstancedMesh -', rockTransforms.length, 'instances, 1 draw call');
    }, undefined, (error) => {
        console.warn('Could not load rocks:', error);
    });

    // Load seaweed with dense grove cluster
    loader.load('./models/env/sea_weed/scene.gltf', (gltf) => {
        const seaweedModel = gltf.scene;

        const addSeaweed = (x, z, scale) => {
            const seaweed = SkeletonUtils.clone(seaweedModel);
            seaweed.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            seaweed.position.set(x, floorY, z);
            seaweed.rotation.y = Math.random() * Math.PI * 2;
            seaweed.scale.setScalar(scale);
            seaweed.userData.baseRotation = seaweed.rotation.z;
            seaweed.userData.swayOffset = Math.random() * Math.PI * 2;
            seaweed.userData.swaySpeed = 0.5 + Math.random() * 0.5;
            seaweed.userData.isSeaweed = true;
            seaweed.userData.baseY = floorY;
            tank.scene.add(seaweed);
            tank.floorDecorations.push(seaweed);
        };

        // Dense seaweed grove cluster
        const sg = clusters.seaweedGrove;
        for (let i = 0; i < 25; i++) {
            const pos = getClusterPosition(sg.x, sg.z, 10);
            addSeaweed(pos.x, pos.z, 0.8 + Math.random() * 0.8);
        }

        // Mixed garden seaweed
        const mg = clusters.mixedGarden;
        for (let i = 0; i < 10; i++) {
            const pos = getClusterPosition(mg.x, mg.z, 12);
            addSeaweed(pos.x, pos.z, 0.6 + Math.random() * 0.6);
        }

        // Scattered seaweed (center-biased)
        for (let i = 0; i < 25; i++) {
            const pos = getCenteredPosition(spreadRadius * 0.7);
            addSeaweed(pos.x, pos.z, 0.5 + Math.random() * 1);
        }

        // Extra seaweed within tank bounds
        const tankWidth = tank.config.tank.width;
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * tankWidth * 1.8;
            const z = (Math.random() - 0.5) * tankWidth * 1.8;
            addSeaweed(x, z, 0.6 + Math.random() * 0.8);
        }

        console.log('Seaweed placed with clusters + tank extras');
    }, undefined, (error) => {
        console.error('Could not load seaweed:', error);
    });

    // Load starfish with InstancedMesh for RAM optimization
    loader.load('./models/env/starfish/scene.gltf', (gltf) => {
        // Find the first mesh in the model to use for instancing
        let starfishGeometry = null;

        gltf.scene.traverse((child) => {
            if (child.isMesh && !starfishGeometry) {
                starfishGeometry = child.geometry;
                // Dispose the original texture-based material to free memory
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });

        if (!starfishGeometry) {
            console.warn('No mesh found in starfish model');
            return;
        }

        // Use simple orange material instead of texture (saves 1.4MB)
        const starfishMaterial = new THREE.MeshLambertMaterial({
            color: 0xff6600  // Orange
        });

        // Collect all starfish positions/transforms
        const starfishTransforms = [];

        // Starfish beach - scattered cluster
        const sb = clusters.starfishBeach;
        for (let i = 0; i < 20; i++) {
            const pos = getClusterPosition(sb.x, sb.z, 15);
            starfishTransforms.push({
                x: pos.x, z: pos.z,
                scale: 0.4 + Math.random() * 0.5,
                rotZ: Math.random() * Math.PI * 2
            });
        }

        // Some starfish near rock circle
        const rc = clusters.rockCircle;
        for (let i = 0; i < 5; i++) {
            const pos = getClusterPosition(rc.x, rc.z, 10);
            starfishTransforms.push({
                x: pos.x, z: pos.z,
                scale: 0.3 + Math.random() * 0.4,
                rotZ: Math.random() * Math.PI * 2
            });
        }

        // Scattered starfish (center-biased)
        for (let i = 0; i < 15; i++) {
            const pos = getCenteredPosition(spreadRadius * 0.6);
            starfishTransforms.push({
                x: pos.x, z: pos.z,
                scale: 0.3 + Math.random() * 0.5,
                rotZ: Math.random() * Math.PI * 2
            });
        }

        // Create InstancedMesh
        const starfishInstances = new THREE.InstancedMesh(
            starfishGeometry,
            starfishMaterial,
            starfishTransforms.length
        );
        starfishInstances.castShadow = true;
        starfishInstances.receiveShadow = true;

        // Set instance matrices
        const dummy = new THREE.Object3D();
        starfishTransforms.forEach((t, i) => {
            dummy.position.set(t.x, floorY + 0.3, t.z);
            dummy.rotation.set(-Math.PI / 2, 0, t.rotZ);
            dummy.scale.setScalar(t.scale);
            dummy.updateMatrix();
            starfishInstances.setMatrixAt(i, dummy.matrix);
        });

        starfishInstances.instanceMatrix.needsUpdate = true;
        tank.scene.add(starfishInstances);
        tank.starfishInstances = starfishInstances;

        console.log('Starfish placed with InstancedMesh -', starfishTransforms.length, 'instances, 1 draw call');
    }, undefined, (error) => {
        console.warn('Could not load starfish:', error);
    });

    // Load floralis water plants - placed in mixed garden cluster
    const fbxLoader = new FBXLoader();

    // Load water clover (GLB with embedded textures)
    loader.load('./models/env/floralis_st_water_plants_pack/clover.glb', (gltf) => {
        const cloverModel = gltf.scene;

        const mg = clusters.mixedGarden;
        for (let i = 0; i < 4; i++) {
            const plant = SkeletonUtils.clone(cloverModel);

            const pos = getClusterPosition(mg.x, mg.z, 12);
            plant.position.set(pos.x, floorY + 0.5, pos.z);
            plant.rotation.y = Math.random() * Math.PI * 2;
            plant.scale.setScalar(1.5 + Math.random());

            plant.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            plant.userData.isPlant = true;
            tank.scene.add(plant);
            tank.floorDecorations.push(plant);
        }
        console.log('Clover plants placed');
    }, undefined, (error) => {
        console.warn('Could not load clover:', error);
    });

    // Load water lotus - using simplified model (143KB vs 5.7MB)
    fbxLoader.load('./models/env/floralis_st_water_plants_pack/floralist_lotus2.fbx', (fbx) => {
        const meshes = [];
        fbx.traverse((child) => {
            if (child.isMesh) meshes.push(child);
        });

        const sg = clusters.seaweedGrove;
        meshes.forEach((mesh) => {
            for (let i = 0; i < 3; i++) {
                const plant = SkeletonUtils.clone(mesh);

                plant.material = new THREE.MeshStandardMaterial({
                    map: baseColorTex,
                    normalMap: normalTex,
                    transparent: true,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide
                });

                // Place near seaweed grove or center-biased
                const pos = i < 2
                    ? getClusterPosition(sg.x, sg.z, 15)
                    : getCenteredPosition(spreadRadius * 0.5);
                plant.position.set(pos.x, floorY + 0.5, pos.z);
                plant.rotation.y = Math.random() * Math.PI * 2;
                plant.scale.setScalar(1.5 + Math.random());

                plant.userData.isPlant = true;
                tank.scene.add(plant);
                tank.floorDecorations.push(plant);
            }
        });
        console.log('Lotus plants placed');
    }, undefined, (error) => {
        console.warn('Could not load lotus:', error);
    });

    // Create continuous bubble stream
    createBubbleStream(tank);
}

/**
 * Create continuous bubble stream effect using InstancedMesh (RAM optimized)
 */
function createBubbleStream(tank) {
    const bubbleCount = 150;
    const floorY = tank.config.tank.floorY;
    const ceilingY = tank.config.tank.ceilingY;

    // Single shared geometry and material for ALL bubbles
    const bubbleGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    const bubbleMaterial = new THREE.MeshPhongMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.6,
        shininess: 100,
        specular: 0xffffff
    });

    // Create InstancedMesh - single draw call for all bubbles!
    const bubbleInstances = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, bubbleCount);
    bubbleInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // For animation updates

    tank.bubbleSources = [
        { x: 0, z: 0 },           // Center
        { x: -15, z: 10 },        // Near seaweed grove
        { x: 20, z: -15 },        // Near rock circle
        { x: 10, z: 25 },         // Near starfish beach
        { x: -18, z: -20 },       // Near mixed garden
    ];

    // Store per-instance data for animation
    tank.bubbleData = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < bubbleCount; i++) {
        const source = tank.bubbleSources[Math.floor(Math.random() * tank.bubbleSources.length)];
        const scale = 0.3 + Math.random() * 0.7;

        // Initial position
        const x = source.x + (Math.random() - 0.5) * 4;
        const y = floorY + Math.random() * (ceilingY - floorY);
        const z = source.z + (Math.random() - 0.5) * 4;

        // Store animation data
        tank.bubbleData.push({
            x, y, z,
            sourceX: source.x,
            sourceZ: source.z,
            speed: 0.02 + Math.random() * 0.03,
            wobbleSpeed: 1 + Math.random() * 2,
            wobbleAmount: 0.5 + Math.random() * 1,
            phase: Math.random() * Math.PI * 2,
            baseScale: scale
        });

        // Set initial matrix
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        bubbleInstances.setMatrixAt(i, dummy.matrix);
    }

    bubbleInstances.instanceMatrix.needsUpdate = true;
    tank.scene.add(bubbleInstances);
    tank.bubbleInstances = bubbleInstances;
    tank.bubbleDummy = dummy;

    console.log('Bubble stream created with InstancedMesh -', bubbleCount, 'bubbles, 1 draw call');
}

/**
 * Update bubble stream animation (InstancedMesh version)
 */
export function updateBubbleStream(tank) {
    if (!tank.bubbleInstances || !tank.bubbleData) return;

    const floorY = tank.config.tank.floorY;
    const ceilingY = tank.config.tank.ceilingY;
    const time = tank.swimTime || Date.now() * 0.001;
    const dummy = tank.bubbleDummy;

    for (let i = 0; i < tank.bubbleData.length; i++) {
        const data = tank.bubbleData[i];

        // Rise upward
        data.y += data.speed;

        // Wobble side to side
        const wobble = Math.sin(time * data.wobbleSpeed + data.phase) * data.wobbleAmount * 0.02;
        data.x += wobble;
        data.z += Math.cos(time * data.wobbleSpeed * 0.7 + data.phase) * data.wobbleAmount * 0.015;

        // Reset bubble when it reaches ceiling
        if (data.y > ceilingY) {
            const source = tank.bubbleSources[Math.floor(Math.random() * tank.bubbleSources.length)];
            data.x = source.x + (Math.random() - 0.5) * 4;
            data.y = floorY + Math.random() * 2;
            data.z = source.z + (Math.random() - 0.5) * 4;
            data.sourceX = source.x;
            data.sourceZ = source.z;
            data.phase = Math.random() * Math.PI * 2;
        }

        // Slight scale pulsing
        const scalePulse = 1 + Math.sin(time * 3 + data.phase) * 0.1;

        // Update instance matrix
        dummy.position.set(data.x, data.y, data.z);
        dummy.scale.setScalar(data.baseScale * scalePulse);
        dummy.updateMatrix();
        tank.bubbleInstances.setMatrixAt(i, dummy.matrix);
    }

    tank.bubbleInstances.instanceMatrix.needsUpdate = true;
}

/**
 * Update floor decoration animations (seaweed swaying)
 */
export function updateFloorDecorations(tank) {
    if (!tank.floorDecorations) return;

    const time = tank.swimTime || Date.now() * 0.001;

    tank.floorDecorations.forEach((decoration) => {
        if (decoration.userData.isSeaweed) {
            // Gentle swaying motion for seaweed
            const sway = Math.sin(time * decoration.userData.swaySpeed + decoration.userData.swayOffset) * 0.1;
            decoration.rotation.z = decoration.userData.baseRotation + sway;
            decoration.rotation.x = sway * 0.5;
        }
    });
}

/**
 * Update sand floor animation (no-op for flat floor)
 */
export function updateSandFloorAnimation(tank) {
    // Flat floor - no animation needed
}

/**
 * Create floating water particles
 */
function createWaterParticles(tank) {
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 200;
        positions[i + 1] = (Math.random() - 0.5) * 200;
        positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.1,
        transparent: true,
        opacity: 0.6
    });

    tank.particles = new THREE.Points(particleGeometry, particleMaterial);
    tank.scene.add(tank.particles);
}

/**
 * Update environmental animations
 */
export function updateEnvironment(tank) {
    // Animate water particles
    if (tank.particles) {
        tank.particles.rotation.y += 0.001;
        const positions = tank.particles.geometry.attributes.position.array;

        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += 0.01;
            if (positions[i] > 100) positions[i] = -100;
        }

        tank.particles.geometry.attributes.position.needsUpdate = true;
    }

    // Animate floating objects within tank bounds
    const tankWidth = tank.config.tank.width;
    const tankFloorY = tank.config.tank.floorY;
    const tankCeilingY = tank.config.tank.ceilingY;

    tank.allObjects.forEach((object, index) => {
        object.rotation.y += 0.001 + (index * 0.0002);
        object.position.y += Math.sin(tank.swimTime + index) * 0.01;

        // Clamp position to tank bounds
        object.position.x = Math.max(-tankWidth, Math.min(tankWidth, object.position.x));
        object.position.z = Math.max(-tankWidth, Math.min(tankWidth, object.position.z));
        object.position.y = Math.max(tankFloorY + 2, Math.min(tankCeilingY - 2, object.position.y));

        // Update collision sphere position to follow object
        if (tank.collisionSpheres && tank.collisionSpheres[index]) {
            tank.collisionSpheres[index].position.copy(object.position);
        }
    });

    updateCausticsAnimation(tank);
    updateSandFloorAnimation(tank);
    updateFloorDecorations(tank);
    updateBubbleStream(tank);
}

/**
 * Create or update tank bounds visualization
 */
export function createTankBounds(tank) {
    // Remove existing bounds if any
    if (tank.tankBoundsGroup) {
        tank.scene.remove(tank.tankBoundsGroup);
        tank.tankBoundsGroup.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    tank.tankBoundsGroup = new THREE.Group();

    const width = tank.config.tank.width * 2;
    const height = tank.config.tank.ceilingY - tank.config.tank.floorY;
    const centerY = (tank.config.tank.ceilingY + tank.config.tank.floorY) / 2;

    // Create wireframe box for tank bounds
    const boxGeometry = new THREE.BoxGeometry(width, height, width);
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
    });

    const wireframe = new THREE.LineSegments(edgesGeometry, lineMaterial);
    wireframe.position.y = centerY;
    tank.tankBoundsGroup.add(wireframe);

    // Add corner markers for better visibility
    const markerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });

    const halfWidth = tank.config.tank.width;
    const corners = [
        [-halfWidth, tank.config.tank.floorY, -halfWidth],
        [-halfWidth, tank.config.tank.floorY, halfWidth],
        [halfWidth, tank.config.tank.floorY, -halfWidth],
        [halfWidth, tank.config.tank.floorY, halfWidth],
        [-halfWidth, tank.config.tank.ceilingY, -halfWidth],
        [-halfWidth, tank.config.tank.ceilingY, halfWidth],
        [halfWidth, tank.config.tank.ceilingY, -halfWidth],
        [halfWidth, tank.config.tank.ceilingY, halfWidth],
    ];

    corners.forEach(pos => {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(pos[0], pos[1], pos[2]);
        tank.tankBoundsGroup.add(marker);
    });

    // Add vertical edge lines from ceiling to floor for better visibility
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8
    });

    const floorY = tank.config.tank.floorY;
    const ceilingY = tank.config.tank.ceilingY;

    // Create vertical lines at each corner
    const edgeCorners = [
        [-halfWidth, -halfWidth],
        [-halfWidth, halfWidth],
        [halfWidth, -halfWidth],
        [halfWidth, halfWidth],
    ];

    edgeCorners.forEach(([x, z]) => {
        const points = [
            new THREE.Vector3(x, floorY, z),
            new THREE.Vector3(x, ceilingY, z)
        ];
        const edgeGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const edgeLine = new THREE.Line(edgeGeometry, edgeMaterial);
        tank.tankBoundsGroup.add(edgeLine);
    });

    // Add floor plane indicator - brighter
    const floorGeometry = new THREE.PlaneGeometry(width, width);
    const floorMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    const floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.position.y = floorY + 0.1; // Offset slightly to prevent z-fighting with sand floor
    tank.tankBoundsGroup.add(floorPlane);

    // Add floor grid for better depth perception
    const gridHelper = new THREE.GridHelper(width, 10, 0x00ffff, 0x00aaaa);
    gridHelper.position.y = floorY + 0.15; // Offset to prevent z-fighting
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    tank.tankBoundsGroup.add(gridHelper);

    // Add ceiling plane indicator
    const ceilingPlane = new THREE.Mesh(floorGeometry.clone(), floorMaterial.clone());
    ceilingPlane.rotation.x = -Math.PI / 2;
    ceilingPlane.position.y = ceilingY;
    tank.tankBoundsGroup.add(ceilingPlane);

    tank.scene.add(tank.tankBoundsGroup);
    tank.tankBoundsVisible = true;
}

/**
 * Create a text sprite for labels
 */
function createTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(8, 2, 1);

    return sprite;
}

/**
 * Update tank bounds when dimensions change
 */
export function updateTankBounds(tank) {
    if (tank.tankBoundsVisible) {
        createTankBounds(tank);
    }
}

/**
 * Toggle tank bounds visibility
 */
export function toggleTankBounds(tank) {
    if (tank.tankBoundsVisible) {
        // Hide bounds
        if (tank.tankBoundsGroup) {
            tank.scene.remove(tank.tankBoundsGroup);
        }
        tank.tankBoundsVisible = false;
        console.log('Tank bounds: OFF');
    } else {
        // Show bounds
        createTankBounds(tank);
        console.log('Tank bounds: ON');
    }
}
