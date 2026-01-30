/**
 * File folders and PDF objects - creation, collision, selection
 */
import * as THREE from 'three';
import { generateRandomFileName, generateRandomPDFName, generateRandomFileSize, parseSizeToGB, parseSizeToMB } from './utils.js';

/**
 * Create floating file folders using Folder.glb - one for each folder in fileData
 */
export function createFileFolders(tank) {
    tank.loader.load('./models/Folder.glb', (gltf) => {
        const folderModel = gltf.scene;

        // Normalize model size based on bounding box
        const bbox = new THREE.Box3().setFromObject(folderModel);
        const modelSize = new THREE.Vector3();
        bbox.getSize(modelSize);
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        const targetSize = 1.0;
        const normalizeScale = targetSize / maxDimension;

        const floorY = tank.config.tank.floorY;
        const ceilingY = tank.config.tank.ceilingY;

        // Create one folder for each entry in fileData
        tank.fileData.forEach((fileData, i) => {
            const folderInstance = folderModel.clone();

            // Position based on semantic area
            const areaKey = fileData.area || 'center';
            const area = tank.areaPositions[areaKey] || tank.areaPositions.center;
            const spreadRadius = 5;  // Tighter clusters
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;

            const x = area.x + Math.cos(angle) * distance;
            // Spawn at 0-60% of tank height (not at top)
            const heightRange = (ceilingY - floorY) * 0.6;
            const y = floorY + 2 + Math.random() * heightRange;
            const z = area.z + Math.sin(angle) * distance;

            const baseScale = 3.0;
            const finalScale = normalizeScale * baseScale;

            folderInstance.scale.setScalar(finalScale);
            folderInstance.position.set(x, y, z);
            folderInstance.rotation.x = (Math.random() - 0.5) * 0.3;
            folderInstance.rotation.y = Math.random() * Math.PI * 2;
            folderInstance.rotation.z = (Math.random() - 0.5) * 0.2;

            folderInstance.userData = { ...fileData };

            const collisionGeometry = new THREE.SphereGeometry(tank.config.world.collisionDistance, 16, 8);
            const collisionMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.2,
                wireframe: true
            });
            const collisionSphere = new THREE.Mesh(collisionGeometry, collisionMaterial);
            collisionSphere.position.copy(folderInstance.position);
            collisionSphere.scale.copy(folderInstance.scale);
            collisionSphere.visible = false;  // Hidden by default

            tank.scene.add(folderInstance);
            tank.scene.add(collisionSphere);
            tank.folders.push(folderInstance);
            tank.collisionSpheres.push(collisionSphere);
        });

        console.log(`Created ${tank.fileData.length} folder instances`);
        updateCombinedObjects(tank);

    }, (progress) => {
        console.log('Loading Folder.glb progress:', (progress.loaded / progress.total * 100) + '%');
    }, (error) => {
        console.error('Error loading Folder.glb:', error);
        createFileFoldersOriginal(tank);
    });
}

/**
 * Fallback folder creation
 */
function createFileFoldersOriginal(tank) {
    const clusters = {
        work: { x: -10, y: 5, z: -8, radius: 6 },
        personal: { x: 10, y: 5, z: -8, radius: 6 },
        system: { x: 0, y: 5, z: 10, radius: 6 }
    };

    for (let i = 0; i < tank.config.world.objectCount; i++) {
        const randomFileData = tank.fileData[Math.floor(Math.random() * tank.fileData.length)];
        const cluster = randomFileData.cluster || 'misc';
        const clusterCenter = clusters[cluster] || { x: 0, y: 5, z: 0, radius: 8 };

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * clusterCenter.radius;
        const x = clusterCenter.x + Math.cos(angle) * distance;
        const y = clusterCenter.y + (Math.random() - 0.5) * 6;
        const z = clusterCenter.z + Math.sin(angle) * distance;

        const fileData = {
            ...randomFileData,
            originalName: randomFileData.name,
            name: generateRandomFileName(randomFileData.name),
            size: generateRandomFileSize(randomFileData.size),
            files: Math.floor(randomFileData.files * (0.7 + Math.random() * 0.6))
        };

        const sizeInGB = parseSizeToGB(fileData.size);
        const baseScale = 6.0;
        const sizeMultiplier = Math.max(0.5, Math.min(2.0, sizeInGB / 10));
        const finalScale = baseScale * sizeMultiplier;

        const object = createCuteFolder(tank, x, y, z, fileData.name, finalScale);
        object.userData = fileData;

        tank.folders.push(object);
    }

    updateCombinedObjects(tank);
}

