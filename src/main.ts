// renderer
// scene
// camera

import './style.css'
import * as THREE from 'three';

document.querySelector<HTMLDivElement>('#launcher')!.innerHTML = `
  <div>
    <div class="card" id="buttonholder">
    </div>
    <ul>
        <li>next up:</li>
        <li>show log within Session</li>
        <li>add hand model</li>
        <ul>
            <li>renderer.xr.getHand(0)</li>
            <li>put a cube in it</li>
            <li>add to cameragroup</li>
        </ul>
        <li>add pinch events</li>
        <li>visualize how code depends on other code</li>
    </ul>
    <pre id="log"></pre>
  </div>
`

function log(msg) {
    document.querySelector('#log')!.innerHTML += `${msg}\n`
}


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth*0.666 / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth*0.666, window.innerHeight );

const hand1 = renderer.xr.getHand( 0 );
//hand1.addEventListener( 'pinchstart', onPinchStartLeft );
scene.add( hand1 );
console.log(hand1)

document.body.appendChild( renderer.domElement );

renderer.xr.enabled = true;

const geometry = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh( geometry, material );
const cube2 = new THREE.Mesh( geometry, material );

scene.add( cube, cube2 );

const spacer = 0.75;

camera.position.z = spacer;

function step() {
	cube.rotation.x += 0.001;
	cube.rotation.y += 0.001;
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

const cameraGroup = new THREE.Group();
cameraGroup.position.set(0, -1, spacer);  // Set the initial VR Headset Position.

//When user turn on the VR mode.
renderer.xr.addEventListener('sessionstart', function () {
    log('SESSION STARTED')
    scene.add(cameraGroup);
    cameraGroup.add(camera);
});
//When user turn off the VR mode.
renderer.xr.addEventListener('sessionend', function () {
    log('SESSION ENDED')
    scene.remove(cameraGroup);
    cameraGroup.remove(camera);
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

if ('xr' in navigator) {
    log('LOGGING ACTIVATED');
    log('PLEASE BEGIN SESSION');

    // Create the VR button and add event listener
    const vrButton = document.createElement('button');
    vrButton.textContent = 'Open Session';
    vrButton.id = 'vr-button';
    vrButton.addEventListener('click', enterVR);
    document.querySelector('#buttonholder')?.appendChild(vrButton);
} else {
    // Create the VR button and add event listener
    const msg = document.createElement('div');
    msg.textContent = 'XR not supported';
    msg.id = 'msg';
    document.querySelector('#buttonholder')?.appendChild(msg);
}
