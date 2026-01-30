/**
 * Frog loading, movement, animation, and multi-frog system
 */
import * as THREE from 'three';

/**
 * Load and setup the GLTF frog model
 */
export function loadFrogModel(tank) {
    const loadingTimeout = setTimeout(() => {
        console.warn('Frog loading timeout - hiding loading screen');
        clearTimeout(tank.initTimeout);
        tank.hideLoadingScreen();
        tank.showInitialMessage();
    }, 5000);

    try {
        tank.loader.load('./models/Frog_Swim.gltf', (gltf) => {
            clearTimeout(loadingTimeout);
            clearTimeout(tank.initTimeout);
            tank.frog = gltf.scene;

            tank.frog.scale.setScalar(2);
            tank.frog.position.copy(tank.frogPosition);
            tank.frog.rotation.copy(tank.frogRotation);

            // Enable shadow casting and receiving for frog
            tank.frog.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            tank.scene.add(tank.frog);

            if (gltf.animations && gltf.animations.length > 0) {
                tank.frogMixer = new THREE.AnimationMixer(tank.frog);
                const swimAction = tank.frogMixer.clipAction(gltf.animations[0]);
                swimAction.play();
            }

            console.log('Frog model loaded and added to scene!');
            updateCameraPosition(tank);
            tank.hideLoadingScreen();
            tank.showInitialMessage();

        }, (progress) => {
            console.log('Loading frog model:', (progress.loaded / progress.total * 100) + '%');
        }, (error) => {
            clearTimeout(loadingTimeout);
            clearTimeout(tank.initTimeout);
            console.error('Error loading frog model:', error);
            tank.hideLoadingScreen();
            tank.showInitialMessage();
        });
    } catch (error) {
        console.error('Exception during GLTF loading setup:', error);
        clearTimeout(loadingTimeout);
        clearTimeout(tank.initTimeout);
        tank.hideLoadingScreen();
        tank.showInitialMessage();
    }
}

/**
 * Update camera position to maintain third-person view
 */
export function updateCameraPosition(tank) {
    if (!tank.frog) return;

    const targetPosition = tank.frog.position.clone().add(tank.cameraOffset);
    tank.camera.position.lerp(targetPosition, 0.1);

    const lookTarget = tank.frog.position.clone();
    lookTarget.y += 4;
    tank.camera.lookAt(lookTarget);
}

/**
 * Update frog movement based on input
 */
