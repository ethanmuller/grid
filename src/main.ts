import './style.css'
import { setupCounter } from './counter.ts'
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div class="card">
      <button type="button">Begin</button>
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
    next: add vr button
    next: add begin button
    next: add vr hand
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
document.body.appendChild( VRButton.createButton( renderer ) );
renderer.xr.enabled = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function animate() {
	requestAnimationFrame( animate );

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	renderer.render( scene, camera );
}

renderer.setAnimationLoop(function () {

    renderer.render( scene, camera );

});

animate();
