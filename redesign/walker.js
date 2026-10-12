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
renderer.toneMappingExposure = 1.05;
scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x312d36, 2.1));
const keyLight = new THREE.DirectionalLight(0xfff3e6, 2.2);
keyLight.position.set(3, 4, 6);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x2fc9e8, 1.5);
rimLight.position.set(-4, 2, -4);
scene.add(rimLight);
const walker = new THREE.Group();
scene.add(walker);
const animatedNodes = [];
const gestureJoints = [];
let walkMixer;
let walkDuration = 0;
const clock = new THREE.Clock();
let elapsed = 0;
let distance = 0;
let gaitPhase = 0;
let gaitWeight = 0;
let gaitDistance = 0;
let gaitTargetDistance = 0;
let lastScrollY = window.scrollY;
let travelLimit = 0;
let characterWidth = 3;
let figureScale = 1;
let frame;
let ready = false;
let failed = false;
let welcomeEndsAt = 0;
let hovering = false;
let poseWeight = 0;
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
let groundStageHeight = 0;
const dock = stage.closest('.lego-dock');
const skillsMap = document.getElementById('skillsRoute');
const skillsTrack = skillsMap?.querySelector('.skill-route-track');
const journeyMap = document.querySelector('.journey-map');
const journeyLine = journeyMap?.querySelector('.journey-route');
let routeState = 'free';
let routeX = 0;
let routeY = 0;
let routeYaw = 0;
let routeFrame = 0;
let bobOffset = 0;
let routeSection = 'none';
const freeWalkSpeed = 1.15;
const strideLength = 1.65;
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
    gaitDistance = 0;
    gaitTargetDistance = 0;
    lastScrollY = window.scrollY;
    status.classList.add('is-hidden');
    welcome.classList.add('is-visible');
    welcomeEndsAt = performance.now() + 10000;
    updateRouteTarget();
    updatePlayback();
};
function resizeRenderer() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    if (!held && !falling && routeState === 'free') groundStageHeight = height;
    const unitsPerPixel = 6.4 / (groundStageHeight || height);
    const halfWidth = unitsPerPixel * width / 2;
    figureScale = width <= 600 ? .72 : 1;
    walker.scale.setScalar(figureScale);
    camera.top = height * unitsPerPixel - 0.4;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.updateProjectionMatrix();
    travelLimit = Math.max(0, halfWidth - characterWidth * figureScale / 2 - 0.7);
    draw();
}
new ResizeObserver(resizeRenderer).observe(stage);
// Follow the actual SVG route and the Journey line at the viewport's reading
// position. Keeping the stage full-height only here preserves the original
// LEGO scale and the bottom-screen walk elsewhere.
function skillPointAt(documentY) {
    const bounds = skillsMap.getBoundingClientRect();
    const length = skillsTrack.getTotalLength();
    const wantedY = THREE.MathUtils.clamp(documentY - window.scrollY - bounds.top, 0, bounds.height);
    let low = 0;
    let high = length;
    for (let i = 0; i < 15; i++) {
        const middle = (low + high) / 2;
        if (skillsTrack.getPointAtLength(middle).y < wantedY) low = middle;
        else high = middle;
    }
    const point = skillsTrack.getPointAtLength((low + high) / 2);
    const before = skillsTrack.getPointAtLength(Math.max(0, low - 12));
    const after = skillsTrack.getPointAtLength(Math.min(length, high + 12));
    return { x: bounds.left + point.x, yaw: THREE.MathUtils.clamp((after.x - before.x) / Math.max(1, after.y - before.y) * .7, -.65, .65) };
}
function updateRouteTarget() {
    if (!skillsMap || !skillsTrack?.getAttribute('d') || !journeyMap || !journeyLine) return;
    const readingY = window.innerHeight * .55;
    const documentY = window.scrollY + readingY;
    const skills = skillsMap.getBoundingClientRect();
    const journey = journeyMap.getBoundingClientRect();
    const first = window.scrollY + skills.top;
    const skillsEnd = window.scrollY + skills.bottom;
    const journeyStart = window.scrollY + journey.top;
    const last = window.scrollY + journey.bottom;
    if (documentY < first || documentY > last) {
        if (routeState === 'following') routeState = 'returning';
        if (routeState === 'gap') {
            routeState = 'free';
            routeSection = 'none';
            dock.classList.remove('is-on-route', 'is-route-gap');
            walker.position.y = 0;
            resumeRoute(walker.position.x, 0);
            resizeRenderer();
        }
        if (routeState === 'returning' && reducedMotion.matches && !held && !falling) {
            routeState = 'free';
            walker.position.y = 0;
            dock.classList.remove('is-on-route');
            resumeRoute(walker.position.x, 0);
            resizeRenderer();
        }
        if (reducedMotion.matches) draw();
        return;
    }
    const section = documentY <= skillsEnd ? 'skills' : documentY >= journeyStart ? 'journey' : 'gap';
    if (routeState === 'free') {
        routeState = 'following';
        dock.classList.add('is-on-route');
        resizeRenderer();
    } else if (routeState === 'returning') routeState = 'following';
    if (section === 'gap') {
        routeState = 'gap';
        routeSection = 'gap';
        dock.classList.add('is-route-gap');
        if (reducedMotion.matches) draw();
        return;
    }
    const restarting = routeState === 'gap' || (routeSection !== 'none' && routeSection !== section);
    routeState = 'following';
    routeSection = section;
    dock.classList.remove('is-route-gap');
    const line = journeyLine.getBoundingClientRect();
    const journeyX = line.left + line.width / 2;
    let screenX;
    if (section === 'skills') {
        const point = skillPointAt(documentY);
        screenX = point.x;
        routeYaw = point.yaw;
    } else {
        screenX = journeyX;
        routeYaw = 0;
    }
    const bounds = stage.getBoundingClientRect();
    const unitsPerPixel = (camera.top - camera.bottom) / bounds.height;
    // On narrow screens the route sits at the edge; keep the whole figure visible.
    const halfFigure = characterWidth * figureScale / unitsPerPixel / 2;
    screenX = THREE.MathUtils.clamp(screenX, halfFigure + 5, bounds.width - halfFigure - 5);
    routeX = (screenX - bounds.left - bounds.width / 2) * unitsPerPixel;
    routeY = camera.bottom + (bounds.bottom - readingY) * unitsPerPixel;
    if (restarting && !held && !falling) walker.position.set(routeX, routeY, 0);
    if (welcomeEndsAt) { welcomeEndsAt = 0; welcome.classList.remove('is-visible'); }
    if (reducedMotion.matches) draw();
}
function requestRouteTarget() {
    if (routeFrame) return;
    routeFrame = requestAnimationFrame(() => { routeFrame = 0; updateRouteTarget(); });
}
window.addEventListener('scroll', requestRouteTarget, { passive: true });
window.addEventListener('resize', requestRouteTarget, { passive: true });
if (skillsMap && journeyMap) {
    const routeObserver = new ResizeObserver(requestRouteTarget);
    routeObserver.observe(skillsMap);
    routeObserver.observe(journeyMap);
}
const draco = new DRACOLoader(manager);
draco.setDecoderPath('https://unpkg.com/three@0.160.1/examples/jsm/libs/draco/');
const loader = new GLTFLoader(manager);
loader.setDRACOLoader(draco);
// This GLB pairs the original run rig with the correct Spider-Man UV atlas.
loader.load('../Assets/Models/spiderman-walk.glb?v=1', gltf => {
    const model = gltf.scene;
    model.rotation.y = Math.PI;
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
                const material = source.clone();
                material.roughness = Math.max(material.roughness ?? 0.6, 0.55);
                material.metalness = 0;
                return material;
            };
            node.material = Array.isArray(node.material) ? node.material.map(soften) : soften(node.material);
        }
    });
    // A relaxed frame becomes the idle pose; the source animation provides the gait.
    if (gltf.animations.length) {
        walkMixer = new THREE.AnimationMixer(model);
        walkDuration = gltf.animations[0].duration;
        walkMixer.clipAction(gltf.animations[0]).play();
        walkMixer.setTime(walkDuration * 0.25);
        model.traverse(node => {
            if (node === model) return;
            animatedNodes.push({ node, position: node.position.clone(), rotation: node.quaternion.clone(), scale: node.scale.clone() });
        });
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
    // Preserve the small greeting gesture when the visitor picks up the LEGO.
    model.traverse(bone => {
        if (!bone.isBone || !/^(UpArm|LowArm|Hand)\.R$/.test(bone.name)) return;
        const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        gestureJoints.push({ bone, kind: bone.name.split('.')[0],
            axis: new THREE.Vector3(1, 0, 0).applyQuaternion(parentRotation.invert()),
            rotation: new THREE.Quaternion() });
    });
    resizeRenderer();
}, undefined, error => {
    console.error('Unable to load spiderman-walk.glb:', error);
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
const footPoint = new THREE.Vector3();
let skillRouteLength = 0;
function refreshRouteGeometry() {
    skillRouteLength = skillsTrack?.getAttribute('d') ? skillsTrack.getTotalLength() : 0;
    requestRouteTarget();
}
window.addEventListener('portfolio-route-layout', refreshRouteGeometry);
refreshRouteGeometry();
function footScreenY() {
    const bounds = stage.getBoundingClientRect();
    footPoint.set(walker.position.x, walker.position.y - bobOffset, walker.position.z).project(camera);
    return bounds.top + (1 - footPoint.y) * bounds.height / 2;
}
function syncIlluminatedRoutes() {
    if (!skillRouteLength || !skillsMap || !journeyMap) return;
    const readingDocumentY = window.scrollY + window.innerHeight * .55;
    const skillsBounds = skillsMap.getBoundingClientRect();
    const journeyBounds = journeyMap.getBoundingClientRect();
    const skillsEnd = window.scrollY + skillsBounds.bottom;
    const journeyStart = window.scrollY + journeyBounds.top;
    let skillsProgress = 0;
    if (readingDocumentY > skillsEnd) skillsProgress = 1;
    else if (routeSection === 'skills' && routeState === 'following') {
        const wantedY = THREE.MathUtils.clamp(footScreenY() - skillsBounds.top, 0, skillsBounds.height);
        let low = 0;
        let high = skillRouteLength;
        for (let i = 0; i < 15; i++) {
            const middle = (low + high) / 2;
            if (skillsTrack.getPointAtLength(middle).y < wantedY) low = middle;
            else high = middle;
        }
        skillsProgress = (low + high) / (2 * skillRouteLength);
    }
    skillsMap.querySelector('.skill-route-progress').style.strokeDashoffset = String(skillRouteLength * (1 - skillsProgress));
    let journeyProgress = 0;
    if (readingDocumentY > window.scrollY + journeyBounds.bottom) journeyProgress = 1;
    else if (readingDocumentY >= journeyStart && routeSection === 'journey' && routeState === 'following') {
        journeyProgress = THREE.MathUtils.clamp((footScreenY() - journeyBounds.top) / journeyBounds.height, 0, 1);
    }
    journeyMap.style.setProperty('--journey-progress', journeyProgress.toFixed(4));
}
function positionHandle() {
    if (!ready) return;
    const bounds = stage.getBoundingClientRect();
    handlePoint.set(walker.position.x, walker.position.y + 2.5 * figureScale, walker.position.z).project(camera);
    const width = THREE.MathUtils.clamp(characterWidth * figureScale / (camera.top - camera.bottom) * bounds.height * 1.15, 52, 150);
    const height = THREE.MathUtils.clamp(5 * figureScale / (camera.top - camera.bottom) * bounds.height * 1.12, 70, 190);
    handle.style.width = `${width}px`;
    handle.style.height = `${height}px`;
    handle.style.left = `${(handlePoint.x + 1) * bounds.width / 2}px`;
    handle.style.top = `${(1 - handlePoint.y) * bounds.height / 2}px`;
}
function draw(delta = 0) {
    walker.position.y -= bobOffset;
    bobOffset = 0;
    const greeting = ready && performance.now() < welcomeEndsAt;
    if (ready && !greeting) welcome.classList.remove('is-visible');
    if (falling && delta) {
        dropVelocity -= 17 * delta;
        const floor = routeState === 'following' ? routeY : 0;
        heldY = Math.max(floor, heldY + dropVelocity * delta);
        if (heldY === floor) {
            falling = false;
            if (routeState === 'free') resumeRoute(heldX, heldYaw);
            dock.classList.remove('is-interacting');
        }
    }
    const posing = ready && (hovering || held || falling);
    poseWeight = reducedMotion.matches ? Number(posing) : THREE.MathUtils.damp(poseWeight, Number(posing), 5.5, delta);
    const moving = ready && !greeting && !reducedMotion.matches && !posing && routeState !== 'gap';
    const departure = THREE.MathUtils.smootherstep(elapsed, 1.8, 3);
    const following = routeState === 'following';
    const returning = routeState === 'returning';
    const previousX = walker.position.x;
    const previousY = walker.position.y;
    const previousZ = walker.position.z;
    if (moving && !following && !returning) distance += freeWalkSpeed * departure * delta;
    const current = routePose();
    const yaw = posing ? 0 : following ? routeYaw : returning ? 0 : moving ? current.yaw * THREE.MathUtils.smootherstep(elapsed, 1, 1.8) : 0;
    heading.setFromAxisAngle(upAxis, yaw);
    walker.quaternion.slerp(heading, reducedMotion.matches ? 1 : 1 - Math.exp(-6 * delta));
    const followRate = reducedMotion.matches ? 1 : 1 - Math.exp(-6.5 * delta);
    if (held || falling) walker.position.set(heldX, heldY, heldZ);
    else if (following) {
        walker.position.y = THREE.MathUtils.lerp(walker.position.y, routeY, followRate);
        walker.position.z = THREE.MathUtils.lerp(walker.position.z, 0, followRate);
        if (routeSection === 'skills') {
            const point = skillPointAt(window.scrollY + footScreenY());
            const bounds = stage.getBoundingClientRect();
            const unitsPerPixel = (camera.top - camera.bottom) / bounds.height;
            walker.position.x = (point.x - bounds.left - bounds.width / 2) * unitsPerPixel;
        } else walker.position.x = routeX;
    } else if (returning) {
        walker.position.y = THREE.MathUtils.lerp(walker.position.y, 0, followRate);
        walker.position.z = THREE.MathUtils.lerp(walker.position.z, 0, followRate);
        if (Math.abs(walker.position.y) < .08 && !posing) {
            walker.position.y = 0;
            routeState = 'free';
            dock.classList.remove('is-on-route');
            resumeRoute(walker.position.x, yaw);
            resizeRenderer();
        }
    } else if (!posing && routeState !== 'gap') walker.position.set(moving ? current.x : 0, 0, moving ? current.z : 0);
    // In Journey the LEGO stays near the reading line while the document moves.
    // Count that scroll as travelled distance, then ease the animation toward it.
    const scrollDelta = delta ? Math.abs(window.scrollY - lastScrollY) : 0;
    if (delta) lastScrollY = window.scrollY;
    const unitsPerPixel = (camera.top - camera.bottom) / Math.max(1, stage.getBoundingClientRect().height);
    const worldStep = Math.hypot(walker.position.x - previousX, walker.position.y - previousY, walker.position.z - previousZ);
    if (moving) gaitTargetDistance += following
        ? Math.max(routeSection === 'journey' ? 0.72 * delta : 0, Math.min(0.9, Math.max(worldStep, scrollDelta * unitsPerPixel)))
        : Math.min(worldStep, 0.2);
    else gaitTargetDistance = gaitDistance;
    const previousGaitDistance = gaitDistance;
    gaitDistance = THREE.MathUtils.damp(gaitDistance, gaitTargetDistance, 12, delta);
    const walkSpeed = delta ? (gaitDistance - previousGaitDistance) / delta : 0;
    gaitWeight = reducedMotion.matches ? 0 : THREE.MathUtils.damp(gaitWeight, Math.min(1, walkSpeed / 0.7), 8, delta);
    gaitPhase = gaitDistance * Math.PI * 2 / strideLength;
    const weight = gaitWeight * (1 - poseWeight);
    // The original footfalls supply the motion; only a slight body lift is added.
    if (!held && !falling) {
        bobOffset = (1 - Math.cos(2 * gaitPhase)) * 0.006 * weight;
        walker.position.y += bobOffset;
    }
    if (walkMixer && walkDuration) {
        walkMixer.setTime((gaitPhase / (Math.PI * 2) + 0.25) * walkDuration);
        for (const { node, position, rotation, scale } of animatedNodes) {
            node.position.lerp(position, 1 - weight);
            node.quaternion.slerp(rotation, 1 - weight);
            node.scale.lerp(scale, 1 - weight);
        }
    }
    for (const joint of gestureJoints) {
        const angle = (joint.kind === 'UpArm' ? -0.7 : joint.kind === 'LowArm' ? -0.35 : 0.1) * poseWeight;
        joint.rotation.setFromAxisAngle(joint.axis, angle);
        joint.bone.quaternion.premultiply(joint.rotation);
    }
    walker.visible = ready;
    renderer.render(scene, camera);
    positionHandle();
    syncIlluminatedRoutes();
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
handle.addEventListener('pointerenter', event => {
    if (!ready || held || falling || event.pointerType === 'touch') return;
    hovering = true;
    if (reducedMotion.matches) draw();
});
handle.addEventListener('pointerleave', () => {
    hovering = false;
    if (reducedMotion.matches) draw();
});
handle.addEventListener('pointerdown', event => {
    if (!ready || held || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    pointerId = event.pointerId;
    hovering = false;
    held = true;
    falling = false;
    heldX = walker.position.x;
    heldY = walker.position.y;
    heldZ = walker.position.z;
    heldYaw = new THREE.Euler().setFromQuaternion(walker.quaternion, 'YXZ').y;
    dragOriginX = heldX;
    dragOriginY = heldY;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    elapsed = Math.max(elapsed, 3);
    welcomeEndsAt = 0;
    welcome.classList.remove('is-visible');
    handle.classList.add('is-held');
    dock.classList.add('is-interacting');
    resizeRenderer();
    updatePlayback();
});
handle.addEventListener('pointermove', event => {
    if (!held || event.pointerId !== pointerId) return;
    event.preventDefault();
    const unitsPerPixel = (camera.top - camera.bottom) / stage.getBoundingClientRect().height;
    heldX = THREE.MathUtils.clamp(dragOriginX + (event.clientX - dragStartX) * unitsPerPixel, -travelLimit, travelLimit);
    heldY = THREE.MathUtils.clamp(dragOriginY - (event.clientY - dragStartY) * unitsPerPixel, 0, Math.max(0, camera.top - 5.2 * figureScale));
    draw();
});
function release(event) {
    if (!held || event.pointerId !== pointerId) return;
    held = false;
    pointerId = null;
    falling = heldY > (routeState === 'following' ? routeY : 0) + .02;
    dropVelocity = 0;
    if (!falling) {
        if (routeState === 'free') resumeRoute(heldX, heldYaw);
        dock.classList.remove('is-interacting');
    }
    handle.classList.remove('is-held');
    updatePlayback();
}
handle.addEventListener('pointerup', release);
handle.addEventListener('pointercancel', release);
handle.addEventListener('lostpointercapture', release);
window.addEventListener('blur', () => { if (held) release({ pointerId }); });
handle.addEventListener('keydown', event => {
    if (!ready || ![' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape' || (event.key === ' ' && held)) { if (held) release({ pointerId }); return; }
    if (!held && event.key === ' ') {
        hovering = false; held = true; falling = false; pointerId = 'keyboard';
        heldX = walker.position.x; heldY = walker.position.y; heldZ = walker.position.z;
        heldYaw = new THREE.Euler().setFromQuaternion(walker.quaternion, 'YXZ').y;
        welcomeEndsAt = 0; elapsed = Math.max(elapsed, 3);
        handle.classList.add('is-held'); dock.classList.add('is-interacting'); resizeRenderer();
        heldY = Math.min(2, Math.max(0, camera.top - 5.2 * figureScale)); updatePlayback();
    } else if (held && pointerId === 'keyboard') {
        heldX = THREE.MathUtils.clamp(heldX + (event.key === 'ArrowRight' ? .5 : event.key === 'ArrowLeft' ? -.5 : 0), -travelLimit, travelLimit);
        heldY = THREE.MathUtils.clamp(heldY + (event.key === 'ArrowUp' ? .5 : event.key === 'ArrowDown' ? -.5 : 0), 0, Math.max(0, camera.top - 5.2 * figureScale)); draw();
    }
});
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