export function updateMovement(tank, delta) {
    if (!tank.frog) return;

    const hasHorizontalInput = tank.movement.forward || tank.movement.backward ||
                               tank.movement.left || tank.movement.right;

    // Apply friction
    if (hasHorizontalInput) {
        tank.velocity.x -= tank.velocity.x * tank.config.movement.friction * delta * 0.2;
        tank.velocity.z -= tank.velocity.z * tank.config.movement.friction * delta * 0.2;
    } else {
        const decelerationRate = tank.config.movement.friction * 0.6;
        tank.velocity.x -= tank.velocity.x * decelerationRate * delta;
        tank.velocity.z -= tank.velocity.z * decelerationRate * delta;

        const underwaterResistance = 0.3;
        tank.velocity.x -= tank.velocity.x * underwaterResistance * delta;
        tank.velocity.z -= tank.velocity.z * underwaterResistance * delta;
    }

    tank.velocity.y -= tank.velocity.y * (tank.config.movement.friction * 0.5) * delta;

    // Calculate movement direction
    tank.direction.set(0, 0, 0);

    if (tank.movement.forward) tank.direction.z -= 1;
    if (tank.movement.backward) tank.direction.z += 1;
    if (tank.movement.left) tank.direction.x -= 1;
    if (tank.movement.right) tank.direction.x += 1;

    tank.direction.normalize();

    // Apply movement force
    if (hasHorizontalInput) {
        const cameraQuaternion = tank.camera.quaternion.clone();
        const moveVector = tank.direction.clone();
        moveVector.applyQuaternion(cameraQuaternion);

        const movementForce = moveVector.multiplyScalar(tank.config.movement.speed * delta);
        tank.velocity.add(movementForce);
    }

    // Vertical movement
    if (tank.movement.up) {
        tank.velocity.y += tank.config.movement.verticalSpeed * delta;
    }
    if (tank.movement.down) {
        tank.velocity.y -= tank.config.movement.verticalSpeed * delta;
    }

    // Update dash cooldown
    if (tank.dashCooldown > 0) {
        tank.dashCooldown -= delta;
    }

    // Apply velocity to frog position
    tank.frog.position.add(tank.velocity.clone().multiplyScalar(delta));

    // Clamp to tank bounds
    const tankConfig = tank.config.tank;
    tank.frog.position.x = Math.max(-tankConfig.width, Math.min(tankConfig.width, tank.frog.position.x));
    tank.frog.position.z = Math.max(-tankConfig.width, Math.min(tankConfig.width, tank.frog.position.z));
    tank.frog.position.y = Math.max(tankConfig.floorY, Math.min(tankConfig.ceilingY, tank.frog.position.y));

    tank.frogPosition.copy(tank.frog.position);

    // Handle rotation
    if (hasHorizontalInput) {
        const inputDirection = tank.direction.clone();
        inputDirection.applyQuaternion(tank.camera.quaternion);

        if (inputDirection.length() > 0.1) {
            const targetRotationY = Math.atan2(inputDirection.x, inputDirection.z);
            const currentY = tank.frog.rotation.y;
            let diff = targetRotationY - currentY;

            if (Math.abs(diff) > Math.PI) {
                diff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
            }

            const rotationSpeed = 8.0;
            tank.frog.rotation.y += diff * rotationSpeed * delta;
        }
    } else if (tank.velocity.length() > 0.3) {
        const velocityDirection = tank.velocity.clone().normalize();
        const targetRotationY = Math.atan2(velocityDirection.x, velocityDirection.z);

        const currentY = tank.frog.rotation.y;
        let diff = targetRotationY - currentY;

        if (Math.abs(diff) > Math.PI) {
            diff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
        }

        const rotationSpeed = 2.0;
        tank.frog.rotation.y += diff * rotationSpeed * delta;
    }
}

/**
 * Update autopilot - frog swims on its own when user is idle
 */
