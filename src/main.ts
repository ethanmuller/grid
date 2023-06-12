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
const dotA = new THREE.PositionalAudio( listener );
const dotB = new THREE.PositionalAudio( listener );
const bgm = new THREE.Audio( listener );
const dragAddA = new THREE.PositionalAudio( listener );
const dragDeleteA = new THREE.PositionalAudio( listener );

const grid: THREE.Object3D[] = [];

audioLoader.load( 'bomp.wav', function( buffer ) {
    bomp.setBuffer( buffer );
    bomp.setRefDistance( 1000 );
    controllerA.add(bomp);

    dotA.setBuffer( buffer );
    dotB.setBuffer( buffer );
    dotA.setRefDistance( 1000 );
    dotB.setRefDistance( 1000 );
    dotA.setVolume( 0.5 );
    dotB.setVolume( 0.5 );
    dotA.setPlaybackRate(0.5)
    dotB.setPlaybackRate(0.5)

    dragAddA.setBuffer( buffer );
    dragAddA.setRefDistance( 1000 );
    dragAddA.setVolume(0.5)

    controllerA.add(dotA);
    controllerB.add(dotB);

    controllerA.add(dragAddA);
});

audioLoader.load( 'tik.wav', function( buffer ) {
    tik.setBuffer( buffer );
    tik.setRefDistance( 1000 );
    controllerA.add(tik);

    dragDeleteA.setBuffer( buffer );
    dragDeleteA.setRefDistance( 1000 );
    dragDeleteA.setVolume(0.5)
    controllerA.add(dragDeleteA);
});

audioLoader.load( 'crossbit-v1.mp3', function( buffer ) {
    bgm.setBuffer( buffer );
    bgm.setVolume(0);
    bgm.setPlaybackRate(1 - Math.random())
});


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth*0.666, window.innerHeight );

document.body.appendChild( renderer.domElement );

renderer.xr.enabled = true;

const gridSize = 0.1;
const cubeSize = gridSize;

const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
const material = new THREE.MeshNormalMaterial();
const hotWhite = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
const hotRed = new THREE.MeshStandardMaterial({ emissive: 0xff0000 });


const cursorGeometryX = new THREE.BoxGeometry(cubeSize*0.75, cubeSize*0.05, cubeSize*0.05);
const cursorGeometryY = new THREE.BoxGeometry(cubeSize*0.05, cubeSize*0.75, cubeSize*0.05);
const cursorGeometryZ = new THREE.BoxGeometry(cubeSize*0.05, cubeSize*0.05, cubeSize*0.75);

const cursorX = new THREE.Mesh( cursorGeometryX, hotWhite );
const cursorY = new THREE.Mesh( cursorGeometryY, hotWhite );
const cursorZ = new THREE.Mesh( cursorGeometryZ, hotWhite );

const dragCursor = new THREE.Mesh( cubeGeometry, hotWhite );
dragCursor.scale.set(cubeSize * 0.5, cubeSize * 0.5, cubeSize * 0.5);
const cursorA = new THREE.Group();
cursorA.add(cursorX, cursorY, cursorZ);
scene.add(dragCursor);
//cursorA.scale.multiplyScalar(0.5);

const cursorB = cursorA.clone();

scene.add( cursorA, cursorB );

let controllerA = new THREE.Group();
let controllerB = new THREE.Group();

const lastSnappedA = new THREE.Vector3();
const lastSnappedB = new THREE.Vector3();

let dragStartA: THREE.Object3D | null = null;

enum Verbs {
    Add,
    Delete,
}

let dragActionA: Verbs | null;


function snapToGrid(position: THREE.Vector3) {
    const snappedX = Math.round(position.x / gridSize) * gridSize;
    const snappedY = Math.round(position.y / gridSize) * gridSize;
    const snappedZ = Math.round(position.z / gridSize) * gridSize;
    return new THREE.Vector3(snappedX, snappedY, snappedZ);
}

