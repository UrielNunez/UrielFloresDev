import * as THREE from 'three';
import { FBXLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/FBXLoader.js';
const stage = document.getElementById('legoStage');
const canvas = document.getElementById('legoCanvas');
const status = document.getElementById('legoStatus');
const welcome = document.getElementById('legoWelcome');
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
let faceMaterial;
let portraitTexture;
const manager = new THREE.LoadingManager();
manager.setURLModifier(url => url.includes('Hair Normal.png') || url.includes('Hair%20Normal.png')
    ? './Assets/Models/Hair_Normal_preview.png' : url);
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
    elapsed = 0;
    distance = 0;
    gaitPhase = 0;
    gaitWeight = 0;
    status.classList.add('is-hidden');
    welcome.classList.add('is-visible');
    welcomeEndsAt = performance.now() + 10000;
    updatePlayback();
};
const faceTexture = new THREE.TextureLoader(manager).load('./Assets/Models/Idle_SpriteSheet.png', texture => {
    const source = texture.image;
    const tile = document.createElement('canvas');
    tile.width = tile.height = 256;
    // Same friendly face used by the intro export, taken from the sprite sheet.
    tile.getContext('2d').drawImage(source, 0, source.height - 256, 256, 256, 0, 0, 256, 256);
    // The sprite uses white as its empty background. Turn it into the same
    // warm LEGO skin tone used by the intro while preserving the expression.
    const context = tile.getContext('2d');
    const pixels = context.getImageData(0, 0, tile.width, tile.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index];
        const green = pixels.data[index + 1];
        const blue = pixels.data[index + 2];
        if (red > 235 && green > 235 && blue > 235) {
            pixels.data[index] = 222;
            pixels.data[index + 1] = 170;
            pixels.data[index + 2] = 116;
            pixels.data[index + 3] = 255;
        }
    }
    context.putImageData(pixels, 0, 0);
    const portrait = new THREE.CanvasTexture(tile);
    portrait.colorSpace = THREE.SRGBColorSpace;
    portrait.needsUpdate = true;
    portraitTexture = portrait;
    if (faceMaterial) {
        faceMaterial.map = portraitTexture;
        faceMaterial.needsUpdate = true;
    }
});
faceTexture.colorSpace = THREE.SRGBColorSpace;
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
new FBXLoader(manager).load('./Assets/Models/Player_Idle.fbx', model => {
    model.scale.setScalar(0.01);
    model.traverse(node => {
        if (node.isMesh) {
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
        if (node.isMesh && /^GEOFace/i.test(node.name)) {
            if (node.name.includes('Idle')) {
                faceMaterial = new THREE.MeshBasicMaterial({
                    map: portraitTexture || faceTexture,
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    polygonOffset: true,
                    polygonOffsetFactor: -1,
                    polygonOffsetUnits: -1
                });
                node.material = faceMaterial;
                node.renderOrder = 2;
            } else {
                // The FBX ships Run and Jump face planes in the same position.
                // They otherwise cover the selected Idle expression in white.
                node.visible = false;
            }
        }
    });
    // Sample the original idle pose before adding procedural steps.
    if (model.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(model.animations[0]).play();
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
    // FBXLoader sanitizes names such as UpLeg.L to UpLegL.
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
    console.error('Unable to load Player_Idle.fbx:', error);
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
const heading = new THREE.Quaternion();
const upAxis = new THREE.Vector3(0, 1, 0);
function draw(delta = 0) {
    const greeting = ready && performance.now() < welcomeEndsAt;
    if (ready && !greeting) welcome.classList.remove('is-visible');
    const moving = ready && !greeting && !reducedMotion.matches;
    const pose = routePose();
    const departure = THREE.MathUtils.smootherstep(elapsed, 1.8, 3);
    const targetSpeed = moving && travelLimit > 0 ? departure * (pose.turning ? 0.8 : 1.25) : 0;
    gaitWeight = THREE.MathUtils.damp(gaitWeight, targetSpeed / 1.25, 5, delta);
    distance += 1.25 * gaitWeight * delta;
    gaitPhase += 1.25 * gaitWeight * delta * Math.PI * 2 / 1.5;
    const current = routePose();
    const yaw = moving ? current.yaw * THREE.MathUtils.smootherstep(elapsed, 1, 1.8) : 0;
    heading.setFromAxisAngle(upAxis, yaw);
    walker.quaternion.slerp(heading, moving ? 1 - Math.exp(-8 * delta) : 1);
    walker.position.set(moving ? current.x : 0, 0, moving ? current.z : 0);
    const weight = moving ? gaitWeight : 0;
    // Twice-per-cycle rise is smooth at foot contact, without abs()/max() snaps.
    walker.position.y = (1 - Math.cos(2 * gaitPhase)) * 0.025 * weight;
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
}
function render() {
    const delta = Math.min(clock.getDelta(), 0.05);
    elapsed += delta;
    draw(delta);
    frame = requestAnimationFrame(render);
}
function updatePlayback() {
    cancelAnimationFrame(frame);
    clock.stop();
    draw();
    if (ready && !document.hidden && !reducedMotion.matches) {
        clock.start();
        frame = requestAnimationFrame(render);
    }
}
reducedMotion.addEventListener('change', updatePlayback);
document.addEventListener('visibilitychange', updatePlayback);
resizeRenderer();
updatePlayback();
