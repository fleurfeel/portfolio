import {
  Box3,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PropertyBinding,
  Raycaster,
  Scene,
  Texture,
  Vector2,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { SceneState } from '../stage/math';
import { bytesFraction } from '../preloader/progress';
import { lerpFit } from '../stage/math';
import { BODY_CUT, HEAD_POSTER, type PosterBounds, type Rect, bodyCut, clampPixelRatio, damp, envelope, fitCamera, headPosterTarget, orbitPosition, posterTarget } from './math';
import { getRenderer } from './renderer';

// Риг и анимации — по прототипу (см. docs/mascot.md); подписей у логотипов нет, орбита медленнее.
const TOOLS = ['figma', 'claude', 'tilda', 'gpt', 'claude_code', 'git', 'yougile', 'flow'] as const;
const FOV = 28;
const ORBIT_SPEED = 0.2; // в прототипе 0.32
const ARMS_DOWN = 1.2; // модель в T-позе — руки опускаем костями
const IDLE_AFTER_MS = 6000;
/** телефон: во сколько раз камера отдалена от головы в начале перехода «тело → голова» */
const HEAD_ZOOM_OUT = 2.6;
/** поза «показывает на проекты»: левая рука (справа на экране) почти горизонтально — карточки сбоку */
const POINT = { upper: 0.45, fore: 0.05, hand: 0.15, yaw: 0.35, body: 0.25, look: 0 };
/** на телефоне карточки ниже маскота: рука вниз-вправо, голова чуть наклонена к ним */
const POINT_MOBILE = { upper: -0.55, fore: 0.05, hand: 0.1, yaw: 0.25, body: 0.15, look: 0.18 };

/** Отдать поток браузеру между тяжёлыми шагами, чтобы не было одной длинной задачи. */
const yieldToMain = () =>
  new Promise<void>((resolve) => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) s.yield().then(resolve);
    else setTimeout(resolve, 0);
  });

