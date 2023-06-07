import './style.css'
import * as THREE from 'three';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div class="card" id="buttonholder">
    </div>
    <ul>
        <li>next: add vr hand</li>
    </ul>
  </div>
`



const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth*0.666 / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth*0.666, window.innerHeight );

document.body.appendChild( renderer.domElement );

renderer.xr.enabled = true;

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function step() {
	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;
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
cameraGroup.position.set(0, -1, 5);  // Set the initial VR Headset Position.

//When user turn on the VR mode.
renderer.xr.addEventListener('sessionstart', function () {
    scene.add(cameraGroup);
    cameraGroup.add(camera);
});
//When user turn off the VR mode.
renderer.xr.addEventListener('sessionend', function () {
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
    // Create the VR button and add event listener
    const vrButton = document.createElement('button');
    vrButton.textContent = 'Enter VR';
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
