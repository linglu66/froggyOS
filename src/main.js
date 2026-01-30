/**
 * Swimming Tank - Interactive 3D File Explorer
 * Main entry point - orchestrates all modules
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Import modules
import { createScene, createEnvironment, updateEnvironment } from './scene.js';
import {
    loadFrogModel, updateCameraPosition, updateMovement, updateFrogAnimation,
    updateAdditionalFrogs, makeFrogsSwimToFolder, updateAutopilot, realignCamera
} from './frog.js';
import { createFileFolders, createTxtFiles, checkCollisions, updateCombinedObjects } from './objects.js';
import {
    createBubbleMaterial, getBubbleFromPool, returnBubbleToPool,
    createBubbleTrail, createDashBubbles, updateBubbleTrail,
    createObjectBubbleStreams, updateObjectBubbleStreams
} from './bubbles.js';
import {
    updateObjectSelection, checkObjectVisibility, openPreview, closePreview,
    setupLightPanel, hideLoadingScreen, showInitialMessage, showErrorMessage
} from './ui.js';
import { setupControls, setupEventListeners } from './controls.js';
import { updateSideScroller } from './sidescroller.js';

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
        this.frogRotation = new THREE.Euler(0, Math.PI, 0);
        this.cameraOffset = new THREE.Vector3(0, 7, 6);
        this.particles = null;
        this.folders = [];
        this.pdfs = [];
        this.pdfModelRotation = { x: Math.PI / 2, y: 0, z: 0 }; // 90° on X axis
        this.allObjects = [];
        this.collisionSpheres = [];
        this.bubbles = [];
        this.dashCooldown = 0;
        this.dashForce = 15.0;
        this.selectedObject = null;
        this.selectionBorder = null;
        this.fileInfoPanel = null;

        // Preview windows state
        this.previewWindows = [];
        this.previewZIndex = 300;
        this.dragState = null;

        // Bubble object pool
        this.bubblePool = [];
        this.maxPoolSize = 100;

        // Sample content pools
        this.samplePools = {
            text: [
                { type: 'text', url: 'samples/meeting-notes.txt' },
                { type: 'text', url: 'samples/project-readme.txt' },
                { type: 'text', url: 'samples/todo-list.txt' },
            ],
            image: [
                { type: 'image', url: 'samples/chart.svg' },
                { type: 'image', url: 'samples/landscape.svg' },
                { type: 'image', url: 'samples/profile.svg' },
            ],
            doc: [
                { type: 'doc', url: 'samples/report.html' },
            ]
        };

        // Configuration
        this.config = {
            movement: {
                speed: 8.0,
                friction: 6.0,
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
                objectCount: 80,
                worldSize: 25,
                worldHeight: 20,
                collisionDistance: 2.0,
                selectionDistance: 4.0,
            },
            tank: {
                width: 30,
                height: 20,
                floorY: -10,
                ceilingY: 15,
            }
        };

        // Area positions for semantic grouping
        this.areaPositions = {
            rockCircle: { x: 10, z: -8, name: 'Daily Life' },        // Daily essentials
            sandcastle: { x: 0, z: 15, name: 'Dreams' },             // Aspirations
            seaweedGrove: { x: -30, z: 15, name: 'Inner World' },    // Private thoughts
            starfishBeach: { x: 20, z: 30, name: 'Memories' },       // Past & relationships
            mixedGarden: { x: -20, z: -25, name: 'Work' },           // Work life
            center: { x: 0, z: 0, name: 'Misc' }                     // Unsorted
        };

        // File data - folders assigned to semantic areas
        this.fileData = [
            { name: 'downloads', size: '2.1 GB', type: 'folder', files: 7, area: 'center' },
            { name: 'drafts', size: '156 KB', type: 'folder', files: 3, area: 'seaweedGrove' },
            { name: 'journal', size: '89 KB', type: 'folder', files: 6, area: 'seaweedGrove' },
            { name: 'music', size: '1.2 GB', type: 'folder', files: 4, area: 'sandcastle' },
            { name: 'old', size: '45 KB', type: 'folder', files: 5, area: 'starfishBeach' },
            { name: 'photos', size: '8.4 GB', type: 'folder', files: 6, area: 'starfishBeach' },
            { name: 'random', size: '23 KB', type: 'folder', files: 3, area: 'sandcastle' },
            { name: 'recipes', size: '34 KB', type: 'folder', files: 4, area: 'center' },
            { name: 'work', size: '567 KB', type: 'folder', files: 5, area: 'mixedGarden' }
        ];

        this.pdfData = [
            { name: 'Q4_Report_2024.pdf', size: '3.2 MB', type: 'pdf', pages: 67, cluster: 'work' },
            { name: 'Project_Proposal.pdf', size: '2.8 MB', type: 'pdf', pages: 34, cluster: 'work' },
            { name: 'Meeting_Minutes.pdf', size: '0.8 MB', type: 'pdf', pages: 5, cluster: 'work' },
            { name: 'Contract_Template.pdf', size: '1.5 MB', type: 'pdf', pages: 12, cluster: 'work' },
            { name: 'Client_Presentation.pdf', size: '4.7 MB', type: 'pdf', pages: 28, cluster: 'work' },
            { name: 'Tax_Return_2024.pdf', size: '2.1 MB', type: 'pdf', pages: 23, cluster: 'personal' },
            { name: 'Insurance_Policy.pdf', size: '4.7 MB', type: 'pdf', pages: 89, cluster: 'personal' },
            { name: 'Recipe_Collection.pdf', size: '1.9 MB', type: 'pdf', pages: 45, cluster: 'personal' },
            { name: 'Travel_Itinerary.pdf', size: '0.6 MB', type: 'pdf', pages: 8, cluster: 'personal' },
            { name: 'Bank_Statement.pdf', size: '1.2 MB', type: 'pdf', pages: 12, cluster: 'personal' },
            { name: 'kdfgkjdfgl.jpg', size: '2.4 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'IMG_20241201_143022.jpg', size: '4.1 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'screenshot_2024-11-15.png', size: '1.8 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'untitled_document.pdf', size: '0.3 MB', type: 'pdf', pages: 2, cluster: 'misc' },
            { name: 'copy_of_copy_final_v2.pdf', size: '1.2 MB', type: 'pdf', pages: 15, cluster: 'misc' },
            { name: 'asdfghjkl.pdf', size: '0.7 MB', type: 'pdf', pages: 3, cluster: 'misc' },
            { name: 'New Document (1).pdf', size: '0.5 MB', type: 'pdf', pages: 1, cluster: 'misc' },
            { name: 'scan_20241201.pdf', size: '3.1 MB', type: 'pdf', pages: 4, cluster: 'misc' }
        ];

        this.txtData = [
            // === DAILY LIFE (Rock Circle) ===
            { name: 'todo.txt', size: '3 KB', type: 'txt', area: 'rockCircle', path: 'content/todo.txt' },
            { name: 'groceries.txt', size: '1 KB', type: 'txt', area: 'rockCircle', path: 'content/groceries.txt' },
            { name: 'sleep-schedule.txt', size: '1 KB', type: 'txt', area: 'rockCircle', path: 'content/sleep-schedule.txt' },
            { name: 'passwords.txt', size: '1 KB', type: 'txt', area: 'rockCircle', path: 'content/passwords.txt' },
            { name: 'new-apartment.txt', size: '4 KB', type: 'txt', area: 'rockCircle', path: 'content/new-apartment.txt' },

            // === DREAMS & ASPIRATIONS (Sandcastle) ===
            { name: 'ideas.txt', size: '3 KB', type: 'txt', area: 'sandcastle', path: 'content/ideas.txt' },
            { name: 'books.txt', size: '2 KB', type: 'txt', area: 'sandcastle', path: 'content/books.txt' },
            { name: 'movies to watch.txt', size: '2 KB', type: 'txt', area: 'sandcastle', path: 'content/movies to watch.txt' },
            { name: 'names-for-future-pet.txt', size: '1 KB', type: 'txt', area: 'sandcastle', path: 'content/random/names-for-future-pet.txt' },
            { name: 'shower-thoughts.txt', size: '2 KB', type: 'txt', area: 'sandcastle', path: 'content/random/shower-thoughts.txt' },
            { name: 'learning-guitar.txt', size: '2 KB', type: 'txt', area: 'sandcastle', path: 'content/music/learning-guitar.txt' },

            // === INNER WORLD (Seaweed Grove) ===
            { name: 'the-dream.txt', size: '2 KB', type: 'txt', area: 'seaweedGrove', path: 'content/journal/the-dream.txt' },
            { name: 'therapy-homework.txt', size: '3 KB', type: 'txt', area: 'seaweedGrove', path: 'content/journal/therapy-homework.txt' },
            { name: 'jan-15.txt', size: '4 KB', type: 'txt', area: 'seaweedGrove', path: 'content/journal/jan-15.txt' },
            { name: 'mar-3.txt', size: '3 KB', type: 'txt', area: 'seaweedGrove', path: 'content/journal/mar-3.txt' },
            { name: 'gratitude-list.txt', size: '2 KB', type: 'txt', area: 'seaweedGrove', path: 'content/journal/gratitude-list.txt' },
            { name: 'good-things.txt', size: '3 KB', type: 'txt', area: 'seaweedGrove', path: 'content/journal/good-things.txt' },
            { name: 'reasons.txt', size: '2 KB', type: 'txt', area: 'seaweedGrove', path: 'content/reasons.txt' },
            { name: 'dating-profile.txt', size: '2 KB', type: 'txt', area: 'seaweedGrove', path: 'content/drafts/dating-profile.txt' },
            { name: 'do-not-open.txt', size: '1 KB', type: 'txt', area: 'seaweedGrove', path: 'content/music/do-not-open.txt' },

            // === MEMORIES & RELATIONSHIPS (Starfish Beach) ===
            { name: 'letter-never-sent.txt', size: '3 KB', type: 'txt', area: 'starfishBeach', path: 'content/old/letter-never-sent.txt' },
            { name: 'anniversary-ideas.txt', size: '2 KB', type: 'txt', area: 'starfishBeach', path: 'content/old/anniversary-ideas.txt' },
            { name: 'pros-and-cons.txt', size: '2 KB', type: 'txt', area: 'starfishBeach', path: 'content/old/pros-and-cons.txt' },
            { name: 'voicemail-transcript.txt', size: '1 KB', type: 'txt', area: 'starfishBeach', path: 'content/old/voicemail-transcript.txt' },
            { name: 'text-to-alex.txt', size: '1 KB', type: 'txt', area: 'starfishBeach', path: 'content/drafts/text-to-alex.txt' },
            { name: 'text-to-danny.txt', size: '1 KB', type: 'txt', area: 'starfishBeach', path: 'content/drafts/text-to-danny.txt' },
            { name: 'things to talk about.txt', size: '2 KB', type: 'txt', area: 'starfishBeach', path: 'content/things to talk about.txt' },
            { name: 'compliments.txt', size: '1 KB', type: 'txt', area: 'starfishBeach', path: 'content/random/compliments.txt' },

            // === WORK LIFE (Mixed Garden) ===
            { name: 'email-draft.txt', size: '2 KB', type: 'txt', area: 'mixedGarden', path: 'content/work/email-draft.txt' },
            { name: 'resume-v2-FINAL.txt', size: '4 KB', type: 'txt', area: 'mixedGarden', path: 'content/downloads/resume-v2-FINAL.txt' },
            { name: 'tax-stuff-2024.txt', size: '3 KB', type: 'txt', area: 'mixedGarden', path: 'content/downloads/tax-stuff-2024.txt' },

            // === MISC / UNSORTED (Center) ===
            { name: 'untitled.txt', size: '1 KB', type: 'txt', area: 'center', path: 'content/untitled.txt' },
            { name: 'readme.txt', size: '1 KB', type: 'txt', area: 'center', path: 'content/downloads/readme.txt' },
            { name: 'apartment-listing.txt', size: '2 KB', type: 'txt', area: 'center', path: 'content/downloads/apartment-listing.txt' },
            { name: 'cricket-crunch-alexs.txt', size: '2 KB', type: 'txt', area: 'center', path: 'content/recipes/cricket-crunch-alexs.txt' },
            { name: 'grandmas-fly-casserole.txt', size: '2 KB', type: 'txt', area: 'center', path: 'content/recipes/grandmas-fly-casserole.txt' },
            { name: 'green-smoothie.txt', size: '1 KB', type: 'txt', area: 'center', path: 'content/recipes/green-smoothie.txt' },
            { name: 'night-swimming.txt', size: '2 KB', type: 'txt', area: 'center', path: 'content/music/night-swimming.txt' },
            { name: 'workout.txt', size: '1 KB', type: 'txt', area: 'center', path: 'content/music/workout.txt' },
        ];

        this.imageData = [
            { name: 'vacation_photo.jpg', size: '4.2 MB', type: 'jpeg', cluster: 'personal' },
            { name: 'family_portrait.jpg', size: '3.8 MB', type: 'jpeg', cluster: 'personal' },
            { name: 'sunset_beach.jpg', size: '5.1 MB', type: 'jpeg', cluster: 'personal' },
            { name: 'product_shot.jpg', size: '2.9 MB', type: 'jpeg', cluster: 'work' },
            { name: 'team_photo.jpg', size: '3.4 MB', type: 'jpeg', cluster: 'work' },
            { name: 'screenshot_001.png', size: '1.2 MB', type: 'png', cluster: 'work' },
            { name: 'logo_final.png', size: '0.8 MB', type: 'png', cluster: 'work' },
            { name: 'icon_set.png', size: '0.3 MB', type: 'png', cluster: 'work' },
            { name: 'meme_funny.png', size: '0.9 MB', type: 'png', cluster: 'personal' },
            { name: 'receipt_scan.png', size: '1.5 MB', type: 'png', cluster: 'personal' },
        ];

        // Arrays for different file type objects
        this.txtFiles = [];
        this.imageFiles = [];

        // Side-scroller state
        this.sideScrollerMode = false;
        this.sideScrollerScene = null;
        this.sideScrollerCamera = null;
        this.sideScrollerPlayer = null;
        this.sideScrollerPlatforms = [];
        this.sideScrollerFiles = [];
        this.currentFolder = null;

        // Side-scroller input state
        this.sideScrollerInput = {
            left: false,
            right: false,
            jump: false,
            down: false
        };

        this.init();
    }

    init() {
        try {
            console.log('Initializing Swimming Tank...');
            createScene(this);
            console.log('Scene created');
            createEnvironment(this);
            console.log('Environment created');

            const initTimeout = setTimeout(() => {
                console.warn('Initialization timeout - continuing without frog');
                this.hideLoadingScreen();
                this.showInitialMessage();
            }, 8000);

            this.initTimeout = initTimeout;

            loadFrogModel(this);
            console.log('Frog model loading initiated');
            createFileFolders(this);
            console.log('File folders created');
            createTxtFiles(this);
            console.log('TXT files created');
            // PDFs and images removed - all content is txt files
            setupControls(this);
            console.log('Controls setup');
            setupEventListeners(this);
            console.log('Event listeners setup');
            setupLightPanel(this);
            console.log('Panels setup');
            this.startAnimation();
            console.log('Animation started');
        } catch (error) {
            console.error('Error initializing Swimming Tank:', error);
            this.showErrorMessage(error);
        }
    }

    // Delegate methods to modules
    hideLoadingScreen() { hideLoadingScreen(); }
    showInitialMessage() { showInitialMessage(); }
    showErrorMessage(error) { showErrorMessage(error); }

    // Bubble methods - needed by frog module
    createBubbleMaterial(options) { return createBubbleMaterial(options); }
    getBubbleFromPool(size) { return getBubbleFromPool(this, size); }
    returnBubbleToPool(bubble) { returnBubbleToPool(this, bubble); }
    createBubbleTrail() { createBubbleTrail(this); }
    createDashBubbles() { createDashBubbles(this); }
    createObjectBubbleStreams() { createObjectBubbleStreams(this); }

    // Frog methods
    makeFrogsSwimToFolder(folder) { makeFrogsSwimToFolder(this, folder); }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        if (this.sideScrollerMode) {
            // Side-scroller mode updates
            updateSideScroller(this, delta);
            this.renderer.render(this.sideScrollerScene, this.sideScrollerCamera);
        } else {
            // Swimming tank mode updates
            updateMovement(this, delta);
            updateAutopilot(this, delta);
            updateFrogAnimation(this, delta);
            updateAdditionalFrogs(this, delta);
            updateCameraPosition(this);
            updateBubbleTrail(this, delta);
            updateObjectSelection(this);
            updateEnvironment(this);
            updateObjectBubbleStreams(this);
            checkCollisions(this);
            checkObjectVisibility(this);

            this.renderer.render(this.scene, this.camera);
        }
    }

    startAnimation() {
        this.animate();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Three.js loaded successfully, initializing Swimming Tank...');
    new SwimmingTank();
});