/** Скачать файл, сообщая число полученных байт (для полоски прелоадера). */
async function fetchWithProgress(url: string, onBytes: (n: number) => void) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  if (!res.body) {
    const buf = await res.arrayBuffer();
    onBytes(buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onBytes(received);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out.buffer;
}

export interface MascotSceneOptions {
  /** /models/artem.glb (текстуры 2048) или /models/artem-mobile.glb (1024) */
  modelUrl: string;
  /** размеры файлов моделей в байтах (считаются при сборке) — знаменатель для прогресса */
  modelSizes: Record<string, number>;
  /** прогресс загрузки: models — доля скачанных байт, init — подготовка GPU (0…1) */
  onProgress?: (p: { models: number; init: number }) => void;
  /** слой, в который встаёт canvas; по его размеру считается кадр */
  container: HTMLElement;
  /** рамки PNG-постеров относительно sticky-экрана сцены (без учёта transform): 3D встаёт ровно на их место */
  measure: () => { hero: PosterInfo; projects: PosterInfo | null; about: PosterInfo | null };
  /**
   * Каждый кадр: где сейчас sticky-экран (px от верха окна; 0, пока сцена закреплена),
   * рамка PNG-головы манифеста в окне и прогресс перехода «тело → голова».
   */
  getDynamic: () => { pinTop: number; head: Rect | null; headMix: number };
  /** пока хотя бы один из элементов на экране — рендерим, иначе пауза */
  observe: Element[];
  /** состояние сцены «первый экран → проекты → обо мне» */
  getTransition: () => SceneState;
  /** следить за курсором (только мышь и без prefers-reduced-motion) */
  trackCursor: boolean;
  reducedMotion: boolean;
  onReady: () => void;
}

/**
 * KHR_materials_specular превращает материал в MeshPhysicalMaterial — его шейдер
 * компилируется в ANGLE/Direct3D до секунды и дороже на пиксель. Визуально разница
 * от specular незаметна, поэтому берём стандартный PBR.
 */
function toStandard(root: Object3D) {
  root.traverse((o) => {
    if (!(o instanceof Mesh) || !(o.material instanceof MeshPhysicalMaterial)) return;
    const m = o.material;
    o.material = new MeshStandardMaterial({
      name: m.name,
      color: m.color,
      map: m.map,
      normalMap: m.normalMap,
      normalScale: m.normalScale,
      roughness: m.roughness,
      roughnessMap: m.roughnessMap,
      metalness: m.metalness,
      metalnessMap: m.metalnessMap,
      aoMap: m.aoMap,
      emissive: m.emissive,
      emissiveMap: m.emissiveMap,
      emissiveIntensity: m.emissiveIntensity,
      transparent: m.transparent,
      opacity: m.opacity,
      alphaTest: m.alphaTest,
      side: m.side,
    });
    m.dispose();
  });
}

export interface PosterInfo {
  rect: Rect;
  bounds: PosterBounds;
}

interface Bones {
  head?: Object3D;
  spine?: Object3D;
  uL?: Object3D;
  fL?: Object3D;
  hL?: Object3D;
  uR?: Object3D;
  fR?: Object3D;
  hR?: Object3D;
}

interface Logo {
  holder: Group;
  scale: number;
  phase: number;
  hover: number;
  kick: number;
}

export async function createMascotScene({ modelUrl, modelSizes, onProgress, container, measure, getDynamic, observe, getTransition, trackCursor, reducedMotion, onReady }: MascotSceneOptions) {
  const renderer = getRenderer();
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';

  // геометрия распаковывается в воркерах, а не в основном потоке
  MeshoptDecoder.useWorkers(2);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const urls = [modelUrl, ...TOOLS.map((k) => `/models/tool-${k}.glb`)];
  const totals = urls.map((u) => modelSizes[u] ?? 200_000);
  const loaded = urls.map(() => 0);
  let initDone = 0;
  const report = () => onProgress?.({ models: bytesFraction(loaded, totals), init: initDone });
  const load = (url: string, i: number) =>
    fetchWithProgress(url, (n) => {
      loaded[i] = n;
      report();
    })
      .then((buf) => loader.parseAsync(buf, ''))
      .then((gltf) => gltf.scene);
  const loading = Promise.all(urls.map(load));

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  await yieldToMain();

  const camera = new PerspectiveCamera(FOV, 1, 0.01, 50);

  scene.add(new HemisphereLight(0xfff4ea, 0xe8d6c6, 0.6));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(0.6, 2.6, 1.6);
  scene.add(key);
  const rim = new DirectionalLight(0xffd2b0, 0.9);
  rim.position.set(-1.6, 1.4, -1.2);
  scene.add(rim);

  // мягкая тень-блоб вместо shadow map
  const blob = document.createElement('canvas');
  blob.width = blob.height = 128;
  const g = blob.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(60,40,25,.32)');
  grad.addColorStop(0.6, 'rgba(60,40,25,.12)');
  grad.addColorStop(1, 'rgba(60,40,25,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const groundMaterial = new MeshBasicMaterial({ map: new CanvasTexture(blob), transparent: true, depthWrite: false });
  const ground = new Mesh(new PlaneGeometry(0.75, 0.42), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const [artem, ...tools] = await loading;
  for (const o of [artem, ...tools]) toStandard(o);
  await yieldToMain();

  // --- маскот: рост 0.98, ступни на y=0, центр по X/Z
  const rig = new Group(); // поворот к курсору
  const hopper = new Group(); // прыжок и дыхание
  rig.add(hopper);
  scene.add(rig);

  artem.updateMatrixWorld(true);
  const b0 = new Box3().setFromObject(artem, true);
  artem.scale.setScalar(0.98 / (b0.max.y - b0.min.y));
  artem.updateMatrixWorld(true);
  const box = new Box3().setFromObject(artem, true);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  artem.position.set(-center.x, -box.min.y, -center.z);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  // переход «тело → голова»: всё ниже uCut плавно растворяется (модель — один меш, иначе тело не спрятать)
  const cutUniforms = { uCut: { value: -1 }, uSoft: { value: 0.05 } };
  artem.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.frustumCulled = false;
    const m = o.material;
    m.envMapIntensity = 0.9;
    for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap'] as const) if (m[k]) m[k].anisotropy = maxAniso;
    m.transparent = true;
    m.onBeforeCompile = (shader: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string }) => {
      Object.assign(shader.uniforms, cutUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
varying float vCutY;`)
        .replace('#include <skinning_vertex>', `#include <skinning_vertex>
vCutY = (modelMatrix * vec4(transformed, 1.0)).y;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform float uCut;
uniform float uSoft;
varying float vCutY;`)
        .replace(
          '#include <alphamap_fragment>',
          `#include <alphamap_fragment>
diffuseColor.a *= smoothstep(uCut - uSoft, uCut + uSoft, vCutY);
if (diffuseColor.a < 0.004) discard;`,
        );
    };
    m.customProgramCacheKey = () => 'mascot-body-cut';
  });
  hopper.add(artem);
  const H = size.y;

  // невидимый цилиндр для попадания курсором — дешевле, чем raycast по skinned mesh
  const proxy = new Mesh(new CylinderGeometry(size.x * 0.42, size.x * 0.22, size.y, 16), new MeshBasicMaterial({ visible: false }));
  proxy.position.y = size.y / 2;
  hopper.add(proxy);

  const bone = (name: string) => artem.getObjectByName(PropertyBinding.sanitizeNodeName(name));
  const bones: Bones = {
    head: bone('head'),
    spine: bone('spine'),
    uL: bone('upperarm.L'),
    fL: bone('forearm.L'),
    hL: bone('hand.L'),
    uR: bone('upperarm.R'),
    fR: bone('forearm.R'),
    hR: bone('hand.R'),
  };

  // --- логотипы на орбите
  const orbit = new Group();
  scene.add(orbit);
  const logos: Logo[] = tools.map((obj, i) => {
    obj.updateMatrixWorld(true);
    const b = new Box3().setFromObject(obj, true);
    const s = b.getSize(new Vector3());
    obj.position.sub(b.getCenter(new Vector3()));
    obj.traverse((o) => {
      if (o instanceof Mesh) o.userData.logo = i;
    });
    const holder = new Group();
    const scale = (H * 0.17) / Math.max(s.x, s.y, s.z);
    holder.scale.setScalar(scale);
    holder.add(obj);
    orbit.add(holder);
    return { holder, scale, phase: i * 1.7, hover: 0, kick: 0 };
  });
  const logoHolders = logos.map((l) => l.holder);

  // --- кадры: маскот ровно на месте постеров (первый экран, проекты, «Обо мне», голова манифеста)
  let posters = measure();
  let w = 1;
  let h = 1;
  let radius = H * 0.6;
  let pose = POINT;
  function layout() {
    w = container.clientWidth;
    h = container.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    posters = measure();
    radius = H * (w < 1024 ? 0.5 : 0.6);
    pose = w < 1024 ? POINT_MOBILE : POINT;
    placeCamera();
  }
  // кадр, отдалённый от центра головы в k раз: голова остаётся на месте, но меньше, тело видно целиком
  const headCenter = { x: 0, y: H * (1 + HEAD_POSTER.cutAt) / 2 };
  const zoomOutFrom = (f: { distance: number; x: number; y: number }, k: number) => ({
    distance: f.distance * k,
    x: headCenter.x + (f.x - headCenter.x) * k,
    y: headCenter.y + (f.y - headCenter.y) * k,
  });
  // постеры сцены едут вместе с sticky-экраном, когда он отпускается (dy — его сдвиг вверх)
  const fitFor = (p: PosterInfo, dy: number) =>
    fitCamera({ width: w, height: h, ...posterTarget({ ...p.rect, top: p.rect.top + dy }, p.bounds) }, H, FOV);

  // переходы: маскот плавно переезжает между местами постеров, а в конце остаётся одной головой в манифесте
  let transition = getTransition();
  function placeCamera() {
    transition = getTransition();
    const { pinTop, head, headMix } = getDynamic();
    const hero = fitFor(posters.hero, pinTop);
    const toProjects = lerpFit(hero, posters.projects ? fitFor(posters.projects, pinTop) : hero, transition.mascotMix);
    const stage = lerpFit(toProjects, posters.about ? fitFor(posters.about, pinTop) : toProjects, transition.aboutMix);
    let fit = stage;
    if (head && headMix > 0) {
      const headFit = fitCamera({ width: w, height: h, ...headPosterTarget(head) }, H, FOV);
      // телефон: «Обо мне» длиннее экрана и маскот из неё уже уехал вверх — не тащим его через текст,
      // а показываем целиком прямо в манифесте (камера отдалена от головы) и приближаем к голове
      const from = w < 1024 ? zoomOutFrom(headFit, HEAD_ZOOM_OUT) : stage;
      fit = lerpFit(from, headFit, headMix);
    }
    camera.position.set(fit.x, fit.y, fit.distance);
    cutUniforms.uCut.value = bodyCut(headMix, H) + hopper.position.y;
    cutUniforms.uSoft.value = H * BODY_CUT.soft;
    // в режиме «только голова» тень-блоб под ногами не нужна
    groundMaterial.opacity = 1 - headMix;
    ground.visible = headMix < 0.99;
    orbit.visible = transition.logos > 0.01;
  }

  // --- ввод
  const mouse = new Vector2(0, 0); // −1…1 по окну
  const ndc = new Vector2(-9, -9); // по канвасу, для raycast
  const ray = new Raycaster();
  let hasPointer = false;
  let lastMove = 0;
  let pointerDirty = true;
  let hovered: Logo | null = null;
  let overMascot = false;

  const toNdc = (e: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    hasPointer = true;
    lastMove = performance.now();
    pointerDirty = true;
    mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    toNdc(e);
  };
  const onPointerLeave = () => {
    ndc.set(-9, -9);
    pointerDirty = true;
  };

  let waveT = -1;
  let nodT = -1;
  let hopT = -1;
  const onClick = (e: MouseEvent) => {
    if (reducedMotion) return;
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    const logoHit = ray.intersectObjects(logoHolders, true)[0];
    if (logoHit) {
      logos[logoHit.object.userData.logo as number]!.kick = 1;
      return;
    }
    if (ray.intersectObject(proxy, false).length) {
      if (waveT < 0) {
        waveT = 0;
        nodT = 0;
      } else hopT = 0;
    }
    if (!trackCursor) ndc.set(-9, -9); // на touch нет наведения
  };

  if (trackCursor) {
    addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerleave', onPointerLeave);
  }
  canvas.addEventListener('click', onClick);

  // --- кадр анимации
  let yaw = 0;
  let pitch = 0;
  let orbitAngle = Math.PI * 0.15;
  let orbitSpeed = reducedMotion ? 0 : ORBIT_SPEED;
  let frameN = 0;

  function update(dt: number, t: number) {
    // взгляд: за курсором или медленное «осматривание»
    let tx = mouse.x;
    let ty = mouse.y;
    if (!hasPointer || performance.now() - lastMove > IDLE_AFTER_MS) {
      tx = Math.sin(t * 0.5) * 0.6;
      ty = Math.sin(t * 0.37) * 0.25;
    }
    if (reducedMotion) tx = ty = 0;
    yaw = damp(yaw, tx * 0.55, 4, dt);
    pitch = damp(pitch, -ty * 0.14, 4, dt);

    placeCamera();
    const point = transition.pointing;
    rig.rotation.y = yaw * 0.35 + pose.body * point;
    if (bones.head) {
      let nod = 0;
      if (nodT >= 0) {
        nodT += dt;
        const u = nodT / 0.7;
        if (u >= 1) nodT = -1;
        else nod = Math.sin(u * Math.PI * 2) * 0.18 * (1 - u);
      }
      bones.head.rotation.set(pitch * 1.4 + nod + pose.look * point, yaw * 0.95 + pose.yaw * point, -yaw * 0.1);
    }
    if (bones.spine) bones.spine.rotation.y = yaw * 0.15;

    const sway = reducedMotion ? 0 : Math.sin(t * 1.6) * 0.04;
    let uL = -ARMS_DOWN + sway;
    let fL = -0.12;
    let hL = 0;
    const uR = ARMS_DOWN - sway;
    const fR = 0.12;
    if (waveT >= 0) {
      waveT += dt;
      const u = waveT / 2;
      if (u >= 1) waveT = -1;
      else {
        const e = envelope(u);
        uL = -ARMS_DOWN + e * (ARMS_DOWN + 0.35);
        fL = -0.12 + e * (0.95 + Math.sin(waveT * 11) * 0.38);
        hL = e * Math.sin(waveT * 11 + 0.6) * 0.25;
      }
    }
    // на экране проектов рука плавно поднимается в сторону карточек
    uL += (pose.upper - uL) * point;
    fL += (pose.fore - fL) * point;
    hL += (pose.hand - hL) * point;
    if (bones.uL) bones.uL.rotation.z = uL;
    if (bones.fL) bones.fL.rotation.z = fL;
    if (bones.hL) bones.hL.rotation.z = hL;
    if (bones.uR) bones.uR.rotation.z = uR;
    if (bones.fR) bones.fR.rotation.z = fR;
    if (bones.hR) bones.hR.rotation.z = 0;

    // дыхание и прыжок
    let jump = 0;
    let squash = 1;
    if (hopT >= 0) {
      hopT += dt;
      const u = hopT / 0.6;
      if (u >= 1) hopT = -1;
      else {
        jump = Math.sin(u * Math.PI) * H * 0.12;
        squash = 1 + Math.sin(u * Math.PI * 2) * 0.04;
      }
    }
    const breath = reducedMotion ? 0 : Math.sin(t * 2) * 0.006;
    hopper.position.y = jump;
    hopper.scale.set(1 / Math.sqrt(squash), squash * (1 + breath), 1 / Math.sqrt(squash));

    // наведение на логотипы (только мышь)
    if (trackCursor) {
      if (++frameN % 10 === 0) pointerDirty = true; // логотипы двигаются и под неподвижным курсором
      if (pointerDirty) {
        pointerDirty = false;
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(logoHolders, true)[0];
        hovered = hit ? logos[hit.object.userData.logo as number]! : null;
        overMascot = !hit && ray.intersectObject(proxy, false).length > 0;
        canvas.style.cursor = hovered || overMascot ? 'pointer' : '';
      }
    }

    // орбита: наклонённое кольцо вокруг кудрей, при наведении на логотип тормозит
    const targetSpeed = reducedMotion ? 0 : hovered ? 0 : ORBIT_SPEED;
    orbitSpeed = damp(orbitSpeed, targetSpeed, 3, dt);
    orbitAngle += orbitSpeed * dt;
    const tilt = 0.28 + mouse.y * 0.08;
    logos.forEach((logo, i) => {
      const p = orbitPosition({ index: i, count: logos.length, angle: orbitAngle, radius, centerY: H * 0.8, tilt });
      logo.hover = damp(logo.hover, logo === hovered ? 1 : 0, 10, dt);
      logo.kick = Math.max(0, logo.kick - dt * 1.6);
      const bob = reducedMotion ? 0 : Math.sin(t * 1.1 + logo.phase) * H * 0.025;
      // при переходе логотипы втягиваются в кудри (к центру орбиты) и уменьшаются
      const pull = transition.logos;
      logo.holder.position.set(
        p.x * pull,
        H * 0.8 + (p.y - H * 0.8 + bob + logo.hover * H * 0.03 + logo.kick * H * 0.08) * pull,
        (p.z + logo.hover * H * 0.15) * pull,
      );
      logo.holder.rotation.y = (reducedMotion ? 0 : Math.sin(t * 0.6 + logo.phase) * 0.45) + yaw * 0.6 + logo.kick * Math.PI * 2;
      logo.holder.rotation.x = -mouse.y * 0.25;
      logo.holder.scale.setScalar(logo.scale * (1 + logo.hover * 0.25) * pull);
    });
    orbit.rotation.y = yaw * 0.25;
    orbit.rotation.z = -mouse.x * 0.06;
  }

  // --- цикл: только пока сцена видна; при reduced motion — рендер по требованию
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let inView = true;
  let ready = false;

  const render = () => {
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      onReady();
    }
  };
  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    elapsed += dt;
    update(dt, elapsed);
    render();
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (raf || reducedMotion || !inView || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = () => (inView && !document.hidden ? start() : stop());

  // холст во весь экран и фиксирован — смотрим не на него, а на секции, где маскот бывает
  const visible = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
    inView = visible.size > 0;
    sync();
  });
  for (const el of observe) io.observe(el);
  document.addEventListener('visibilitychange', sync);

  const ro = new ResizeObserver(() => {
    layout();
    if (!raf) render();
  });
  ro.observe(container);

  // текстуры в GPU — по одной за задачу, шейдеры — параллельно (KHR_parallel_shader_compile)
  const textures = new Set<Texture>();
  scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    for (const m of [o.material].flat()) for (const v of Object.values(m)) if (v instanceof Texture) textures.add(v);
  });
  const initSteps = textures.size + 2;
  let step = 0;
  const initStep = () => {
    initDone = ++step / initSteps;
    report();
  };
  for (const t of textures) {
    renderer.initTexture(t);
    initStep();
    await yieldToMain();
  }
  layout();
  update(0, 0);
  await renderer.compileAsync(scene, camera);
  initStep();
  await yieldToMain();

  container.appendChild(canvas);
  layout();
  render();
  initStep();
  sync();

  let pending = 0;
  return {
    /** перерисовать кадр, если цикл стоит (prefers-reduced-motion): скролл меняет кадр */
    invalidate() {
      if (raf || pending || !inView) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        update(0, elapsed);
        render();
      });
    },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      canvas.remove();
      scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        o.geometry.dispose();
        for (const m of [o.material].flat()) {
          for (const v of Object.values(m)) if (v instanceof Texture) v.dispose();
          m.dispose();
        }
      });
      scene.environment?.dispose();
    },
  };
}
