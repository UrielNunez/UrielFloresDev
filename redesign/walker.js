import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/DRACOLoader.js';
const stage = document.getElementById('legoStage');
const canvas = document.getElementById('legoCanvas');
const status = document.getElementById('legoStatus');
const welcome = document.getElementById('legoWelcome');
const handle = document.getElementById('legoHandle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scene = new THREE.Scene();
// Parallel projection keeps the character size consistent across the screen.
const camera = new THREE.OrthographicCamera(-4, 4, 6, -0.4, 0.1, 100);
camera.position.set(0, 0, 20);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x77716a, 1.8));
const keyLight = new THREE.DirectionalLight(0xfff4e8, 1.5);
keyLight.position.set(4, 7, 5);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xdbeeff, 0.8);
fillLight.position.set(-5, 3, 4);
scene.add(fillLight);
const walker = new THREE.Group();
scene.add(walker);
const joints = [];
const clock = new THREE.Clock();
let elapsed = 0;
let distance = 0;
let gaitPhase = 0;
let gaitWeight = 0;
let travelLimit = 0;
let characterWidth = 3;
let frame;
let ready = false;
let failed = false;
let welcomeEndsAt = 0;
let held = false;
let falling = false;
let pointerId = null;
let heldX = 0;
let heldY = 0;
let dropVelocity = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let dragStartX = 0;
let dragStartY = 0;
let heldZ = 0;
let heldYaw = 0;
const manager = new THREE.LoadingManager();
function showError() {
    failed = true;
    status.classList.remove('is-hidden');
    status.setAttribute('aria-label', 'Unable to load 3D character');
    status.textContent = 'Unable to load the 3D character.';
}
manager.onError = showError;
manager.onLoad = () => {
    if (failed || !walker.children.length) return;
    ready = true;
    handle.classList.add('is-ready');
    elapsed = 0;
    distance = 0;
    gaitPhase = 0;
    gaitWeight = 0;
    status.classList.add('is-hidden');
    welcome.classList.add('is-visible');
    welcomeEndsAt = performance.now() + 10000;
    updatePlayback();
};
function resizeRenderer() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    const halfWidth = 6.4 * width / height / 2;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.updateProjectionMatrix();
    travelLimit = Math.max(0, halfWidth - characterWidth / 2 - 0.7);
    draw();
}
new ResizeObserver(resizeRenderer).observe(stage);
const draco = new DRACOLoader(manager);
draco.setDecoderPath('https://unpkg.com/three@0.160.1/examples/jsm/libs/draco/');
const loader = new GLTFLoader(manager);
loader.setDRACOLoader(draco);
loader.load('../Assets/Models/lego-walker.glb?v=1', gltf => {
    const model = gltf.scene;
    model.scale.setScalar(0.01);
    model.traverse(node => {
        if (node.isMesh && /^GEOFace/i.test(node.name)) {
            const source = Array.isArray(node.material) ? node.material[0] : node.material;
            node.material = new THREE.MeshBasicMaterial({
                map: source.map,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });
            node.renderOrder = 2;
        } else if (node.isMesh) {
            const soften = source => {
                const material = new THREE.MeshStandardMaterial({
                    color: source.color, map: source.map, normalMap: source.normalMap,
                    roughness: 0.72, metalness: 0,
                    transparent: source.transparent, opacity: source.opacity, side: source.side
                });
                material.normalScale.setScalar(0.3);
                return material;
            };
            node.material = Array.isArray(node.material) ? node.material.map(soften) : soften(node.material);
        }
    });
    // Sample the original idle pose before adding procedural steps.
    if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
        mixer.update(0);
    }
    model.updateMatrixWorld(true);
    const height = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
    if (!Number.isFinite(height) || height <= 0) {
        showError();
        return;
    }
    model.scale.multiplyScalar(5 / height);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    characterWidth = bounds.getSize(new THREE.Vector3()).x;
    model.position.set(-center.x, -bounds.min.y, -center.z);
    walker.add(model);
    model.updateMatrixWorld(true);
    // Accept both dotted Blender names and sanitized legacy names.
    model.traverse(bone => {
        const match = /^(UpLeg|LowLeg|Foot|UpArm|LowArm|Hand)[._]?([LR])$/.exec(bone.name);
        if (!bone.isBone || (!match && !/^Spine[12]$/.test(bone.name))) return;
        const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        joints.push({ bone, kind: match ? match[1] : bone.name, side: match?.[2] === 'L' ? 1 : -1,
            rest: bone.quaternion.clone(),
            axis: new THREE.Vector3(1, 0, 0).applyQuaternion(parentRotation.invert()),
            twistAxis: new THREE.Vector3(0, 1, 0).applyQuaternion(parentRotation),
            rotation: new THREE.Quaternion() });
    });
    resizeRenderer();
}, undefined, error => {
    console.error('Unable to load lego-walker.glb:', error);
    showError();
});
// A capsule-shaped route keeps each turnaround a continuous walking arc.
function routePose() {
    const radius = Math.min(0.85, travelLimit * 0.45);
    const straight = Math.max(0, travelLimit - radius);
    const arc = Math.PI * radius;
    const perimeter = 4 * straight + 2 * arc;
    if (!perimeter) return { x: 0, z: 0, yaw: 0, turning: false };
    let position = (distance + straight) % perimeter;
    if (position < 2 * straight) return { x: -straight + position, z: -radius, yaw: Math.PI / 2, turning: false };
    position -= 2 * straight;
    if (position < arc) {
        const angle = position / radius;
        return { x: straight + radius * Math.sin(angle), z: -radius * Math.cos(angle), yaw: Math.PI / 2 - angle, turning: true };
    }
    position -= arc;
    if (position < 2 * straight) return { x: straight - position, z: radius, yaw: -Math.PI / 2, turning: false };
    const angle = (position - 2 * straight) / radius;
    return { x: -straight - radius * Math.sin(angle), z: radius * Math.cos(angle), yaw: -Math.PI / 2 - angle, turning: true };
}
function resumeRoute(x, yaw) {
    const radius = Math.min(0.85, travelLimit * 0.45);
    const straight = Math.max(0, travelLimit - radius);
    const perimeter = 4 * straight + 2 * Math.PI * radius;
    if (!perimeter) { distance = 0; return; }
    let nearest = 0;
    let score = Infinity;
    for (let i = 0; i < 160; i++) {
        distance = perimeter * i / 160;
        const pose = routePose();
        const difference = Math.abs(pose.x - x) + (Math.sign(pose.yaw) === Math.sign(yaw) ? 0 : 0.35);
        if (difference < score) { score = difference; nearest = distance; }
    }
    distance = nearest;
}
const heading = new THREE.Quaternion();
const upAxis = new THREE.Vector3(0, 1, 0);
const handlePoint = new THREE.Vector3();
function positionHandle() {
    if (!ready) return;
    const bounds = stage.getBoundingClientRect();
    handlePoint.set(walker.position.x, walker.position.y + 2.5, walker.position.z).project(camera);
    const width = THREE.MathUtils.clamp(characterWidth / (camera.top - camera.bottom) * bounds.height * 1.15, 52, 150);
    const height = THREE.MathUtils.clamp(5 / (camera.top - camera.bottom) * bounds.height * 1.12, 88, 190);
    handle.style.width = `${width}px`;
    handle.style.height = `${height}px`;
    handle.style.left = `${(handlePoint.x + 1) * bounds.width / 2}px`;
    handle.style.top = `${(1 - handlePoint.y) * bounds.height / 2}px`;
}
function draw(delta = 0) {
    const greeting = ready && performance.now() < welcomeEndsAt;
    if (ready && !greeting) welcome.classList.remove('is-visible');
    if (falling && delta) {
        dropVelocity -= 17 * delta;
        heldY = Math.max(0, heldY + dropVelocity * delta);
        if (heldY === 0) {
            falling = false;
            resumeRoute(heldX, heldYaw);
        }
    }
    const moving = ready && !greeting && !reducedMotion.matches && !held && !falling;
    const pose = routePose();
    const departure = THREE.MathUtils.smootherstep(elapsed, 1.8, 3);
    const targetSpeed = moving && travelLimit > 0 ? departure * (pose.turning ? 0.8 : 1.25) : 0;
    gaitWeight = THREE.MathUtils.damp(gaitWeight, targetSpeed / 1.25, 5, delta);
    distance += 1.25 * gaitWeight * delta;
    gaitPhase += 1.25 * gaitWeight * delta * Math.PI * 2 / 1.5;
    const current = routePose();
    const yaw = held || falling ? heldYaw : moving ? current.yaw * THREE.MathUtils.smootherstep(elapsed, 1, 1.8) : 0;
    heading.setFromAxisAngle(upAxis, yaw);
    walker.quaternion.slerp(heading, moving ? 1 - Math.exp(-8 * delta) : 1);
    walker.position.set(held || falling ? heldX : moving ? current.x : 0, 0, held || falling ? heldZ : moving ? current.z : 0);
    const weight = moving ? gaitWeight : 0;
    // Twice-per-cycle rise is smooth at foot contact, without abs()/max() snaps.
    walker.position.y = held || falling ? heldY : (1 - Math.cos(2 * gaitPhase)) * 0.025 * weight;
    for (const joint of joints) {
        const phase = gaitPhase + (joint.side === 1 ? 0 : Math.PI);
        const swing = Math.cos(phase);
        const lift = Math.pow((1 + Math.sin(phase)) / 2, 3);
        let angle = 0;
        if (joint.kind === 'UpLeg') angle = swing * 0.36;
        if (joint.kind === 'LowLeg') angle = -lift * 0.6;
        if (joint.kind === 'Foot') angle = -swing * 0.18 + lift * 0.22;
        if (joint.kind === 'UpArm') angle = -swing * 0.3;
        if (joint.kind === 'LowArm') angle = -0.12 - (1 - swing) * 0.09;
        if (joint.kind === 'Hand') angle = Math.sin(phase - 0.35) * 0.035;
        if (joint.kind === 'Spine1') angle = 0.025 + Math.cos(2 * gaitPhase) * 0.015;
        if (joint.kind === 'Spine2') angle = -0.015;
        joint.rotation.setFromAxisAngle(joint.axis, angle * weight);
        joint.bone.quaternion.copy(joint.rest).premultiply(joint.rotation);
        if (joint.kind.startsWith('Spine')) {
            joint.rotation.setFromAxisAngle(joint.twistAxis, Math.sin(gaitPhase) * (joint.kind === 'Spine1' ? 0.035 : -0.065) * weight);
            joint.bone.quaternion.premultiply(joint.rotation);
        }
    }
    walker.visible = ready;
    renderer.render(scene, camera);
    positionHandle();
}
function render() {
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    draw(delta);
    if (!reducedMotion.matches || held || falling) frame = requestAnimationFrame(render);
}
function updatePlayback() {
    cancelAnimationFrame(frame);
    clock.stop();
    draw();
    if (ready && !document.hidden && (!reducedMotion.matches || held || falling)) {
        clock.start();
        frame = requestAnimationFrame(render);
    }
}
handle.addEventListener('pointerdown', event => {
    if (!ready) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    pointerId = event.pointerId;
    held = true;
    falling = false;
    heldX = walker.position.x;
    heldY = walker.position.y;
    heldZ = walker.position.z;
    heldYaw = routePose().yaw;
    dragOriginX = heldX;
    dragOriginY = heldY;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    elapsed = Math.max(elapsed, 3);
    welcomeEndsAt = 0;
    welcome.classList.remove('is-visible');
    handle.classList.add('is-held');
    updatePlayback();
});
handle.addEventListener('pointermove', event => {
    if (!held || event.pointerId !== pointerId) return;
    event.preventDefault();
    const unitsPerPixel = (camera.top - camera.bottom) / stage.getBoundingClientRect().height;
    heldX = THREE.MathUtils.clamp(dragOriginX + (event.clientX - dragStartX) * unitsPerPixel, -travelLimit, travelLimit);
    heldY = THREE.MathUtils.clamp(dragOriginY - (event.clientY - dragStartY) * unitsPerPixel, 0, 3.5);
    draw();
});
function release(event) {
    if (!held || event.pointerId !== pointerId) return;
    held = false;
    pointerId = null;
    falling = heldY > 0;
    dropVelocity = 0;
    if (!falling) resumeRoute(heldX, heldYaw);
    handle.classList.remove('is-held');
    updatePlayback();
}
handle.addEventListener('pointerup', release);
handle.addEventListener('pointercancel', release);
handle.addEventListener('lostpointercapture', release);
window.addEventListener('scroll', () => {
    if (window.scrollY > 100 && welcomeEndsAt) {
        welcomeEndsAt = 0;
        welcome.classList.remove('is-visible');
    }
}, { passive: true });
reducedMotion.addEventListener('change', updatePlayback);
document.addEventListener('visibilitychange', updatePlayback);
resizeRenderer();
updatePlayback();
