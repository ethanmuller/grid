import './style.css'
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { normalizePath } from 'vite';

document.querySelector<HTMLDivElement>('#launcher')!.innerHTML = `
  <div>
    <div class="card" id="buttonholder">
    <div style="font-size:3em; margin: 3rem;">🥽</div>
    </div>
    <pre id="log"></pre>
    <div style="opacity: 0.6; display: block;">
    <h1 style="font-size: 1rem; text-align: left;margin-top: 4rem;">Issues</h1>
    <ul>
    <li>visual feedback is not shown for dragging to add blocks</li>
    <li>there is no way to save creations</li>
    </ul>
    </div>
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
const deleteSoundWhileDraggingA = new THREE.PositionalAudio( listener );

const grid: THREE.Mesh[] = [];

audioLoader.load( 'bomp.wav', function( buffer ) {
    bomp.setBuffer( buffer );
    bomp.setRefDistance( 0.3 );
    bomp.setVolume(2);
    controllerA.add(bomp);

    dotA.setBuffer( buffer );
    dotB.setBuffer( buffer );
    dotA.setRefDistance( 0.8 );
    dotB.setRefDistance( 1000 );
    dotA.setVolume( 1 );
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
    tik.setRefDistance( 0.7 );
    controllerA.add(tik);

    deleteSoundWhileDraggingA.setBuffer( buffer );
    deleteSoundWhileDraggingA.setRefDistance( 1000 );
    deleteSoundWhileDraggingA.setVolume(0.5)
    controllerA.add(deleteSoundWhileDraggingA);
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
const normalMaterial = new THREE.MeshNormalMaterial();
const hotWhite = new THREE.MeshStandardMaterial({ emissive: 0xffffff });
const hotRed = new THREE.MeshStandardMaterial({ emissive: 0xff0000 });


const cursorGeometryX = new THREE.BoxGeometry(cubeSize*0.75, cubeSize*0.05, cubeSize*0.05);
const cursorGeometryY = new THREE.BoxGeometry(cubeSize*0.05, cubeSize*0.75, cubeSize*0.05);
const cursorGeometryZ = new THREE.BoxGeometry(cubeSize*0.05, cubeSize*0.05, cubeSize*0.75);

const cursorX = new THREE.Mesh( cursorGeometryX, hotWhite );
const cursorY = new THREE.Mesh( cursorGeometryY, hotWhite );
const cursorZ = new THREE.Mesh( cursorGeometryZ, hotWhite );

const cursorA = new THREE.Group();

cursorA.add(cursorX, cursorY, cursorZ);

// a box we use to show the result of the dragging action

//const cursorB = cursorA.clone();

scene.add( cursorA );

let controllerA = new THREE.Group();
let controllerB = new THREE.Group();

const lastA = new THREE.Vector3();
const lastSnappedB = new THREE.Vector3();

let dragPointA = new THREE.Object3D();
let isDraggingA: Boolean = false;
const dragDiff = new THREE.Mesh( cubeGeometry, hotWhite );
const dragDiffPivot = new THREE.Group();
dragDiffPivot.add(dragDiff)
dragDiff.geometry.computeBoundingSphere();
dragDiff.scale.set(1,1,1)
dragDiff.position.add(new THREE.Vector3(0, 0, 1).multiplyScalar(cubeSize))
scene.add(dragDiffPivot)

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

    let axisSnapped
    let diff = null;

    if (isDraggingA) {
        // We get the position of the cursor
        // when it is snapped to its most prominent vector direction
        // Relative to where the drag started
        diff = new THREE.Vector3().subVectors(cursorPosSnappedA, dragPointA.position)
        if (diff.length() < cubeSize) {
            dragDiffPivot.visible = false
        } else {
            dragDiffPivot.visible = true
            dragDiff.position.copy(new THREE.Vector3(0, 0, 1).multiplyScalar(cubeSize))
            dragDiff.position.add(new THREE.Vector3(0, 0, 0.5).multiplyScalar(diff.length()-1*cubeSize))
            dragDiff.scale.setZ(1 + diff.length()*(1/cubeSize) - 1)
        }
        axisSnapped = createLargestComponentVector(diff)
        axisSnapped.add(dragPointA.position)
        cursorA.position.copy(axisSnapped);
        dragDiffPivot.lookAt(axisSnapped);
    } else {
        cursorA.position.copy(cursorPosSnappedA);
    }

    // the step function runs very fast
    // so we check if we crossed any of the grid boundaries
    const didNotMoveBetweenCells = lastA.equals(cursorA.position)

    if (didNotMoveBetweenCells) {
        return
    }

    const didMoveBetweenCells = !didNotMoveBetweenCells;

    if (didMoveBetweenCells) {
        grid.forEach((i) => {
            i.material = normalMaterial
        })

        if (isDraggingA) {
            if (dragActionA === Verbs.Delete) {
                runForEachCellBetween(cursorA.position, dragPointA.position, (mesh:THREE.Mesh, point:THREE.Vector3) => {
                    redCubeAt(point)
                })
            }
        }

        const i = grid.findIndex(i => i.position.equals(snapToGrid(cursorA.position)));
        const isObjectHere = i > -1;
        if (isObjectHere) {
            if (isDraggingA) {
                if (dragActionA === Verbs.Delete) {
                    deleteSoundWhileDraggingA.stop();
                    deleteSoundWhileDraggingA.setPlaybackRate(4);
                    deleteSoundWhileDraggingA.play();
                    grid[i].material = hotRed
                }
            } else {
                // the sound when there's something there
                dotA.stop();
                dotA.setPlaybackRate(0.1);
                dotA.setVolume( 0.6 );
                dotA.play();
                grid[i].material = hotRed
            }
        } else {
            cursorA.visible = true;
            dotA.stop();
            dotA.setPlaybackRate(0.5);
            dotA.setVolume( 0.25 );
            dotA.play();
        }
    }

    lastA.copy(cursorA.position);
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

    dragPointA.position.copy(snappedPosition);
    isDraggingA = true;
    dragDiffPivot.position.copy(snappedPosition);

    const i = grid.findIndex(i => i.position.equals(snappedPosition));
    const isObjectHere = i > -1;
    if (isObjectHere) {
        deleteCubeAt(snappedPosition)
        tik.play();
        dragActionA = Verbs.Delete
    } else {
        spawnCubeAt(snappedPosition)
        bomp.setPlaybackRate(1.2 + Math.random() * 0.3)
        bomp.play();
        dragActionA = Verbs.Add
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


function spawnCubeAt(v: THREE.Vector3) {
    const p = snapToGrid(v)
    const i = grid.findIndex(i => i.position.equals(p));
    const isObjectHere = i > -1;
    if (!isObjectHere) {
        const spawn = new THREE.Mesh( cubeGeometry, normalMaterial );
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

function redCubeAt(v: THREE.Vector3) {
    const i = grid.findIndex(i => i.position.equals(snapToGrid(v)));
    const isObjectHere = i > -1;
    if (isObjectHere) {
        grid[i].material = hotRed;
    }
}

function resetCubeAt(v: THREE.Vector3) {
    const i = grid.findIndex(i => i.position.equals(snapToGrid(v)));
    const isObjectHere = i > -1;
    if (isObjectHere) {
        grid[i].material = normalMaterial;
    }
}

function runForEachCellBetween(a: THREE.Vector3, b: THREE.Vector3, cb: Function): Array<THREE.Mesh> {
    // this lets us modify each mesh that falls between one point and another,
    // where we snap to the first anchor to help prevent aliasing
    const diff = new THREE.Vector3().subVectors(a, b);
    const axisSnappedLine = createLargestComponentVector(diff)
    const dir = axisSnappedLine.clone().normalize();
    const intScaledVector = axisSnappedLine.clone().multiplyScalar(10)
    const int = Math.round(intScaledVector.length());
    log(`running loop ${int} times`)
    for (let i = 1; i <= int; i++) {
        const insertionPoint:THREE.Vector3 = dir.clone().multiplyScalar(i).divideScalar(10)
        insertionPoint.add(b)

        const indexInGrid = grid.findIndex(i => i.position.equals(insertionPoint));
        let mesh;
        if (indexInGrid > 0) {
            mesh = grid[i]
        }

        cb(mesh, insertionPoint, int, axisSnappedLine)
    }
}

function pinchEnd(e: any) {

    if (isDraggingA) {
        const cursorPosSnappedA = snapToGrid(e.target.position);

        const didMoveBetweenGridCells = !dragPointA.position.equals(cursorPosSnappedA)

        if (didMoveBetweenGridCells) {

            if (dragActionA === Verbs.Add) {
                bomp.setPlaybackRate(1 + Math.random() * 0.3)
                bomp.play();
                runForEachCellBetween(cursorPosSnappedA, dragPointA.position, (mesh:THREE.Mesh, point:THREE.Vector3) => {
                    spawnCubeAt(point)
                })
            }

            if (dragActionA === Verbs.Delete) {
                tik.play();
                runForEachCellBetween(cursorPosSnappedA, dragPointA.position, (mesh:THREE.Mesh, point:THREE.Vector3) => {
                    deleteCubeAt(point)
                })
            }

        }
    }


    // check if there was a drag
    // if dragAAdd
    //  spawn a bunch of cubes
    // if Delete
    //  count through each space, and if there's a cube in it, delete it

    dragActionA = null;
    isDraggingA = false;
    dragDiffPivot.visible = false
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

    // controllerB = renderer.xr.getController( 1 );
    // scene.add( controllerB );


    controllerA.addEventListener( 'selectstart',  pinch );
    controllerA.addEventListener( 'selectend',  pinchEnd );


    // controllerB.addEventListener( 'selectstart',  pinch );
    // controllerB.addEventListener( 'selectend',  pinchEnd );

    const cubeGeometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 ) ] );
     
} else {
    // Create the VR button and add event listener
    const msg = document.createElement('div');
    msg.textContent = 'XR not supported';
    msg.id = 'msg';
    document.querySelector('#buttonholder')?.appendChild(msg);
}
