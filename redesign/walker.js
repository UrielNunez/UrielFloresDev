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
let gaitSpeed = 0;
let lastScrollY = window.scrollY;
let routeDirection = 1;
let routeScrollSpeed = 0;
let travelLimit = 0;
let characterWidth = 3;
let figureScale = 1;
let frame;
let ready = false;
let failed = false;
let welcomeEndsAt = 0;
let hovering = false;
let poseWeight = 0;
let armReachAngle = 0;
let waveWeight = 0;
let held = false;
let falling = false;
let pointerId = null;
let heldPointerType = '';
let touchStartedAt = 0;
let touchMoved = false;
let touchGreetingTimer = 0;
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
const skillsSection = skillsMap?.closest('.skills-info');
const journeyMap = document.querySelector('.journey-map');
const journeyLine = journeyMap?.querySelector('.journey-route');
let routeState = 'free';
let routeX = 0;
let routeY = 0;
let routeYaw = 0;
let routeFrame = 0;
let bobOffset = 0;
let routeSection = 'none';
let approachingSkills = false;
const freeWalkSpeed = 1.15;
const strideLength = 1.25;
const manager = new THREE.LoadingManager();
// GLTFLoader removes dots from glTF node names (Hand.R becomes HandR).
const rigName = name => name.replace(/[^a-z0-9]/gi, '');
// The exported cycle closes with a duplicate of its first pose. Rebuild its
// repeating motion from a few Fourier harmonics so the pose and its velocity
// stay continuous everywhere, including where the animation loops.
function seamlessWalkClip(source) {
    const start = Math.min(...source.tracks.map(track => track.times[0]));
    const end = Math.max(...source.tracks.map(track => track.times[track.times.length - 1]));
    const duration = end - start;
    const tracks = source.tracks.map(track => {
        if (track.times.length <= 2 || track.getInterpolation() === THREE.InterpolateDiscrete) {
            const copy = track.clone();
            copy.shift(-start);
            return copy;
        }
        const width = track.getValueSize();
        const quaternion = track instanceof THREE.QuaternionKeyframeTrack;
        const keyCount = track.times.length - 1;
        const samples = keyCount * 12;
        const times = new Float32Array(samples + 1);
        const values = new Float32Array((samples + 1) * width);
        const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
        const keyframes = Array.from({ length: keyCount }, (_, index) =>
            Array.from(track.values.subarray(index * width, (index + 1) * width)));
        // q and -q are the same rotation. Unwrap Blender's sign flips before
        // fitting a spline, or its derivatives would reverse at those frames.
        if (quaternion) {
            for (let i = 1; i < keyCount; i++) {
                if (dot(keyframes[i - 1], keyframes[i]) < 0) {
                    keyframes[i] = keyframes[i].map(value => -value);
                }
            }
        }
        // The stride and its second harmonic retain alternating footfalls
        // without reproducing the sharp changes in the exported keyframes.
        const harmonics = Math.min(2, Math.floor((keyCount - 1) / 2));
        const coefficients = Array.from({ length: width }, (_, component) => {
            const mean = keyframes.reduce((sum, pose) => sum + pose[component], 0) / keyCount;
            const waves = Array.from({ length: harmonics }, (_, index) => {
                const harmonic = index + 1;
                let cosine = 0;
                let sine = 0;
                for (let key = 0; key < keyCount; key++) {
                    const angle = 2 * Math.PI * harmonic * key / keyCount;
                    cosine += keyframes[key][component] * Math.cos(angle);
                    sine += keyframes[key][component] * Math.sin(angle);
                }
                return [2 * cosine / keyCount, 2 * sine / keyCount];
            });
            return { mean, waves };
        });
        for (let i = 0; i < samples; i++) {
            const phase = 2 * Math.PI * i / samples;
            const pose = coefficients.map(({ mean, waves }) => waves.reduce((sum, [cosine, sine], index) => {
                const angle = (index + 1) * phase;
                return sum + cosine * Math.cos(angle) + sine * Math.sin(angle);
            }, mean));
            if (quaternion) {
                const length = Math.hypot(...pose) || 1;
                pose.forEach((value, index) => { pose[index] = value / length; });
            }
            times[i] = i * duration / samples;
            values.set(pose, i * width);
        }
        times[samples] = duration;
        values.set(values.subarray(0, width), samples * width);
        return new track.constructor(track.name, times, values, THREE.InterpolateLinear);
    });
    return new THREE.AnimationClip(source.name, duration, tracks);
}
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
    gaitSpeed = 0;
    lastScrollY = window.scrollY;
    routeDirection = 1;
    routeScrollSpeed = 0;
    status.classList.add('is-hidden');
    if (window.scrollY <= 100) {
        welcome.classList.add('is-visible');
        welcomeEndsAt = performance.now() + 10000;
    } else {
        welcome.classList.remove('is-visible');
        welcomeEndsAt = 0;
        elapsed = 3;
    }
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
    const skillsEntrance = skillsSection?.getBoundingClientRect();
    const journey = journeyMap.getBoundingClientRect();
    const first = window.scrollY + skills.top;
    const skillsEnd = window.scrollY + skills.bottom;
    const journeyStart = window.scrollY + journey.top;
    const last = window.scrollY + journey.bottom;
    const enteringSkills = documentY < first && skillsEntrance &&
        skillsEntrance.top < window.innerHeight - 24 && skillsEntrance.bottom > 0;
    if ((documentY < first && !enteringSkills) || documentY > last) {
        approachingSkills = false;
        if (routeState === 'following') {
            routeState = 'returning';
            hovering = false;
        }
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
            routeSection = 'none';
            hovering = false;
            walker.position.y = 0;
            dock.classList.remove('is-on-route', 'is-route-gap');
            resumeRoute(walker.position.x, 0);
            resizeRenderer();
        }
        if (reducedMotion.matches) draw();
        return;
    }
    const section = enteringSkills || documentY <= skillsEnd ? 'skills' : documentY >= journeyStart ? 'journey' : 'gap';
    approachingSkills = Boolean(enteringSkills);
    if (routeState === 'free') {
        routeState = 'following';
        routeX = walker.position.x;
        routeY = walker.position.y;
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
    const targetScreenY = approachingSkills
        ? THREE.MathUtils.clamp(skills.top + 18, readingY, window.innerHeight - 12)
        : readingY;
    let screenX;
    if (section === 'skills') {
        const point = skillPointAt(window.scrollY + targetScreenY);
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
    routeY = camera.bottom + (bounds.bottom - targetScreenY) * unitsPerPixel;
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
        const walkClip = seamlessWalkClip(gltf.animations[0]);
        walkMixer = new THREE.AnimationMixer(model);
        walkDuration = walkClip.duration;
        walkMixer.clipAction(walkClip).setLoop(THREE.LoopRepeat, Infinity).play();
        walkMixer.setTime(walkDuration * 0.25);
        model.traverse(node => {
            if (node === model) return;
            const strength = /^(UpArm|LowArm|Hand)(?:CO)?[LR]$/.test(rigName(node.name)) ? .62
                : /^(UpLeg|LowLeg|Foot|Toe)/.test(node.name) ? .86 : 1;
            animatedNodes.push({ node, position: node.position.clone(), rotation: node.quaternion.clone(), scale: node.scale.clone(), strength });
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
    // Swing the shoulder forward. This rig faces +Z after its half-turn, so
    // a negative world-X rotation reaches toward the visitor without opening
    // the arm sideways. Keep the rigid LEGO elbow in its original alignment.
    model.traverse(bone => {
        if (!bone.isBone) return;
        const part = /^(UpArm|Hand)(?:CO)?R$/.exec(rigName(bone.name));
        if (!part) return;
        const kind = part[1];
        const parentRotation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        const inverseParentRotation = parentRotation.invert();
        gestureJoints.push({ bone, kind,
            liftAxis: new THREE.Vector3(1, 0, 0).applyQuaternion(inverseParentRotation),
            waveAxis: new THREE.Vector3(0, 1, 0),
            liftRotation: new THREE.Quaternion(), waveRotation: new THREE.Quaternion() });
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
    poseWeight = reducedMotion.matches ? Number(posing) : THREE.MathUtils.damp(poseWeight, Number(posing), 10, delta);
    const targetArmReach = held || falling ? -2 : hovering ? -1.55 : 0;
    armReachAngle = reducedMotion.matches ? targetArmReach : THREE.MathUtils.damp(armReachAngle, targetArmReach, 10, delta);
    waveWeight = reducedMotion.matches || held || falling ? 0 : THREE.MathUtils.damp(waveWeight, Number(hovering), 12, delta);
    const moving = ready && !greeting && !reducedMotion.matches && !posing && routeState !== 'gap';
    const departure = THREE.MathUtils.smootherstep(elapsed, 1.8, 3);
    const following = routeState === 'following';
    const returning = routeState === 'returning';
    const previousX = walker.position.x;
    const previousY = walker.position.y;
    const previousZ = walker.position.z;
    const scrollMovement = delta ? window.scrollY - lastScrollY : 0;
    const scrollDelta = Math.abs(scrollMovement);
    if (following && scrollDelta > 1) routeDirection = Math.sign(scrollMovement);
    if (delta) lastScrollY = window.scrollY;
    if (moving && !following && !returning) distance += freeWalkSpeed * departure * delta;
    const current = routePose();
    const approachOffset = routeX - walker.position.x;
    const approachDistance = approachingSkills ? Math.hypot(approachOffset, routeY - walker.position.y) : 0;
    const routeHeading = approachingSkills && Math.abs(approachOffset) > .25
        ? Math.sign(approachOffset) * Math.PI / 2
        : routeYaw + (routeDirection < 0 ? Math.PI : 0);
    const yaw = posing ? 0 : following ? routeHeading : returning ? 0 : moving ? current.yaw * THREE.MathUtils.smootherstep(elapsed, 1, 1.8) : 0;
    heading.setFromAxisAngle(upAxis, yaw);
    walker.quaternion.slerp(heading, reducedMotion.matches ? 1 : 1 - Math.exp(-6 * delta));
    const followRate = reducedMotion.matches ? 1 : 1 - Math.exp(-(approachingSkills ? 11 : 6.5) * delta);
    if (held || falling) walker.position.set(heldX, heldY, heldZ);
    else if (following) {
        walker.position.y = THREE.MathUtils.lerp(walker.position.y, routeY, followRate);
        walker.position.z = THREE.MathUtils.lerp(walker.position.z, 0, followRate);
        if (routeSection === 'skills' && !approachingSkills) {
            const point = skillPointAt(window.scrollY + footScreenY());
            const bounds = stage.getBoundingClientRect();
            const unitsPerPixel = (camera.top - camera.bottom) / bounds.height;
            const halfFigure = characterWidth * figureScale / unitsPerPixel / 2;
            const screenX = THREE.MathUtils.clamp(point.x, halfFigure + 5, bounds.width - halfFigure - 5);
            const targetX = (screenX - bounds.left - bounds.width / 2) * unitsPerPixel;
            walker.position.x = THREE.MathUtils.lerp(walker.position.x, targetX, followRate);
        } else walker.position.x = THREE.MathUtils.lerp(walker.position.x, routeX, followRate);
    } else if (returning) {
        walker.position.y = THREE.MathUtils.lerp(walker.position.y, 0, followRate);
        walker.position.z = THREE.MathUtils.lerp(walker.position.z, 0, followRate);
        if (Math.abs(walker.position.y) < .08 && !held && !falling) {
            walker.position.y = 0;
            routeState = 'free';
            routeSection = 'none';
            hovering = false;
            dock.classList.remove('is-on-route', 'is-route-gap');
            resumeRoute(walker.position.x, yaw);
            resizeRenderer();
        }
    } else if (!posing && routeState !== 'gap') walker.position.set(moving ? current.x : 0, 0, moving ? current.z : 0);
    // In Journey the LEGO stays near the reading line while the document moves.
    // Ease the step speed instead of jumping the clip ahead after a large scroll.
    const unitsPerPixel = (camera.top - camera.bottom) / Math.max(1, stage.getBoundingClientRect().height);
    const worldStep = Math.hypot(walker.position.x - previousX, walker.position.y - previousY, walker.position.z - previousZ);
    const worldSpeed = delta ? worldStep / delta : 0;
    if (following) routeScrollSpeed = Math.min(1.8, routeScrollSpeed + scrollDelta * unitsPerPixel * .4);
    else routeScrollSpeed = 0;
    const desiredSpeed = moving ? Math.min(approachingSkills ? 3.6 : 1.8,
        following ? Math.max(worldSpeed, routeScrollSpeed, approachDistance > .12 ? 2.4 : 0)
            : returning ? worldSpeed : freeWalkSpeed * departure) : 0;
    routeScrollSpeed = THREE.MathUtils.damp(routeScrollSpeed, 0, 3, delta);
    gaitSpeed = THREE.MathUtils.damp(gaitSpeed, desiredSpeed, moving ? (approachingSkills ? 14 : 7) : 9, delta);
    gaitWeight = reducedMotion.matches ? 0 : THREE.MathUtils.damp(gaitWeight, Math.min(1, Math.abs(gaitSpeed) / 0.7), 8, delta);
    gaitPhase = ((gaitPhase + gaitSpeed * delta * Math.PI * 2 / strideLength) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const weight = gaitWeight * (1 - poseWeight);
    // The original footfalls supply the motion; only a slight body lift is added.
    if (!held && !falling) {
        bobOffset = (1 - Math.cos(2 * gaitPhase)) * 0.006 * weight;
        walker.position.y += bobOffset;
    }
    if (walkMixer && walkDuration) {
        walkMixer.setTime((gaitPhase / (Math.PI * 2) + 0.25) * walkDuration);
        for (const { node, position, rotation, scale, strength } of animatedNodes) {
            const idleBlend = 1 - weight * strength;
            node.position.lerp(position, idleBlend);
            node.quaternion.slerp(rotation, idleBlend);
            node.scale.lerp(scale, idleBlend);
        }
    }
    for (const joint of gestureJoints) {
        joint.liftRotation.setFromAxisAngle(joint.liftAxis, joint.kind === 'UpArm' ? armReachAngle : 0);
        joint.bone.quaternion.premultiply(joint.liftRotation);
        if (joint.kind === 'Hand') {
            // Twist the hand about its own bone axis; the arm remains still.
            const wave = Math.sin(elapsed * Math.PI * 3.2) * 0.62 * waveWeight * poseWeight;
            joint.waveRotation.setFromAxisAngle(joint.waveAxis, wave);
            joint.bone.quaternion.premultiply(joint.waveRotation);
        }
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
handle.addEventListener('pointerleave', event => {
    if (event.pointerType === 'touch') return;
    hovering = false;
    if (reducedMotion.matches) draw();
});
handle.addEventListener('pointerdown', event => {
    if (!ready || held || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    clearTimeout(touchGreetingTimer);
    handle.setPointerCapture(event.pointerId);
    pointerId = event.pointerId;
    heldPointerType = event.pointerType;
    touchStartedAt = performance.now();
    touchMoved = false;
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
    if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 12) touchMoved = true;
    const unitsPerPixel = (camera.top - camera.bottom) / stage.getBoundingClientRect().height;
    heldX = THREE.MathUtils.clamp(dragOriginX + (event.clientX - dragStartX) * unitsPerPixel, -travelLimit, travelLimit);
    heldY = THREE.MathUtils.clamp(dragOriginY - (event.clientY - dragStartY) * unitsPerPixel, 0, Math.max(0, camera.top - 5.2 * figureScale));
    draw();
});
function release(event) {
    if (!held || event.pointerId !== pointerId) return;
    const tapped = heldPointerType === 'touch' && event.type === 'pointerup' &&
        !touchMoved && performance.now() - touchStartedAt < 550;
    held = false;
    pointerId = null;
    heldPointerType = '';
    falling = heldY > (routeState === 'following' ? routeY : 0) + .02;
    dropVelocity = 0;
    if (!falling) {
        if (routeState === 'free') resumeRoute(heldX, heldYaw);
        dock.classList.remove('is-interacting');
    }
    handle.classList.remove('is-held');
    if (tapped) {
        // Touchscreens have no hover state: a short tap gives the same wave.
        hovering = true;
        touchGreetingTimer = setTimeout(() => {
            hovering = false;
            if (reducedMotion.matches) draw();
        }, 1800);
    }
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
