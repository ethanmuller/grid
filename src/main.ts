import './style.css'
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

document.querySelector<HTMLDivElement>('#launcher')!.innerHTML = `
  <div>
    <div class="card" id="buttonholder">
    <div style="font-size:3em; margin: 3rem;">🥽</div>
    </div>
    <pre id="log"></pre>
  </div>
`

function log(msg:String) {
    document.querySelector('#log')!.innerHTML += `${msg}\n`
    console.log(msg)
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth*0.666 / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 1.6, 0);

const listener = new THREE.AudioListener();
camera.add( listener );
const audioLoader = new THREE.AudioLoader();

const bomp = new THREE.PositionalAudio( listener );
const tik = new THREE.PositionalAudio( listener );
const dot = new THREE.PositionalAudio( listener );
const bgm = new THREE.Audio( listener );

audioLoader.load( 'bomp.wav', function( buffer ) {
    bomp.setBuffer( buffer );
    bomp.setRefDistance( 100 );
    bgm.setVolume(0.6);
    cursorA.add(bomp);
});

audioLoader.load( 'tik.wav', function( buffer ) {
    tik.setBuffer( buffer );
    dot.setBuffer( buffer );
    tik.setRefDistance( 100 );
    bgm.setVolume(0.6);
    dot.setVolume( 0.1 );
    bgm.setPlaybackRate(1.5)
    dot.setPlaybackRate(0.5)
    cursorA.add(bomp);
});

audioLoader.load( 'crossbit-v1.mp3', function( buffer ) {
    bgm.setBuffer( buffer );
    bgm.setVolume(0.1);
    bgm.setPlaybackRate(1 - Math.random())
});


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth*0.666, window.innerHeight );

document.body.appendChild( renderer.domElement );

renderer.xr.enabled = true;

const gridSize = 0.05;
const cubeSize = gridSize;

const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const material = new THREE.MeshNormalMaterial();
const m = new THREE.MeshStandardMaterial({ emissive: 0xffffff });


const cursorGeometryX = new THREE.BoxGeometry(cubeSize*1.5, cubeSize*0.05, cubeSize*0.05);
const cursorGeometryY = new THREE.BoxGeometry(cubeSize*0.05, cubeSize*1.5, cubeSize*0.05);
const cursorGeometryZ = new THREE.BoxGeometry(cubeSize*0.05, cubeSize*0.05, cubeSize*1.5);

const cursorX = new THREE.Mesh( cursorGeometryX, m );
const cursorY = new THREE.Mesh( cursorGeometryY, m );
const cursorZ = new THREE.Mesh( cursorGeometryZ, m );

const cursorA = new THREE.Group();
cursorA.add(cursorX, cursorY, cursorZ);
//cursorA.scale.multiplyScalar(0.5);
//
const cursorB = cursorA.clone();

scene.add( cursorA, cursorB );

let controller1 = new THREE.Group();
let controller2 = new THREE.Group();

const lastSnappedPos = new THREE.Vector3();

let drag1 = null;


function snapToGrid(position: THREE.Vector3) {
    const snappedX = Math.round(position.x / gridSize) * gridSize;
    const snappedY = Math.round(position.y / gridSize) * gridSize;
    const snappedZ = Math.round(position.z / gridSize) * gridSize;
    return new THREE.Vector3(snappedX, snappedY, snappedZ);
}

function step() {
    // this moves the cube around based on hand position
    cursorA.position.copy(snapToGrid(controller1.position));
    if (!lastSnappedPos.equals(cursorA.position)) {
        dot.play();
        lastSnappedPos.copy(cursorA.position);
    }

    cursorB.position.copy(snapToGrid(controller2.position));
    if (!lastSnappedPos.equals(cursorB.position)) {
        dot.play();
        lastSnappedPos.copy(cursorB.position);
    }
}

function animateOnPage() {
	requestAnimationFrame( animateOnPage );
    step()
	renderer.render( scene, camera );
}

renderer.setAnimationLoop( function () {
    step()
	renderer.render( scene, camera );

} );

animateOnPage();

//When user turn on the VR mode.
renderer.xr.addEventListener('sessionstart', function () {
    log('SESSION STARTED')
    bgm.setPlaybackRate(1.2 - Math.random())
    bgm.play()
});
//When user turn off the VR mode.
renderer.xr.addEventListener('sessionend', function () {
    log('SESSION ENDED')
    bgm.pause()
});


// Function to handle VR mode
function enterVR() {
  // Check if the browser supports WebXR
  if ('xr' in navigator) {

    // Request VR session
    navigator.xr
      .requestSession('immersive-ar', { optionalFeatures: ['local-floor'] })
      .then((session) => {
        // Set the session to the renderer
        renderer.xr.setSession(session);

        // Render the scene in VR mode
        function renderLoop() {
          // Render your 3D scene here

          // Submit the frame to the VR display
          session.requestAnimationFrame(renderLoop);
        }

        // Start the render loop
        session.requestAnimationFrame(renderLoop);
      })
      .catch((error) => {
        console.error('Failed to enter VR session:', error);
      });
  } else {
    console.error('WebXR is not supported in this browser.');
  }
}

const grid: THREE.Object3D[] = [];

function pinch(e: any) {
    //log(`${Math.floor(controller1.position.x * 10)}`);


    const snappedPosition = snapToGrid(e.target.position);

    drag1 = new THREE.Object3D();
    drag1.position.copy(snappedPosition);

    const i = grid.findIndex(i => i.position.equals(snappedPosition));
    const isObjectHere = i > -1;
    if (isObjectHere) {
        // remove what's there
        scene.remove(grid[i])
        grid.splice(i, 1)
        tik.play();
    } else {
        // spawn a block!
        const spawn = new THREE.Mesh( geometry, material );
        spawn.geometry.computeBoundingSphere();
        spawn.position.copy( snappedPosition );
        scene.add( spawn );
        grid.push(spawn);
        bomp.setPlaybackRate(1 + Math.random() * 0.3)
        bomp.play();
    }
}

function pinchEnd(e: any) {
    drag1 = null;
}

log('LOGGING ACTIVATED');
if ('xr' in navigator) {
    log('PLEASE BEGIN SESSION');

    // Create the VR button and add event listener
    const vrButton = document.createElement('button');
    vrButton.textContent = 'Open Session';
    vrButton.id = 'vr-button';
    vrButton.addEventListener('click', enterVR);
    document.querySelector('#buttonholder')?.appendChild(vrButton);

    controller1 = renderer.xr.getController( 0 );
    scene.add( controller1 );

    controller2 = renderer.xr.getController( 1 );
    scene.add( controller2 );


    controller1.addEventListener( 'selectstart',  pinch );
    controller1.addEventListener( 'selectend',  pinchEnd );

    controller2.addEventListener( 'selectstart',  pinch );
    controller2.addEventListener( 'selectend',  pinchEnd );

    const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );
     
} else {
    // Create the VR button and add event listener
    const msg = document.createElement('div');
    msg.textContent = 'XR not supported';
    msg.id = 'msg';
    document.querySelector('#buttonholder')?.appendChild(msg);
}
