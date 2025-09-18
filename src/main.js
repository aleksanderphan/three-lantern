import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c2a);

// Camera
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 12, 35);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);

// Lights
scene.add(new THREE.AmbientLight(0x111122, 0.25));
const mountainLight = new THREE.PointLight(0xffaa55, 1.2, 20, 2);
mountainLight.position.set(0, 7, 0);
scene.add(mountainLight);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x221a0f,
    roughness: 1,
    metalness: 0,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -5;
scene.add(floor);

// Mountain
const mountain = new THREE.Mesh(
  new THREE.ConeGeometry(8, 8, 32),
  new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    roughness: 1,
    metalness: 0,
  })
);
mountain.position.set(0, -1, 0);
scene.add(mountain);

// Stars
const starsGeometry = new THREE.BufferGeometry();
const starVertices = [];
for (let i = 0; i < 500; i++) {
  starVertices.push(
    (Math.random() - 0.5) * 400,
    Math.random() * 200 + 10,
    (Math.random() - 0.5) * 400
  );
}
starsGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(starVertices, 3)
);
scene.add(
  new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })
  )
);

// --- Lanterns ---
const lanterns = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

for (let i = 0; i < 50; i++) {
  const geometry = new THREE.CylinderGeometry(0.5, 0.6, 2, 16);
  const color = new THREE.Color(0xffa500).offsetHSL(
    0,
    0,
    (Math.random() - 0.5) * 0.1
  );

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: color }, intensity: { value: 1.0 } },
    vertexShader: `
      varying vec3 vNormal;
      void main(){ vNormal=normalize(normalMatrix*normal);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      void main(){
        float glow = pow(1.0-dot(vNormal,vec3(0,1,0)), 2.0)*intensity;
        gl_FragColor = vec4(glowColor*glow,0.7);}`,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const lantern = new THREE.Mesh(geometry, shaderMaterial);
  lantern.position.set(
    (Math.random() - 0.5) * 40,
    Math.random() * 4 + 4,
    (Math.random() - 0.5) * 40
  );

  const light = new THREE.PointLight(color, 0.8, 6, 2);
  light.position.set(0, 0.5, 0);
  lantern.add(light);

  // Unique ID + default popup info
  lantern.userData = {
    id: i + 1,
    image: 'https://placehold.co/200x150?text=Lantern+' + (i + 1),
    text: 'Gacor main di MAXWIN' + (i + 1),
  };

  scene.add(lantern);
  lanterns.push({
    mesh: lantern,
    speed: 0.01 + Math.random() * 0.02,
    light: light,
    shaderMaterial: shaderMaterial,
    flickerOffset: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.002,
  });
}

// --- Popup ---
const popup = document.getElementById('popup');
const popupImage = document.getElementById('popupImage');
const popupText = document.getElementById('popupText');
document.getElementById('popupClose').addEventListener('click', () => {
  popup.style.display = 'none';
});

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(lanterns.map((l) => l.mesh));
  if (intersects.length > 0) {
    const clicked = intersects[0].object.userData;
    popupImage.src = clicked.image;
    popupText.textContent = clicked.text;
    popup.style.display = 'block';
  }
});

// --- Animate ---
function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.002;

  lanterns.forEach((l) => {
    l.mesh.position.y += l.speed;
    l.mesh.position.x +=
      Math.sin(Date.now() * 0.001 + l.mesh.position.y) * 0.002;
    l.mesh.position.z +=
      Math.cos(Date.now() * 0.001 + l.mesh.position.y) * 0.002;
    l.mesh.rotation.y += l.rotationSpeed;

    if (l.mesh.position.y > 20) {
      l.mesh.position.y = Math.random() * 2 + 4;
      l.mesh.position.x = (Math.random() - 0.5) * 40;
      l.mesh.position.z = (Math.random() - 0.5) * 40;
    }

    const intensity =
      0.5 + Math.sin(time + l.flickerOffset) * 0.2 + Math.random() * 0.05;
    l.light.intensity = intensity;
    l.shaderMaterial.uniforms.intensity.value = intensity;
  });

  camera.position.y = 12 + Math.sin(time * 0.1) * 0.5;
  controls.update();
  renderer.render(scene, camera);
}

animate();
