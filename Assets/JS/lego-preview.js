import * as THREE from 'three';
import { FBXLoader } from 'https://unpkg.com/three@0.160.1/examples/jsm/loaders/FBXLoader.js';

const stage = document.getElementById('legoStage');
const canvas = document.getElementById('legoCanvas');
const status = document.getElementById('legoStatus');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
camera.position.set(6, 4, 7);
camera.lookAt(0, 1.5, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 2.5));

const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(4, 7, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const clock = new THREE.Clock();
let mixer;
const faceTexture = new THREE.TextureLoader().load('./Assets/Models/Idle_SpriteSheet.png');
faceTexture.colorSpace = THREE.SRGBColorSpace;

function resizeRenderer() {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

new ResizeObserver(resizeRenderer).observe(stage);
resizeRenderer();

new FBXLoader().load(
    './Assets/Models/Player_Idle.fbx',
    model => {
        model.scale.setScalar(0.01);
        model.traverse(node => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;

                if (node.name.includes('GEOFaceIdle')) {
                    node.material = new THREE.MeshBasicMaterial({
                        map: faceTexture,
                        transparent: true,
                        depthWrite: false
                    });
                }
            }
    });

        model.updateMatrixWorld(true);
        const firstBounds = new THREE.Box3().setFromObject(model);
        const firstHeight = firstBounds.getSize(new THREE.Vector3()).y;
        if (!Number.isFinite(firstHeight) || firstHeight <= 0) {
            throw new Error('The FBX model has no measurable height.');
        }
        model.scale.multiplyScalar(5 / firstHeight);

        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        model.position.set(-center.x, -bounds.min.y, -center.z);
        model.position.y += 0.3;
        scene.add(model);

        const cameraDistance = Math.max(size.x, size.y, size.z) * 2.0;
        camera.position.set(cameraDistance, size.y * 0.7, cameraDistance);
        camera.lookAt(0, size.y / 2, 0);

        if (model.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            mixer.clipAction(model.animations[0]).play();
        }

        status.textContent = model.animations.length > 0
            ? 'Idle animation loaded successfully.'
            : 'Model loaded (no animation clip detected).';
        status.classList.add('is-hidden');
    },
    undefined,
    error => {
        console.error('Unable to load Player_Idle.fbx:', error);
        status.textContent = 'The FBX model could not be loaded.';
    }
);

function render() {
    requestAnimationFrame(render);
    mixer?.update(clock.getDelta());
    renderer.render(scene, camera);
}

render();