export function updateAutopilot(tank, delta) {
    if (!tank.frog || !tank.allObjects || tank.allObjects.length === 0) return;

    // Initialize autopilot state if needed
    if (tank.autopilot === undefined) {
        tank.autopilot = {
            active: false,
            lastInputTime: Date.now(),
            targetObject: null,
            idleTimeout: 5000,           // 5 seconds before autopilot kicks in
            cameraRealignInterval: 8000, // Realign camera every 8 seconds
            lastCameraRealign: Date.now(),
            speed: 0.3                   // Slow swimming speed
        };
    }

    const now = Date.now();
    const timeSinceInput = now - tank.autopilot.lastInputTime;

    // Check if user is providing input
    const hasInput = tank.movement.forward || tank.movement.backward ||
                     tank.movement.left || tank.movement.right ||
                     tank.movement.up || tank.movement.down;

    if (hasInput) {
        tank.autopilot.lastInputTime = now;
        tank.autopilot.active = false;
        tank.autopilot.targetObject = null;
        return;
    }

    // Activate autopilot after idle timeout
    if (timeSinceInput > tank.autopilot.idleTimeout) {
        if (!tank.autopilot.active) {
            tank.autopilot.active = true;
            console.log('Autopilot engaged');
        }

        // Pick a target if we don't have one or reached it
        if (!tank.autopilot.targetObject ||
            tank.frog.position.distanceTo(tank.autopilot.targetObject.position) < 5) {
            // Pick a random object that's not too close
            const candidates = tank.allObjects.filter(obj => {
                const dist = tank.frog.position.distanceTo(obj.position);
                return dist > 8 && dist < 50;
            });

            if (candidates.length > 0) {
                tank.autopilot.targetObject = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        // Swim towards target
        if (tank.autopilot.targetObject) {
            const target = tank.autopilot.targetObject.position;
            const direction = target.clone().sub(tank.frog.position).normalize();

            // Apply gentle movement force
            const force = direction.multiplyScalar(tank.autopilot.speed * delta);
            tank.velocity.add(force);

            // Rotate towards target
            const targetRotationY = Math.atan2(direction.x, direction.z);
            let diff = targetRotationY - tank.frog.rotation.y;

            if (Math.abs(diff) > Math.PI) {
                diff = diff > 0 ? diff - 2 * Math.PI : diff + 2 * Math.PI;
            }

            tank.frog.rotation.y += diff * 2.0 * delta;

            // Gently adjust Y to match target height
            const yDiff = target.y - tank.frog.position.y;
            tank.velocity.y += yDiff * 0.1 * delta;
        }

        // Periodically realign camera
        if (now - tank.autopilot.lastCameraRealign > tank.autopilot.cameraRealignInterval) {
            realignCamera(tank);
            tank.autopilot.lastCameraRealign = now;
        }

        // Keep frog animation going during autopilot
        tank.swimTime += delta * 0.5;
        if (tank.frogMixer) {
            tank.frogMixer.update(delta * 0.5);
        }
    }
}

/**
 * Realign camera behind the frog
 */
export function realignCamera(tank) {
    if (!tank.frog) return;

    // Get frog's forward direction
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(tank.frog.quaternion);

    // Position camera behind frog
    const cameraDistance = 10;
    const cameraHeight = 5;

    tank.cameraOffset.set(
        -forward.x * cameraDistance,
        cameraHeight,
        -forward.z * cameraDistance
    );

    // Reset mouse look angles
    tank.euler.set(0, 0, 0);
    tank.mouseX = 0;
    tank.mouseY = 0;

    console.log('Camera realigned');
}

/**
 * Update frog animations based on movement
 */
export function updateFrogAnimation(tank, delta) {
    if (!tank.frog) return;

    const isMoving = Object.values(tank.movement).some(moving => moving);

    if (isMoving) {
        tank.swimTime += delta;
    }

    if (tank.frogMixer) {
        if (isMoving) {
            tank.frogMixer.update(delta);
        }
    }

    if (isMoving) {
        const bobSpeed = tank.config.swimming.strokeSpeed * 2;
        const bobAmplitude = 0.05;
        tank.frog.position.y += Math.sin(tank.swimTime * bobSpeed) * bobAmplitude * delta;
    } else {
        const floatSpeed = tank.config.swimming.floatSpeed;
        const floatAmplitude = 0.02;
        tank.frog.position.y += Math.sin(tank.swimTime * floatSpeed) * floatAmplitude * delta;
    }

    tank.frogPosition.copy(tank.frog.position);
}

/**
 * Perform dash/boost in current movement direction
 */
export function performDash(tank) {
    if (!tank.frog || tank.dashCooldown > 0) return;

    let dashDirection = new THREE.Vector3();

    const hasHorizontalInput = tank.movement.forward || tank.movement.backward ||
                               tank.movement.left || tank.movement.right;

    if (hasHorizontalInput) {
        if (tank.movement.forward) dashDirection.z -= 1;
        if (tank.movement.backward) dashDirection.z += 1;
        if (tank.movement.left) dashDirection.x -= 1;
        if (tank.movement.right) dashDirection.x += 1;

        dashDirection.normalize();
        dashDirection.applyQuaternion(tank.camera.quaternion);
    } else {
        dashDirection.set(0, 0, 1);
        dashDirection.applyQuaternion(tank.frog.quaternion);
    }

    tank.velocity.add(dashDirection.multiplyScalar(tank.dashForce));
    tank.dashCooldown = 0.5;

    // Create dash bubbles
    if (tank.createDashBubbles) {
        tank.createDashBubbles();
    }

    console.log('Dash activated!');
}

/**
 * Reset camera offset behind frog
 */
export function resetCamera(tank) {
    if (!tank.frog) return;

    const currentCameraPos = tank.camera.position.clone();
    const frogPos = tank.frog.position.clone();
    const currentOffset = currentCameraPos.sub(frogPos);

    const currentDistance = Math.sqrt(currentOffset.x * currentOffset.x + currentOffset.z * currentOffset.z);
    const currentHeight = currentOffset.y;

    const frogDirection = new THREE.Vector3(0, 0, 1);
    frogDirection.applyQuaternion(tank.frog.quaternion);

    tank.cameraOffset = frogDirection.multiplyScalar(-currentDistance);
    tank.cameraOffset.y = currentHeight;

    console.log(`Camera offset reset behind frog (distance: ${currentDistance.toFixed(1)}, height: ${currentHeight.toFixed(1)})`);
}

/**
 * Create additional frogs for multi-frog mode
 */
export function createAdditionalFrogs(tank) {
    if (!tank.multiFrogMode) return;

    for (let i = 0; i < 5; i++) {
        tank.loader.load('./models/Frog_Swim.gltf', (gltf) => {
            const otherFrog = gltf.scene;

            otherFrog.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            otherFrog.visible = true;
            otherFrog.scale.setScalar(2);
            otherFrog.position.set(0, 0, 0);

            const bbox = new THREE.Box3().setFromObject(otherFrog);
            const localTop = bbox.max.y;

            const angle = (i / 5) * Math.PI * 2;
            const radius = 18 + i * 6;
            const x = Math.cos(angle) * radius;
            const y = 10 + i * 3;
            const z = Math.sin(angle) * radius;

            otherFrog.position.set(x, y, z);
            otherFrog.rotation.y = Math.random() * Math.PI * 2;
            otherFrog.userData.isFrog = true;
            otherFrog.userData.frogIndex = i;

            const mixer = new THREE.AnimationMixer(otherFrog);
            if (gltf.animations && gltf.animations.length > 0) {
                const swimAction = mixer.clipAction(gltf.animations[0]);
                swimAction.play();
            }

            const nameLabel = createFrogNameLabel(tank.frogNames[i]);
            nameLabel.position.set(0, localTop - 0.5, 0);
            otherFrog.add(nameLabel);

            const frogData = {
                mesh: otherFrog,
                mixer: mixer,
                name: tank.frogNames[i],
                nameLabel: nameLabel,
                position: otherFrog.position,
                velocity: new THREE.Vector3(),
                acceleration: new THREE.Vector3(),
                target: null,
                speed: 3.0 + Math.random() * 2.0,
                maxForce: 2.0,
                separationRadius: 4.0,
                minSeparation: 1.5,
                isMoving: false
            };

            tank.otherFrogs.push(frogData);
            tank.scene.add(otherFrog);
        });
    }
}

/**
 * Create a name label for a frog
 */
function createFrogNameLabel(name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#ffffff';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1
    });

    const geometry = new THREE.PlaneGeometry(2, 0.5);
    const label = new THREE.Mesh(geometry, material);

    return label;
}

