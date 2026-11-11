// 3D-голова маскота в футере страниц без скролл-сцены (кейсы, «Работы», документы). На главной голову в футер
// приводит общая сцена (scene.ts), здесь — маленькая отдельная: та же модель и свет, камера наведена так, что голова
// встаёт ровно на место PNG-постера head.png. Голова смотрит за курсором (мышь, без reduced motion) или медленно
// осматривается; рендер только пока футер на экране. Один WebGLRenderer на весь сайт (renderer.ts).
import { Box3, DirectionalLight, Group, HemisphereLight, Mesh, type Object3D, PerspectiveCamera, PMREMGenerator, PropertyBinding, Scene, Vector3 } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clampPixelRatio, damp, fitCamera, headPosterTarget } from './math';
import { getRenderer } from './renderer';
import { toStandard } from './scene';

const FOV = 28;
const ARMS_DOWN = 1.2;

export interface HeadSceneOptions {
  /** куда встаёт canvas: блок ровно по рамке PNG-постера головы */
  container: HTMLElement;
  /** адрес модели с хешем версии */
  modelUrl: string;
  /** пока элемент на экране — рендерим */
  observe: Element;
  trackCursor: boolean;
  reducedMotion: boolean;
  onReady: () => void;
}

export async function createHeadScene({ container, modelUrl, observe, trackCursor, reducedMotion, onReady }: HeadSceneOptions) {
  const renderer = getRenderer();
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(modelUrl);
  const artem: Object3D = gltf.scene;
  toStandard(artem);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.add(new HemisphereLight(0xfff4ea, 0xe8d6c6, 0.6));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(0.6, 2.6, 1.6);
  scene.add(key);
  const rim = new DirectionalLight(0xffd2b0, 0.9);
  rim.position.set(-1.6, 1.4, -1.2);
  scene.add(rim);

  // рост 0.98, ступни на y=0, центр по X/Z — как в общей сцене, иначе кадр по постеру не совпадёт
  artem.updateMatrixWorld(true);
  const b0 = new Box3().setFromObject(artem, true);
  artem.scale.setScalar(0.98 / (b0.max.y - b0.min.y));
  artem.updateMatrixWorld(true);
  const box = new Box3().setFromObject(artem, true);
  const center = box.getCenter(new Vector3());
  const H = box.getSize(new Vector3()).y;
  artem.position.set(-center.x, -box.min.y, -center.z);
  artem.traverse((o) => {
    if (o instanceof Mesh) {
      o.frustumCulled = false;
      o.material.envMapIntensity = 0.9;
    }
  });
  const rig = new Group();
  rig.add(artem);
  scene.add(rig);

  const bone = (name: string) => artem.getObjectByName(PropertyBinding.sanitizeNodeName(name));
  const head = bone('head');
  const uL = bone('upperarm.L');
  const uR = bone('upperarm.R');
  if (uL) uL.rotation.z = -ARMS_DOWN;
  if (uR) uR.rotation.z = ARMS_DOWN;

  const camera = new PerspectiveCamera(FOV, 1, 0.01, 50);
  let w = 1;
  let h = 1;
  const layout = () => {
    w = container.clientWidth;
    h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const fit = fitCamera({ width: w, height: h, ...headPosterTarget({ left: 0, top: 0, width: w, height: h }) }, H, FOV);
    camera.position.set(fit.x, fit.y, fit.distance);
  };

  // взгляд: за курсором по всему окну или медленное «осматривание»
  const mouse = { x: 0, y: 0, seen: false, at: 0 };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -((e.clientY / innerHeight) * 2 - 1);
    mouse.seen = true;
    mouse.at = performance.now();
  };
  if (trackCursor) addEventListener('pointermove', onMove, { passive: true });

  let yaw = 0;
  let pitch = 0;
  let elapsed = 0;
  const update = (dt: number) => {
    elapsed += dt;
    let tx = mouse.x;
    let ty = mouse.y;
    if (!mouse.seen || performance.now() - mouse.at > 6000) {
      tx = Math.sin(elapsed * 0.5) * 0.6;
      ty = Math.sin(elapsed * 0.37) * 0.25;
    }
    if (reducedMotion) tx = ty = 0;
    yaw = damp(yaw, tx * 0.55, 4, dt);
    // футер внизу экрана: голова чуть приподнята к курсору, а не вниз
    pitch = damp(pitch, -ty * 0.14, 4, dt);
    rig.rotation.y = yaw * 0.35;
    if (head) head.rotation.set(pitch * 1.4, yaw * 0.95, -yaw * 0.1);
  };

  let raf = 0;
  let last = 0;
  let inView = false;
  const render = () => renderer.render(scene, camera);
  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    update(dt);
    render();
    raf = requestAnimationFrame(tick);
  };
  const sync = () => {
    if (inView && !document.hidden && !reducedMotion) {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver(([e]) => {
    inView = !!e?.isIntersecting;
    sync();
  });
  io.observe(observe);
  document.addEventListener('visibilitychange', sync);
  const ro = new ResizeObserver(() => {
    layout();
    if (!raf) render();
  });
  ro.observe(container);

  layout();
  update(0);
  await renderer.compileAsync(scene, camera);
  container.appendChild(canvas);
  render();
  onReady();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', sync);
    removeEventListener('pointermove', onMove);
    canvas.remove();
    scene.environment?.dispose();
  };
}