/**
 * Create PDF files using pdf.gltf
 */
export function createPDFFiles(tank) {
    tank.loader.load('./models/pdf3.glb', (gltf) => {
        const pdfModel = gltf.scene;

        // Model is upright by default, no base rotation needed

        // Normalize model size based on bounding box
        // This ensures any model gets scaled to a consistent base size
        const bbox = new THREE.Box3().setFromObject(pdfModel);
        const modelSize = new THREE.Vector3();
        bbox.getSize(modelSize);
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        const targetSize = 1.0; // Target base size of 1 unit
        const normalizeScale = targetSize / maxDimension;

        console.log(`PDF model original size: ${maxDimension.toFixed(2)}, normalize scale: ${normalizeScale.toFixed(4)}`);

        // PDFs - front area, above floor
        const clusters = {
            work: { x: -10, y: 3, z: -10, radius: 6 },
            personal: { x: 10, y: 5, z: -12, radius: 6 },
            system: { x: 0, y: 2, z: -8, radius: 5 },
            misc: { x: 5, y: 4, z: -15, radius: 6 }
        };

        const pdfCount = Math.floor(tank.config.world.objectCount * 0.4);

        for (let i = 0; i < pdfCount; i++) {
            const randomPdfData = tank.pdfData[Math.floor(Math.random() * tank.pdfData.length)];
            const cluster = randomPdfData.cluster || 'misc';
            const clusterCenter = clusters[cluster] || { x: 0, y: 8, z: 0, radius: 10 };

            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * clusterCenter.radius;
            const x = clusterCenter.x + Math.cos(angle) * distance;
            const y = clusterCenter.y + (Math.random() - 0.5) * 4;
            const z = clusterCenter.z + Math.sin(angle) * distance;

            const pdfInstance = pdfModel.clone();
            const pdfData = {
                ...randomPdfData,
                originalName: randomPdfData.name,
                name: generateRandomPDFName(randomPdfData.name),
                size: generateRandomFileSize(randomPdfData.size),
                pages: Math.floor(randomPdfData.pages * (0.7 + Math.random() * 0.6))
            };

            // Apply normalize scale first, then file size multiplier
            const sizeInMB = parseSizeToMB(pdfData.size);
            const baseScale = 2.0; // Base visual size after normalization
            const sizeMultiplier = Math.max(0.5, Math.min(2.0, sizeInMB / 5));
            const finalScale = normalizeScale * baseScale * sizeMultiplier;

            pdfInstance.scale.setScalar(finalScale);
            pdfInstance.position.set(x, y, z);
            // Random wobble only (model is upright by default)
            pdfInstance.rotation.x = (Math.random() - 0.5) * 0.3;
            pdfInstance.rotation.y = Math.random() * Math.PI * 2;
            pdfInstance.rotation.z = (Math.random() - 0.5) * 0.2;

            pdfInstance.userData = pdfData;

            const collisionGeometry = new THREE.SphereGeometry(tank.config.world.collisionDistance, 16, 8);
            const collisionMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.2,
                wireframe: true
            });
            const collisionSphere = new THREE.Mesh(collisionGeometry, collisionMaterial);
            collisionSphere.position.copy(pdfInstance.position);
            collisionSphere.scale.copy(pdfInstance.scale);
            collisionSphere.visible = false;  // Hidden by default

            tank.scene.add(pdfInstance);
            tank.scene.add(collisionSphere);
            tank.pdfs.push(pdfInstance);
            tank.collisionSpheres.push(collisionSphere);
        }

        console.log(`Created ${pdfCount} PDF instances`);
        updateCombinedObjects(tank);

        // Create bubble streams after all objects loaded
        if (tank.createObjectBubbleStreams) {
            tank.createObjectBubbleStreams();
        }

    }, (progress) => {
        console.log('Loading PDF.gltf progress:', (progress.loaded / progress.total * 100) + '%');
    }, (error) => {
        console.error('Error loading PDF.gltf:', error);
        createPDFFilesOriginal(tank);
    });
}

