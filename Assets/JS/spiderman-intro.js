import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/DRACOLoader.js';

const overlay = document.getElementById('spidermanIntro');
const canvas = document.getElementById('spidermanIntroCanvas');
const loading = document.getElementById('spidermanIntroLoading');
const loadingText = document.getElementById('spidermanIntroText');
const skip = document.getElementById('spidermanIntroSkip');
const portfolio = document.querySelector('.Container');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Every visit starts with the hidden top edge of the portfolio as the target
// of the web, even when the browser tries to restore an older scroll position.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x312d36, 2.1));
const keyLight = new THREE.DirectionalLight(0xfff3e6, 2.2);
keyLight.position.set(3, 4, 6);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x2fc9e8, 1.5);
rimLight.position.set(-4, 2, -4);
scene.add(rimLight);

let mixer;
let model;
let wrist;
let clipDuration = 10;
let finished = false;
let animationFrame;
let lastTime = performance.now();
let modelBaseY = 0;
let modelHeight = 1;
let framingCenter = new THREE.Vector3();
const fadingMaterials = [];

const suspensionMaterial = new THREE.LineBasicMaterial({ color: 0xe9f7ff, transparent: true, opacity: 0.92 });
const suspensionGeometry = new THREE.BufferGeometry();
const suspension = new THREE.Line(suspensionGeometry, suspensionMaterial);
scene.add(suspension);

const shotMaterial = new THREE.LineBasicMaterial({ color: 0xf5fbff, transparent: true, opacity: 0 });
const shotGeometry = new THREE.BufferGeometry();
const shot = new THREE.Line(shotGeometry, shotMaterial);
scene.add(shot);

function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (model) frameModel();
}

function frameModel() {
    const dockHeight = document.getElementById('legoStage').getBoundingClientRect().height;
    const pixels = Math.max(80, dockHeight * 5 / 6.4);
    const distance = modelHeight * window.innerHeight / pixels / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(framingCenter.x, framingCenter.y, framingCenter.z + distance);
    camera.lookAt(framingCenter);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
}

function screenPointAtDepth(screenX, screenY, depth) {
    const point = new THREE.Vector3(
        screenX / window.innerWidth * 2 - 1,
        1 - screenY / window.innerHeight * 2,
        0.5
    ).unproject(camera);
    const direction = point.sub(camera.position).normalize();
    const distance = (depth - camera.position.z) / direction.z;
    return camera.position.clone().add(direction.multiplyScalar(distance));
}

function updateStory(time) {
    if (!model) return;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    const top = new THREE.Vector3(box.getCenter(new THREE.Vector3()).x, box.max.y, box.getCenter(new THREE.Vector3()).z);
    suspensionGeometry.setFromPoints([top, new THREE.Vector3(top.x, top.y + box.getSize(new THREE.Vector3()).y * 0.95, top.z)]);

    const launchProgress = THREE.MathUtils.smootherstep(time, clipDuration * 0.69, clipDuration * 0.79);
    const pullProgress = THREE.MathUtils.smootherstep(time, clipDuration * 0.79, clipDuration * 0.985);

    // The portfolio waits below the viewport until the web catches it, then
    // follows the character upward as one continuous pull.
    const pageOffset = (1 - pullProgress) * 108;
    document.body.style.setProperty('--portfolio-intro-y', `${pageOffset}vh`);
    overlay.style.setProperty('--intro-backdrop-opacity', String(1 - pullProgress * 0.98));
    model.position.y = modelBaseY + pullProgress * modelHeight * 2.65;
    const characterOpacity = 1 - THREE.MathUtils.smootherstep(pullProgress, 0.18, 0.95);
    for (const material of fadingMaterials) material.opacity = characterOpacity;
    suspensionMaterial.opacity = characterOpacity * 0.92;

    if (!wrist || launchProgress <= 0) {
        shotMaterial.opacity = 0;
        return;
    }
    const origin = wrist.getWorldPosition(new THREE.Vector3());
    const pageTop = Math.min(window.innerHeight * 0.94, pageOffset / 100 * window.innerHeight + 12);
    const attachment = screenPointAtDepth(window.innerWidth * 0.5, pageTop, origin.z);
    const end = origin.clone().lerp(attachment, launchProgress);
    shotGeometry.setFromPoints([origin, end]);
    shotMaterial.opacity = Math.min(launchProgress, characterOpacity) * 0.95;
}

