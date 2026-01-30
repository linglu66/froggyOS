/**
 * UI components - preview windows, config panel, file info, selection
 */
import * as THREE from 'three';
import { updateTankBounds } from './scene.js';
import { enterSideScrollerMode } from './sidescroller.js';

/**
 * Update object selection based on proximity and camera direction
 */
export function updateObjectSelection(tank) {
    if (!tank.frog) return;

    const frogPosition = tank.frog.position;
    const selectionDistance = tank.config.world.selectionDistance;

    let bestObject = null;
    let bestScore = -Infinity;

    tank.allObjects.forEach((object) => {
        const distance = frogPosition.distanceTo(object.position);

        if (distance > selectionDistance) return;

        const objectScreenPos = object.position.clone().project(tank.camera);

        if (objectScreenPos.z > 1) return;

        const heightDifference = object.position.y - frogPosition.y;

        if (heightDifference < -2.0) return;

        const cameraDirection = new THREE.Vector3();
        tank.camera.getWorldDirection(cameraDirection);

        const frogToObject = object.position.clone().sub(frogPosition);
        const dotProduct = frogToObject.dot(cameraDirection);

        const distanceScore = (selectionDistance - distance) / selectionDistance;
        const frontScore = Math.max(0, dotProduct / distance);

        let heightScore;
        if (heightDifference > 0) {
            heightScore = Math.min(1.0, heightDifference / 5);
        } else {
            heightScore = Math.max(-2.0, heightDifference / 2);
        }

        const totalScore = distanceScore * 0.2 + frontScore * 0.3 + heightScore * 0.5;

        if (totalScore > bestScore) {
            bestObject = object;
            bestScore = totalScore;
        }
    });

    if (bestObject !== tank.selectedObject) {
        removeSelectionBorder(tank);
        tank.selectedObject = bestObject;

        const hint = document.getElementById('selection-hint');

        if (tank.selectedObject) {
            createSelectionBorder(tank);
            showFileInfo(tank);

            if (tank.makeFrogsSwimToFolder) {
                tank.makeFrogsSwimToFolder(tank.selectedObject);
            }

            if (hint && tank.previewWindows.length === 0) {
                hint.classList.add('visible');
            }
        } else {
            hideFileInfo(tank);
            if (hint) {
                hint.classList.remove('visible');
            }
        }
    }

    // Animate selection border
    if (tank.selectionBorder && tank.selectedObject) {
        const time = Date.now() * 0.003;

        tank.selectionBorder.position.copy(tank.selectedObject.position);
        tank.selectionBorder.rotation.copy(tank.selectedObject.rotation);

        const baseScale = tank.selectedObject.scale.clone().multiplyScalar(1.2);
        const pulseMultiplier = 1.0 + Math.sin(time) * 0.08;
        tank.selectionBorder.scale.copy(baseScale).multiplyScalar(pulseMultiplier);

        const opacityPulse = 0.8 + Math.sin(time * 2) * 0.2;
        tank.selectionBorder.children.forEach(child => {
            if (child.material) {
                child.material.opacity = opacityPulse;
            }
        });

        if (tank.fileInfoPanel && tank.fileInfoPanel.classList.contains('visible')) {
            positionFileInfoNearObject(tank);
        }
    }
}

/**
 * Create selection border
 */