/**
 * Fallback PDF creation
 */
function createPDFFilesOriginal(tank) {
    const clusters = {
        work: { x: -10, y: 5, z: -8, radius: 5 },
        personal: { x: 10, y: 5, z: -8, radius: 5 },
        system: { x: 0, y: 5, z: 10, radius: 5 },
        misc: { x: -5, y: 5, z: 5, radius: 6 }
    };

    const pdfCount = Math.floor(tank.config.world.objectCount * 0.4);

    for (let i = 0; i < pdfCount; i++) {
        const randomPdfData = tank.pdfData[Math.floor(Math.random() * tank.pdfData.length)];
        const cluster = randomPdfData.cluster || 'misc';
        const clusterCenter = clusters[cluster] || { x: 0, y: 8, z: 0, radius: 10 };

        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * clusterCenter.radius;
        const x = clusterCenter.x + Math.cos(angle) * distance;
        const y = clusterCenter.y + (Math.random() - 0.5) * 4;
        const z = clusterCenter.z + Math.sin(angle) * distance;

        const label = generateRandomPDFName(randomPdfData.name);
        const object = createCutePDF(tank, x, y, z, label);

        object.userData = {
            ...randomPdfData,
            originalName: randomPdfData.name,
            name: label,
            size: generateRandomFileSize(randomPdfData.size),
            pages: Math.floor(randomPdfData.pages * (0.7 + Math.random() * 0.6))
        };

        tank.pdfs.push(object);
    }

    tank.allObjects = [...tank.folders, ...tank.pdfs];

    if (tank.createObjectBubbleStreams) {
        tank.createObjectBubbleStreams();
    }
}

/**
 * Update combined objects array
 */
export function updateCombinedObjects(tank) {
    tank.allObjects = [
        ...tank.folders,
        ...tank.pdfs,
        ...(tank.txtFiles || []),
        ...(tank.imageFiles || [])
    ];
}

/**
 * Create text files using txt.glb - one for each file in txtData
 */
export function createTxtFiles(tank) {
    tank.loader.load('./models/txt.glb', (gltf) => {
        const txtModel = gltf.scene;

        // Normalize model size
        const bbox = new THREE.Box3().setFromObject(txtModel);
        const modelSize = new THREE.Vector3();
        bbox.getSize(modelSize);
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        const normalizeScale = 1.0 / maxDimension;

        const floorY = tank.config.tank.floorY;
        const ceilingY = tank.config.tank.ceilingY;

        // Create one instance for each actual file in txtData
        tank.txtData.forEach((fileData, i) => {
            const instance = txtModel.clone();

            // Position based on semantic area
            const areaKey = fileData.area || 'center';
            const area = tank.areaPositions[areaKey] || tank.areaPositions.center;
            const spreadRadius = 6;  // Tighter clusters
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadRadius;

            const x = area.x + Math.cos(angle) * distance;
            // Spawn at 0-60% of tank height (not at top)
            const heightRange = (ceilingY - floorY) * 0.6;
            const y = floorY + 2 + Math.random() * heightRange;
            const z = area.z + Math.sin(angle) * distance;

            const baseScale = 2.0;
            const finalScale = normalizeScale * baseScale;

            instance.scale.setScalar(finalScale);
            instance.position.set(x, y, z);
            instance.rotation.x = (Math.random() - 0.5) * 0.3;
            instance.rotation.y = Math.random() * Math.PI * 2;
            instance.rotation.z = (Math.random() - 0.5) * 0.2;

            instance.userData = { ...fileData };

            tank.scene.add(instance);
            tank.txtFiles.push(instance);
        });

        console.log(`Created ${tank.txtData.length} TXT instances`);
        updateCombinedObjects(tank);

    }, undefined, (error) => {
        console.error('Error loading txt.glb:', error);
    });
}

