/**
 * Swimming Tank - Interactive 3D File Explorer
 * A Three.js-based underwater swimming simulation with file folders
 */

// Import Three.js and GLTFLoader
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class SwimmingTank {
    constructor() {
        // Core Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.loader = new GLTFLoader();

        // Game state
        this.swimTime = 0;
        
        // Movement state
        this.movement = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false
        };

        // Physics
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        // Mouse look
        this.mouseX = 0;
        this.mouseY = 0;
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

        // Game objects
        this.frog = null;
        this.frogMixer = null;
        this.frogPosition = new THREE.Vector3(0, 0, 0);
        this.frogRotation = new THREE.Euler(0, Math.PI, 0); // 180° rotation - frog faces away from camera
        this.cameraOffset = new THREE.Vector3(0, 7, 6); // Camera positioned higher to show frog lower on screen
        this.particles = null;
        this.folders = [];
        this.pdfs = []; // Array to store PDF objects
        this.allObjects = []; // Combined array for collision detection
        this.collisionSpheres = []; // Store collision visualization spheres
        this.bubbleTrail = null; // Bubble trail particle system
        this.bubbles = []; // Individual bubbles for trail
        this.dashCooldown = 0; // Dash cooldown timer
        this.dashForce = 15.0; // Dash force multiplier
        this.selectedObject = null; // Currently selected object (folder or PDF)
        this.selectionBorder = null; // Selection border mesh
        this.fileInfoPanel = null; // File information display panel

        // Configuration
        this.config = {
            movement: {
                speed: 8.0,
                friction: 6.0, // Reduced for smoother deceleration
                verticalSpeed: 6.0,
                mouseSensitivity: 0.003,
                rotationSpeed: 2.0
            },
            swimming: {
                strokeSpeed: 4,
                strokeAmplitude: 0.8,
                floatSpeed: 0.5,
                floatAmplitude: 0.1
            },
            world: {
                objectCount: 80,        // Number of folder instances
                worldSize: 25,          // Much closer clustering
                worldHeight: 20,        // Even smaller vertical space
                collisionDistance: 2.0, // Further reduced collision area
                selectionDistance: 4.0, // Distance for folder selection highlight
            },
            tank: {
                width: 50,              // Half-width of tank (actual width = 2x)
                height: 20,             // Vertical swim space
                floorY: -60,            // Sand floor Y position
                ceilingY: 15,           // Maximum swim height
            }
        };

        // File data for folders organized by themed clusters
        this.fileData = [
            // Work/Professional Cluster
            { name: 'Work Projects', size: '12.4 GB', type: 'folder', files: 234, cluster: 'work' },
            { name: 'Client Files', size: '8.7 GB', type: 'folder', files: 156, cluster: 'work' },
            { name: 'Meeting Notes', size: '1.2 GB', type: 'folder', files: 89, cluster: 'work' },
            { name: 'Presentations', size: '3.8 GB', type: 'folder', files: 45, cluster: 'work' },
            { name: 'Reports', size: '2.1 GB', type: 'folder', files: 67, cluster: 'work' },
            
            // Personal/Media Cluster
            { name: 'Photos', size: '24.6 GB', type: 'folder', files: 3456, cluster: 'personal' },
            { name: 'Videos', size: '18.3 GB', type: 'folder', files: 123, cluster: 'personal' },
            { name: 'Music', size: '7.2 GB', type: 'folder', files: 892, cluster: 'personal' },
            { name: 'Downloads', size: '4.1 GB', type: 'folder', files: 567, cluster: 'personal' },
            { name: 'Desktop', size: '1.2 GB', type: 'folder', files: 67, cluster: 'personal' },
            
            // System/Archive Cluster
            { name: 'System Backup', size: '45.2 GB', type: 'folder', files: 1234, cluster: 'system' },
            { name: 'Old Projects', size: '15.7 GB', type: 'folder', files: 234, cluster: 'system' },
            { name: 'Archive 2023', size: '8.9 GB', type: 'folder', files: 456, cluster: 'system' },
            { name: 'Temp Files', size: '2.3 GB', type: 'folder', files: 789, cluster: 'system' },
            { name: 'Cache', size: '1.8 GB', type: 'folder', files: 1234, cluster: 'system' }
        ];

        // PDF file data organized by themes with realistic names
        this.pdfData = [
            // Work Documents
            { name: 'Q4_Report_2024.pdf', size: '3.2 MB', type: 'pdf', pages: 67, cluster: 'work' },
            { name: 'Project_Proposal.pdf', size: '2.8 MB', type: 'pdf', pages: 34, cluster: 'work' },
            { name: 'Meeting_Minutes.pdf', size: '0.8 MB', type: 'pdf', pages: 5, cluster: 'work' },
            { name: 'Contract_Template.pdf', size: '1.5 MB', type: 'pdf', pages: 12, cluster: 'work' },
            { name: 'Client_Presentation.pdf', size: '4.7 MB', type: 'pdf', pages: 28, cluster: 'work' },
            
            // Personal Documents
            { name: 'Tax_Return_2024.pdf', size: '2.1 MB', type: 'pdf', pages: 23, cluster: 'personal' },
            { name: 'Insurance_Policy.pdf', size: '4.7 MB', type: 'pdf', pages: 89, cluster: 'personal' },
            { name: 'Recipe_Collection.pdf', size: '1.9 MB', type: 'pdf', pages: 45, cluster: 'personal' },
            { name: 'Travel_Itinerary.pdf', size: '0.6 MB', type: 'pdf', pages: 8, cluster: 'personal' },
            { name: 'Bank_Statement.pdf', size: '1.2 MB', type: 'pdf', pages: 12, cluster: 'personal' },
            
            // Random/Misc Files (realistic messy names)
            { name: 'kdfgkjdfgl.jpg', size: '2.4 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'IMG_20241201_143022.jpg', size: '4.1 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'screenshot_2024-11-15.png', size: '1.8 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'untitled_document.pdf', size: '0.3 MB', type: 'pdf', pages: 2, cluster: 'misc' },
            { name: 'copy_of_copy_final_v2.pdf', size: '1.2 MB', type: 'pdf', pages: 15, cluster: 'misc' },
            { name: 'asdfghjkl.pdf', size: '0.7 MB', type: 'pdf', pages: 3, cluster: 'misc' },
            { name: 'New Document (1).pdf', size: '0.5 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'scan_20241201.pdf', size: '3.1 MB', type: 'pdf', pages: 4, cluster: 'misc' }
        ];

        this.init();
    }

    /**
     * Generate a random file name based on the base name
     */
    generateRandomFileName(baseName) {
        const suffixes = ['_2024', '_backup', '_archive', '_old', '_new', '_temp', '_copy', '_v2', '_final', '_draft'];
        const prefixes = ['my_', 'work_', 'personal_', 'project_', 'data_', 'files_', 'doc_', 'img_', 'vid_', 'audio_'];
        
        // 30% chance to add a prefix
        if (Math.random() < 0.3) {
            baseName = prefixes[Math.floor(Math.random() * prefixes.length)] + baseName;
        }
        
        // 40% chance to add a suffix
        if (Math.random() < 0.4) {
            baseName = baseName + suffixes[Math.floor(Math.random() * suffixes.length)];
        }
        
        // 20% chance to add a number
        if (Math.random() < 0.2) {
            baseName = baseName + '_' + Math.floor(Math.random() * 100);
        }
        
        return baseName;
    }

    /**
     * Generate a random PDF name based on the base name
     */
    generateRandomPDFName(baseName) {
        const suffixes = ['_draft', '_final', '_v2', '_v3', '_updated', '_revised', '_latest', '_old', '_new', '_temp'];
        const prefixes = ['draft_', 'final_', 'revised_', 'updated_', 'new_', 'old_', 'temp_', 'backup_', 'copy_', 'version_'];
        
        // 30% chance to add a prefix
        if (Math.random() < 0.3) {
            baseName = prefixes[Math.floor(Math.random() * prefixes.length)] + baseName;
        }
        
        // 40% chance to add a suffix
        if (Math.random() < 0.4) {
            baseName = baseName.replace('.pdf', '') + suffixes[Math.floor(Math.random() * suffixes.length)] + '.pdf';
        }
        
        // 20% chance to add a number
        if (Math.random() < 0.2) {
            baseName = baseName.replace('.pdf', '') + '_' + Math.floor(Math.random() * 100) + '.pdf';
        }
        
        return baseName;
    }

    /**
     * Generate a random file size based on the base size
     */
    generateRandomFileSize(baseSize) {
        // Parse the base size (e.g., "2.4 GB" -> 2.4)
        const sizeMatch = baseSize.match(/(\d+\.?\d*)\s*(GB|MB|KB)/);
        if (!sizeMatch) return baseSize;
        
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        
        // Add ±50% variation
        const variation = 0.5 + Math.random(); // 0.5 to 1.5
        const newSize = (size * variation).toFixed(1);
        
        return `${newSize} ${unit}`;
    }

    /**
     * Parse file size string to GB for scaling calculations
     */
    parseSizeToGB(sizeString) {
        const sizeMatch = sizeString.match(/(\d+\.?\d*)\s*(GB|MB|KB)/);
        if (!sizeMatch) return 1.0; // Default to 1GB if parsing fails
        
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        
        // Convert to GB
        switch (unit) {
            case 'GB': return size;
            case 'MB': return size / 1024;
            case 'KB': return size / (1024 * 1024);
            default: return 1.0;
        }
    }

    /**
     * Parse file size string to MB for PDF scaling calculations
     */
    parseSizeToMB(sizeString) {
        const sizeMatch = sizeString.match(/(\d+\.?\d*)\s*(GB|MB|KB)/);
        if (!sizeMatch) return 1.0; // Default to 1MB if parsing fails
        
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        
        // Convert to MB
        switch (unit) {
            case 'GB': return size * 1024;
            case 'MB': return size;
            case 'KB': return size / 1024;
            default: return 1.0;
        }
    }

    /**
     * Initialize the entire swimming tank experience
     */
    init() {
        try {
            console.log('🏊‍♂️ Initializing Swimming Tank...');
            this.createScene();
            console.log('✅ Scene created');
            this.createEnvironment();
            console.log('✅ Environment created');
            
            // Add a fallback timeout to continue without frog if loading takes too long
            const initTimeout = setTimeout(() => {
                console.warn('⏰ Initialization timeout - continuing without frog');
                this.hideLoadingScreen();
                this.showInitialMessage();
            }, 8000); // 8 second timeout
            
            this.initTimeout = initTimeout;
            
            this.loadFrogModel();
            console.log('✅ Frog model loading initiated');
            this.createFileFolders();
            console.log('✅ File folders created');
            this.createPDFFiles();
            console.log('✅ PDF files created');
            this.setupControls();
            console.log('✅ Controls setup');
            this.setupEventListeners();
            console.log('✅ Event listeners setup');
            this.setupLightPanel();
            console.log('✅ Light panel setup');
            this.startAnimation();
            console.log('✅ Animation started');
            // Note: Loading screen will be hidden after frog loads successfully
        } catch (error) {
            console.error('❌ Error initializing Swimming Tank:', error);
            this.showErrorMessage(error);
        }
    }

    /**
     * Create the basic Three.js scene setup
     */
    createScene() {
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera - positioned for third-person view
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(0, 3, 6); // Higher and further behind the frog

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x4477aa); // Bright underwater blue background

        // Underwater fog effect (on scene, not renderer)
        this.scene.fog = new THREE.Fog(0x4477aa, 15, 80);
        
        // Enable smooth shading for better rounded appearance
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enhanced renderer settings for caustics
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.4; // Increased from 1.2 for brighter overall scene
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        document.getElementById('container').appendChild(this.renderer.domElement);

        // Camera setup complete
    }

    /**
     * Create the underwater environment with lighting and particles
     */
    createEnvironment() {
        // Lighting setup - much brighter for better visibility
        // Store references for config panel
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(this.ambientLight);

        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
        this.mainLight.position.set(10, 20, 5);
        this.mainLight.castShadow = true;
        this.scene.add(this.mainLight);

        // Add a brighter blue underwater tint for better atmosphere
        this.underwaterLight = new THREE.DirectionalLight(0x88ccff, 0.4);
        this.underwaterLight.position.set(-5, 10, -10);
        this.scene.add(this.underwaterLight);

        // Add additional bright overhead light for better folder visibility
        this.overheadLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.overheadLight.position.set(0, 25, 0);
        this.overheadLight.castShadow = true;
        this.scene.add(this.overheadLight);

        // Create water caustics lighting effects
        this.createWaterCaustics();

        // Create wavy sand floor
        this.createSandFloor();

        // Underwater particles (bubbles/debris)
        this.createWaterParticles();
    }

    /**
     * Create water caustics lighting effects
     */
    createWaterCaustics() {
        // Create caustics texture using canvas
        const causticsCanvas = this.createCausticsTexture();
        const causticsTexture = new THREE.CanvasTexture(causticsCanvas);
        causticsTexture.wrapS = THREE.RepeatWrapping;
        causticsTexture.wrapT = THREE.RepeatWrapping;
        causticsTexture.repeat.set(4, 4);

        // Create caustics light patterns
        this.createCausticsLights(causticsTexture);
        
        // Create animated caustics mesh for dynamic lighting
        this.createAnimatedCaustics(causticsTexture);
        
        // Note: Bubble streams will be created after folders and PDFs are loaded
    }

    /**
     * Create PDF files scattered throughout the water using PDF.gltf
     */
    createPDFFiles() {
        // Load the PDF.gltf model once and clone it for each instance
        this.loader.load('pdf.gltf', (gltf) => {
            const pdfModel = gltf.scene;
            
            // Define cluster centers (same as folders but with slight offsets)
            const clusters = {
                work: { x: -12, y: 8, z: -8, radius: 6 },
                personal: { x: 18, y: 8, z: -8, radius: 6 },
                system: { x: 3, y: 8, z: 18, radius: 6 },
                misc: { x: -5, y: 8, z: 5, radius: 8 }
            };
            
            // Create multiple PDF instances
            const pdfCount = Math.floor(this.config.world.objectCount * 0.4); // 40% of total objects are PDFs
            
            for (let i = 0; i < pdfCount; i++) {
                // Get PDF data first to determine cluster
                const randomPdfData = this.pdfData[Math.floor(Math.random() * this.pdfData.length)];
                const cluster = randomPdfData.cluster || 'misc';
                const clusterCenter = clusters[cluster] || { x: 0, y: 8, z: 0, radius: 10 };
                
                // Position within cluster with some randomness
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * clusterCenter.radius;
                const x = clusterCenter.x + Math.cos(angle) * distance;
                const y = clusterCenter.y + (Math.random() - 0.5) * 4; // Vertical spread
                const z = clusterCenter.z + Math.sin(angle) * distance;
                
                // Clone the PDF model
                const pdfInstance = pdfModel.clone();
                const pdfData = {
                    ...randomPdfData,
                    originalName: randomPdfData.name,
                    // Add some randomization to make each PDF unique
                    name: this.generateRandomPDFName(randomPdfData.name),
                    size: this.generateRandomFileSize(randomPdfData.size),
                    pages: Math.floor(randomPdfData.pages * (0.7 + Math.random() * 0.6)) // ±30% variation
                };
                
                // Calculate scale based on PDF size (larger PDFs = bigger scale)
                const sizeInMB = this.parseSizeToMB(pdfData.size);
                const baseScale = 4.0;
                const sizeMultiplier = Math.max(0.5, Math.min(2.0, sizeInMB / 5)); // Scale between 0.5x and 2.0x based on size
                const finalScale = baseScale * sizeMultiplier;
                
                // Scale the PDF based on its size
                pdfInstance.scale.setScalar(finalScale);
                
                // Position the PDF
                pdfInstance.position.set(x, y, z);
                
                // Add some random rotation for variety
                pdfInstance.rotation.x = (Math.random() - 0.5) * 0.3;
                pdfInstance.rotation.y = Math.random() * Math.PI * 2;
                pdfInstance.rotation.z = (Math.random() - 0.5) * 0.2;
                
                // Assign the PDF data
                pdfInstance.userData = pdfData;
                
                // Add collision visualization (semi-transparent sphere) - scale with PDF
                const collisionGeometry = new THREE.SphereGeometry(this.config.world.collisionDistance, 16, 8);
                const collisionMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,        // Green color for PDFs (different from folders)
                    transparent: true,
                    opacity: 0.2,           // Semi-transparent
                    wireframe: true         // Wireframe to see through
                });
                const collisionSphere = new THREE.Mesh(collisionGeometry, collisionMaterial);
                collisionSphere.position.copy(pdfInstance.position);
                collisionSphere.scale.copy(pdfInstance.scale); // Scale collision sphere with PDF
                
                // Add to scene and arrays
                this.scene.add(pdfInstance);
                this.scene.add(collisionSphere);
                this.pdfs.push(pdfInstance);
                this.collisionSpheres.push(collisionSphere);
            }
            
            console.log(`✅ Created ${pdfCount} PDF instances from PDF.gltf with random file data`);
            
            // Update the combined objects array for collision detection
            this.updateCombinedObjects();
            
            // Create bubble streams for all objects now that both folders and PDFs are loaded
            this.createObjectBubbleStreams();
            
        }, (progress) => {
            console.log('Loading PDF.gltf progress:', (progress.loaded / progress.total * 100) + '%');
        }, (error) => {
            console.error('❌ Error loading PDF.gltf:', error);
            console.log('📄 Falling back to procedural PDF creation...');
            // Fallback to original method if GLB fails to load
            this.createPDFFilesOriginal();
        });
    }

    /**
     * Create caustics texture using canvas
     */
    createCausticsTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Create underwater caustics pattern
        ctx.fillStyle = '#001122';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add multiple layers of caustic patterns
        for (let layer = 0; layer < 3; layer++) {
            ctx.globalAlpha = 0.1 + layer * 0.05;
            ctx.strokeStyle = '#44aaff';
            ctx.lineWidth = 1 + layer * 0.5;

            // Create curved caustic lines
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

            // Add wave-like patterns
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
     * Create animated caustics lights
     */
    createCausticsLights(causticsTexture) {
        // Create multiple caustic light sources
        const causticLights = [];
        
        for (let i = 0; i < 5; i++) {
            const causticLight = new THREE.SpotLight(0x44aaff, 0.6); // Increased from 0.3 to 0.6
            causticLight.position.set(
                (Math.random() - 0.5) * 40,
                15 + Math.random() * 10,
                (Math.random() - 0.5) * 40
            );
            
            causticLight.angle = 0.3;
            causticLight.penumbra = 0.5;
            causticLight.decay = 1.2; // Reduced from 1.5 for brighter effect
            causticLight.distance = 35; // Increased from 30 for wider coverage
            
            // Add caustics texture to the light
            causticLight.map = causticsTexture;
            
            this.scene.add(causticLight);
            causticLights.push(causticLight);
        }
        
        this.causticLights = causticLights;
    }

    /**
     * Create animated caustics mesh for dynamic lighting
     */
    createAnimatedCaustics(causticsTexture) {
        // Create a large plane for caustics projection
        const causticsGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
        
        // Create caustics material with transparency
        const causticsMaterial = new THREE.MeshBasicMaterial({
            map: causticsTexture,
            transparent: true,
            opacity: 0.25, // Increased from 0.15 for better visibility
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        // Create multiple caustics layers
        this.causticsLayers = [];
        
        for (let i = 0; i < 3; i++) {
            const causticsMesh = new THREE.Mesh(causticsGeometry, causticsMaterial.clone());
            causticsMesh.position.y = 10 + i * 5; // Layer at different heights
            causticsMesh.rotation.x = -Math.PI / 2; // Lay flat
            
            // Store animation data
            causticsMesh.userData = {
                speed: 0.5 + Math.random() * 0.5,
                offset: Math.random() * Math.PI * 2,
                scale: 1.0 + Math.random() * 0.3
            };
            
                    this.scene.add(causticsMesh);
        this.causticsLayers.push(causticsMesh);
    }
}

    /**
     * Update caustics animation
     */
    updateCausticsAnimation() {
        if (!this.causticsLayers) return;

        // Animate caustics layers
        this.causticsLayers.forEach((layer, index) => {
            const data = layer.userData;
            const time = this.swimTime * data.speed + data.offset;
            
            // Gentle floating motion
            layer.position.y = 10 + index * 5 + Math.sin(time * 0.5) * 0.5;
            
            // Subtle rotation
            layer.rotation.z += 0.001 * data.speed;
            
            // Scale variation
            const scaleVariation = 1.0 + Math.sin(time * 0.3) * 0.05;
            layer.scale.setScalar(data.scale * scaleVariation);
            
            // Move texture for flowing effect
            if (layer.material.map) {
                layer.material.map.offset.x += 0.001 * data.speed;
                layer.material.map.offset.y += 0.0005 * data.speed;
            }
        });

        // Animate caustic lights
        if (this.causticLights) {
            this.causticLights.forEach((light, index) => {
                const time = this.swimTime * 0.3 + index * 0.5;
                
                // Gentle light movement
                light.position.x += Math.sin(time) * 0.01;
                light.position.z += Math.cos(time) * 0.01;
                
                // Subtle intensity variation
                light.intensity = 0.3 + Math.sin(time * 2) * 0.05;
            });
        }
    }

    /**
     * Create a curved bowl-like seafloor with procedural wave patterns
     */
    createSandFloor() {
        // Create a smaller plane geometry that we'll curve into a bowl shape
        const sandGeometry = new THREE.PlaneGeometry(300, 300, 80, 80);
        
        // Get the position attribute to modify vertices
        const positions = sandGeometry.attributes.position;
        const vertices = positions.array;
        
        // Create bowl curvature and wave patterns by modifying vertex positions
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 1];
            
            // Calculate distance from center for bowl effect
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            const maxDistance = 150; // Bowl radius
            
            // Create bowl curvature - much deeper in center, curves up at edges
            let bowlDepth = 0;
            if (distanceFromCenter < maxDistance) {
                // Create a pronounced bowl shape
                const normalizedDistance = distanceFromCenter / maxDistance;
                bowlDepth = -40 * (1 - normalizedDistance * normalizedDistance);
            } else {
                // Outside the bowl, keep it flat or slightly raised
                bowlDepth = 5;
            }
            
            // Create wave patterns for sand texture
            let waveHeight = 0;
            
            // Primary wave pattern (large dunes)
            waveHeight += Math.sin(x * 0.02) * Math.cos(z * 0.015) * 1.5;
            
            // Secondary wave pattern (medium ripples)
            waveHeight += Math.sin(x * 0.05 + z * 0.03) * 0.8;
            
            // Tertiary wave pattern (small ripples)
            waveHeight += Math.sin(x * 0.1) * Math.sin(z * 0.08) * 0.3;
            
            // Add some random variation for natural look
            waveHeight += (Math.random() - 0.5) * 0.2;
            
            // Apply both bowl curvature and wave patterns to Y coordinate
            vertices[i + 2] = bowlDepth + waveHeight;
        }
        
        // Create vertex colors for distance-based gradient (sand to blue)
        const colors = [];
        const sandColor = new THREE.Color(0xd4af8c); // Warm sand color
        const blueColor = new THREE.Color(0x4477aa); // Water blue color
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 1];
            
            // Calculate distance from center
            const distanceFromCenter = Math.sqrt(x * x + z * z);
            const maxDistance = 150; // Bowl radius
            
            // Create gradient from sand (center) to blue (edges)
            let colorMix = Math.min(distanceFromCenter / maxDistance, 1.0);
            // Make the gradient more pronounced
            colorMix = Math.pow(colorMix, 1.5);
            
            // Interpolate between sand and blue colors
            const vertexColor = sandColor.clone().lerp(blueColor, colorMix);
            
            colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
        }
        
        // Apply vertex colors to geometry
        sandGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Update the geometry to reflect vertex changes
        positions.needsUpdate = true;
        sandGeometry.computeVertexNormals(); // Recalculate normals for proper lighting
        
        // Create sand material with distance-based color gradient
        const sandMaterial = new THREE.MeshLambertMaterial({
            color: 0xd4af8c, // Warm sand color (will be modified by vertex colors)
            transparent: true,
            opacity: 0.7, // More transparent to work better with fog
            side: THREE.DoubleSide,
            vertexColors: true, // Enable vertex colors for gradient effect
            fog: true // Ensure fog affects this material
        });
        
        // Create the curved sand floor mesh
        this.sandFloor = new THREE.Mesh(sandGeometry, sandMaterial);
        this.sandFloor.position.y = -60; // Position much lower to create proper seafloor depth
        this.sandFloor.rotation.x = -Math.PI / 2; // Lay flat (PlaneGeometry faces up by default)
        this.sandFloor.receiveShadow = true; // Allow shadows to be cast on it
        
        // Add to scene
        this.scene.add(this.sandFloor);
        
        // Store animation data for very subtle movement (start static)
        this.sandFloor.userData = {
            waveSpeed: 0.05, // Much slower
            waveAmplitude: 0.02, // Much smaller amplitude
            time: 0,
            enabled: false, // Start with animation disabled
            originalVertices: new Float32Array(vertices) // Store original positions for animation
        };
        
        console.log('🏖️ Curved bowl seafloor created with wavy patterns');
    }

    /**
     * Update sand floor animation for subtle wave movement
     */
    updateSandFloorAnimation() {
        if (!this.sandFloor) return;
        
        const data = this.sandFloor.userData;
        
        // Only animate if enabled
        if (!data.enabled) return;
        
        data.time += 0.005; // Even slower time increment
        
        // Very subtle wave animation by modifying vertex positions from stored originals
        const positions = this.sandFloor.geometry.attributes.position;
        const vertices = positions.array;
        const originalVertices = data.originalVertices;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const x = originalVertices[i];
            const z = originalVertices[i + 1];
            const originalY = originalVertices[i + 2];
            
            // Add very subtle animated wave to the original curved surface
            const animatedWave = Math.sin(x * 0.01 + data.time * data.waveSpeed) * 
                                Math.cos(z * 0.008 + data.time * data.waveSpeed) * 
                                data.waveAmplitude;
            
            // Restore original position and add animation
            vertices[i] = x;
            vertices[i + 1] = z;
            vertices[i + 2] = originalY + animatedWave;
        }
        
        positions.needsUpdate = true;
    }

    /**
     * Create a realistic bubble material with fresnel effect (edges visible, center transparent)
     * Real bubbles are thin membranes - you see the rim more than the center
     */
    createBubbleMaterial(options = {}) {
        const {
            baseOpacity = 0.15,
            rimOpacity = 0.7,
            rimPower = 2.0,
            color = new THREE.Color(0xaaddff),
            emissiveColor = new THREE.Color(0x003344)
        } = options;

        const bubbleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                baseOpacity: { value: baseOpacity },
                rimOpacity: { value: rimOpacity },
                rimPower: { value: rimPower },
                bubbleColor: { value: color },
                emissiveColor: { value: emissiveColor },
                time: { value: 0.0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float baseOpacity;
                uniform float rimOpacity;
                uniform float rimPower;
                uniform vec3 bubbleColor;
                uniform vec3 emissiveColor;
                uniform float time;

                varying vec3 vNormal;
                varying vec3 vViewPosition;

                void main() {
                    // Calculate fresnel effect - edges are more visible than center
                    vec3 viewDir = normalize(vViewPosition);
                    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
                    fresnel = pow(fresnel, rimPower);

                    // Combine base transparency with fresnel rim
                    float alpha = mix(baseOpacity, rimOpacity, fresnel);

                    // Add subtle specular highlight
                    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                    float specular = pow(max(dot(reflect(-lightDir, vNormal), viewDir), 0.0), 32.0);

                    // Final color with emissive glow and specular
                    vec3 finalColor = bubbleColor + emissiveColor * 0.3 + vec3(1.0) * specular * 0.5;

                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        return bubbleMaterial;
    }

    /**
     * Create vertical bubble streams for each object to help with depth perception
     */
    createObjectBubbleStreams() {
        this.objectBubbleStreams = [];
        
        // Create bubble streams for each object (folder and PDF)
        this.allObjects.forEach((object, index) => {
            const bubbleStream = this.createSingleBubbleStream(object, index);
            this.objectBubbleStreams.push(bubbleStream);
        });
    }

    /**
     * Create a single bubble stream for a folder
     */
    createSingleBubbleStream(folder, index) {
        const streamGroup = new THREE.Group();
        const bubbleCount = 8 + Math.floor(Math.random() * 4); // 8-12 bubbles per stream
        
        // Create bubbles in a vertical stream
        for (let i = 0; i < bubbleCount; i++) {
            const bubble = this.createStreamBubble(index, i);
            
            // Position bubbles in a vertical line above the folder
            bubble.position.set(0, 2 + i * 0.8, 0); // Start 2 units above folder
            
            // Store animation data
            bubble.userData = {
                startY: 2 + i * 0.8,
                speed: 0.3 + Math.random() * 0.2,
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: 1.0 + Math.random() * 2.0,
                wobbleAmount: 0.1 + Math.random() * 0.2,
                index: i
            };
            
            streamGroup.add(bubble);
        }
        
        // Position the stream group at the folder's location
        streamGroup.position.copy(folder.position);
        this.scene.add(streamGroup);
        
        return streamGroup;
    }

    /**
     * Create a single bubble for the stream
     */
    createStreamBubble(folderIndex, bubbleIndex) {
        // Create bubble geometry with varying sizes
        const bubbleSize = 0.04 + Math.random() * 0.06; // 0.04 to 0.10
        const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 16, 12);

        // Add subtle color variation based on folder index for better identification
        const hue = (folderIndex * 137.5) % 360; // Golden angle for good distribution
        const saturation = 40 + Math.random() * 30; // 40-70%
        const lightness = 70 + Math.random() * 20; // 70-90%
        const color = new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100);

        // Create fresnel bubble material - thin membrane with visible edges
        // Stream bubbles need higher visibility since they're further from camera
        const bubbleMaterial = this.createBubbleMaterial({
            baseOpacity: 0.15 + Math.random() * 0.1,   // More visible center for streams
            rimOpacity: 0.7 + Math.random() * 0.25,    // Strong visible rim
            rimPower: 1.2 + Math.random() * 0.5,       // Softer falloff for better visibility
            color: color,
            emissiveColor: new THREE.Color(0x004455)   // Brighter emissive
        });

        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        
        return bubble;
    }

    /**
     * Update object bubble stream animations
     */
    updateObjectBubbleStreams() {
        if (!this.objectBubbleStreams) return;

        this.objectBubbleStreams.forEach((stream, streamIndex) => {
            // Update each bubble in the stream
            stream.children.forEach((bubble, bubbleIndex) => {
                const data = bubble.userData;
                
                // Move bubble upward
                bubble.position.y += data.speed * 0.016; // Assuming 60fps
                
                // Add wobble effect
                data.wobble += data.wobbleSpeed * 0.016;
                bubble.position.x += Math.sin(data.wobble) * data.wobbleAmount * 0.016;
                bubble.position.z += Math.cos(data.wobble) * data.wobbleAmount * 0.016;
                
                // Reset bubble position when it goes too high
                if (bubble.position.y > 15) {
                    bubble.position.y = data.startY;
                    bubble.position.x = 0;
                    bubble.position.z = 0;
                }

                // Fade bubble based on height (more transparent when higher)
                const heightRatio = (bubble.position.y - data.startY) / (15 - data.startY);
                const fadeFactor = (1 - heightRatio * 0.6);

                // Update shader uniforms for fresnel material
                if (bubble.material.uniforms) {
                    bubble.material.uniforms.rimOpacity.value = (0.7 + Math.random() * 0.2) * fadeFactor;
                    bubble.material.uniforms.baseOpacity.value = 0.15 * fadeFactor;
                }

                // Scale bubble slightly as it rises
                const scale = 1.0 + heightRatio * 0.3;
                bubble.scale.setScalar(scale);
            });
            
            // Keep stream positioned with the object
            if (this.allObjects[streamIndex]) {
                stream.position.copy(this.allObjects[streamIndex].position);
            }
        });
    }

    /**
     * Create floating water particles for atmosphere
     */
    createWaterParticles() {
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 2000;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;     // x
            positions[i + 1] = (Math.random() - 0.5) * 200; // y
            positions[i + 2] = (Math.random() - 0.5) * 200; // z
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });

        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
    }

    /**
     * Load and setup the GLTF frog model
     */
    loadFrogModel() {
        // Check if GLTFLoader is available
        if (!GLTFLoader) {
            console.error('❌ GLTFLoader not available! Cannot load frog model.');
            clearTimeout(this.initTimeout);
            this.hideLoadingScreen();
            this.showInitialMessage();
            return;
        }
        
        // Set a timeout in case loading gets stuck
        const loadingTimeout = setTimeout(() => {
            console.warn('⏰ Frog loading timeout - hiding loading screen');
            clearTimeout(this.initTimeout);
            this.hideLoadingScreen();
            this.showInitialMessage();
        }, 5000); // Reduced to 5 second timeout for faster feedback

        // Add explicit error handling and logging
        try {
            this.loader.load('./Frog_Swim.gltf', (gltf) => {
            clearTimeout(loadingTimeout); // Cancel loading timeout
            clearTimeout(this.initTimeout); // Cancel init timeout
            this.frog = gltf.scene;
            
            // Scale the frog appropriately
            this.frog.scale.setScalar(2); // Adjust size as needed
            
            // Position the frog at origin initially
            this.frog.position.copy(this.frogPosition);
            
            // Set frog to face away from camera
            this.frog.rotation.copy(this.frogRotation);
            
            // Add frog to scene
            this.scene.add(this.frog);
            
            // Setup animation mixer if animations exist
            if (gltf.animations && gltf.animations.length > 0) {
                this.frogMixer = new THREE.AnimationMixer(this.frog);
                
                // Play swimming animation if it exists
                const swimAction = this.frogMixer.clipAction(gltf.animations[0]);
                swimAction.play();
            }
            
            console.log('🐸 Frog model loaded and added to scene!');
            
            // Update camera position relative to frog
            this.updateCameraPosition();
            
            // Hide loading screen now that frog is ready
            this.hideLoadingScreen();
            console.log('✅ Loading screen hidden');
            this.showInitialMessage();
            console.log('🎉 Swimming Tank ready!');
            
        }, (progress) => {
            console.log('Loading frog model:', (progress.loaded / progress.total * 100) + '%');
        }, (error) => {
            clearTimeout(loadingTimeout); // Cancel loading timeout
            clearTimeout(this.initTimeout); // Cancel init timeout
            console.error('Error loading frog model:', error);
            
            // Hide loading screen even if frog loading failed
            this.hideLoadingScreen();
            
            // Show error message but allow the app to continue without the frog
            const errorMsg = `Failed to load frog model: ${error.message}`;
            console.warn('⚠️ Continuing without frog model');
            
            // Still show ready message so user knows app is functional
            this.showInitialMessage();
        });
        } catch (error) {
            console.error('🚨 Exception during GLTF loading setup:', error);
            clearTimeout(loadingTimeout);
            clearTimeout(this.initTimeout);
            this.hideLoadingScreen();
            this.showInitialMessage();
        }
    }

    /**
     * Update camera position to maintain third-person view behind the frog
     */
    updateCameraPosition() {
        if (!this.frog) return;

        // Calculate desired camera position relative to frog using current offset
        const targetPosition = this.frog.position.clone().add(this.cameraOffset);
        
        // Smooth camera movement with lerp for natural following
        this.camera.position.lerp(targetPosition, 0.1);
        
        // Make camera look at a point below the frog to position it lower on screen
        const lookTarget = this.frog.position.clone();
        lookTarget.y += 4; // Look much further below the frog to position it ~200px from bottom
        this.camera.lookAt(lookTarget);
    }

    /**
     * Create floating objects (folders) scattered throughout the water using Folder.glb
     */
    createFileFolders() {
        // Load the Folder.glb model once and clone it for each instance
        this.loader.load('Folder.glb', (gltf) => {
            const folderModel = gltf.scene;
            
            // Define cluster centers
            const clusters = {
                work: { x: -15, y: 5, z: -10, radius: 8 },
                personal: { x: 15, y: 5, z: -10, radius: 8 },
                system: { x: 0, y: 5, z: 15, radius: 8 }
            };
            
            // Create multiple folder instances organized by clusters
            for (let i = 0; i < this.config.world.objectCount; i++) {
                // Get file data first to determine cluster
                const randomFileData = this.fileData[Math.floor(Math.random() * this.fileData.length)];
                const cluster = randomFileData.cluster || 'misc';
                const clusterCenter = clusters[cluster] || { x: 0, y: 5, z: 0, radius: 12 };
                
                // Position within cluster with some randomness
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * clusterCenter.radius;
                const x = clusterCenter.x + Math.cos(angle) * distance;
                const y = clusterCenter.y + (Math.random() - 0.5) * 6; // Vertical spread
                const z = clusterCenter.z + Math.sin(angle) * distance;
                
                // Clone the folder model
                const folderInstance = folderModel.clone();
                
                // Create file data with some randomization to make each folder unique
                const fileData = {
                    ...randomFileData,
                    originalName: randomFileData.name,
                    // Add some randomization to make each folder unique
                    name: this.generateRandomFileName(randomFileData.name),
                    size: this.generateRandomFileSize(randomFileData.size),
                    files: Math.floor(randomFileData.files * (0.7 + Math.random() * 0.6)) // ±30% variation
                };
                
                // Calculate scale based on folder size (larger folders = bigger scale)
                const sizeInGB = this.parseSizeToGB(fileData.size);
                const baseScale = 6.0;
                const sizeMultiplier = Math.max(0.5, Math.min(2.0, sizeInGB / 10)); // Scale between 0.5x and 2.0x based on size
                const finalScale = baseScale * sizeMultiplier;
                
                // Scale the folder based on its size
                folderInstance.scale.setScalar(finalScale);
                
                // Position the folder
                folderInstance.position.set(x, y, z);
                
                // Add some random rotation for variety
                folderInstance.rotation.x = (Math.random() - 0.5) * 0.3;
                folderInstance.rotation.y = Math.random() * Math.PI * 2;
                folderInstance.rotation.z = (Math.random() - 0.5) * 0.2;
                
                // Assign the file data to the folder
                folderInstance.userData = fileData;
                
                // Add collision visualization (semi-transparent sphere) - scale with folder
                const collisionGeometry = new THREE.SphereGeometry(this.config.world.collisionDistance, 16, 8);
                const collisionMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff0000,        // Red color
                    transparent: true,
                    opacity: 0.2,           // Semi-transparent
                    wireframe: true         // Wireframe to see through
                });
                const collisionSphere = new THREE.Mesh(collisionGeometry, collisionMaterial);
                collisionSphere.position.copy(folderInstance.position);
                collisionSphere.scale.copy(folderInstance.scale); // Scale collision sphere with folder
                
                // Add to scene and arrays
                this.scene.add(folderInstance);
                this.scene.add(collisionSphere); // Add collision visualization
                this.folders.push(folderInstance);
                this.collisionSpheres.push(collisionSphere); // Store for toggle functionality
            }
            
            console.log(`✅ Created ${this.config.world.objectCount} folder instances from Folder.glb with random file data`);
            
            // Update combined objects array
            this.updateCombinedObjects();
            
        }, (progress) => {
            console.log('Loading Folder.glb progress:', (progress.loaded / progress.total * 100) + '%');
        }, (error) => {
            console.error('❌ Error loading Folder.glb:', error);
            console.log('📁 Falling back to procedural folder creation...');
            // Fallback to original method if GLB fails to load
            this.createFileFoldersOriginal();
        });
    }
    
    /**
     * Fallback method for folder creation if GLB loading fails
     */
    createFileFoldersOriginal() {
        // Define cluster centers (same as main method)
        const clusters = {
            work: { x: -15, y: 5, z: -10, radius: 8 },
            personal: { x: 15, y: 5, z: -10, radius: 8 },
            system: { x: 0, y: 5, z: 15, radius: 8 }
        };
        
        for (let i = 0; i < this.config.world.objectCount; i++) {
            // Get random file data first to determine cluster
            const randomFileData = this.fileData[Math.floor(Math.random() * this.fileData.length)];
            const cluster = randomFileData.cluster || 'misc';
            const clusterCenter = clusters[cluster] || { x: 0, y: 5, z: 0, radius: 12 };
            
            // Position within cluster with some randomness
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * clusterCenter.radius;
            const x = clusterCenter.x + Math.cos(angle) * distance;
            const y = clusterCenter.y + (Math.random() - 0.5) * 6; // Vertical spread
            const z = clusterCenter.z + Math.sin(angle) * distance;
            const fileData = {
                ...randomFileData,
                originalName: randomFileData.name,
                name: this.generateRandomFileName(randomFileData.name),
                size: this.generateRandomFileSize(randomFileData.size),
                files: Math.floor(randomFileData.files * (0.7 + Math.random() * 0.6)) // ±30% variation
            };
            
            // Calculate scale based on folder size
            const sizeInGB = this.parseSizeToGB(fileData.size);
            const baseScale = 6.0;
            const sizeMultiplier = Math.max(0.5, Math.min(2.0, sizeInGB / 10));
            const finalScale = baseScale * sizeMultiplier;
            
            const object = this.createCuteFolder(x, y, z, fileData.name, finalScale);
            
            // Assign file data to the folder
            object.userData = fileData;
            
            this.folders.push(object);
        }
        
        // Update combined objects array
        this.updateCombinedObjects();
    }

    /**
     * Fallback method for PDF creation if GLB loading fails
     */
    createPDFFilesOriginal() {
        // Define cluster centers (same as main method)
        const clusters = {
            work: { x: -12, y: 8, z: -8, radius: 6 },
            personal: { x: 18, y: 8, z: -8, radius: 6 },
            system: { x: 3, y: 8, z: 18, radius: 6 },
            misc: { x: -5, y: 8, z: 5, radius: 8 }
        };
        
        const pdfCount = Math.floor(this.config.world.objectCount * 0.4); // 40% of total objects are PDFs
        
        for (let i = 0; i < pdfCount; i++) {
            // Get random PDF data first to determine cluster
            const randomPdfData = this.pdfData[Math.floor(Math.random() * this.pdfData.length)];
            const cluster = randomPdfData.cluster || 'misc';
            const clusterCenter = clusters[cluster] || { x: 0, y: 8, z: 0, radius: 10 };
            
            // Position within cluster with some randomness
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * clusterCenter.radius;
            const x = clusterCenter.x + Math.cos(angle) * distance;
            const y = clusterCenter.y + (Math.random() - 0.5) * 4; // Vertical spread
            const z = clusterCenter.z + Math.sin(angle) * distance;
            const label = this.generateRandomPDFName(randomPdfData.name);
            
            const object = this.createCutePDF(x, y, z, label);
            
            // Assign PDF data to the object
            object.userData = {
                ...randomPdfData,
                originalName: randomPdfData.name,
                name: label,
                size: this.generateRandomFileSize(randomPdfData.size),
                pages: Math.floor(randomPdfData.pages * (0.7 + Math.random() * 0.6)) // ±30% variation
            };
            
            this.pdfs.push(object);
        }
        
        // Update the combined objects array for collision detection
        this.allObjects = [...this.folders, ...this.pdfs];
        
        console.log(`✅ Created ${pdfCount} fallback PDF instances with random file data`);
        
        // Create bubble streams for all objects now that both folders and PDFs are loaded
        this.createObjectBubbleStreams();
    }

    /**
     * Update the combined objects array for collision detection and selection
     */
    updateCombinedObjects() {
        this.allObjects = [...this.folders, ...this.pdfs];
    }

    /**
     * Create a rounded file folder
     */
    createCuteFolder(x, y, z, label, scale = 6.0) {
        const folderGroup = new THREE.Group();

        // Main folder body with smooth rounded corners - proper yellow color
        const folderGeometry = this.createRoundedBoxGeometry(1.6, 1.0, 0.3, 0.1);
        folderGeometry.computeVertexNormals(); // Smooth shading
        const folderMaterial = this.createSoftMaterial(0xffcc00, false, 1.0);
        
        const folderMesh = new THREE.Mesh(folderGeometry, folderMaterial);
        folderGroup.add(folderMesh);

        // Folder tab with rounded corners - positioned on left like classic folders
        const tabGeometry = this.createRoundedBoxGeometry(0.8, 0.3, 0.31, 0.08);
        tabGeometry.computeVertexNormals(); // Smooth shading
        const tabMesh = new THREE.Mesh(tabGeometry, folderMaterial);
        tabMesh.position.set(-0.4, 0.65, 0);
        folderGroup.add(tabMesh);

        // Add papers inside the folder (white sheets) - smooth appearance
        const paperMaterial = this.createSoftMaterial(0xf8f8f8, true, 0.9);
        
        // Multiple paper sheets slightly offset
        for (let i = 0; i < 3; i++) {
            const paperGeometry = new THREE.BoxGeometry(1.4, 0.02, 0.25, 4, 1, 4); // More segments for smoothness
            const paperMesh = new THREE.Mesh(paperGeometry, paperMaterial);
            paperMesh.position.set(0, 0.3 - (i * 0.05), (i * 0.02) - 0.01);
            folderGroup.add(paperMesh);
        }

        // Create text labels on both sides of folder tab
        // Front side label on tab
        // const labelMeshFront = this.createTextLabel(label, '#000000', 'transparent');
        // labelMeshFront.position.set(-0.4, 0.65, 0.16);
        // labelMeshFront.scale.set(1.4, 1.4, 1);
        // folderGroup.add(labelMeshFront);

        // // Back side label on tab (flipped)
        // const labelMeshBack = this.createTextLabel(label, '#000000', 'transparent');
        // labelMeshBack.position.set(-0.4, 0.65, -0.16);
        // labelMeshBack.scale.set(1.4, 1.4, 1);
        // labelMeshBack.rotation.y = Math.PI; // Rotate 180 degrees to face the other way
        // folderGroup.add(labelMeshBack);

        // Additional labels on main folder body for better visibility
        // Front body label
        const bodyLabelFront = this.createTextLabel(label, '#000000', 'rgba(255,204,0,0.1)');
        bodyLabelFront.position.set(0, 0, 0.16);
        bodyLabelFront.scale.set(1.2, 1.2, 1);
        folderGroup.add(bodyLabelFront);

        // Back body label
        const bodyLabelBack = this.createTextLabel(label, '#000000', 'rgba(255,204,0,0.1)');
        bodyLabelBack.position.set(0, 0, -0.16);
        bodyLabelBack.scale.set(1.2, 1.2, 1);
        bodyLabelBack.rotation.y = Math.PI;
        folderGroup.add(bodyLabelBack);

        // Side labels for left and right visibility
        // Left side label
     

        // Scale the folder based on size
        folderGroup.scale.setScalar(scale);
        
        // Position and rotate folder (less random rotation)
        folderGroup.position.set(x, y, z);
        folderGroup.rotation.x = (Math.random() - 0.5) * 0.2;
        folderGroup.rotation.y = Math.random() * Math.PI * 2;
        folderGroup.rotation.z = (Math.random() - 0.5) * 0.1;

        this.scene.add(folderGroup);
        return folderGroup;
    }

    /**
     * Create a rounded white document-shaped PDF file
     */
    createCutePDF(x, y, z, label) {
        const pdfGroup = new THREE.Group();

        // Main PDF body - white document with smooth rounded corners
        const pdfGeometry = this.createRoundedBoxGeometry(0.8, 1.1, 0.05, 0.08);
        pdfGeometry.computeVertexNormals(); // Smooth shading
        const pdfMaterial = this.createSoftMaterial(0xffffff, false, 1.0);
        
        const pdfMesh = new THREE.Mesh(pdfGeometry, pdfMaterial);
        pdfGroup.add(pdfMesh);

        // Add document lines (to make it look like a document) - smooth appearance
        const lineMaterial = this.createSoftMaterial(0xcccccc, true, 0.8);
        
        // Create several horizontal lines on the document
        for (let i = 0; i < 6; i++) {
            const lineGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.051, 4, 1, 1); // More segments for smoothness
            const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
            lineMesh.position.set(0, 0.3 - (i * 0.12), 0.001);
            pdfGroup.add(lineMesh);
        }

        // PDF corner fold (small rounded corner detail)
        const foldGeometry = new THREE.SphereGeometry(0.04, 8, 6); // Smaller, subtler fold
        const foldMaterial = this.createSoftMaterial(0xe8e8e8, false, 1.0);
        const foldMesh = new THREE.Mesh(foldGeometry, foldMaterial);
        foldMesh.position.set(0.32, 0.47, 0.026);
        pdfGroup.add(foldMesh);

        // Create text labels on both sides of the document
        // Front side label (bottom)
        const labelMeshFront = this.createTextLabel(label, '#333333', 'transparent');
        labelMeshFront.position.set(0, -0.35, 0.026);
        labelMeshFront.scale.set(1.2, 1.2, 1);
        pdfGroup.add(labelMeshFront);

        // Back side label (bottom, flipped)
        const labelMeshBack = this.createTextLabel(label, '#333333', 'transparent');
        labelMeshBack.position.set(0, -0.35, -0.026);
        labelMeshBack.scale.set(1.2, 1.2, 1);
        labelMeshBack.rotation.y = Math.PI; // Rotate 180 degrees to face the other way
        pdfGroup.add(labelMeshBack);

        // Additional labels in center of document for better visibility
        // Front center label
        const centerLabelFront = this.createTextLabel(label, '#666666', 'rgba(255,255,255,0.1)');
        centerLabelFront.position.set(0, 0.1, 0.026);
        centerLabelFront.scale.set(1.0, 1.0, 1);
        pdfGroup.add(centerLabelFront);

        // Back center label
        const centerLabelBack = this.createTextLabel(label, '#666666', 'rgba(255,255,255,0.1)');
        centerLabelBack.position.set(0, 0.1, -0.026);
        centerLabelBack.scale.set(1.0, 1.0, 1);
        centerLabelBack.rotation.y = Math.PI;
        pdfGroup.add(centerLabelBack);


        // Position and rotate PDF (less random rotation)
        pdfGroup.position.set(x, y, z);
        pdfGroup.rotation.x = (Math.random() - 0.5) * 0.2;
        pdfGroup.rotation.y = Math.random() * Math.PI * 2;
        pdfGroup.rotation.z = (Math.random() - 0.5) * 0.1;

        this.scene.add(pdfGroup);
        return pdfGroup;
    }

    /**
     * Create a box with smooth rounded appearance
     */
    createRoundedBoxGeometry(width, height, depth, radius) {
        // Try to use RoundedBoxGeometry if available (newer Three.js versions)
        if (THREE.RoundedBoxGeometry) {
            return new THREE.RoundedBoxGeometry(width, height, depth, 16, radius);
        }
        
        // Alternative: Create a rounded box using ExtrudeGeometry for better rounded corners
        if (radius > 0) {
            const shape = new THREE.Shape();
            const x = width / 2 - radius;
            const y = height / 2 - radius;
            
            shape.moveTo(-x, -y + radius);
            shape.lineTo(-x, y - radius);
            shape.quadraticCurveTo(-x, y, -x + radius, y);
            shape.lineTo(x - radius, y);
            shape.quadraticCurveTo(x, y, x, y - radius);
            shape.lineTo(x, -y + radius);
            shape.quadraticCurveTo(x, -y, x - radius, -y);
            shape.lineTo(-x + radius, -y);
            shape.quadraticCurveTo(-x, -y, -x, -y + radius);
            
            const extrudeSettings = {
                depth: depth,
                bevelEnabled: true,
                bevelSegments: 8,
                steps: 2,
                bevelSize: radius * 0.2,
                bevelThickness: radius * 0.2
            };
            
            return new THREE.ExtrudeGeometry(shape, extrudeSettings);
        }
        
        // Fallback: Create a highly segmented box for smoother appearance
        return new THREE.BoxGeometry(width, height, depth, 16, 16, 16);
    }

    /**
     * Create enhanced materials with better lighting for softer appearance
     */
    createSoftMaterial(color, transparent = false, opacity = 1.0) {
        return new THREE.MeshPhongMaterial({
            color: color,
            transparent: transparent,
            opacity: opacity,
            shininess: 30,      // Add some shine for softer look
            specular: 0x222222  // Subtle specular highlights
        });
    }

    /**
     * Create a text label using canvas texture
     */
    createTextLabel(text, textColor = '#ffffff', bgColor = '#000000') {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Background with rounded corners (with fallback)
        if (bgColor !== 'transparent') {
            context.fillStyle = bgColor;
            context.globalAlpha = bgColor.includes('rgba') ? 1.0 : 1.0; // Handle rgba colors
            context.beginPath();
            
            if (context.roundRect) {
                // Modern browsers
                context.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
            } else {
                // Fallback for older browsers
                context.rect(4, 4, canvas.width - 8, canvas.height - 8);
            }
            
            context.fill();
            context.globalAlpha = 1.0; // Reset alpha
        }
        
        // Text
        context.fillStyle = textColor;
        context.font = 'bold 28px Arial'; // Much bigger font
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Wrap text if too long
        const maxWidth = canvas.width - 20;
        const words = text.split(' ');
        let line = '';
        let y = canvas.height / 2;
        
        if (context.measureText(text).width <= maxWidth) {
            context.fillText(text, canvas.width / 2, y);
        } else {
            // Simple word wrapping
            const firstWord = words[0];
            const rest = words.slice(1).join(' ');
            context.fillText(firstWord, canvas.width / 2, y - 12);
            if (rest) {
                context.font = 'bold 22px Arial'; // Much bigger secondary font too
                context.fillText(rest, canvas.width / 2, y + 12);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });
        
        const labelGeometry = new THREE.PlaneGeometry(1.2, 0.3);
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);

        return labelMesh;
    }

    /**
     * Setup mouse and keyboard controls
     */
    setupControls() {
        // Mouse movement handler for frog rotation
        this.onMouseMove = (event) => {
            // Mouse look disabled - no pointer lock needed
        };

        // Mouse click handler - no pointer lock needed
        this.onMouseClick = () => {
            // Just handle regular mouse clicks for object selection
        };

        // Keyboard handlers
        this.onKeyDown = (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.movement.forward = true;
                    break;
                case 'KeyA':
                    this.movement.left = true;
                    break;
                case 'KeyS':
                    this.movement.backward = true;
                    break;
                case 'KeyD':
                    this.movement.right = true;
                    break;
                case 'ArrowUp':
                    this.movement.up = true;
                    break;
                case 'ArrowDown':
                    this.movement.down = true;
                    break;
                case 'Space':
                    event.preventDefault();
                    this.performDash();
                    break;
                case 'KeyC':
                    // Toggle collision visualization
                    this.toggleCollisionVisualization();
                    break;
                case 'KeyR':
                    // Reset camera position behind frog
                    this.resetCamera();
                    break;
                case 'KeyF':
                    // Toggle debug mode
                    this.toggleDebugMode();
                    break;
                case 'KeyM':
                    // Toggle multi-frog mode
                    this.toggleMultiFrogMode();
                    break;
                case 'KeyB':
                    // Debug: Print scene state
                    this.debugSceneState();
                    break;
                case 'KeyL':
                    // Toggle light config panel
                    this.toggleLightPanel();
                    break;
            }
        };

        this.onKeyUp = (event) => {
            switch (event.code) {
                case 'KeyW':
                    this.movement.forward = false;
                    break;
                case 'KeyA':
                    this.movement.left = false;
                    break;
                case 'KeyS':
                    this.movement.backward = false;
                    break;
                case 'KeyD':
                    this.movement.right = false;
                    break;
                case 'ArrowUp':
                    this.movement.up = false;
                    break;
                case 'ArrowDown':
                    this.movement.down = false;
                    break;
            }
        };
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        document.addEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.addEventListener('click', this.onMouseClick);
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);

        // Window resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Debug mode toggle
        this.debugMode = false;
        
        // Multi-frog mode
        this.multiFrogMode = false; // Toggle for multi-frog mode
        this.otherFrogs = []; // Array to store additional frogs
        this.frogNames = ['Bubbles', 'Splash', 'Ripple', 'Wave', 'Current']; // Names for the frogs
    }

    /**
     * Create additional frogs for multi-frog mode
     */
    createAdditionalFrogs() {
        if (!this.multiFrogMode) return;
        
        // Load the frog model 5 times for multi-frog mode
        for (let i = 0; i < 5; i++) {
            this.loader.load('./Frog_Swim.gltf', (gltf) => {
                const otherFrog = gltf.scene;
                
                // Make sure the frog is properly set up (exactly like main frog)
                otherFrog.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Ensure the frog is visible
                otherFrog.visible = true;
                
                // Scale the same as main frog (scale 2) - DO THIS FIRST before positioning
                otherFrog.scale.setScalar(2);
                
                // Calculate bounding box BEFORE positioning to get true local dimensions
                // Position at origin first
                otherFrog.position.set(0, 0, 0);
                
                const bbox = new THREE.Box3().setFromObject(otherFrog);
                const bboxHeight = bbox.max.y - bbox.min.y;
                const bboxCenter = new THREE.Vector3();
                bbox.getCenter(bboxCenter);
                
                // These are the local coordinates relative to the frog's origin (0,0,0)
                const localTop = bbox.max.y;
                const localBottom = bbox.min.y;
                const localCenter = bboxCenter.y;
                
                // NOW position the frog in world space - closer together
                const angle = (i / 5) * Math.PI * 2; // Evenly spaced around circle
                const radius = 18 + i * 6; // Closer spacing (18, 24, 30, 36, 42)
                const x = Math.cos(angle) * radius;
                const y = 10 + i * 3; // Different heights (10, 13, 16, 19, 22)
                const z = Math.sin(angle) * radius;
                
                otherFrog.position.set(x, y, z);
                otherFrog.rotation.y = Math.random() * Math.PI * 2; // Random rotation
                otherFrog.userData.isFrog = true;
                otherFrog.userData.frogIndex = i;
                
                // Add animation mixer for swimming animation (exactly like main frog)
                const mixer = new THREE.AnimationMixer(otherFrog);
                if (gltf.animations && gltf.animations.length > 0) {
                    const swimAction = mixer.clipAction(gltf.animations[0]);
                    swimAction.play();
                }
                
                // Create name label positioned just above the actual top of the frog
                const nameLabel = this.createFrogNameLabel(this.frogNames[i]);
                nameLabel.position.set(0, localTop - 0.5, 0); // Just above the top
                otherFrog.add(nameLabel);
                
                console.log(`Added frog ${i} to scene at position:`, otherFrog.position);
                
                // Store frog data
                // IMPORTANT: Use mesh.position directly as reference, don't create separate position!
                const frogData = {
                    mesh: otherFrog,
                    mixer: mixer,
                    name: this.frogNames[i],
                    nameLabel: nameLabel,
                    position: otherFrog.position, // Use mesh position directly (reference, not copy!)
                    velocity: new THREE.Vector3(),
                    acceleration: new THREE.Vector3(), // For steering behaviors
                    target: null, // Will be set when folder is selected
                    speed: 3.0 + Math.random() * 2.0, // Random speed between 3-5
                    maxForce: 2.0, // Maximum steering force
                    separationRadius: 4.0, // Distance to start avoiding other frogs
                    minSeparation: 1.5, // Minimum safe distance - hard boundary (just prevent overlap)
                    isMoving: false
                };
                
                this.otherFrogs.push(frogData);
                this.scene.add(otherFrog);
                
                console.log(`Frog ${i} added to scene. Total frogs in scene:`, this.scene.children.filter(child => child.userData.isFrog).length);
                
                // Log completion for this frog
                console.log(`🐸 Frog ${i} (${this.frogNames[i]}) created and added to scene!`);
            });
        }
    }

    /**
     * Create a name label for a frog
     */
    createFrogNameLabel(name) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.fillStyle = '#ffffff';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, canvas.width / 2, canvas.height / 2);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        
        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(2, 0.5);
        const label = new THREE.Mesh(geometry, material);
        
        return label;
    }

    /**
     * Update additional frogs movement and animation
     */
    updateAdditionalFrogs(delta) {
        if (!this.multiFrogMode) return;
        
        // Debug: Check for overlapping frogs every frame
        this.checkAndLogOverlaps();
        
        this.otherFrogs.forEach((frogData, index) => {
            // Update animation mixer
            if (frogData.mixer) {
                frogData.mixer.update(delta);
            }
            
            // Update movement if targeting a folder
            if (frogData.target && frogData.isMoving) {
                this.updateFrogMovement(frogData, delta);
            }
            
            // Update name label to always face camera
            if (frogData.nameLabel) {
                frogData.nameLabel.lookAt(this.camera.position);
            }
        });
    }
    
    /**
     * Check and log when frogs are overlapping
     */
    checkAndLogOverlaps() {
        // Only log every 30 frames to avoid spam
        if (!this.overlapCheckFrame) this.overlapCheckFrame = 0;
        this.overlapCheckFrame++;
        if (this.overlapCheckFrame % 30 !== 0) return;
        
        let overlappingPairs = [];
        
        // Check each frog pair
        for (let i = 0; i < this.otherFrogs.length; i++) {
            const frogA = this.otherFrogs[i];
            
            // Check against player
            const distToPlayer = frogA.position.distanceTo(this.frogPosition);
            if (distToPlayer < frogA.minSeparation) {
                overlappingPairs.push(`${frogA.name} <-> Player (dist: ${distToPlayer.toFixed(2)})`);
            }
            
            // Check against other frogs
            for (let j = i + 1; j < this.otherFrogs.length; j++) {
                const frogB = this.otherFrogs[j];
                const distance = frogA.position.distanceTo(frogB.position);
                
                if (distance < frogA.minSeparation) {
                    overlappingPairs.push(`${frogA.name} <-> ${frogB.name} (dist: ${distance.toFixed(2)})`);
                }
            }
        }
        
        if (overlappingPairs.length > 0) {
            console.warn('⚠️ FROGS OVERLAPPING:', overlappingPairs);
        }
    }

    /**
     * Update individual frog movement towards target using steering behaviors
     */
    updateFrogMovement(frogData, delta) {
        if (!frogData.target) return;
        
        // Check if too close to any frog - if so, ONLY do separation
        const tooClose = this.checkMinimumSeparation(frogData);
        
        // Reset acceleration
        frogData.acceleration.set(0, 0, 0);
        
        if (tooClose) {
            // EMERGENCY: Only separate, don't seek target
            const separationForce = this.calculateSeparation(frogData);
            separationForce.multiplyScalar(1.5); // Gentle emergency separation
            frogData.acceleration.add(separationForce);
        } else {
            // Normal movement: seek target and maintain separation

            // 1. SEEK BEHAVIOR - Move towards target
            const seekForce = this.calculateSeek(frogData, frogData.target.position);
            seekForce.multiplyScalar(1.0); // Seek weight
            frogData.acceleration.add(seekForce);

            // 2. SEPARATION BEHAVIOR - Avoid other frogs
            const separationForce = this.calculateSeparation(frogData);
            separationForce.multiplyScalar(0.8); // Light separation, allow close proximity
            frogData.acceleration.add(separationForce);
        }
        
        // 3. Apply acceleration to velocity
        frogData.velocity.add(frogData.acceleration.multiplyScalar(delta));
        
        // Limit velocity to max speed
        if (frogData.velocity.length() > frogData.speed) {
            frogData.velocity.normalize().multiplyScalar(frogData.speed);
        }
        
        // 4. Update position
        const displacement = frogData.velocity.clone().multiplyScalar(delta);
        const newPosition = frogData.position.clone().add(displacement);
        
        // 5. Verify new position doesn't cause overlap
        if (!this.wouldCauseOverlap(frogData, newPosition)) {
            // frogData.position is a reference to mesh.position, so updating it updates the mesh
            frogData.position.copy(newPosition);
        } else {
            // Position would cause overlap - don't move, just slow down
            frogData.velocity.multiplyScalar(0.5);
        }
        
        // 6. Check if reached target (closer now that separation is reduced)
        const distanceToTarget = frogData.position.distanceTo(frogData.target.position);
        if (distanceToTarget < 5.0) {
            frogData.isMoving = false;
            frogData.target = null;
            frogData.velocity.set(0, 0, 0); // Stop moving
            return;
        }
        
        // 7. Rotate to face movement direction
        if (frogData.velocity.length() > 0.1) {
            const angle = Math.atan2(frogData.velocity.x, frogData.velocity.z);
            frogData.mesh.rotation.y = angle;
        }
    }
    
    /**
     * Check if frog is too close to another frog (below minimum safe distance)
     */
    checkMinimumSeparation(frogData) {
        // Check distance to player frog
        if (frogData.position.distanceTo(this.frogPosition) < frogData.minSeparation) {
            return true;
        }
        
        // Check distance to other frogs
        for (const otherFrog of this.otherFrogs) {
            if (otherFrog === frogData) continue;
            if (frogData.position.distanceTo(otherFrog.position) < frogData.minSeparation) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Check if a new position would cause overlap with other frogs
     */
    wouldCauseOverlap(frogData, newPosition) {
        const minDistance = frogData.minSeparation;
        
        // Check against player frog
        if (newPosition.distanceTo(this.frogPosition) < minDistance) {
            return true;
        }
        
        // Check against other frogs
        for (const otherFrog of this.otherFrogs) {
            if (otherFrog === frogData) continue;
            if (newPosition.distanceTo(otherFrog.position) < minDistance) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Calculate seek steering force towards a target
     */
    calculateSeek(frogData, targetPosition) {
        const desired = new THREE.Vector3()
            .subVectors(targetPosition, frogData.position)
            .normalize()
            .multiplyScalar(frogData.speed);
        
        const steer = new THREE.Vector3()
            .subVectors(desired, frogData.velocity)
            .clampLength(0, frogData.maxForce);
        
        return steer;
    }
    
    /**
     * Calculate separation steering force to avoid other frogs
     * Uses inverse square law: force gets exponentially stronger as frogs get closer
     */
    calculateSeparation(frogData) {
        const steer = new THREE.Vector3();
        let count = 0;

        // Check separation from player frog
        const distanceToPlayer = frogData.position.distanceTo(this.frogPosition);
        if (distanceToPlayer < frogData.separationRadius && distanceToPlayer > 0.01) {
            // Linear falloff - gentler than inverse square
            const repulsionStrength = 1.0 - (distanceToPlayer / frogData.separationRadius);

            const diff = new THREE.Vector3()
                .subVectors(frogData.position, this.frogPosition)
                .normalize()
                .multiplyScalar(repulsionStrength);
            steer.add(diff);
            count++;
        }

        // Check separation from other frogs
        for (const otherFrog of this.otherFrogs) {
            if (otherFrog === frogData) continue; // Skip self

            const distance = frogData.position.distanceTo(otherFrog.position);
            if (distance < frogData.separationRadius && distance > 0.01) {
                // Linear falloff - gentler repulsion
                const repulsionStrength = 1.0 - (distance / frogData.separationRadius);

                const diff = new THREE.Vector3()
                    .subVectors(frogData.position, otherFrog.position)
                    .normalize()
                    .multiplyScalar(repulsionStrength);
                steer.add(diff);
                count++;
            }
        }

        // Average the steering force
        if (count > 0) {
            steer.divideScalar(count);
            if (steer.length() > 0) {
                steer.normalize().multiplyScalar(frogData.speed * 0.5); // Half speed for gentle avoidance
                steer.sub(frogData.velocity);
                steer.clampLength(0, frogData.maxForce); // Normal max force
            }
        }

        return steer;
    }

    /**
     * Make all frogs swim towards a selected folder
     */
    makeFrogsSwimToFolder(folder) {
        if (!this.multiFrogMode) return;
        
        this.otherFrogs.forEach((frogData) => {
            frogData.target = folder;
            frogData.isMoving = true;
        });
        
        console.log(`🐸 All frogs swimming towards: ${folder.userData.name}`);
    }

    /**
     * Debug: Print current scene state
     */
    debugSceneState() {
        console.log('=== SCENE DEBUG STATE ===');
        console.log('Multi-frog mode:', this.multiFrogMode);
        console.log('Other frogs array length:', this.otherFrogs.length);
        
        const frogsInScene = this.scene.children.filter(child => child.userData.isFrog);
        console.log('Frogs in scene:', frogsInScene.length);
        frogsInScene.forEach((frog, index) => {
            console.log(`  Frog ${index}:`, {
                position: frog.position,
                userData: frog.userData,
                visible: frog.visible
            });
        });
        
        const debugObjects = this.scene.children.filter(child => 
            child.userData.isDebugSphere || child.userData.isMainFrogDebug || child.userData.isTestCube
        );
        console.log('Debug objects in scene:', debugObjects.length);
        debugObjects.forEach((obj, index) => {
            console.log(`  Debug object ${index}:`, {
                position: obj.position,
                userData: obj.userData,
                color: obj.material.color.getHexString(),
                type: obj.userData.isDebugSphere ? 'sphere' : obj.userData.isTestCube ? 'cube' : 'main frog'
            });
        });
        
        console.log('Total scene children:', this.scene.children.length);
        console.log('========================');
    }

    /**
     * Toggle multi-frog mode
     */
    toggleMultiFrogMode() {
        this.multiFrogMode = !this.multiFrogMode;
        console.log('Multi-frog mode:', this.multiFrogMode ? 'ON' : 'OFF');
        
        if (this.multiFrogMode) {
            console.log('Creating additional frogs...');
            this.createAdditionalFrogs();
        } else {
            console.log('Removing additional frogs...');
            // Remove all additional frogs
            this.otherFrogs.forEach((frogData) => {
                this.scene.remove(frogData.mesh);
            });
            this.otherFrogs = [];
            
            // Remove debug spheres, test cubes, placeholder frogs, and test boxes
            const debugObjects = this.scene.children.filter(child => 
                child.userData.isDebugSphere || child.userData.isMainFrogDebug || 
                child.userData.isTestCube || child.userData.isPlaceholderFrog ||
                child.userData.isTestBox
            );
            debugObjects.forEach(obj => {
                this.scene.remove(obj);
            });
            console.log(`Removed ${debugObjects.length} debug objects`);
        }
    }

    /**
     * Handle collision detection with floating objects
     */
    checkCollisions() {
        if (!this.frog) return;
        
        const frogPosition = this.frog.position;
        const collisionDistance = this.config.world.collisionDistance;

        this.allObjects.forEach(object => {
            const distance = frogPosition.distanceTo(object.position);
            if (distance < collisionDistance && distance > 0.1) { // Avoid division by zero and very close objects
                // Calculate push force proportional to how close we are (stronger when closer)
                const pushStrength = (collisionDistance - distance) / collisionDistance;
                const maxPushForce = 0.05; // Very gentle push force to prevent random turning
                const pushForce = pushStrength * maxPushForce;
                
                // Push frog away from object
                const pushDirection = new THREE.Vector3();
                pushDirection.subVectors(frogPosition, object.position);
                pushDirection.normalize();
                pushDirection.multiplyScalar(pushForce);
                
                // Apply to velocity instead of position for smoother movement
                this.velocity.add(pushDirection);
                
                // Very gentle damping to prevent excessive bouncing
                this.velocity.multiplyScalar(0.99); // Minimal damping
            }
        });
    }

    /**
     * Update frog movement based on input
     */
    updateMovement(delta) {
        if (!this.frog) return;

        // Check if there's any horizontal movement input (WASD)
        const hasHorizontalInput = this.movement.forward || this.movement.backward || this.movement.left || this.movement.right;
        
        // Apply smooth deceleration with different friction rates
        if (hasHorizontalInput) {
            // Gentle friction when actively swimming - maintains momentum
            this.velocity.x -= this.velocity.x * this.config.movement.friction * delta * 0.2;
            this.velocity.z -= this.velocity.z * this.config.movement.friction * delta * 0.2;
        } else {
            // Smooth, natural deceleration when not actively swimming
            // Use a more gradual friction curve for realistic underwater movement
            const decelerationRate = this.config.movement.friction * 0.6; // Even smoother deceleration
            this.velocity.x -= this.velocity.x * decelerationRate * delta;
            this.velocity.z -= this.velocity.z * decelerationRate * delta;
            
            // Add subtle underwater resistance for more realistic feel
            const underwaterResistance = 0.3;
            this.velocity.x -= this.velocity.x * underwaterResistance * delta;
            this.velocity.z -= this.velocity.z * underwaterResistance * delta;
        }

        // Apply gentle friction to vertical velocity for smooth up/down movement
        this.velocity.y -= this.velocity.y * (this.config.movement.friction * 0.5) * delta;

        // Calculate movement direction based on camera orientation (camera-relative controls)
        this.direction.set(0, 0, 0);
        
        if (this.movement.forward) this.direction.z -= 1;  // Move away from camera
        if (this.movement.backward) this.direction.z += 1; // Move toward camera  
        if (this.movement.left) this.direction.x -= 1;     // Move left relative to camera
        if (this.movement.right) this.direction.x += 1;    // Move right relative to camera
        
        this.direction.normalize();

        // Apply forces based on movement with momentum preservation
        if (hasHorizontalInput) {
            // Transform movement direction by camera's current orientation
            const cameraQuaternion = this.camera.quaternion.clone();
            const moveVector = this.direction.clone();
            moveVector.applyQuaternion(cameraQuaternion);
            
            // Add movement force while preserving existing momentum
            const movementForce = moveVector.multiplyScalar(this.config.movement.speed * delta);
            this.velocity.add(movementForce);
        }
        
        // Vertical movement (up/down arrows) with smooth acceleration
        if (this.movement.up) {
            this.velocity.y += this.config.movement.verticalSpeed * delta;
        }
        if (this.movement.down) {
            this.velocity.y -= this.config.movement.verticalSpeed * delta;
        }
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= delta;
        }

        // Apply velocity to frog position
        this.frog.position.add(this.velocity.clone().multiplyScalar(delta));

        // Clamp frog position to tank bounds
        const tank = this.config.tank;
        this.frog.position.x = Math.max(-tank.width, Math.min(tank.width, this.frog.position.x));
        this.frog.position.z = Math.max(-tank.width, Math.min(tank.width, this.frog.position.z));
        this.frog.position.y = Math.max(tank.floorY + 5, Math.min(tank.ceilingY, this.frog.position.y));

        this.frogPosition.copy(this.frog.position);

        // Handle rotation based on user input direction, not just velocity
        if (hasHorizontalInput) {
            // Calculate target rotation based on user input direction (camera-relative)
            const inputDirection = this.direction.clone();
            inputDirection.applyQuaternion(this.camera.quaternion);
            
            // Only rotate if there's significant input movement
            if (inputDirection.length() > 0.1) {
                const targetRotationY = Math.atan2(inputDirection.x, inputDirection.z);
                const currentY = this.frog.rotation.y;
                let diff = targetRotationY - currentY;
                
                // Handle angle wrapping for shortest rotation path
                if (Math.abs(diff) > Math.PI) {
                    diff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
                }
                
                // Smooth rotation towards input direction
                const rotationSpeed = 8.0; // Responsive but not too fast
                this.frog.rotation.y += diff * rotationSpeed * delta;
            }
        } else if (this.velocity.length() > 0.3) {
            // Only use velocity-based rotation when moving significantly and no input
            // This prevents random turning from collision forces
            const velocityDirection = this.velocity.clone().normalize();
            const targetRotationY = Math.atan2(velocityDirection.x, velocityDirection.z);
            
            const currentY = this.frog.rotation.y;
            let diff = targetRotationY - currentY;
            
            // Handle angle wrapping for shortest rotation path
            if (Math.abs(diff) > Math.PI) {
                diff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
            }
            
            // Much slower rotation when not actively steering
            const rotationSpeed = 2.0; // Very slow to prevent random turning
            this.frog.rotation.y += diff * rotationSpeed * delta;
        }
    }

    /**
     * Update frog animations based on movement
     */
    updateFrogAnimation(delta) {
        if (!this.frog) return;

        const isMoving = Object.values(this.movement).some(moving => moving);
        
        // Only advance swim time when moving
        if (isMoving) {
            this.swimTime += delta;
        }

        // Update animation mixer only when moving
        if (this.frogMixer) {
            if (isMoving) {
                this.frogMixer.update(delta);
            } else {
                // Pause the animation when not moving (don't update the mixer)
                // This freezes the frog on the current animation frame
            }
        }
        
        if (isMoving) {
            // Add subtle bobbing motion while swimming
            const bobSpeed = this.config.swimming.strokeSpeed * 2;
            const bobAmplitude = 0.05;
            
            this.frog.position.y += Math.sin(this.swimTime * bobSpeed) * bobAmplitude * delta;
        } else {
            // Gentle floating motion when idle
            const floatSpeed = this.config.swimming.floatSpeed;
            const floatAmplitude = 0.02;
            
            this.frog.position.y += Math.sin(this.swimTime * floatSpeed) * floatAmplitude * delta;
        }
        
        // Update frog position reference
        this.frogPosition.copy(this.frog.position);
    }

    /**
     * Update environmental animations (particles, folders, caustics)
     */
    updateEnvironment() {
        // Animate water particles
        if (this.particles) {
            this.particles.rotation.y += 0.001;
            const positions = this.particles.geometry.attributes.position.array;
            
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += 0.01; // Move particles upward
                if (positions[i] > 100) positions[i] = -100; // Reset when too high
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        // Animate floating objects (slower rotation)
        this.allObjects.forEach((object, index) => {
            object.rotation.y += 0.001 + (index * 0.0002); // Much slower spinning
            object.position.y += Math.sin(this.swimTime + index) * 0.01;
        });

        // Animate caustics lighting effects
        this.updateCausticsAnimation();
        
        // Animate sand floor waves
        this.updateSandFloorAnimation();
        
        // Animate object bubble streams
        this.updateObjectBubbleStreams();
    }

    /**
     * Main animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();

        // Update all systems
        this.updateMovement(delta);
        this.updateFrogAnimation(delta);
        this.updateAdditionalFrogs(delta);
        this.updateCameraPosition();
        this.updateBubbleTrail(delta);
        this.updateObjectSelection();
        this.updateEnvironment();
        this.checkCollisions();
        this.checkObjectVisibility();

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Toggle collision sphere visualization on/off
     */
    toggleCollisionVisualization() {
        this.collisionSpheres.forEach(sphere => {
            sphere.visible = !sphere.visible;
        });
        
        const status = this.collisionSpheres.length > 0 && this.collisionSpheres[0].visible ? 'ON' : 'OFF';
        console.log(`🔍 Collision visualization: ${status}`);
    }

    /**
     * Reset camera offset to be behind frog based on frog's current facing direction
     * while maintaining the same relative distance and height
     */
    resetCamera() {
        if (!this.frog) return;
        
        // Calculate current camera distance and height relative to frog
        const currentCameraPos = this.camera.position.clone();
        const frogPos = this.frog.position.clone();
        const currentOffset = currentCameraPos.sub(frogPos);
        
        // Get current distance (horizontal) and height
        const currentDistance = Math.sqrt(currentOffset.x * currentOffset.x + currentOffset.z * currentOffset.z);
        const currentHeight = currentOffset.y;
        
        // Get the frog's current facing direction
        const frogDirection = new THREE.Vector3(0, 0, 1); // Default forward direction
        frogDirection.applyQuaternion(this.frog.quaternion);
        
        // Set the new offset to be behind the frog's current facing direction
        // using the same distance and height as before
        this.cameraOffset = frogDirection.multiplyScalar(-currentDistance); // Behind frog
        this.cameraOffset.y = currentHeight; // Same height as before
        
        console.log(`📷 Camera offset reset behind frog (distance: ${currentDistance.toFixed(1)}, height: ${currentHeight.toFixed(1)})`);
    }

    /**
     * Check for nearby objects and highlight the closest one
     */
    updateObjectSelection() {
        if (!this.frog) return;

        const frogPosition = this.frog.position;
        const selectionDistance = this.config.world.selectionDistance;
        
        let bestObject = null;
        let bestScore = -Infinity;
        let debugInfo = [];

        // Create debug visualization if debug mode is on
        if (this.debugMode) {
            this.createDebugVisualization(frogPosition, selectionDistance);
        }

                 // Find the best object based on camera-relative position and distance
         this.allObjects.forEach((object, index) => {
             const distance = frogPosition.distanceTo(object.position);
             
             // Skip objects that are too far away
             if (distance > selectionDistance) return;
             
             // Project object position to screen coordinates to check if it's in front of camera
             const objectScreenPos = object.position.clone().project(this.camera);
             
             // Skip objects behind the camera
             if (objectScreenPos.z > 1) return;
             
             // Calculate height difference (positive = above frog, negative = below frog)
             const heightDifference = object.position.y - frogPosition.y;
             
             // Heavily penalize objects that are significantly below the frog
             // Only allow objects that are at most 2 units below the frog
             if (heightDifference < -2.0) return;
             
             // Calculate camera-relative position
             const cameraDirection = new THREE.Vector3();
             this.camera.getWorldDirection(cameraDirection);
             
             // Vector from frog to object
             const frogToObject = object.position.clone().sub(frogPosition);
             
             // Check if object is in front of frog relative to camera direction
             const dotProduct = frogToObject.dot(cameraDirection);
             
             // Calculate score based on:
             // 1. Distance (closer is better)
             // 2. Being in front of frog relative to camera (positive dot product)
             // 3. Being above frog (positive Y difference) - HEAVILY weighted
             const distanceScore = (selectionDistance - distance) / selectionDistance; // 0 to 1, closer is better
             const frontScore = Math.max(0, dotProduct / distance); // Positive if in front
             
             // Heavily penalize objects below the frog
             let heightScore;
             if (heightDifference > 0) {
                 // Object is above frog - reward it
                 heightScore = Math.min(1.0, heightDifference / 5); // Cap at 1.0, more sensitive
             } else {
                 // Object is below frog - heavily penalize it
                 heightScore = Math.max(-2.0, heightDifference / 2); // Strong negative penalty
             }
             
             // Weight the scores to heavily favor objects above and in front
             const totalScore = distanceScore * 0.2 + frontScore * 0.3 + heightScore * 0.5;
            
            // Store debug info
            debugInfo.push({
                object: object,
                distance: distance,
                dotProduct: dotProduct,
                yDifference: heightDifference,
                distanceScore: distanceScore,
                frontScore: frontScore,
                heightScore: heightScore,
                totalScore: totalScore,
                screenPos: objectScreenPos
            });
            
            if (totalScore > bestScore) {
                bestObject = object;
                bestScore = totalScore;
            }
        });

        // Update debug display if debug mode is on
        if (this.debugMode) {
            this.updateDebugDisplay(debugInfo, bestObject, bestScore);
        }

        // Update selection if changed
        if (bestObject !== this.selectedObject) {
            this.removeSelectionBorder();
            this.selectedObject = bestObject;
            
            if (this.selectedObject) {
                this.createSelectionBorder();
                this.showFileInfo();
                // Make frogs swim to selected folder in multi-frog mode
                this.makeFrogsSwimToFolder(this.selectedObject);
            } else {
                this.hideFileInfo();
            }
        }

        // Animate the selection border (pulsing effect and follow object movement)
        if (this.selectionBorder && this.selectedObject) {
            const time = Date.now() * 0.003; // Pulsing speed
            
            // Update position and rotation to match the animated object
            this.selectionBorder.position.copy(this.selectedObject.position);
            this.selectionBorder.rotation.copy(this.selectedObject.rotation);
            
            // Reset to base scale (object scale * 1.2) then apply pulse
            const baseScale = this.selectedObject.scale.clone().multiplyScalar(1.2);
            const pulseMultiplier = 1.0 + Math.sin(time) * 0.08; // Slightly more visible pulse
            this.selectionBorder.scale.copy(baseScale).multiplyScalar(pulseMultiplier);
            
            // Also pulse the opacity for all outline materials
            const opacityPulse = 0.8 + Math.sin(time * 2) * 0.2; // Between 0.6 and 1.0
            this.selectionBorder.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = opacityPulse;
                }
            });
            
            // Update file info panel position to follow the object
            if (this.fileInfoPanel && this.fileInfoPanel.classList.contains('visible')) {
                this.positionFileInfoNearObject();
            }
        }
    }

    /**
     * Create selection border that traces around the selected object's shape
     */
    createSelectionBorder() {
        if (!this.selectedObject) return;

        // Create a group to hold all outline meshes
        this.selectionBorder = new THREE.Group();
        
        // Traverse the object model and create outline for each mesh
        this.selectedObject.traverse((child) => {
            if (child.isMesh && child.geometry) {
                // Create edges geometry from the mesh
                const edges = new THREE.EdgesGeometry(child.geometry);
                
                // Use different colors for different object types
                const borderColor = this.selectedObject.userData.type === 'pdf' ? 0x00ffff : 0x00ff00; // Cyan for PDFs, Green for folders
                
                const outlineMaterial = new THREE.LineBasicMaterial({
                    color: borderColor,
                    transparent: true,
                    opacity: 1.0,
                    linewidth: 4          // Thicker lines for better visibility
                });
                
                const outlineWireframe = new THREE.LineSegments(edges, outlineMaterial);
                
                // Copy the mesh's transform
                outlineWireframe.position.copy(child.position);
                outlineWireframe.rotation.copy(child.rotation);
                outlineWireframe.scale.copy(child.scale);
                
                this.selectionBorder.add(outlineWireframe);
            }
        });

        // Position the border group to match the object
        this.selectionBorder.position.copy(this.selectedObject.position);
        this.selectionBorder.rotation.copy(this.selectedObject.rotation);
        this.selectionBorder.scale.copy(this.selectedObject.scale);
        
        // Apply additional scaling to make the border larger than the object
        this.selectionBorder.scale.multiplyScalar(1.2); // 20% larger for clear visibility
        
        this.scene.add(this.selectionBorder);
    }

    /**
     * Remove the current selection border
     */
    removeSelectionBorder() {
        if (this.selectionBorder) {
            // Dispose of all child geometries and materials
            this.selectionBorder.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            
            this.scene.remove(this.selectionBorder);
            this.selectionBorder = null;
        }
    }

        /**
     * Show file information panel for the selected object
     */
    showFileInfo() {
        if (!this.selectedObject || !this.selectedObject.userData) {
            console.log('showFileInfo: No selected object or userData');
            return;
        }
        
        const fileData = this.selectedObject.userData;
        console.log('showFileInfo: Showing info for', fileData.name, fileData.type);
        
        // Create or update the file info panel
        if (!this.fileInfoPanel) {
            this.fileInfoPanel = document.createElement('div');
            this.fileInfoPanel.id = 'fileInfoPanel';
            this.fileInfoPanel.className = 'file-info-panel';
            document.body.appendChild(this.fileInfoPanel);
        }
        
        // Determine icon and display content based on object type
        const icon = fileData.type === 'pdf' ? '📄' : '📁';
        const extraInfo = fileData.type === 'pdf' ? 
            `<div class="file-info-row">
                <span class="file-label">Pages:</span>
                <span class="file-value">${fileData.pages}</span>s 
            </div>` :
            `<div class="file-info-row">
                <span class="file-label">Files:</span>
                <span class="file-value">${fileData.files}</span>
            </div>`;
        
        // Update the content
        this.fileInfoPanel.innerHTML = `
            <div class="file-info-header">
                <span class="file-name">${fileData.name}</span>
            </div>
            <div class="file-info-details">
               
                <div class="file-info-row">
                    <span class="file-label">Size:</span>
                    <span class="file-value">${fileData.size}</span>
                </div>
                ${extraInfo}
            </div>
        `;
        
        // Position the panel near the selected object on screen
        this.positionFileInfoNearObject();
        
        // Show the panel with animation
        this.fileInfoPanel.style.display = 'block';
        setTimeout(() => {
            this.fileInfoPanel.classList.add('visible');
        }, 10);
    }

    /**
     * Position the file info panel near the selected object on screen
     */
    positionFileInfoNearObject() {
        if (!this.selectedObject || !this.fileInfoPanel) return;
        
        // Get the object's position in 3D space
        const objectPosition = this.selectedObject.position.clone();
        
        // Project the 3D position to 2D screen coordinates
        const screenPosition = objectPosition.clone().project(this.camera);
        
        // Check if object is behind camera (z > 1 means behind)
        if (screenPosition.z > 1) {
            // Hide panel if object is behind camera
            this.fileInfoPanel.style.opacity = '0';
            return;
        }
        
        // Convert to screen pixel coordinates
        const screenX = (screenPosition.x + 1) * window.innerWidth / 2;
        const screenY = (-screenPosition.y + 1) * window.innerHeight / 2;
        
        // Calculate panel dimensions (match actual CSS)
        const panelWidth = 220; // Match CSS max-width
        const panelHeight = 120; // Approximate height for compact design
        
        // Smart positioning to avoid blocking the frog (center of screen)
        let left, top;
        
        // Calculate distance from screen center (where frog is)
        const screenCenterX = window.innerWidth / 2;
        const distanceFromCenter = Math.abs(screenX - screenCenterX);
        
        // Prefer positioning away from center to avoid blocking frog
        if (screenX < screenCenterX) {
            // Object is on left side, place panel to the left (further from center)
            left = screenX - panelWidth - 30;
        } else {
            // Object is on right side, place panel to the right (further from center)
            left = screenX + 30;
        }
        
        // If object is very close to center, force panel to one side
        if (distanceFromCenter < 100) {
            // Object is near center, place panel on the side with more space
            const leftSpace = screenX;
            const rightSpace = window.innerWidth - screenX;
            
            if (leftSpace > rightSpace) {
                // More space on left, place panel to the left
                left = screenX - panelWidth - 30;
            } else {
                // More space on right, place panel to the right
                left = screenX + 30;
            }
        }
        
        // Center panel vertically on object
        top = screenY - panelHeight / 2;
        
        // Ensure panel stays within screen bounds
        if (left < 20) {
            left = 20;
        } else if (left + panelWidth > window.innerWidth - 20) {
            left = window.innerWidth - panelWidth - 20;
        }
        
        if (top < 20) {
            top = 20;
        } else if (top + panelHeight > window.innerHeight - 20) {
            top = window.innerHeight - panelHeight - 20;
        }
        
        // Apply positioning and ensure visibility
        this.fileInfoPanel.style.left = `${left}px`;
        this.fileInfoPanel.style.top = `${top}px`;
        this.fileInfoPanel.style.right = 'auto'; // Override CSS right positioning
        this.fileInfoPanel.style.opacity = '1'; // Ensure panel is visible
    }

    /**
     * Hide the file information panel
     */
    hideFileInfo() {
        if (this.fileInfoPanel) {
            this.fileInfoPanel.classList.remove('visible');
            setTimeout(() => {
                this.fileInfoPanel.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Check if selected object is still visible on screen and reposition if needed
     */
    checkObjectVisibility() {
        if (!this.selectedObject || !this.fileInfoPanel || !this.fileInfoPanel.classList.contains('visible')) {
            return;
        }
        
        // Get current object position on screen
        const objectPosition = this.selectedObject.position.clone();
        const screenPosition = objectPosition.clone().project(this.camera);
        
        // Check if object is behind camera or off-screen
        if (screenPosition.z > 1 || 
            screenPosition.x < -1.5 || screenPosition.x > 1.5 || 
            screenPosition.y < -1.5 || screenPosition.y > 1.5) {
            
            // Object is off-screen, hide the panel
            this.hideFileInfo();
        }
    }



    /**
     * Create debug visualization for selection system
     */
    createDebugVisualization(frogPosition, selectionDistance) {
        // Remove existing debug elements
        this.removeDebugVisualization();
        
        // Create selection sphere
        const sphereGeometry = new THREE.SphereGeometry(selectionDistance, 16, 12);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.1,
            wireframe: true
        });
        this.debugSelectionSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.debugSelectionSphere.position.copy(frogPosition);
        this.scene.add(this.debugSelectionSphere);
        
        // Create camera direction arrow
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        const arrowGeometry = new THREE.ConeGeometry(0.2, 2, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.debugCameraArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.debugCameraArrow.position.copy(frogPosition);
        this.debugCameraArrow.lookAt(frogPosition.clone().add(cameraDirection.multiplyScalar(3)));
        this.scene.add(this.debugCameraArrow);
        
        // Create debug info panel
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'debugPanel';
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            max-width: 300px;
            max-height: 400px;
            overflow-y: auto;
        `;
        document.body.appendChild(this.debugPanel);
    }
    
    /**
     * Update debug display with current selection info
     */
    updateDebugDisplay(debugInfo, bestObject, bestScore) {
        if (!this.debugPanel) return;
        
        let html = '<h4>Selection Debug</h4>';
        html += `<p><strong>Best Score:</strong> ${bestScore.toFixed(3)}</p>`;
        html += `<p><strong>Objects in Range:</strong> ${debugInfo.length}</p><br>`;
        
        // Sort by score for display
        debugInfo.sort((a, b) => b.totalScore - a.totalScore);
        
        debugInfo.forEach((info, index) => {
            const isSelected = info.object === bestObject;
            const color = isSelected ? '#00ff00' : '#ffffff';
            const weight = isSelected ? 'bold' : 'normal';
            
            html += `<div style="color: ${color}; font-weight: ${weight}; margin-bottom: 5px;">`;
            html += `<strong>Object ${index + 1}:</strong><br>`;
            html += `&nbsp;&nbsp;Distance: ${info.distance.toFixed(2)}<br>`;
            html += `&nbsp;&nbsp;Dot Product: ${info.dotProduct.toFixed(3)}<br>`;
            html += `&nbsp;&nbsp;Y Diff: ${info.yDifference.toFixed(2)}<br>`;
            html += `&nbsp;&nbsp;Dist Score: ${info.distanceScore.toFixed(3)}<br>`;
            html += `&nbsp;&nbsp;Front Score: ${info.frontScore.toFixed(3)}<br>`;
            html += `&nbsp;&nbsp;Height Score: ${info.heightScore.toFixed(3)}<br>`;
            html += `&nbsp;&nbsp;<strong>Total: ${info.totalScore.toFixed(3)}</strong><br>`;
            html += `&nbsp;&nbsp;Screen Z: ${info.screenPos.z.toFixed(3)}<br>`;
            html += '</div>';
        });
        
        this.debugPanel.innerHTML = html;
    }
    
    /**
     * Remove debug visualization
     */
    removeDebugVisualization() {
        if (this.debugSelectionSphere) {
            this.scene.remove(this.debugSelectionSphere);
            this.debugSelectionSphere.geometry.dispose();
            this.debugSelectionSphere.material.dispose();
            this.debugSelectionSphere = null;
        }
        
        if (this.debugCameraArrow) {
            this.scene.remove(this.debugCameraArrow);
            this.debugCameraArrow.geometry.dispose();
            this.debugCameraArrow.material.dispose();
            this.debugCameraArrow = null;
        }
        
        if (this.debugPanel) {
            this.debugPanel.remove();
            this.debugPanel = null;
        }
    }
    
    /**
     * Toggle debug mode on/off
     */
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');

        if (!this.debugMode) {
            this.removeDebugVisualization();
        }
    }

    /**
     * Toggle the lighting config panel
     */
    toggleLightPanel() {
        const panel = document.getElementById('light-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }

    /**
     * Setup the lighting config panel event listeners
     */
    setupLightPanel() {
        const panel = document.getElementById('light-panel');
        if (!panel) return;

        // Close button
        document.getElementById('close-light-panel')?.addEventListener('click', () => {
            panel.classList.add('hidden');
        });

        // Helper to update value display
        const updateDisplay = (id, value) => {
            const display = document.getElementById(id + '-val');
            if (display) display.textContent = value;
        };

        // Helper to create slider listener
        const sliderListener = (id, callback) => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    updateDisplay(id, value);
                    callback(value);
                });
            }
        };

        // Helper to create color listener
        const colorListener = (id, callback) => {
            const picker = document.getElementById(id);
            if (picker) {
                picker.addEventListener('input', (e) => {
                    callback(new THREE.Color(e.target.value));
                });
            }
        };

        // Ambient Light
        sliderListener('ambient-intensity', (v) => { if (this.ambientLight) this.ambientLight.intensity = v; });
        colorListener('ambient-color', (c) => { if (this.ambientLight) this.ambientLight.color.copy(c); });

        // Main Directional Light
        sliderListener('main-intensity', (v) => { if (this.mainLight) this.mainLight.intensity = v; });
        colorListener('main-color', (c) => { if (this.mainLight) this.mainLight.color.copy(c); });
        sliderListener('main-pos-x', (v) => { if (this.mainLight) this.mainLight.position.x = v; });
        sliderListener('main-pos-y', (v) => { if (this.mainLight) this.mainLight.position.y = v; });
        sliderListener('main-pos-z', (v) => { if (this.mainLight) this.mainLight.position.z = v; });

        // Underwater Light
        sliderListener('underwater-intensity', (v) => { if (this.underwaterLight) this.underwaterLight.intensity = v; });
        colorListener('underwater-color', (c) => { if (this.underwaterLight) this.underwaterLight.color.copy(c); });

        // Overhead Light
        sliderListener('overhead-intensity', (v) => { if (this.overheadLight) this.overheadLight.intensity = v; });
        colorListener('overhead-color', (c) => { if (this.overheadLight) this.overheadLight.color.copy(c); });

        // Caustic Lights
        sliderListener('caustic-intensity', (v) => {
            if (this.causticLights) {
                this.causticLights.forEach(light => light.intensity = v);
            }
        });
        colorListener('caustic-color', (c) => {
            if (this.causticLights) {
                this.causticLights.forEach(light => light.color.copy(c));
            }
        });

        // Tank dimension controls
        sliderListener('tank-width', (v) => {
            this.config.tank.width = v;
        });
        sliderListener('tank-height', (v) => {
            this.config.tank.height = v;
            // Update ceiling based on height (centered around y=0)
            this.config.tank.ceilingY = v * 0.75;
        });
        sliderListener('tank-floor', (v) => {
            this.config.tank.floorY = v;
            if (this.sandFloor) this.sandFloor.position.y = v;
        });
        sliderListener('tank-ceiling', (v) => {
            this.config.tank.ceilingY = v;
        });

        // Fog controls
        sliderListener('fog-near', (v) => {
            if (this.scene.fog) this.scene.fog.near = v;
        });
        sliderListener('fog-far', (v) => {
            if (this.scene.fog) this.scene.fog.far = v;
        });
        colorListener('fog-color', (c) => {
            if (this.scene.fog) this.scene.fog.color.copy(c);
        });

        // Reset button
        document.getElementById('reset-lights')?.addEventListener('click', () => {
            this.resetLightDefaults();
        });
    }

    /**
     * Reset all lights to default values
     */
    resetLightDefaults() {
        // Reset light values
        if (this.ambientLight) {
            this.ambientLight.intensity = 1.2;
            this.ambientLight.color.set(0xffffff);
        }
        if (this.mainLight) {
            this.mainLight.intensity = 1.4;
            this.mainLight.color.set(0xffffff);
            this.mainLight.position.set(10, 20, 5);
        }
        if (this.underwaterLight) {
            this.underwaterLight.intensity = 0.4;
            this.underwaterLight.color.set(0x88ccff);
        }
        if (this.overheadLight) {
            this.overheadLight.intensity = 0.8;
            this.overheadLight.color.set(0xffffff);
        }
        if (this.causticLights) {
            this.causticLights.forEach(light => {
                light.intensity = 0.6;
                light.color.set(0x44aaff);
            });
        }
        if (this.scene.fog) {
            this.scene.fog.near = 15;
            this.scene.fog.far = 80;
            this.scene.fog.color.set(0x4477aa);
        }

        // Reset tank dimensions
        this.config.tank.width = 50;
        this.config.tank.height = 20;
        this.config.tank.floorY = -60;
        this.config.tank.ceilingY = 15;
        if (this.sandFloor) this.sandFloor.position.y = -60;

        // Reset UI controls
        const defaults = {
            'ambient-intensity': 1.2,
            'ambient-color': '#ffffff',
            'main-intensity': 1.4,
            'main-color': '#ffffff',
            'main-pos-x': 10,
            'main-pos-y': 20,
            'main-pos-z': 5,
            'underwater-intensity': 0.4,
            'underwater-color': '#88ccff',
            'overhead-intensity': 0.8,
            'overhead-color': '#ffffff',
            'caustic-intensity': 0.6,
            'caustic-color': '#44aaff',
            'fog-near': 15,
            'fog-far': 80,
            'fog-color': '#4477aa',
            'tank-width': 50,
            'tank-height': 20,
            'tank-floor': -60,
            'tank-ceiling': 15
        };

        for (const [id, value] of Object.entries(defaults)) {
            const el = document.getElementById(id);
            if (el) {
                el.value = value;
                // Update value display for sliders
                const display = document.getElementById(id + '-val');
                if (display && typeof value === 'number') {
                    display.textContent = value;
                }
            }
        }

        console.log('Lights reset to defaults');
    }

    /**
     * Clean up file info panel when destroying the scene
     */
    cleanup() {
        if (this.fileInfoPanel) {
            this.fileInfoPanel.remove();
            this.fileInfoPanel = null;
        }
        this.removeDebugVisualization();
    }

    /**
     * Perform dash/boost in current movement direction
     */
    performDash() {
        if (!this.frog || this.dashCooldown > 0) return; // Can't dash if on cooldown
        
        // Determine dash direction based on current movement or frog facing
        let dashDirection = new THREE.Vector3();
        
        // If moving, dash in movement direction (camera-relative)
        const hasHorizontalInput = this.movement.forward || this.movement.backward || this.movement.left || this.movement.right;
        
        if (hasHorizontalInput) {
            // Use camera-relative movement direction
            if (this.movement.forward) dashDirection.z -= 1;
            if (this.movement.backward) dashDirection.z += 1;
            if (this.movement.left) dashDirection.x -= 1;
            if (this.movement.right) dashDirection.x += 1;
            
            dashDirection.normalize();
            dashDirection.applyQuaternion(this.camera.quaternion);
        } else {
            // If not moving, dash forward in frog's current facing direction
            dashDirection.set(0, 0, 1);
            dashDirection.applyQuaternion(this.frog.quaternion);
        }
        
        // Apply dash force to velocity
        this.velocity.add(dashDirection.multiplyScalar(this.dashForce));
        
        // Set cooldown (1.5 seconds)
        this.dashCooldown = 0.5;
        
        // Create extra bubbles for dash effect
        this.createDashBubbles();
        
        console.log('💨 Dash activated!');
    }

    /**
     * Create extra realistic, 3D glassy bubbles when dashing for visual effect
     */
    createDashBubbles() {
        if (!this.frog) return;
        
        // Create burst of bubbles for dash effect
        for (let i = 0; i < 8; i++) {
            // Get frog direction for bubble positioning
            const frogDirection = new THREE.Vector3(0, 0, 1);
            frogDirection.applyQuaternion(this.frog.quaternion);
            
            // Position bubbles behind frog with extra wide spread for dash
            const bubblePosition = this.frog.position.clone();
            bubblePosition.add(frogDirection.multiplyScalar(-1.0 - Math.random() * 0.5));
            bubblePosition.x += (Math.random() - 0.5) * 2.0; // Very wide spread
            bubblePosition.y += (Math.random() - 0.5) * 1.5;
            bubblePosition.z += (Math.random() - 0.5) * 2.0;
            
            // Create larger, more dramatic bubbles with high-quality geometry
            const bubbleSize = 0.08 + Math.random() * 0.08;
            const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 20, 16);

            // Create fresnel bubble material - larger dash bubbles with more visible rims
            const bubbleMaterial = this.createBubbleMaterial({
                baseOpacity: 0.05 + Math.random() * 0.05,  // Transparent center
                rimOpacity: 0.6 + Math.random() * 0.3,     // More visible rim for dash effect
                rimPower: 1.5 + Math.random() * 0.5,       // Softer falloff for larger bubbles
                color: new THREE.Color(0xddeeff),          // Slightly whiter for dash
                emissiveColor: new THREE.Color(0x002244)
            });

            const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
            bubble.position.copy(bubblePosition);
            
            // Add enhanced bubble data with more realistic physics
            bubble.userData = {
                life: 1.5 + Math.random() * 0.5,
                maxLife: 1.5 + Math.random() * 0.5,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.4, // Faster horizontal movement for dash
                    0.6 + Math.random() * 0.4,   // Faster upward velocity for dash
                    (Math.random() - 0.5) * 0.4
                ),
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 4.0, // Faster rotation for dash effect
                    (Math.random() - 0.5) * 4.0,
                    (Math.random() - 0.5) * 4.0
                ),
                wobble: Math.random() * Math.PI * 2, // Random wobble phase
                wobbleSpeed: 4.0 + Math.random() * 4.0, // Faster wobble for dash
                scale: 1.0 + Math.random() * 0.3 // Random initial scale variation
            };
            
            this.scene.add(bubble);
            this.bubbles.push(bubble);
        }
    }

    /**
     * Create realistic, 3D glassy bubble trail particles behind the frog
     */
    createBubbleTrail() {
        if (!this.frog) return;
        
        // Create 3-5 bubbles behind the frog for wider trail
        const bubbleCount = 3 + Math.floor(Math.random() * 3); // 3-5 bubbles
        
        for (let i = 0; i < bubbleCount; i++) {
            // Calculate position behind the frog
            const frogDirection = new THREE.Vector3(0, 0, 1); // Default forward direction
            frogDirection.applyQuaternion(this.frog.quaternion);
            
            // Position bubbles behind the frog with wider randomness
            const bubblePosition = this.frog.position.clone();
            bubblePosition.add(frogDirection.multiplyScalar(-1.5 - Math.random() * 0.8)); // Behind frog, more depth variation
            bubblePosition.x += (Math.random() - 0.5) * 1.2; // Much wider horizontal spread
            bubblePosition.y += (Math.random() - 0.5) * 0.8; // Wider vertical spread
            bubblePosition.z += (Math.random() - 0.5) * 1.2; // Much wider depth spread
            
            // Create realistic bubble geometry with more segments for smoothness
            const bubbleSize = 0.05 + Math.random() * 0.05; // Random size
            const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 16, 12);

            // Create fresnel bubble material - thin membrane with visible edges
            const bubbleMaterial = this.createBubbleMaterial({
                baseOpacity: 0.03 + Math.random() * 0.05,  // Very transparent center
                rimOpacity: 0.4 + Math.random() * 0.3,     // Visible rim
                rimPower: 1.8 + Math.random() * 0.8,       // Rim sharpness
                color: new THREE.Color(0xcceeFF),          // Light blue tint
                emissiveColor: new THREE.Color(0x001122)
            });

            const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
            bubble.position.copy(bubblePosition);
            
            // Add bubble data for animation with more realistic physics
            bubble.userData = {
                life: 2.0 + Math.random() * 1.0, // Lifespan 2-3 seconds
                maxLife: 2.0 + Math.random() * 1.0,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.15, // Slight horizontal drift
                    0.4 + Math.random() * 0.3,   // Upward velocity with variation
                    (Math.random() - 0.5) * 0.15
                ),
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 2.0, // Random rotation for 3D effect
                    (Math.random() - 0.5) * 2.0,
                    (Math.random() - 0.5) * 2.0
                ),
                wobble: Math.random() * Math.PI * 2, // Random wobble phase
                wobbleSpeed: 2.0 + Math.random() * 3.0 // Wobble speed variation
            };
            
            this.scene.add(bubble);
            this.bubbles.push(bubble);
        }
    }

    /**
     * Update realistic, 3D glassy bubble trail animations
     */
    updateBubbleTrail(delta) {
        // Update existing bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            const data = bubble.userData;
            
            // Update bubble position with realistic physics
            bubble.position.add(data.velocity.clone().multiplyScalar(delta));
            
            // Apply 3D rotation for realistic bubble movement
            if (data.rotationSpeed) {
                bubble.rotation.x += data.rotationSpeed.x * delta;
                bubble.rotation.y += data.rotationSpeed.y * delta;
                bubble.rotation.z += data.rotationSpeed.z * delta;
            }
            
            // Apply wobble effect for more realistic bubble physics
            if (data.wobble !== undefined) {
                data.wobble += data.wobbleSpeed * delta;
                const wobbleAmount = 0.02; // Subtle wobble
                bubble.position.x += Math.sin(data.wobble) * wobbleAmount * delta;
                bubble.position.z += Math.cos(data.wobble) * wobbleAmount * delta;
            }
            
            // Reduce bubble life
            data.life -= delta;

            // Fade out bubble as it ages
            const fadeRatio = data.life / data.maxLife;

            // Update shader uniforms for fresnel material
            if (bubble.material.uniforms) {
                // Fade rim opacity as bubble ages
                bubble.material.uniforms.rimOpacity.value = fadeRatio * 0.6;
                bubble.material.uniforms.baseOpacity.value = fadeRatio * 0.08;

                // Shift color toward underwater tint as bubble ages
                const underwaterTint = new THREE.Color(0x003344);
                const baseColor = new THREE.Color(0xcceeFF);
                const finalColor = baseColor.clone().lerp(underwaterTint, (1.0 - fadeRatio) * 0.4);
                bubble.material.uniforms.bubbleColor.value.copy(finalColor);
            }

            // Scale bubble slightly as it rises (realistic bubble expansion)
            const scale = 1.0 + (1.0 - fadeRatio) * 0.4;
            if (data.scale) {
                bubble.scale.setScalar(scale * data.scale);
            } else {
                bubble.scale.setScalar(scale);
            }
            
            // Remove dead bubbles
            if (data.life <= 0) {
                this.scene.remove(bubble);
                bubble.geometry.dispose();
                bubble.material.dispose();
                this.bubbles.splice(i, 1);
            }
        }
        
        // Create new bubbles if frog is moving horizontally (WASD)
        const isMovingHorizontally = this.movement.forward || this.movement.backward || this.movement.left || this.movement.right;
        
        if (isMovingHorizontally && Math.random() < 0.4) { // 40% chance per frame when swimming
            this.createBubbleTrail();
        }
    }

    /**
     * Start the animation loop
     */
    startAnimation() {
        this.animate();
    }

    /**
     * Hide the loading screen once everything is loaded
     */
    hideLoadingScreen() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            // Add a small delay to ensure everything is rendered
            setTimeout(() => {
                loadingElement.classList.add('hidden');
                // Remove from DOM after fade animation completes
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                }, 500);
            }, 500);
        }
    }

    /**
     * Show initial instructions to user
     */
    showInitialMessage() {
        // Instructions are now only shown in the UI panel - no popup needed
        console.log('🎉 Swimming Tank ready! Click to start swimming.');
    }

    /**
     * Show error message if initialization fails
     */
    showErrorMessage(error) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <h2 style="color: #ff6b6b;">⚠️ Loading Error</h2>
                <p style="color: #ffffff; max-width: 400px; text-align: center;">
                    Failed to load the Swimming Tank. Please check the browser console for details.
                </p>
                <p style="color: #ffaa00; font-size: 12px;">
                    Error: ${error.message}
                </p>
                <button onclick="location.reload()" style="
                    padding: 10px 20px; 
                    margin-top: 20px; 
                    background: #00ffff; 
                    color: #001122; 
                    border: none; 
                    border-radius: 5px; 
                    cursor: pointer;
                    font-weight: bold;
                ">Reload Page</button>
            `;
        }
    }
}

// Initialize the swimming tank when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Three.js loaded successfully, initializing Swimming Tank...');
    new SwimmingTank();
});