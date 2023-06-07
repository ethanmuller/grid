import './style.css'
import { setupCounter } from './counter.ts'
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div class="card" id="buttonholder">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
    next: add vr hand
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth*0.666 / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth*0.666, window.innerHeight );

document.body.appendChild( renderer.domElement );
document.body.appendChild( VRButton.createButton( renderer ) );

renderer.xr.enabled = true;

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
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
