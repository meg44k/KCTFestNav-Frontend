import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import {
  type Campus,
  floorBand,
  floorLabel,
  type Part,
} from "@/lib/map/campus";
import type { MapPin } from "@/lib/map/map-booths";
import { type MapFocus, type MapLocation, PIN_COLORS } from "./types";

/** 3D の最初のカメラの向き(画面の奥の方角、北から時計回り)。校舎の並び(MAP_BEARING)から 45° ずらして斜めに */
const CAMERA_BEARING = 13;
/** 最初に正面に置く棟 */
const CAMERA_FRONT = "１号館";

export type Hit = { pin: number } | { building: string } | null;

const COLOR = {
  bg: "#0b0d10",
  ground: "#16191e",
  named: "#aab3bf",
  unnamed: "#59616c",
  dim: "#3a4049",
  focus: "#3d8bff",
  band: "#ffd166",
  me: "#4f8cff",
};

const mat = (color: string, opacity = 1) =>
  new THREE.MeshLambertMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
  });

function shapesOf(part: Part) {
  return part.polygons.map(([outer, ...holes]) => {
    const shape = new THREE.Shape(
      outer.map(([x, y]) => new THREE.Vector2(x, y)),
    );
    shape.holes = holes.map(
      (h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))),
    );
    return shape;
  });
}

/** 部分を from〜to(m) の高さで押し出した箱。平面図の y(北) は 3D の -z */
function slab(part: Part, from: number, to: number, material: THREE.Material) {
  const geom = new THREE.ExtrudeGeometry(shapesOf(part), {
    depth: Math.max(to - from, 0.05),
    bevelEnabled: false,
  });
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, from, 0);
  const mesh = new THREE.Mesh(geom, material);
  if (material instanceof THREE.MeshLambertMaterial && !material.transparent) {
    mesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(geom, 30),
        new THREE.LineBasicMaterial({ color: "#20252b" }),
      ),
    );
  }
  return mesh;
}

const toScene = ([x, y]: [number, number], elevation = 0) =>
  new THREE.Vector3(x, elevation, -y);

function label(text: string, className: string) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  return new CSS2DObject(div);
}

function dispose(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (
      o instanceof THREE.Mesh ||
      o instanceof THREE.LineSegments ||
      o instanceof THREE.Line
    ) {
      o.geometry.dispose();
      // 描き直すたびに材質も作るので、一緒に解放する
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        m.dispose();
      }
    }
    if (o instanceof CSS2DObject) o.element.remove();
  });
}