/**
 * Update additional frogs movement and animation
 */
export function updateAdditionalFrogs(tank, delta) {
    if (!tank.multiFrogMode) return;

    tank.otherFrogs.forEach((frogData) => {
        if (frogData.mixer) {
            frogData.mixer.update(delta);
        }

        if (frogData.target && frogData.isMoving) {
            updateFrogMovement(tank, frogData, delta);
        }

        if (frogData.nameLabel) {
            frogData.nameLabel.lookAt(tank.camera.position);
        }
    });
}

/**
 * Update individual frog movement towards target
 */
function updateFrogMovement(tank, frogData, delta) {
    if (!frogData.target) return;

    const tooClose = checkMinimumSeparation(tank, frogData);

    frogData.acceleration.set(0, 0, 0);

    if (tooClose) {
        const separationForce = calculateSeparation(tank, frogData);
        separationForce.multiplyScalar(1.5);
        frogData.acceleration.add(separationForce);
    } else {
        const seekForce = calculateSeek(frogData, frogData.target.position);
        seekForce.multiplyScalar(1.0);
        frogData.acceleration.add(seekForce);

        const separationForce = calculateSeparation(tank, frogData);
        separationForce.multiplyScalar(0.8);
        frogData.acceleration.add(separationForce);
    }

    frogData.velocity.add(frogData.acceleration.multiplyScalar(delta));

    if (frogData.velocity.length() > frogData.speed) {
        frogData.velocity.normalize().multiplyScalar(frogData.speed);
    }

    const displacement = frogData.velocity.clone().multiplyScalar(delta);
    const newPosition = frogData.position.clone().add(displacement);

    if (!wouldCauseOverlap(tank, frogData, newPosition)) {
        frogData.position.copy(newPosition);
    } else {
        frogData.velocity.multiplyScalar(0.5);
    }

    const distanceToTarget = frogData.position.distanceTo(frogData.target.position);
    if (distanceToTarget < 5.0) {
        frogData.isMoving = false;
        frogData.target = null;
        frogData.velocity.set(0, 0, 0);
        return;
    }

    if (frogData.velocity.length() > 0.1) {
        const angle = Math.atan2(frogData.velocity.x, frogData.velocity.z);
        frogData.mesh.rotation.y = angle;
    }
}