function step() {
    // this moves the cube around based on hand position
    const cursorPosSnappedA = snapToGrid(controllerA.position);
    cursorA.position.copy(cursorPosSnappedA);

    if (dragStartA) {
        cursorA.visible = true;

        const dragMovement = new THREE.Vector3();
        dragMovement.subVectors(cursorPosSnappedA, dragStartA.position);
        const axisSnappedDrag = createLargestComponentVector(dragMovement.clone()).add(dragStartA.position)

        cursorA.position.copy(axisSnappedDrag);
    }

    const didMoveBetweenGridCells = !lastSnappedA.equals(cursorA.position)

    if (didMoveBetweenGridCells) {
        if (dragStartA) {
            dragCursor.visible = false;
            dragCursor.lookAt(cursorA.position);
            const dist = cursorPosSnappedA.distanceTo(dragStartA.position);

            dragCursor.scale.setZ(1 / gridSize * dist)

            //dragCursor.position.addVectors(cursorPosSnappedA, dragStartA.position).multiplyScalar(0.5);
            //dragCursor.position.subVectors(cursorPosSnappedA, dragStartA.position);

            if (dragActionA === Verbs.Add) {
                dragAddA.stop();
                dragAddA.setPlaybackRate(4 + dist*4);
                dragAddA.play();
            } else if (dragActionA === Verbs.Delete) {
                dragDeleteA.stop();
                dragDeleteA.setPlaybackRate(4 + dist*4);
                dragDeleteA.play();
            }

        } else {
            const i = grid.findIndex(i => i.position.equals(cursorPosSnappedA));
            const isObjectHere = i > -1;

            if (isObjectHere) {
                dotA.stop();
                dotA.setPlaybackRate(0.2);
                dotA.play();
                dragActionA = Verbs.Delete
            } else {
                dotA.stop();
                dotA.setPlaybackRate(0.5);
                dotA.play();
                dragActionA = Verbs.Add
            }
        }
        lastSnappedA.copy(cursorA.position);
    }

    if (!didMoveBetweenGridCells && dragStartA) {
        // because we don't want to only update color upon moving between cells
        const i = grid.findIndex(i => i.position.equals(dragStartA.position));
        const isObjectHere = i > -1;

        if (isObjectHere) {
            dragActionA = Verbs.Add
        } else {
            dragActionA = Verbs.Delete
        }
    }
    if (!didMoveBetweenGridCells && !dragStartA) {
        // because we also want to update color after a drag when not dragging
        const i = grid.findIndex(i => i.position.equals(cursorPosSnappedA));
        const isObjectHere = i > -1;

        if (isObjectHere) {
            dragActionA = Verbs.Delete
        } else {
            dragActionA = Verbs.Add
        }
    }

    cursorB.position.copy(snapToGrid(controllerB.position));
    if (!lastSnappedB.equals(cursorB.position)) {
        dotB.stop();
        dotB.play();
        lastSnappedB.copy(cursorB.position);
    }

    switch(dragActionA) {
        case Verbs.Add: {
            cursorX.material = hotWhite;
            cursorY.material = hotWhite;
            cursorZ.material = hotWhite;
            dragCursor.material = hotWhite;
            break;
        }
        case Verbs.Delete: {
            cursorX.material = hotRed;
            cursorY.material = hotRed;
            cursorZ.material = hotRed;
            dragCursor.material = hotRed;
            break;
        }
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
    bgm.setPlaybackRate(1.2 - Math.random()*0.3)
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

function pinch(e: any) {
    cursorA.visible = false;
    const snappedPosition = snapToGrid(e.target.position);

    dragStartA = new THREE.Object3D();

    if (dragStartA) {
        dragStartA.position.copy(snappedPosition);
    }

    const i = grid.findIndex(i => i.position.equals(snappedPosition));
    const isObjectHere = i > -1;
    if (isObjectHere) {
        deleteCubeAt(snappedPosition)
        tik.play();
        dragCursor.visible = false;
    } else {
        spawnCubeAt(snappedPosition)
        bomp.setPlaybackRate(1 + Math.random() * 0.3)
        bomp.play();
    }
}

function findLargestComponent(vector: THREE.Vector3): number {
  const largestX = Math.max(vector.x, -vector.x);
  const largestY = Math.max(vector.y, -vector.y);
  const largestZ = Math.max(vector.z, -vector.z);

  return Math.max(largestX, largestY, largestZ);
}

function createLargestComponentVector(vector: THREE.Vector3): THREE.Vector3 {
  const absX = Math.abs(vector.x);
  const absY = Math.abs(vector.y);
  const absZ = Math.abs(vector.z);

  let largestComponent:String;

  if (absX >= absY && absX >= absZ) {
    largestComponent = 'x';
  } else if (absY >= absX && absY >= absZ) {
    largestComponent = 'y';
  } else {
    largestComponent = 'z';
  }

  const largestComponentValue = vector[largestComponent];

  const largestComponentVector = new THREE.Vector3();
  largestComponentVector[largestComponent] = largestComponentValue;
  return largestComponentVector;
}


function biggestComponent(v: THREE.Vector3) {
}

function spawnCubeAt(v: THREE.Vector3) {
    const p = snapToGrid(v)
    const i = grid.findIndex(i => i.position.equals(p));
    const isObjectHere = i > -1;
    if (!isObjectHere) {
        const spawn = new THREE.Mesh( cubeGeometry, material );
        spawn.geometry.computeBoundingSphere();
        spawn.position.copy(p);
        scene.add( spawn );
        grid.push(spawn);
    }
}

function deleteCubeAt(v: THREE.Vector3) {
    const i = grid.findIndex(i => i.position.equals(snapToGrid(v)));
    const isObjectHere = i > -1;
    if (isObjectHere) {
        scene.remove(grid[i])
        grid.splice(i, 1)
    }
}

function pinchEnd(e: any) {
    cursorA.visible = true;

    if (dragStartA) {
        const cursorPosSnappedA = snapToGrid(e.target.position);

        const didMoveBetweenGridCells = !dragStartA.position.equals(cursorPosSnappedA)

        if (didMoveBetweenGridCells) {
            const dragMovement = new THREE.Vector3();
            dragMovement.subVectors(cursorPosSnappedA, dragStartA.position);
            const pos = createLargestComponentVector(dragMovement.clone().multiplyScalar(10))
            const dir = pos.clone().normalize();
            const v = dragMovement.clone().multiplyScalar(10)
            const n = Math.round(v.length())
            log(`repeat this many times: ${n}`)
            log(`in this direction: ${Math.floor( dir.x )} y: ${Math.floor( dir.y )} z: ${Math.floor( dir.z )}`)
            //log(n)


            if (dragActionA === Verbs.Add) {
                bomp.setPlaybackRate(1 + Math.random() * 0.3)
                bomp.play();


                for (let i = 1; i <= n; i++) {
                    const insertionPoint = dir.clone().multiplyScalar(i).divideScalar(10)
                    insertionPoint.add(dragStartA.position)
                    spawnCubeAt(insertionPoint)
                }

            }

            if (dragActionA === Verbs.Delete) {
                tik.play();

                for (let i = 1; i <= n; i++) {
                    const insertionPoint = dir.clone().multiplyScalar(i).divideScalar(10)
                    insertionPoint.add(dragStartA.position)
                    deleteCubeAt(insertionPoint)
                }
            }

        }
    }


    // check if there was a drag
    // if dragAAdd
    //  spawn a bunch of cubes
    // if Delete
    //  count through each space, and if there's a cube in it, delete it

    dragStartA = null;
    dragActionA = null;
    dragCursor.visible = false;
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

    controllerA = renderer.xr.getController( 0 );
    scene.add( controllerA );

    controllerB = renderer.xr.getController( 1 );
    scene.add( controllerB );


    controllerA.addEventListener( 'selectstart',  pinch );
    controllerA.addEventListener( 'selectend',  pinchEnd );


    controllerB.addEventListener( 'selectstart',  pinch );
    controllerB.addEventListener( 'selectend',  pinchEnd );

    const cubeGeometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );
     
} else {
    // Create the VR button and add event listener
    const msg = document.createElement('div');
    msg.textContent = 'XR not supported';
    msg.id = 'msg';
    document.querySelector('#buttonholder')?.appendChild(msg);
}
