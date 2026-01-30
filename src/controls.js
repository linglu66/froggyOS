/**
 * Controls - keyboard and mouse input handling
 */
import { performDash, resetCamera, toggleMultiFrogMode, realignCamera } from './frog.js';
import { toggleCollisionVisualization } from './objects.js';
import { openPreview, closePreview, toggleLightPanel } from './ui.js';
import { toggleTankBounds } from './scene.js';
import { exitSideScrollerMode, handleSideScrollerInput, getSelectedFile } from './sidescroller.js';

/**
 * Setup mouse and keyboard controls
 */
export function setupControls(tank) {
    // Mouse movement handler
    tank.onMouseMove = (event) => {
        // Mouse look disabled - no pointer lock needed
    };

    // Mouse click handler
    tank.onMouseClick = () => {
        // Handle regular mouse clicks for object selection
    };

    // Keyboard down handler
    tank.onKeyDown = (event) => {
        // Side-scroller mode controls
        if (tank.sideScrollerMode) {
            switch (event.code) {
                case 'KeyA':
                case 'ArrowLeft':
                    tank.sideScrollerInput.left = true;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    tank.sideScrollerInput.right = true;
                    break;
                case 'KeyW':
                case 'ArrowUp':
                case 'Space':
                    event.preventDefault();
                    tank.sideScrollerInput.jump = true;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    tank.sideScrollerInput.down = true;
                    break;
                case 'Enter':
                    const selectedFile = getSelectedFile(tank);
                    if (selectedFile) {
                        openPreview(tank, selectedFile);
                    }
                    break;
                case 'Escape':
                    exitSideScrollerMode(tank);
                    break;
            }
            return;
        }

        // Reset autopilot timer on any input
        if (tank.autopilot) {
            tank.autopilot.lastInputTime = Date.now();
            tank.autopilot.active = false;
        }

        // Swimming tank mode controls
        switch (event.code) {
            case 'KeyW':
                tank.movement.forward = true;
                break;
            case 'KeyA':
                tank.movement.left = true;
                break;
            case 'KeyS':
                tank.movement.backward = true;
                break;
            case 'KeyD':
                tank.movement.right = true;
                break;
            case 'ArrowUp':
                tank.movement.up = true;
                break;
            case 'ArrowDown':
                tank.movement.down = true;
                break;
            case 'Space':
                event.preventDefault();
                performDash(tank);
                break;
            case 'KeyC':
                toggleCollisionVisualization(tank);
                break;
            case 'KeyR':
                realignCamera(tank);
                break;
            case 'KeyF':
                toggleDebugMode(tank);
                break;
            case 'KeyM':
                toggleMultiFrogMode(tank);
                break;
            case 'KeyB':
                debugSceneState(tank);
                break;
            case 'KeyL':
                toggleLightPanel();
                break;
            case 'KeyT':
                toggleTankBounds(tank);
                break;
            case 'Enter':
                if (tank.selectedObject) {
                    openPreview(tank, tank.selectedObject);
                }
                break;
            case 'Escape':
                if (tank.previewWindows.length > 0) {
                    closePreview(tank);
                }
                break;
        }
    };

    // Keyboard up handler
    tank.onKeyUp = (event) => {
        // Side-scroller mode key releases
        if (tank.sideScrollerMode) {
            switch (event.code) {
                case 'KeyA':
                case 'ArrowLeft':
                    tank.sideScrollerInput.left = false;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    tank.sideScrollerInput.right = false;
                    break;
                case 'KeyW':
                case 'ArrowUp':
                case 'Space':
                    tank.sideScrollerInput.jump = false;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    tank.sideScrollerInput.down = false;
                    break;
            }
            return;
        }

        // Swimming tank mode key releases
        switch (event.code) {
            case 'KeyW':
                tank.movement.forward = false;
                break;
            case 'KeyA':
                tank.movement.left = false;
                break;
            case 'KeyS':
                tank.movement.backward = false;
                break;
            case 'KeyD':
                tank.movement.right = false;
                break;
            case 'ArrowUp':
                tank.movement.up = false;
                break;
            case 'ArrowDown':
                tank.movement.down = false;
                break;
        }
    };
}

/**
 * Setup all event listeners
 */
export function setupEventListeners(tank) {
    document.addEventListener('mousemove', tank.onMouseMove);
    tank.renderer.domElement.addEventListener('click', tank.onMouseClick);
    document.addEventListener('keydown', tank.onKeyDown);
    document.addEventListener('keyup', tank.onKeyUp);

    // Window resize handler
    window.addEventListener('resize', () => {
        tank.camera.aspect = window.innerWidth / window.innerHeight;
        tank.camera.updateProjectionMatrix();
        tank.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Initialize state
    tank.debugMode = false;
    tank.multiFrogMode = false;
    tank.otherFrogs = [];
    tank.frogNames = ['Bubbles', 'Splash', 'Ripple', 'Wave', 'Current'];
}

/**
 * Toggle debug mode
 */
function toggleDebugMode(tank) {
    tank.debugMode = !tank.debugMode;
    console.log('Debug mode:', tank.debugMode ? 'ON' : 'OFF');

    if (!tank.debugMode) {
        removeDebugVisualization(tank);
    }
}

/**
 * Debug scene state
 */
function debugSceneState(tank) {
    console.log('=== SCENE DEBUG STATE ===');
    console.log('Multi-frog mode:', tank.multiFrogMode);
    console.log('Other frogs array length:', tank.otherFrogs.length);

    const frogsInScene = tank.scene.children.filter(child => child.userData.isFrog);
    console.log('Frogs in scene:', frogsInScene.length);
    frogsInScene.forEach((frog, index) => {
        console.log(`  Frog ${index}:`, {
            position: frog.position,
            userData: frog.userData,
            visible: frog.visible
        });
    });

    console.log('Total scene children:', tank.scene.children.length);
    console.log('========================');
}

/**
 * Remove debug visualization
 */
function removeDebugVisualization(tank) {
    if (tank.debugSelectionSphere) {
        tank.scene.remove(tank.debugSelectionSphere);
        tank.debugSelectionSphere.geometry.dispose();
        tank.debugSelectionSphere.material.dispose();
        tank.debugSelectionSphere = null;
    }

    if (tank.debugCameraArrow) {
        tank.scene.remove(tank.debugCameraArrow);
        tank.debugCameraArrow.geometry.dispose();
        tank.debugCameraArrow.material.dispose();
        tank.debugCameraArrow = null;
    }

    if (tank.debugPanel) {
        tank.debugPanel.remove();
        tank.debugPanel = null;
    }
}
