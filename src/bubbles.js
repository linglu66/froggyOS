/**
 * Bubble system - creation, pooling, and animation
 */
import * as THREE from 'three';

/**
 * Create a realistic bubble material with fresnel effect
 */
export function createBubbleMaterial(options = {}) {
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
                vec3 viewDir = normalize(vViewPosition);
                float fresnel = 1.0 - abs(dot(viewDir, vNormal));
                fresnel = pow(fresnel, rimPower);

                float alpha = mix(baseOpacity, rimOpacity, fresnel);

                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                float specular = pow(max(dot(reflect(-lightDir, vNormal), viewDir), 0.0), 32.0);

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
 * Get a bubble from the pool or create a new one
 */
export function getBubbleFromPool(tank, size = 0.05) {
    let bubble;

    if (tank.bubblePool.length > 0) {
        bubble = tank.bubblePool.pop();
        bubble.scale.setScalar(1);
        bubble.visible = true;
    } else {
        const bubbleGeometry = new THREE.SphereGeometry(size, 12, 8);
        const bubbleMaterial = createBubbleMaterial({
            baseOpacity: 0.05,
            rimOpacity: 0.5,
            rimPower: 2.0,
            color: new THREE.Color(0xcceeFF),
            emissiveColor: new THREE.Color(0x001122)
        });
        bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    }

    return bubble;
}

/**
 * Return a bubble to the pool for reuse
 */
export function returnBubbleToPool(tank, bubble) {
    tank.scene.remove(bubble);
    bubble.visible = false;

    if (tank.bubblePool.length < tank.maxPoolSize) {
        tank.bubblePool.push(bubble);
    } else {
        bubble.geometry.dispose();
        bubble.material.dispose();
    }
}

/**
 * Create bubble trail behind the frog
 */
export function createBubbleTrail(tank) {
    if (!tank.frog) return;

    const bubbleCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < bubbleCount; i++) {
        const frogDirection = new THREE.Vector3(0, 0, 1);
        frogDirection.applyQuaternion(tank.frog.quaternion);

        const bubblePosition = tank.frog.position.clone();
        bubblePosition.add(frogDirection.multiplyScalar(-1.5 - Math.random() * 0.8));
        bubblePosition.x += (Math.random() - 0.5) * 1.2;
        bubblePosition.y += (Math.random() - 0.5) * 0.8;
        bubblePosition.z += (Math.random() - 0.5) * 1.2;

        const bubble = getBubbleFromPool(tank);
        bubble.position.copy(bubblePosition);

        if (bubble.material.uniforms) {
            bubble.material.uniforms.baseOpacity.value = 0.03 + Math.random() * 0.05;
            bubble.material.uniforms.rimOpacity.value = 0.4 + Math.random() * 0.3;
            bubble.material.uniforms.rimPower.value = 1.8 + Math.random() * 0.8;
        }

        const life = 2.0 + Math.random() * 1.0;
        bubble.userData = {
            life: life,
            maxLife: life,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                0.4 + Math.random() * 0.3,
                (Math.random() - 0.5) * 0.15
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 2.0,
                (Math.random() - 0.5) * 2.0,
                (Math.random() - 0.5) * 2.0
            ),
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 2.0 + Math.random() * 3.0
        };

        tank.scene.add(bubble);
        tank.bubbles.push(bubble);
    }
}

/**
 * Create dash bubbles burst effect
 */
export function createDashBubbles(tank) {
    if (!tank.frog) return;

    for (let i = 0; i < 5; i++) {
        const frogDirection = new THREE.Vector3(0, 0, 1);
        frogDirection.applyQuaternion(tank.frog.quaternion);

        const bubblePosition = tank.frog.position.clone();
        bubblePosition.add(frogDirection.multiplyScalar(-1.0 - Math.random() * 0.5));
        bubblePosition.x += (Math.random() - 0.5) * 2.0;
        bubblePosition.y += (Math.random() - 0.5) * 1.5;
        bubblePosition.z += (Math.random() - 0.5) * 2.0;

        const bubble = getBubbleFromPool(tank);
        bubble.position.copy(bubblePosition);

        if (bubble.material.uniforms) {
            bubble.material.uniforms.baseOpacity.value = 0.05 + Math.random() * 0.05;
            bubble.material.uniforms.rimOpacity.value = 0.6 + Math.random() * 0.3;
            bubble.material.uniforms.rimPower.value = 1.5 + Math.random() * 0.5;
        }

        const life = 1.5 + Math.random() * 0.5;
        bubble.userData = {
            life: life,
            maxLife: life,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                0.6 + Math.random() * 0.4,
                (Math.random() - 0.5) * 0.4
            ),
            rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 4.0,
                (Math.random() - 0.5) * 4.0,
                (Math.random() - 0.5) * 4.0
            ),
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 4.0 + Math.random() * 4.0,
            scale: 1.0 + Math.random() * 0.3
        };

        tank.scene.add(bubble);
        tank.bubbles.push(bubble);
    }
}

/**
 * Update bubble trail animations
 */