/** 3D の地図。React からは set* を呼ぶだけにして、three.js の状態はここに閉じ込める */
export function createScene(
  host: HTMLElement,
  campus: Campus,
  onHit: (hit: Hit) => void,
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(host.clientWidth, host.clientHeight);
  Object.assign(labelRenderer.domElement.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
  });
  host.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR.bg);
  scene.add(new THREE.HemisphereLight("#ffffff", "#3a3f46", 1.6));
  const sun = new THREE.DirectionalLight("#ffffff", 1.4);
  sun.position.set(-150, 300, 200);
  scene.add(sun);

  const { minX, maxX, minY, maxY } = campus.bounds;
  const span = Math.max(maxX - minX, maxY - minY);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 1.6, span * 1.6),
    new THREE.MeshLambertMaterial({ color: COLOR.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((minX + maxX) / 2, -0.05, -(minY + maxY) / 2);
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(
    45,
    host.clientWidth / host.clientHeight,
    1,
    5000,
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.enableDamping = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  // 最初は 1 号館を正面に、校舎の並びに対して斜めから見下ろす(本人の希望)
  const front = campus.buildings.find((b) => b.name === CAMERA_FRONT);
  const home = front
    ? toScene(front.center)
    : toScene([(minX + maxX) / 2, (minY + maxY) / 2]);
  controls.target.copy(home);
  const bearing = (CAMERA_BEARING * Math.PI) / 180;
  const back = span * 1.05;
  camera.position.set(
    home.x - Math.sin(bearing) * back,
    span * 0.95,
    home.z + Math.cos(bearing) * back,
  );
  controls.update();

  const buildingGroup = new THREE.Group();
  const pinGroup = new THREE.Group();
  const meGroup = new THREE.Group();
  scene.add(buildingGroup, pinGroup, meGroup);

  // ---- 建物 ----
  function setBuildings(focus: MapFocus) {
    dispose(buildingGroup);
    buildingGroup.clear();
    for (const b of campus.buildings) {
      const group = new THREE.Group();
      group.userData.buildingId = b.id;
      const focused = focus?.buildingId === b.id;
      const base = focus ? COLOR.dim : b.name ? COLOR.named : COLOR.unnamed;
      for (const part of b.parts) {
        const top = part.bottom + part.height;
        const band =
          focused && focus.floor > 0 ? floorBand(part, focus.floor) : undefined;
        if (!focused) {
          group.add(slab(part, part.bottom, top, mat(base)));
        } else if (focus.floor === 0) {
          group.add(slab(part, part.bottom, top, mat(COLOR.focus)));
        } else if (band) {
          // 選んだ階まで色付き、その床を帯で、上の階は半透明にして中のピンを見せる
          if (band.bottom > part.bottom)
            group.add(slab(part, part.bottom, band.bottom, mat(COLOR.focus)));
          group.add(
            slab(part, band.bottom, band.bottom + 0.3, mat(COLOR.band)),
          );
          group.add(slab(part, band.bottom + 0.3, top, mat(COLOR.focus, 0.18)));
        } else {
          // この部分にその階が無い: 全部その階より下なら色付き、上なら半透明
          const below = part.baseFloor + part.storeys - 1 < focus.floor;
          group.add(
            slab(
              part,
              part.bottom,
              top,
              below ? mat(COLOR.focus) : mat(COLOR.focus, 0.18),
            ),
          );
        }
      }
      if (b.name) {
        const text =
          focused && focus.floor > 0
            ? `${b.name} ${floorLabel(focus.floor)}`
            : b.name;
        const tag = label(
          text,
          focused ? "map3d-label map3d-label-focus" : "map3d-label",
        );
        tag.position.copy(toScene(b.center, b.top + 3));
        group.add(tag);
      }
      buildingGroup.add(group);
    }
  }

  // ---- ピン(建物を透かして手前に描く) ----
  function setPins(pins: MapPin[], selected: number | null) {
    dispose(pinGroup);
    pinGroup.clear();
    for (const pin of pins) {
      const big = pin.id === selected;
      const color = new THREE.Color(PIN_COLORS[pin.kind]);
      const stickMat = new THREE.MeshBasicMaterial({ color, depthTest: false });
      const headMat = new THREE.MeshBasicMaterial({ color, depthTest: false });
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4),
        stickMat,
      );
      stick.position.copy(toScene(pin.xy, pin.elevation + 2));
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(big ? 2.2 : 1.4, 16, 12),
        headMat,
      );
      head.position.copy(toScene(pin.xy, pin.elevation + 4.5));
      head.userData.pinId = pin.id;
      stick.renderOrder = head.renderOrder = big ? 21 : 20;
      // 遠くから見るとピンは数 px しかないので、見えない大きな球で押しやすくする
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(6, 8, 6),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.position.copy(head.position);
      hit.userData.pinId = pin.id;
      pinGroup.add(stick, head, hit);
    }
  }

  // ---- 現在地 ----
  function setLocation(loc: MapLocation) {
    dispose(meGroup);
    meGroup.clear();
    if (!loc) return;
    const at = toScene(loc.xy, 0.2);
    const flat = (
      geom: THREE.BufferGeometry,
      color: string,
      opacity: number,
    ) => {
      const m = new THREE.Mesh(
        geom,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthTest: false,
          side: THREE.DoubleSide,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.copy(at);
      m.renderOrder = 30;
      return m;
    };
    meGroup.add(
      flat(
        new THREE.CircleGeometry(Math.max(loc.accuracy, 2), 48),
        COLOR.me,
        0.15,
      ),
    );
    meGroup.add(flat(new THREE.CircleGeometry(1.6, 24), COLOR.me, 1));
    if (loc.heading !== undefined) {
      // 北(-z)向きの扇形を、向き(北から時計回り)の分だけ回す
      const fan = new THREE.Shape();
      fan.moveTo(0, 0);
      fan.lineTo(-4, 12);
      fan.lineTo(4, 12);
      fan.lineTo(0, 0);
      const m = flat(new THREE.ShapeGeometry(fan), COLOR.me, 0.45);
      m.rotation.z = (-loc.heading * Math.PI) / 180;
      meGroup.add(m);
    }
  }

  // ---- カメラを棟に寄せる ----
  function focusOn(focus: MapFocus) {
    const b = focus && campus.buildings.find((x) => x.id === focus.buildingId);
    const target = b ? toScene(b.center, 0) : home;
    const offset = camera.position
      .clone()
      .sub(controls.target)
      .setLength(b ? 110 : span * 1.05);
    controls.target.copy(target);
    camera.position.copy(target).add(offset);
  }

  // ---- 押した物 ----
  const raycaster = new THREE.Raycaster();
  let downAt: [number, number] | null = null;
  const onDown = (e: PointerEvent) => {
    downAt = [e.clientX, e.clientY];
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6)
      return;
    downAt = null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    // ピンを先に見る(建物の中に隠れていても押せるように)
    const pin = raycaster
      .intersectObjects(pinGroup.children)
      .find((h) => h.object.userData.pinId);
    if (pin) return onHit({ pin: pin.object.userData.pinId });
    const hit = raycaster
      .intersectObjects(buildingGroup.children, true)
      .find((h) => h.object instanceof THREE.Mesh);
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.buildingId) o = o.parent;
    onHit(o ? { building: o.userData.buildingId } : null);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);

  const resize = new ResizeObserver(() => {
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    labelRenderer.setSize(host.clientWidth, host.clientHeight);
  });
  resize.observe(host);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return {
    setBuildings,
    setPins,
    setLocation,
    focusOn,
    dispose() {
      renderer.setAnimationLoop(null);
      resize.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      dispose(scene);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}