/**
 * Create image files (jpeg/png) - using txt.glb as placeholder for now
 */
export function createImageFiles(tank) {
    tank.loader.load('./models/image.glb', (gltf) => {
        const imageModel = gltf.scene;

        // Normalize model size
        const bbox = new THREE.Box3().setFromObject(imageModel);
        const modelSize = new THREE.Vector3();
        bbox.getSize(modelSize);
        const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        const normalizeScale = 1.0 / maxDimension;

        console.log(`Image model original size: ${maxDimension.toFixed(2)}`);

        // Image files - back right area (z positive, x positive)
        const clusters = {
            work: { x: 12, y: 2, z: 10, radius: 5 },
            personal: { x: 15, y: 5, z: 12, radius: 5 },
            system: { x: 10, y: 3, z: 15, radius: 4 },
            misc: { x: 18, y: 4, z: 12, radius: 5 }
        };

        const imageCount = Math.floor(tank.config.world.objectCount * 0.25);

        for (let i = 0; i < imageCount; i++) {
            const randomData = tank.imageData[Math.floor(Math.random() * tank.imageData.length)];
            const cluster = randomData.cluster || 'misc';
            const clusterCenter = clusters[cluster] || { x: 0, y: 10, z: 0, radius: 8 };

            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * clusterCenter.radius;
            const x = clusterCenter.x + Math.cos(angle) * distance;
            const y = clusterCenter.y + (Math.random() - 0.5) * 4;
            const z = clusterCenter.z + Math.sin(angle) * distance;

            const instance = imageModel.clone();
            const ext = randomData.type === 'jpeg' ? '.jpg' : '.png';
            const fileData = {
                ...randomData,
                name: randomData.name.replace(/\.(jpg|jpeg|png)$/i, '') + '_' + Math.floor(Math.random() * 1000) + ext,
            };

            const baseScale = 2.5;
            const finalScale = normalizeScale * baseScale;

            instance.scale.setScalar(finalScale);
            instance.position.set(x, y, z);
            instance.rotation.x = (Math.random() - 0.5) * 0.3;
            instance.rotation.y = Math.random() * Math.PI * 2;
            instance.rotation.z = (Math.random() - 0.5) * 0.2;

            instance.userData = fileData;

            tank.scene.add(instance);
            tank.imageFiles.push(instance);
        }

        console.log(`Created ${imageCount} image file instances`);
        updateCombinedObjects(tank);

    }, undefined, (error) => {
        console.error('Error loading image placeholder model:', error);
    });
}

/**
 * Create a rounded file folder (fallback)
 */
function createCuteFolder(tank, x, y, z, label, scale = 6.0) {
    const folderGroup = new THREE.Group();

    const folderGeometry = createRoundedBoxGeometry(1.6, 1.0, 0.3, 0.1);
    folderGeometry.computeVertexNormals();
    const folderMaterial = createSoftMaterial(0xffcc00, false, 1.0);

    const folderMesh = new THREE.Mesh(folderGeometry, folderMaterial);
    folderGroup.add(folderMesh);

    const tabGeometry = createRoundedBoxGeometry(0.8, 0.3, 0.31, 0.08);
    tabGeometry.computeVertexNormals();
    const tabMesh = new THREE.Mesh(tabGeometry, folderMaterial);
    tabMesh.position.set(-0.4, 0.65, 0);
    folderGroup.add(tabMesh);

    const paperMaterial = createSoftMaterial(0xf8f8f8, true, 0.9);

    for (let i = 0; i < 3; i++) {
        const paperGeometry = new THREE.BoxGeometry(1.4, 0.02, 0.25, 4, 1, 4);
        const paperMesh = new THREE.Mesh(paperGeometry, paperMaterial);
        paperMesh.position.set(0, 0.3 - (i * 0.05), (i * 0.02) - 0.01);
        folderGroup.add(paperMesh);
    }

    folderGroup.scale.setScalar(scale);
    folderGroup.position.set(x, y, z);
    folderGroup.rotation.x = (Math.random() - 0.5) * 0.2;
    folderGroup.rotation.y = Math.random() * Math.PI * 2;
    folderGroup.rotation.z = (Math.random() - 0.5) * 0.1;

    tank.scene.add(folderGroup);
    return folderGroup;
}