export function updateBubbleTrail(tank, delta) {
    for (let i = tank.bubbles.length - 1; i >= 0; i--) {
        const bubble = tank.bubbles[i];
        const data = bubble.userData;

        bubble.position.add(data.velocity.clone().multiplyScalar(delta));

        if (data.rotationSpeed) {
            bubble.rotation.x += data.rotationSpeed.x * delta;
            bubble.rotation.y += data.rotationSpeed.y * delta;
            bubble.rotation.z += data.rotationSpeed.z * delta;
        }

        if (data.wobble !== undefined) {
            data.wobble += data.wobbleSpeed * delta;
            const wobbleAmount = 0.02;
            bubble.position.x += Math.sin(data.wobble) * wobbleAmount * delta;
            bubble.position.z += Math.cos(data.wobble) * wobbleAmount * delta;
        }

        data.life -= delta;

        const fadeRatio = data.life / data.maxLife;

        if (bubble.material.uniforms) {
            bubble.material.uniforms.rimOpacity.value = fadeRatio * 0.6;
            bubble.material.uniforms.baseOpacity.value = fadeRatio * 0.08;

            const underwaterTint = new THREE.Color(0x003344);
            const baseColor = new THREE.Color(0xcceeFF);
            const finalColor = baseColor.clone().lerp(underwaterTint, (1.0 - fadeRatio) * 0.4);
            bubble.material.uniforms.bubbleColor.value.copy(finalColor);
        }

        const scale = 1.0 + (1.0 - fadeRatio) * 0.4;
        if (data.scale) {
            bubble.scale.setScalar(scale * data.scale);
        } else {
            bubble.scale.setScalar(scale);
        }

        if (data.life <= 0) {
            returnBubbleToPool(tank, bubble);
            tank.bubbles.splice(i, 1);
        }
    }

    const isMovingHorizontally = tank.movement.forward || tank.movement.backward ||
                                  tank.movement.left || tank.movement.right;

    if (isMovingHorizontally && Math.random() < 0.4) {
        createBubbleTrail(tank);
    }
}

/**
 * Create bubble streams for objects
 */
export function createObjectBubbleStreams(tank) {
    tank.objectBubbleStreams = [];

    tank.allObjects.forEach((object, index) => {
        const bubbleStream = createSingleBubbleStream(tank, object, index);
        tank.objectBubbleStreams.push(bubbleStream);
    });
}

/**
 * Create a single bubble stream for an object
 */
export function createSingleBubbleStream(tank, folder, index) {
    const streamGroup = new THREE.Group();
    const bubbleCount = 8 + Math.floor(Math.random() * 4);

    for (let i = 0; i < bubbleCount; i++) {
        const bubble = createStreamBubble(tank, index, i);
        bubble.position.set(0, 2 + i * 0.8, 0);

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

    streamGroup.position.copy(folder.position);
    tank.scene.add(streamGroup);

    return streamGroup;
}

/**
 * Create a single bubble for streams
 */
export function createStreamBubble(tank, folderIndex, bubbleIndex) {
    const bubbleSize = 0.04 + Math.random() * 0.06;
    const bubbleGeometry = new THREE.SphereGeometry(bubbleSize, 16, 12);

    const hue = (folderIndex * 137.5) % 360;
    const saturation = 40 + Math.random() * 30;
    const lightness = 70 + Math.random() * 20;
    const color = new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100);

    const bubbleMaterial = createBubbleMaterial({
        baseOpacity: 0.15 + Math.random() * 0.1,
        rimOpacity: 0.7 + Math.random() * 0.25,
        rimPower: 1.2 + Math.random() * 0.5,
        color: color,
        emissiveColor: new THREE.Color(0x004455)
    });

    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    return bubble;
}

/**
 * Update object bubble stream animations
 */
export function updateObjectBubbleStreams(tank) {
    if (!tank.objectBubbleStreams) return;

    tank.objectBubbleStreams.forEach((stream, streamIndex) => {
        stream.children.forEach((bubble, bubbleIndex) => {
            const data = bubble.userData;

            bubble.position.y += data.speed * 0.016;

            data.wobble += data.wobbleSpeed * 0.016;
            bubble.position.x += Math.sin(data.wobble) * data.wobbleAmount * 0.016;
            bubble.position.z += Math.cos(data.wobble) * data.wobbleAmount * 0.016;

            if (bubble.position.y > 15) {
                bubble.position.y = data.startY;
                bubble.position.x = 0;
                bubble.position.z = 0;
            }

            const heightRatio = (bubble.position.y - data.startY) / (15 - data.startY);
            const fadeFactor = (1 - heightRatio * 0.6);

            if (bubble.material.uniforms) {
                bubble.material.uniforms.rimOpacity.value = (0.7 + Math.random() * 0.2) * fadeFactor;
                bubble.material.uniforms.baseOpacity.value = 0.15 * fadeFactor;
            }

            const scale = 1.0 + heightRatio * 0.3;
            bubble.scale.setScalar(scale);
        });

        if (tank.allObjects[streamIndex]) {
            stream.position.copy(tank.allObjects[streamIndex].position);
        }
    });
}