function createSelectionBorder(tank) {
    if (!tank.selectedObject) return;

    tank.selectionBorder = new THREE.Group();

    tank.selectedObject.traverse((child) => {
        if (child.isMesh && child.geometry) {
            const edges = new THREE.EdgesGeometry(child.geometry);

            const borderColor = tank.selectedObject.userData.type === 'pdf' ? 0x00ffff : 0x00ff00;

            const outlineMaterial = new THREE.LineBasicMaterial({
                color: borderColor,
                transparent: true,
                opacity: 1.0,
                linewidth: 4
            });

            const outlineWireframe = new THREE.LineSegments(edges, outlineMaterial);

            outlineWireframe.position.copy(child.position);
            outlineWireframe.rotation.copy(child.rotation);
            outlineWireframe.scale.copy(child.scale);

            tank.selectionBorder.add(outlineWireframe);
        }
    });

    tank.selectionBorder.position.copy(tank.selectedObject.position);
    tank.selectionBorder.rotation.copy(tank.selectedObject.rotation);
    tank.selectionBorder.scale.copy(tank.selectedObject.scale);
    tank.selectionBorder.scale.multiplyScalar(1.2);

    tank.scene.add(tank.selectionBorder);
}

/**
 * Remove selection border
 */
function removeSelectionBorder(tank) {
    if (tank.selectionBorder) {
        tank.selectionBorder.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });

        tank.scene.remove(tank.selectionBorder);
        tank.selectionBorder = null;
    }
}

/**
 * Show file information panel
 */