/**
 * Create a PDF document (fallback)
 */
function createCutePDF(tank, x, y, z, label) {
    const pdfGroup = new THREE.Group();

    const pdfGeometry = createRoundedBoxGeometry(0.8, 1.1, 0.05, 0.08);
    pdfGeometry.computeVertexNormals();
    const pdfMaterial = createSoftMaterial(0xffffff, false, 1.0);

    const pdfMesh = new THREE.Mesh(pdfGeometry, pdfMaterial);
    pdfGroup.add(pdfMesh);

    const lineMaterial = createSoftMaterial(0xcccccc, true, 0.8);

    for (let i = 0; i < 6; i++) {
        const lineGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.051, 4, 1, 1);
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        lineMesh.position.set(0, 0.3 - (i * 0.12), 0.001);
        pdfGroup.add(lineMesh);
    }

    const foldGeometry = new THREE.SphereGeometry(0.04, 8, 6);
    const foldMaterial = createSoftMaterial(0xe8e8e8, false, 1.0);
    const foldMesh = new THREE.Mesh(foldGeometry, foldMaterial);
    foldMesh.position.set(0.32, 0.47, 0.026);
    pdfGroup.add(foldMesh);

    pdfGroup.position.set(x, y, z);
    pdfGroup.rotation.x = (Math.random() - 0.5) * 0.2;
    pdfGroup.rotation.y = Math.random() * Math.PI * 2;
    pdfGroup.rotation.z = (Math.random() - 0.5) * 0.1;

    tank.scene.add(pdfGroup);
    return pdfGroup;
}

/**
 * Create rounded box geometry
 */
function createRoundedBoxGeometry(width, height, depth, radius) {
    if (THREE.RoundedBoxGeometry) {
        return new THREE.RoundedBoxGeometry(width, height, depth, 16, radius);
    }

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

    return new THREE.BoxGeometry(width, height, depth, 16, 16, 16);
}

/**
 * Create soft material
 */
function createSoftMaterial(color, transparent = false, opacity = 1.0) {
    return new THREE.MeshPhongMaterial({
        color: color,
        transparent: transparent,
        opacity: opacity,
        shininess: 30,
        specular: 0x222222
    });
}

/**
 * Handle collision detection with floating objects
 */
export function checkCollisions(tank) {
    if (!tank.frog) return;

    const frogPosition = tank.frog.position;
    const collisionDistance = tank.config.world.collisionDistance;

    tank.allObjects.forEach(object => {
        const distance = frogPosition.distanceTo(object.position);
        if (distance < collisionDistance && distance > 0.1) {
            const pushStrength = (collisionDistance - distance) / collisionDistance;
            const maxPushForce = 0.05;
            const pushForce = pushStrength * maxPushForce;

            const pushDirection = new THREE.Vector3();
            pushDirection.subVectors(frogPosition, object.position);
            pushDirection.normalize();
            pushDirection.multiplyScalar(pushForce);

            tank.velocity.add(pushDirection);
            tank.velocity.multiplyScalar(0.99);
        }
    });
}

/**
 * Toggle collision visualization
 */
export function toggleCollisionVisualization(tank) {
    tank.collisionSpheres.forEach(sphere => {
        sphere.visible = !sphere.visible;
    });

    const status = tank.collisionSpheres.length > 0 && tank.collisionSpheres[0].visible ? 'ON' : 'OFF';
    console.log(`Collision visualization: ${status}`);
}