/**
 * Check if frog is too close to another frog
 */
function checkMinimumSeparation(tank, frogData) {
    if (frogData.position.distanceTo(tank.frogPosition) < frogData.minSeparation) {
        return true;
    }

    for (const otherFrog of tank.otherFrogs) {
        if (otherFrog === frogData) continue;
        if (frogData.position.distanceTo(otherFrog.position) < frogData.minSeparation) {
            return true;
        }
    }

    return false;
}

/**
 * Check if a new position would cause overlap
 */
function wouldCauseOverlap(tank, frogData, newPosition) {
    const minDistance = frogData.minSeparation;

    if (newPosition.distanceTo(tank.frogPosition) < minDistance) {
        return true;
    }

    for (const otherFrog of tank.otherFrogs) {
        if (otherFrog === frogData) continue;
        if (newPosition.distanceTo(otherFrog.position) < minDistance) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate seek steering force
 */
function calculateSeek(frogData, targetPosition) {
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
 * Calculate separation steering force
 */
function calculateSeparation(tank, frogData) {
    const steer = new THREE.Vector3();
    let count = 0;

    const distanceToPlayer = frogData.position.distanceTo(tank.frogPosition);
    if (distanceToPlayer < frogData.separationRadius && distanceToPlayer > 0.01) {
        const repulsionStrength = 1.0 - (distanceToPlayer / frogData.separationRadius);

        const diff = new THREE.Vector3()
            .subVectors(frogData.position, tank.frogPosition)
            .normalize()
            .multiplyScalar(repulsionStrength);
        steer.add(diff);
        count++;
    }

    for (const otherFrog of tank.otherFrogs) {
        if (otherFrog === frogData) continue;

        const distance = frogData.position.distanceTo(otherFrog.position);
        if (distance < frogData.separationRadius && distance > 0.01) {
            const repulsionStrength = 1.0 - (distance / frogData.separationRadius);

            const diff = new THREE.Vector3()
                .subVectors(frogData.position, otherFrog.position)
                .normalize()
                .multiplyScalar(repulsionStrength);
            steer.add(diff);
            count++;
        }
    }

    if (count > 0) {
        steer.divideScalar(count);
        if (steer.length() > 0) {
            steer.normalize().multiplyScalar(frogData.speed * 0.5);
            steer.sub(frogData.velocity);
            steer.clampLength(0, frogData.maxForce);
        }
    }

    return steer;
}

/**
 * Make all frogs swim towards a selected folder
 */
export function makeFrogsSwimToFolder(tank, folder) {
    if (!tank.multiFrogMode) return;

    tank.otherFrogs.forEach((frogData) => {
        frogData.target = folder;
        frogData.isMoving = true;
    });

    console.log(`All frogs swimming towards: ${folder.userData.name}`);
}

/**
 * Toggle multi-frog mode
 */
export function toggleMultiFrogMode(tank) {
    tank.multiFrogMode = !tank.multiFrogMode;
    console.log('Multi-frog mode:', tank.multiFrogMode ? 'ON' : 'OFF');

    if (tank.multiFrogMode) {
        createAdditionalFrogs(tank);
    } else {
        tank.otherFrogs.forEach((frogData) => {
            tank.scene.remove(frogData.mesh);
        });
        tank.otherFrogs = [];
    }
}