function render(now) {
    // RAF timestamps can precede performance.now() from the loader callback.
    // A negative first step would finish a LoopOnce action backwards at frame 0.
    const delta = Math.max(0, Math.min((now - lastTime) / 1000, 0.05));
    lastTime = now;
    if (mixer) {
        // Keep the search concise, then slow down the shot and pull so the
        // relationship between the web and the rising page is easy to read.
        const playbackRate = 1;
        mixer.update(delta * playbackRate);
        const time = mixer.time;
        updateStory(time);
        if (time >= clipDuration * 0.99) finishIntro();
    }
    renderer.render(scene, camera);
    if (!finished) animationFrame = requestAnimationFrame(render);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

async function startPortfolio() {
    try {
        await Promise.all([
            loadScript('https://unpkg.com/typed.js@2.1.0/dist/typed.umd.js'),
            loadScript('https://unpkg.com/scrollreveal')
        ]);
        await loadScript('./Assets/JS/main.js');
    } finally {
        import('./lego-preview.js');
    }
}

function finishIntro() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(animationFrame);
    document.body.style.setProperty('--portfolio-intro-y', '0vh');
    document.body.classList.remove('intro-pending');
    document.body.classList.add('portfolio-ready');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    overlay.classList.add('is-leaving');
    startPortfolio();
    setTimeout(() => {
        overlay.remove();
        renderer.dispose();
        suspensionGeometry.dispose();
        shotGeometry.dispose();
    }, 800);
}

skip.addEventListener('click', finishIntro);
window.addEventListener('resize', resize, { passive: true });
resize();

const draco = new DRACOLoader();
draco.setDecoderPath('https://unpkg.com/three@0.160.1/examples/jsm/libs/draco/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
loader.load('./Assets/Models/spiderman-intro.glb?v=2', gltf => {
    model = gltf.scene;
    // The Blender camera looked at the character's front from the opposite
    // side. Rotate the exported asset so visitors see that same front view.
    model.rotation.y = Math.PI;
    model.traverse(node => {
        if (node.isMesh) {
            node.frustumCulled = false;
            if (node.material) {
                node.material = node.material.clone();
                if (/GEOFace/i.test(node.name)) {
                    node.material = new THREE.MeshBasicMaterial({
                        map: node.material.map, transparent: true,
                        side: THREE.DoubleSide, depthWrite: false,
                        polygonOffset: true, polygonOffsetFactor: -1,
                        polygonOffsetUnits: -1
                    });
                    node.renderOrder = 1;
                }
                node.material.roughness = Math.max(node.material.roughness ?? 0.6, 0.55);
                node.material.metalness = 0;
                node.material.transparent = true;
                fadingMaterials.push(node.material);
            }
        }
        if (/Hand[._]?R/i.test(node.name)) wrist = node;
    });
    scene.add(model);
    modelBaseY = model.position.y;
    loading.classList.add('is-hidden');
    if (gltf.animations.length && !reduceMotion) {
        mixer = new THREE.AnimationMixer(model);
        const clip = gltf.animations[0];
        clipDuration = clip.duration;
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        // Measure the evaluated skin, not its compact bind-pose bounds.
        mixer.setTime(clipDuration * 0.5);
        model.updateMatrixWorld(true);
        const posedBounds = new THREE.Box3().setFromObject(model, true);
        modelHeight = posedBounds.getSize(new THREE.Vector3()).y;
        posedBounds.getCenter(framingCenter);
        mixer.setTime(0);
        action.reset().play();
    } else {
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model, true);
        modelHeight = bounds.getSize(new THREE.Vector3()).y;
        bounds.getCenter(framingCenter);
        setTimeout(finishIntro, 1200);
    }
    frameModel();
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(render);
}, progress => {
    if (progress.total) loadingText.textContent = `Preparing experience ${Math.round(progress.loaded / progress.total * 100)}%`;
}, error => {
    console.error('Unable to load the intro model:', error);
    loadingText.textContent = 'Opening portfolio';
    setTimeout(finishIntro, 600);
});

// Never trap the visitor behind the intro if a device or network fails.
setTimeout(finishIntro, 15000);