function showFileInfo(tank) {
    if (!tank.selectedObject || !tank.selectedObject.userData) {
        return;
    }

    const fileData = tank.selectedObject.userData;

    if (!tank.fileInfoPanel) {
        tank.fileInfoPanel = document.createElement('div');
        tank.fileInfoPanel.id = 'fileInfoPanel';
        tank.fileInfoPanel.className = 'file-info-panel';
        document.body.appendChild(tank.fileInfoPanel);
    }

    const icon = fileData.type === 'pdf' ? '📄' : '📁';
    const extraInfo = fileData.type === 'pdf' ?
        `<div class="file-info-row">
            <span class="file-label">Pages:</span>
            <span class="file-value">${fileData.pages}</span>
        </div>` :
        `<div class="file-info-row">
            <span class="file-label">Files:</span>
            <span class="file-value">${fileData.files}</span>
        </div>`;

    tank.fileInfoPanel.innerHTML = `
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

    positionFileInfoNearObject(tank);

    tank.fileInfoPanel.style.display = 'block';
    setTimeout(() => {
        tank.fileInfoPanel.classList.add('visible');
    }, 10);
}

/**
 * Position file info panel near selected object
 */
function positionFileInfoNearObject(tank) {
    if (!tank.selectedObject || !tank.fileInfoPanel) return;

    const objectPosition = tank.selectedObject.position.clone();
    const screenPosition = objectPosition.clone().project(tank.camera);

    if (screenPosition.z > 1) {
        tank.fileInfoPanel.style.opacity = '0';
        return;
    }

    const screenX = (screenPosition.x + 1) * window.innerWidth / 2;
    const screenY = (-screenPosition.y + 1) * window.innerHeight / 2;

    const panelWidth = 220;
    const panelHeight = 120;

    let left, top;

    const screenCenterX = window.innerWidth / 2;
    const distanceFromCenter = Math.abs(screenX - screenCenterX);

    if (screenX < screenCenterX) {
        left = screenX - panelWidth - 30;
    } else {
        left = screenX + 30;
    }

    if (distanceFromCenter < 100) {
        const leftSpace = screenX;
        const rightSpace = window.innerWidth - screenX;

        if (leftSpace > rightSpace) {
            left = screenX - panelWidth - 30;
        } else {
            left = screenX + 30;
        }
    }

    top = screenY - panelHeight / 2;

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

    tank.fileInfoPanel.style.left = `${left}px`;
    tank.fileInfoPanel.style.top = `${top}px`;
    tank.fileInfoPanel.style.right = 'auto';
    tank.fileInfoPanel.style.opacity = '1';
}

/**
 * Hide file info panel
 */
function hideFileInfo(tank) {
    if (tank.fileInfoPanel) {
        tank.fileInfoPanel.classList.remove('visible');
        setTimeout(() => {
            tank.fileInfoPanel.style.display = 'none';
        }, 300);
    }
}

/**
 * Check if selected object is still visible
 */
export function checkObjectVisibility(tank) {
    if (!tank.selectedObject || !tank.fileInfoPanel || !tank.fileInfoPanel.classList.contains('visible')) {
        return;
    }

    const objectPosition = tank.selectedObject.position.clone();
    const screenPosition = objectPosition.clone().project(tank.camera);

    if (screenPosition.z > 1 ||
        screenPosition.x < -1.5 || screenPosition.x > 1.5 ||
        screenPosition.y < -1.5 || screenPosition.y > 1.5) {
        hideFileInfo(tank);
    }
}

/**
 * Open a new file preview window
 */
export function openPreview(tank, object) {
    if (!object || !object.userData) return;

    const fileData = object.userData;
    if (!fileData.name) return;

    if (fileData.type === 'folder') {
        enterSideScrollerMode(tank, object);
        return;
    }

    const MAX_PREVIEW_WINDOWS = 5;
    while (tank.previewWindows.length >= MAX_PREVIEW_WINDOWS) {
        closePreviewWindow(tank, tank.previewWindows[0].id);
    }

    const windowId = 'preview-' + Date.now();
    const container = document.getElementById('preview-container');
    if (!container) return;

    const offset = tank.previewWindows.length * 30;
    const startX = 20 + offset;
    const startY = 20 + offset;

    const panel = document.createElement('div');
    panel.id = windowId;
    panel.className = 'preview-panel';
    panel.style.left = startX + 'px';
    panel.style.top = startY + 'px';
    panel.style.zIndex = ++tank.previewZIndex;

    panel.innerHTML = `
        <div class="preview-header">
            <div class="preview-file-info">
                <span class="preview-icon">📄</span>
                <span class="preview-filename">${fileData.name}</span>
            </div>
            <button class="close-btn" data-window-id="${windowId}">&times;</button>
        </div>
        <div class="preview-content">
            <div class="pdf-placeholder">
                <div class="pdf-icon">⏳</div>
                <p>Loading...</p>
            </div>
        </div>
        <div class="preview-footer">
            <span class="preview-meta">Size: ${fileData.size} | Type: ${fileData.type}</span>
        </div>
    `;

    container.appendChild(panel);

    tank.previewWindows.push({ id: windowId, element: panel, fileData });

    const closeBtn = panel.querySelector('.close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePreviewWindow(tank, windowId);
    });

    const header = panel.querySelector('.preview-header');
    setupWindowDrag(panel, header);

    panel.addEventListener('mousedown', () => {
        focusPreviewWindow(tank, windowId);
    });

    const content = panel.querySelector('.preview-content');

    // Use actual file path if available, otherwise fall back to sample pools
    if (fileData.path) {
        loadPreviewContent({ type: 'text', url: fileData.path }, content);
    } else {
        const nameHash = fileData.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

        let poolType;
        if (fileData.name.includes('Report') || fileData.name.includes('Contract') || fileData.name.includes('Policy')) {
            poolType = 'doc';
        } else if (fileData.name.includes('Photo') || fileData.name.includes('IMG') || fileData.name.includes('screenshot') || fileData.name.includes('Chart') || fileData.name.includes('Presentation')) {
            poolType = 'image';
        } else {
            poolType = (nameHash % 3 === 0) ? 'image' : 'text';
        }

        const pool = tank.samplePools[poolType];
        const sampleInfo = pool[nameHash % pool.length];
        loadPreviewContent(sampleInfo, content);
    }

    const hint = document.getElementById('selection-hint');
    if (hint) hint.classList.remove('visible');

    console.log(`Opened preview for: ${fileData.name}`);
}

/**
 * Setup window drag functionality
 */
function setupWindowDrag(panel, header) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('close-btn')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = panel.offsetLeft;
        initialY = panel.offsetTop;

        panel.style.transition = 'none';

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            panel.style.left = (initialX + dx) + 'px';
            panel.style.top = (initialY + dy) + 'px';
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

/**
 * Focus a preview window
 */
function focusPreviewWindow(tank, windowId) {
    const windowData = tank.previewWindows.find(w => w.id === windowId);
    if (windowData) {
        tank.previewWindows.forEach(w => w.element.classList.remove('focused'));
        windowData.element.classList.add('focused');
        windowData.element.style.zIndex = ++tank.previewZIndex;
    }
}

/**
 * Close a specific preview window
 */
export function closePreviewWindow(tank, windowId) {
    const index = tank.previewWindows.findIndex(w => w.id === windowId);
    if (index !== -1) {
        const windowData = tank.previewWindows[index];
        windowData.element.remove();
        tank.previewWindows.splice(index, 1);
        console.log(`Closed preview: ${windowData.fileData.name}`);
    }

    if (tank.previewWindows.length === 0) {
        const hint = document.getElementById('selection-hint');
        if (hint && tank.selectedObject) {
            hint.classList.add('visible');
        }
    }
}

/**
 * Close topmost preview window
 */
export function closePreview(tank) {
    if (tank.previewWindows.length > 0) {
        const topWindow = tank.previewWindows[tank.previewWindows.length - 1];
        closePreviewWindow(tank, topWindow.id);
    }
}

/**
 * Load preview content
 */
async function loadPreviewContent(sampleInfo, container) {
    container.className = 'preview-content';

    try {
        if (sampleInfo.type === 'text') {
            const response = await fetch(sampleInfo.url);
            const text = await response.text();
            container.className = 'preview-content text-preview';
            container.textContent = text;

        } else if (sampleInfo.type === 'image') {
            container.className = 'preview-content image-preview';
            container.innerHTML = `<img src="${sampleInfo.url}" alt="Preview" />`;

        } else if (sampleInfo.type === 'doc') {
            container.className = 'preview-content doc-preview';
            container.innerHTML = `<iframe src="${sampleInfo.url}" title="Document Preview"></iframe>`;

        } else {
            container.innerHTML = `
                <div class="pdf-placeholder">
                    <div class="pdf-icon">❓</div>
                    <p>Unknown file type</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading preview:', error);
        container.innerHTML = `
            <div class="pdf-placeholder">
                <div class="pdf-icon">⚠️</div>
                <p>Failed to load preview</p>
                <p style="color: #666; font-size: 12px;">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Toggle light config panel
 */
export function toggleLightPanel() {
    const panel = document.getElementById('light-panel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

/**
 * Setup the lighting config panel
 */
export function setupLightPanel(tank) {
    const panel = document.getElementById('light-panel');
    if (!panel) return;

    document.getElementById('close-light-panel')?.addEventListener('click', () => {
        panel.classList.add('hidden');
    });

    const updateDisplay = (id, value) => {
        const display = document.getElementById(id + '-val');
        if (display) display.textContent = value;
    };

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

    const colorListener = (id, callback) => {
        const picker = document.getElementById(id);
        if (picker) {
            picker.addEventListener('input', (e) => {
                callback(new THREE.Color(e.target.value));
            });
        }
    };

    sliderListener('ambient-intensity', (v) => { if (tank.ambientLight) tank.ambientLight.intensity = v; });
    colorListener('ambient-color', (c) => { if (tank.ambientLight) tank.ambientLight.color.copy(c); });

    sliderListener('main-intensity', (v) => { if (tank.mainLight) tank.mainLight.intensity = v; });
    colorListener('main-color', (c) => { if (tank.mainLight) tank.mainLight.color.copy(c); });
    sliderListener('main-pos-x', (v) => { if (tank.mainLight) tank.mainLight.position.x = v; });
    sliderListener('main-pos-y', (v) => { if (tank.mainLight) tank.mainLight.position.y = v; });
    sliderListener('main-pos-z', (v) => { if (tank.mainLight) tank.mainLight.position.z = v; });

    sliderListener('underwater-intensity', (v) => { if (tank.underwaterLight) tank.underwaterLight.intensity = v; });
    colorListener('underwater-color', (c) => { if (tank.underwaterLight) tank.underwaterLight.color.copy(c); });

    sliderListener('overhead-intensity', (v) => { if (tank.overheadLight) tank.overheadLight.intensity = v; });
    colorListener('overhead-color', (c) => { if (tank.overheadLight) tank.overheadLight.color.copy(c); });

    sliderListener('caustic-intensity', (v) => {
        if (tank.causticLights) {
            tank.causticLights.forEach(light => light.intensity = v);
        }
    });
    colorListener('caustic-color', (c) => {
        if (tank.causticLights) {
            tank.causticLights.forEach(light => light.color.copy(c));
        }
    });

    // Floor color
    colorListener('floor-color', (c) => {
        if (tank.sandFloor && tank.sandFloor.material) {
            tank.sandFloor.material.color.copy(c);
        }
    });

    // Decoration Y offset controls
    sliderListener('rock-y-offset', (v) => {
        if (tank.floorDecorations) {
            tank.floorDecorations.forEach(dec => {
                if (dec.userData.isRock) {
                    dec.position.y = tank.config.tank.floorY + 1 + v;
                }
            });
        }
    });
    sliderListener('seaweed-y-offset', (v) => {
        if (tank.floorDecorations) {
            tank.floorDecorations.forEach(dec => {
                if (dec.userData.isSeaweed) {
                    dec.position.y = tank.config.tank.floorY - 2 + v;
                }
            });
        }
    });
    sliderListener('starfish-y-offset', (v) => {
        if (tank.floorDecorations) {
            tank.floorDecorations.forEach(dec => {
                if (dec.userData.isStarfish) {
                    dec.position.y = tank.config.tank.floorY + 0.1 + v;
                }
            });
        }
    });

    // PDF model rotation controls
    const degToRad = (deg) => deg * Math.PI / 180;

    sliderListener('pdf-rot-x', (v) => {
        tank.pdfModelRotation = tank.pdfModelRotation || { x: 0, y: 0, z: Math.PI/2 };
        tank.pdfModelRotation.x = degToRad(v);
        // Update all existing PDFs
        tank.pdfs.forEach(pdf => {
            pdf.rotation.x = tank.pdfModelRotation.x + (Math.random() - 0.5) * 0.3;
        });
    });
    sliderListener('pdf-rot-y', (v) => {
        tank.pdfModelRotation = tank.pdfModelRotation || { x: 0, y: 0, z: Math.PI/2 };
        tank.pdfModelRotation.y = degToRad(v);
        // Update all existing PDFs
        tank.pdfs.forEach(pdf => {
            pdf.rotation.y = tank.pdfModelRotation.y + Math.random() * Math.PI * 2;
        });
    });
    sliderListener('pdf-rot-z', (v) => {
        tank.pdfModelRotation = tank.pdfModelRotation || { x: 0, y: 0, z: Math.PI/2 };
        tank.pdfModelRotation.z = degToRad(v);
        // Update all existing PDFs
        tank.pdfs.forEach(pdf => {
            pdf.rotation.z = tank.pdfModelRotation.z + (Math.random() - 0.5) * 0.2;
        });
    });

    sliderListener('tank-width', (v) => {
        tank.config.tank.width = v;
        if (tank.tankBoundsVisible) updateTankBounds(tank);
    });
    sliderListener('tank-height', (v) => {
        tank.config.tank.height = v;
        tank.config.tank.ceilingY = v * 0.75;
        if (tank.tankBoundsVisible) updateTankBounds(tank);
    });
    sliderListener('tank-floor', (v) => {
        tank.config.tank.floorY = v;
        if (tank.sandFloor) tank.sandFloor.position.y = v;
        if (tank.tankBoundsVisible) updateTankBounds(tank);
    });
    sliderListener('tank-ceiling', (v) => {
        tank.config.tank.ceilingY = v;
        if (tank.tankBoundsVisible) updateTankBounds(tank);
    });

    sliderListener('fog-near', (v) => {
        if (tank.scene.fog) tank.scene.fog.near = v;
    });
    sliderListener('fog-far', (v) => {
        if (tank.scene.fog) tank.scene.fog.far = v;
    });
    colorListener('fog-color', (c) => {
        if (tank.scene.fog) tank.scene.fog.color.copy(c);
    });

    document.getElementById('reset-lights')?.addEventListener('click', () => {
        resetLightDefaults(tank);
    });
}

/**
 * Reset all lights to defaults
 */
function resetLightDefaults(tank) {
    if (tank.ambientLight) {
        tank.ambientLight.intensity = 1.2;
        tank.ambientLight.color.set(0xffffff);
    }
    if (tank.mainLight) {
        tank.mainLight.intensity = 1.4;
        tank.mainLight.color.set(0xffffff);
        tank.mainLight.position.set(10, 20, 5);
    }
    if (tank.underwaterLight) {
        tank.underwaterLight.intensity = 0.4;
        tank.underwaterLight.color.set(0x88ccff);
    }
    if (tank.overheadLight) {
        tank.overheadLight.intensity = 0.8;
        tank.overheadLight.color.set(0xffffff);
    }
    if (tank.causticLights) {
        tank.causticLights.forEach(light => {
            light.intensity = 0.6;
            light.color.set(0x44aaff);
        });
    }
    if (tank.scene.fog) {
        tank.scene.fog.near = 15;
        tank.scene.fog.far = 80;
        tank.scene.fog.color.set(0x4477aa);
    }

    tank.config.tank.width = 30;
    tank.config.tank.height = 20;
    tank.config.tank.floorY = -10;
    tank.config.tank.ceilingY = 15;
    if (tank.sandFloor) {
        tank.sandFloor.position.y = -10;
        tank.sandFloor.material.color.set(0xd4af8c);
    }

    // Reset decoration positions
    if (tank.floorDecorations) {
        tank.floorDecorations.forEach(dec => {
            if (dec.userData.isRock) {
                dec.position.y = tank.config.tank.floorY + 1;
            } else if (dec.userData.isSeaweed) {
                dec.position.y = tank.config.tank.floorY - 2;
            } else if (dec.userData.isStarfish) {
                dec.position.y = tank.config.tank.floorY + 0.1;
            }
        });
    }

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
        'tank-width': 30,
        'tank-height': 20,
        'tank-floor': -10,
        'tank-ceiling': 15,
        'floor-color': '#d4af8c',
        'rock-y-offset': 0.5,
        'seaweed-y-offset': 0,
        'starfish-y-offset': 0
    };

    for (const [id, value] of Object.entries(defaults)) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            const display = document.getElementById(id + '-val');
            if (display && typeof value === 'number') {
                display.textContent = value;
            }
        }
    }

    console.log('Lights reset to defaults');
}

/**
 * Hide loading screen
 */
export function hideLoadingScreen() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        setTimeout(() => {
            loadingElement.classList.add('hidden');
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 500);
        }, 500);
    }
}

/**
 * Show initial message
 */
export function showInitialMessage() {
    console.log('Swimming Tank ready! Click to start swimming.');
    setupControlsPanel();
}

/**
 * Setup controls panel toggle
 */
function setupControlsPanel() {
    const toggle = document.getElementById('controls-toggle');
    const content = document.getElementById('controls-content');

    if (!toggle || !content) return;

    let isExpanded = true;

    toggle.addEventListener('click', () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
            content.classList.remove('hidden');
            toggle.textContent = 'Controls ▲';
        } else {
            content.classList.add('hidden');
            toggle.textContent = 'Controls ▼';
        }
    });
}

/**
 * Show error message
 */
export function showErrorMessage(error) {
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
