import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt } from './terrain.js';
import { mergedMesh } from './geometry.js';

export const WALL_HEIGHT = 7.2;

function pushQuad(pos, uvs, a, b, c, d, ua, ub, uc, ud) {
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  pos.push(b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z);
  uvs.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  uvs.push(ub[0], ub[1], ud[0], ud[1], uc[0], uc[1]);
}

function pushBox(pos, uvs, w, h, d, center, quat) {
  const source = new THREE.BoxGeometry(w, h, d);
  source.applyMatrix4(new THREE.Matrix4().compose(center, quat, new THREE.Vector3(1, 1, 1)));
  const geo = source.index ? source.toNonIndexed() : source;
  const p = geo.attributes.position.array;
  const uv = geo.attributes.uv.array;
  for (let i = 0; i < p.length; i++) pos.push(p[i]);
  for (let i = 0; i < uv.length; i++) uvs.push(uv[i]);
  if (geo !== source) geo.dispose();
  source.dispose();
}

function tintGeometry(geo, r, g, b, vary = 0.14) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const h = Math.sin(p.getX(i) * 12.9898 + p.getY(i) * 37.719 + p.getZ(i) * 78.233) * 43758.5453;
    const n = h - Math.floor(h);
    const k = 1 - vary * 0.5 + (n - 0.5) * vary;
    colors[i * 3] = r * k;
    colors[i * 3 + 1] = g * k;
    colors[i * 3 + 2] = b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function makeBuffer(positions, uvs, tint) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  if (tint) tintGeometry(geo, tint[0], tint[1], tint[2], tint[3]);
  return geo;
}

export function getWallFrame(curve, t) {
  const p = curve.getPointAt(t);
  const tan = curve.getTangentAt(t);
  tan.y = 0;
  tan.normalize();
  const nx = -tan.z;
  const nz = tan.x;
  const y = heightAt(p.x, p.z);
  return {
    x: p.x,
    z: p.z,
    y,
    nx,
    nz,
    tx: tan.x,
    tz: tan.z,
    yaw: Math.atan2(tan.x, tan.z),
    top: y + WALL_HEIGHT,
  };
}

function smoothHeights(raw, passes = 3) {
  let cur = raw.slice();
  for (let pass = 0; pass < passes; pass++) {
    const next = cur.slice();
    for (let i = 1; i < cur.length - 1; i++) {
      next[i] = cur[i - 1] * 0.22 + cur[i] * 0.56 + cur[i + 1] * 0.22;
    }
    next[0] = cur[0];
    next[cur.length - 1] = cur[cur.length - 1];
    cur = next;
  }
  return cur;
}

export function createWall(curve, options = {}) {
  const {
    spacing = 2.25,
    height = WALL_HEIGHT,
    topHalf = 2.44,
    bottomHalf = 3.14,
    bodyBottomHalf = 2.86,
    stoneTopHalf = 2.9,
    crenelSpacing = 2.6,
    startT = 0,
    endT = 1,
    breakRange = null,
    repairRanges = [],
  } = options;

  const curvePart = curve;
  const length = Math.max(2, curvePart.getLength() * (endT - startT));
  const count = Math.max(24, Math.round(length / spacing));
  const rawSamples = [];

  for (let i = 0; i <= count; i++) {
    const t = startT + (endT - startT) * (i / count);
    const p = curvePart.getPointAt(t);
    const tan = curvePart.getTangentAt(t);
    tan.y = 0;
    tan.normalize();
    rawSamples.push({
      t,
      x: p.x,
      z: p.z,
      y: heightAt(p.x, p.z),
      nx: -tan.z,
      nz: tan.x,
      tx: tan.x,
      tz: tan.z,
    });
  }

  const smooth = smoothHeights(rawSamples.map((s) => s.y), 3);
  const samples = rawSamples.map((s, i) => {
    const hL = heightAt(s.x + s.nx * bottomHalf, s.z + s.nz * bottomHalf);
    const hR = heightAt(s.x - s.nx * bottomHalf, s.z - s.nz * bottomHalf);
    const ground = Math.min(s.y, hL, hR);
    return {
      ...s,
      top: smooth[i] + height,
      baseTop: smooth[i] + 1.12,
      bottom: ground - 2.0,
    };
  });

  const brickPos = [];
  const brickUV = [];
  const stonePos = [];
  const stoneUV = [];
  const topPos = [];
  const topUV = [];
  const accentPos = [];
  const accentUV = [];
  const accent2Pos = [];
  const accent2UV = [];
  const darkPos = [];
  const darkUV = [];
  const ironPos = [];
  const ironUV = [];
  const warmPos = [];
  const warmUV = [];
  const depthAcc = [0];
  for (let i = 1; i < samples.length; i++) {
    depthAcc[i] = depthAcc[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
  }

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const ua = depthAcc[i] * 0.28;
    const ub = depthAcc[i + 1] * 0.28;
    const sa = depthAcc[i] * 0.18;
    const sb = depthAcc[i + 1] * 0.18;

    const aLb = new THREE.Vector3(a.x + a.nx * bottomHalf, a.bottom, a.z + a.nz * bottomHalf);
    const aRb = new THREE.Vector3(a.x - a.nx * bottomHalf, a.bottom, a.z - a.nz * bottomHalf);
    const aLs = new THREE.Vector3(a.x + a.nx * stoneTopHalf, a.baseTop, a.z + a.nz * stoneTopHalf);
    const aRs = new THREE.Vector3(a.x - a.nx * stoneTopHalf, a.baseTop, a.z - a.nz * stoneTopHalf);
    const bLb = new THREE.Vector3(b.x + b.nx * bottomHalf, b.bottom, b.z + b.nz * bottomHalf);
    const bRb = new THREE.Vector3(b.x - b.nx * bottomHalf, b.bottom, b.z - b.nz * bottomHalf);
    const bLs = new THREE.Vector3(b.x + b.nx * stoneTopHalf, b.baseTop, b.z + b.nz * stoneTopHalf);
    const bRs = new THREE.Vector3(b.x - b.nx * stoneTopHalf, b.baseTop, b.z - b.nz * stoneTopHalf);
    const aLt = new THREE.Vector3(a.x + a.nx * topHalf, a.top, a.z + a.nz * topHalf);
    const aRt = new THREE.Vector3(a.x - a.nx * topHalf, a.top, a.z - a.nz * topHalf);
    const bLt = new THREE.Vector3(b.x + b.nx * topHalf, b.top, b.z + b.nz * topHalf);
    const bRt = new THREE.Vector3(b.x - b.nx * topHalf, b.top, b.z - b.nz * topHalf);
    const aLm = new THREE.Vector3(a.x + a.nx * bodyBottomHalf, a.baseTop, a.z + a.nz * bodyBottomHalf);
    const aRm = new THREE.Vector3(a.x - a.nx * bodyBottomHalf, a.baseTop, a.z - a.nz * bodyBottomHalf);
    const bLm = new THREE.Vector3(b.x + b.nx * bodyBottomHalf, b.baseTop, b.z + b.nz * bodyBottomHalf);
    const bRm = new THREE.Vector3(b.x - b.nx * bodyBottomHalf, b.baseTop, b.z - b.nz * bodyBottomHalf);

    pushQuad(stonePos, stoneUV, aLb, bLb, aLs, bLs,
      [sa, 0], [sb, 0], [sa, (a.baseTop - a.bottom) * 0.18], [sb, (b.baseTop - b.bottom) * 0.18]);
    pushQuad(stonePos, stoneUV, aRb, aRs, bRb, bRs,
      [sa, 0], [sa, (a.baseTop - a.bottom) * 0.18], [sb, 0], [sb, (b.baseTop - b.bottom) * 0.18]);
    pushQuad(brickPos, brickUV, aLm, bLm, aLt, bLt,
      [ua, 0], [ub, 0], [ua, (a.top - a.baseTop) * 0.28], [ub, (b.top - b.baseTop) * 0.28]);
    pushQuad(brickPos, brickUV, aRm, aRt, bRm, bRt,
      [ua, 0], [ua, (a.top - a.baseTop) * 0.28], [ub, 0], [ub, (b.top - b.baseTop) * 0.28]);
    pushQuad(topPos, topUV, aLt, bLt, aRt, bRt,
      [0, ua], [0, ub], [1.42, ua], [1.42, ub]);

    const rise = b.top - a.top;
    const run = Math.max(0.01, Math.hypot(b.x - a.x, b.z - a.z));
    const grade = Math.abs(rise / run);
    const yaw = Math.atan2(b.tx, b.tz);

    if (grade > 0.075) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
      const p = new THREE.Vector3((a.x + b.x) * 0.5, (a.top + b.top) * 0.5 + 0.03, (a.z + b.z) * 0.5);
      const geo = new THREE.BoxGeometry((topHalf - 0.46) * 2, 0.18, run * 1.14);
      geo.applyMatrix4(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
      accentPos.push(...geo.attributes.position.array);
      const uv = geo.attributes.uv.array;
      for (let k = 0; k < uv.length; k++) accentUV.push(uv[k]);
      geo.dispose();
    }
  }

  const crenelMaterialList = [];
  const addParapet = (sideSign, offsetFromEdge, thick, parapetH) => {
    const pos = [];
    const uv = [];
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      const ao = sideSign * offsetFromEdge;
      const ua = depthAcc[i] * 0.26;
      const ub = depthAcc[i + 1] * 0.26;
      const aIn = new THREE.Vector3(a.x + a.nx * (ao - thick * 0.5), a.top, a.z + a.nz * (ao - thick * 0.5));
      const aOut = new THREE.Vector3(a.x + a.nx * (ao + thick * 0.5), a.top, a.z + a.nz * (ao + thick * 0.5));
      const bIn = new THREE.Vector3(b.x + b.nx * (ao - thick * 0.5), b.top, b.z + b.nz * (ao - thick * 0.5));
      const bOut = new THREE.Vector3(b.x + b.nx * (ao + thick * 0.5), b.top, b.z + b.nz * (ao + thick * 0.5));
      const aInT = aIn.clone(); aInT.y += parapetH;
      const aOutT = aOut.clone(); aOutT.y += parapetH;
      const bInT = bIn.clone(); bInT.y += parapetH;
      const bOutT = bOut.clone(); bOutT.y += parapetH;
      const v0 = 0;
      const v1 = parapetH * 0.45;
      pushQuad(pos, uv, aIn, aInT, bIn, bInT, [ua, v0], [ua, v1], [ub, v0], [ub, v1]);
      pushQuad(pos, uv, aOut, bOut, aOutT, bOutT, [ua, v0], [ub, v0], [ua, v1], [ub, v1]);
      pushQuad(pos, uv, aInT, bInT, aOutT, bOutT, [0, ua], [0, ub], [0.2, ua], [0.2, ub]);
    }
    crenelMaterialList.push(makeBuffer(pos, uv));
  };

  addParapet(1, topHalf - 0.24, 0.46, 1.02);
  addParapet(-1, topHalf - 0.2, 0.4, 0.82);

  const merlonGeoList = [];
  let accum = 1.2;
  let merlonIndex = 0;
  for (let i = 1; i < samples.length - 1; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    const seg = depthAcc[i] - depthAcc[i - 1];
    accum += seg;
    if (accum < crenelSpacing) continue;
    accum = 0;

    const s = samples[i];
    const forward = new THREE.Vector3(b.x - a.x, b.top - a.top, b.z - a.z).normalize();
    const xAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    const yAxis = new THREE.Vector3().crossVectors(forward, xAxis).normalize();
    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, forward);
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);

    const off = topHalf - 0.24;
    const px = s.x + s.nx * off;
    const pz = s.z + s.nz * off;
    const py = s.top + 1.02 + 0.45;
    const broken = breakRange && s.t > breakRange[0] && s.t < breakRange[1];
    if (!broken) {
      const geo = new THREE.BoxGeometry(0.72, 0.9, 1.56);
      geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(1, 1, 1)));
      merlonGeoList.push(geo);
      pushBox(accent2Pos, accent2UV, 0.9, 0.11, 1.74, new THREE.Vector3(px, py + 0.5, pz), q);
      if (merlonIndex % 3 === 0) {
        pushBox(accentPos, accentUV, 0.09, 0.34, 0.16,
          new THREE.Vector3(px + s.nx * 0.39, py + 0.16, pz + s.nz * 0.39), q);
      }
    } else if (merlonIndex % 2 === 0) {
      for (let k = 0; k < 3; k++) {
        const r = Math.sin(s.x * 0.71 + k * 4.7 + s.z * 0.33);
        const r2 = Math.sin(s.z * 0.53 - k * 2.9);
        const rx = s.x + s.nx * (topHalf + 2.4 + k * 1.15) + s.tx * r * 1.7;
        const rz = s.z + s.nz * (topHalf + 2.4 + k * 1.15) + s.tz * r * 1.7;
        const gy = heightAt(rx, rz);
        const size = 0.55 + Math.abs(r2) * 0.5;
        const rq = new THREE.Quaternion().setFromEuler(new THREE.Euler(r * 0.5, r2 * 2.2, r2 * 0.6));
        pushBox(accent2Pos, accent2UV, size * 1.5, size, size, new THREE.Vector3(rx, gy + size * 0.35, rz), rq);
      }
    }
    merlonIndex++;
  }

  for (let i = 4; i < samples.length - 4; i += 6) {
    const s = samples[i];
    const d = depthAcc[i];
    if (d < 9) continue;
    const yaw = Math.atan2(s.tx, s.tz);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    const off = topHalf + 0.12;
    const p = new THREE.Vector3(s.x + s.nx * off, s.top - 0.18, s.z + s.nz * off);
    const geo = new THREE.BoxGeometry(0.9, 0.22, 0.3);
    geo.applyMatrix4(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
    accent2Pos.push(...geo.attributes.position.array);
    const uv = geo.attributes.uv.array;
    for (let k = 0; k < uv.length; k++) accent2UV.push(uv[k]);
    geo.dispose();
  }

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const seg = Math.max(0.3, depthAcc[i + 1] - depthAcc[i]);
    if (seg < 0.2) continue;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2((a.tx + b.tx) * 0.5, (a.tz + b.tz) * 0.5), 0));
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const my = (a.top + b.top) * 0.5;
    pushBox(accent2Pos, accent2UV, 0.6, 0.13, seg * 1.03,
      new THREE.Vector3(mx + a.nx * (topHalf - 0.24), my + 1.06, mz + a.nz * (topHalf - 0.24)), q);
    pushBox(accent2Pos, accent2UV, 0.48, 0.11, seg * 1.03,
      new THREE.Vector3(mx - a.nx * (topHalf - 0.2), my + 0.86, mz - a.nz * (topHalf - 0.2)), q);
    if (i % 3 === 0) {
      pushBox(darkPos, darkUV, 0.09, 0.46, 0.13,
        new THREE.Vector3(a.x + a.nx * (topHalf + 0.005), a.top + 0.55, a.z + a.nz * (topHalf + 0.005)), q);
    }
    if (i % 5 === 0) {
      pushBox(accentPos, accentUV, topHalf * 2 - 2.05, 0.035, 0.09,
        new THREE.Vector3(mx, my + 0.068, mz), q);
      pushBox(accentPos, accentUV, 0.42, 0.05, seg * 0.92,
        new THREE.Vector3(mx, my + 0.075, mz), q);
    }
    if (i % 18 === 0) {
      pushBox(accent2Pos, accent2UV, 1.05, 0.26, 0.34,
        new THREE.Vector3(a.x + a.nx * (topHalf + 0.34), a.top - 0.62, a.z + a.nz * (topHalf + 0.34)), q);
      pushBox(accent2Pos, accent2UV, 0.15, 0.34, 0.42,
        new THREE.Vector3(a.x + a.nx * (topHalf + 0.86), a.top - 0.68, a.z + a.nz * (topHalf + 0.86)), q);
      pushBox(darkPos, darkUV, 0.1, 0.1, 0.2,
        new THREE.Vector3(a.x + a.nx * (topHalf + 0.9), a.top - 0.62, a.z + a.nz * (topHalf + 0.9)), q);
    }
    if (i % 32 === 0 && depthAcc[i] > 8) {
      pushBox(accent2Pos, accent2UV, 1.15, 1.0, 1.0,
        new THREE.Vector3(mx + a.nx * (bottomHalf + 0.2), a.baseTop - 0.85, mz + a.nz * (bottomHalf + 0.2)), q);
    }
  }

  for (let i = 8; i < samples.length - 10; i += 3) {
    const a = samples[i];
    const b = samples[i + 3];
    if (Math.abs(b.top - a.top) < 0.2) continue;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(a.tx, a.tz), 0));
    const off = -(topHalf - 0.78);
    for (let k = 0; k <= 3; k++) {
      const f = k / 3;
      const px = a.x + (b.x - a.x) * f + a.nx * off;
      const pz = a.z + (b.z - a.z) * f + a.nz * off;
      const py = a.top + (b.top - a.top) * f;
      pushBox(ironPos, ironUV, 0.07, 0.92, 0.07, new THREE.Vector3(px, py + 0.5, pz), q);
    }
    pushBox(ironPos, ironUV, 0.065, 0.065, Math.hypot(b.x - a.x, b.z - a.z) * 1.02,
      new THREE.Vector3((a.x + b.x) * 0.5 + a.nx * off, (a.top + b.top) * 0.5 + 0.96, (a.z + b.z) * 0.5 + a.nz * off), q);
  }

  for (let i = 2; i < samples.length - 2; i += 4) {
    const s = samples[i];
    const seg = depthAcc[i] - depthAcc[i - 1];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(s.tx, s.tz), 0));
    pushBox(accentPos, accentUV, topHalf * 2 - 1.5, 0.07, Math.max(0.3, seg * 1.08),
      new THREE.Vector3(s.x, s.top + 0.045, s.z), q);
    if (i % 12 === 2) {
      pushBox(accent2Pos, accent2UV, 0.56, 0.09, Math.max(0.3, seg * 3.2),
        new THREE.Vector3(s.x - s.nx * (topHalf - 0.2), s.top + 0.87, s.z - s.nz * (topHalf - 0.2)), q);
    }
    if (i + 1 < samples.length) {
      const n = samples[i + 1];
      const rise = Math.abs(n.top - s.top);
      if (rise > 0.24) {
        pushBox(accentPos, accentUV, topHalf * 2 - 1.35, 0.12, 0.48,
          new THREE.Vector3(s.x, Math.min(s.top, n.top) + 0.11, s.z), q);
      }
    }
  }

  for (let i = 8; i < samples.length - 20; i += 18) {
    const s = samples[i];
    const n = samples[i + 4];
    if (!n) continue;
    const rise = Math.abs(n.top - s.top);
    if (rise < 0.34) continue;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(s.tx, s.tz), 0));
    const edge = -(topHalf - 0.62);
    const span = depthAcc[i + 4] - depthAcc[i];
    const cx = (s.x + n.x) * 0.5 + s.nx * edge;
    const cz = (s.z + n.z) * 0.5 + s.nz * edge;
    const cy = (s.top + n.top) * 0.5;
    for (let k = 0; k <= 2; k++) {
      const f = k / 2;
      const px = s.x + (n.x - s.x) * f + s.nx * edge;
      const pz = s.z + (n.z - s.z) * f + s.nz * edge;
      const py = s.top + (n.top - s.top) * f;
      pushBox(accentPos, accentUV, 0.09, 1.08, 0.09, new THREE.Vector3(px, py + 1.56, pz), q);
    }
    pushBox(accentPos, accentUV, 0.08, 0.09, span * 1.02,
      new THREE.Vector3(cx, cy + 2.08, cz), q);
    pushBox(accentPos, accentUV, 0.07, 0.07, span * 1.02,
      new THREE.Vector3(cx, cy + 1.72, cz), q);
  }

  const addRepairPatch = (t0, t1, dense) => {
    for (let i = 3; i < samples.length - 3; i++) {
      const s = samples[i];
      if (s.t < t0 || s.t > t1) continue;
      if (dense && i % 2 !== 0) continue;
      if (!dense && i % 47 !== 3) continue;
      const hsh = Math.sin(s.x * 1.37 + s.z * 0.91 + i * 2.13);
      const ph = 0.9 + Math.abs(hsh) * 1.5;
      const pw = 0.8 + Math.abs(Math.sin(i * 1.7)) * 1.2;
      const cy = Math.min(s.top - 1.0, Math.max(s.baseTop + 0.8, s.baseTop + (s.top - s.baseTop) * (0.35 + Math.abs(hsh) * 0.35)));
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(s.tx, s.tz), 0));
      pushBox(accent2Pos, accent2UV, 0.1, ph, pw,
        new THREE.Vector3(s.x + s.nx * (topHalf + 0.02), cy, s.z + s.nz * (topHalf + 0.02)), q);
    }
  };
  for (const range of repairRanges) addRepairPatch(range[0], range[1], true);
  addRepairPatch(0.21, 0.995, false);

  const addWarmPatch = (t0, t1, step) => {
    for (let i = 5; i < samples.length - 5; i += step) {
      const s = samples[i];
      if (s.t < t0 || s.t > t1) continue;
      const hsh = Math.sin(s.x * 0.83 + s.z * 1.27 + i * 1.71);
      const ph = 0.45 + Math.abs(hsh) * 1.05;
      const pw = 0.5 + Math.abs(Math.cos(i * 2.3)) * 0.7;
      const cy = s.baseTop + (s.top - s.baseTop) * (0.22 + Math.abs(hsh) * 0.58);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(s.tx, s.tz), 0));
      const side = i % 2 === 0 ? 1 : -1;
      pushBox(warmPos, warmUV, 0.055, ph, pw,
        new THREE.Vector3(s.x + s.nx * (bodyBottomHalf + 0.01) * side, cy, s.z + s.nz * (bodyBottomHalf + 0.01) * side), q);
    }
  };
  addWarmPatch(0.0, 1.0, 17);
  for (const range of repairRanges) addWarmPatch(range[0], range[1], 2);

  for (let i = 12; i < samples.length - 14; i += 23) {
    const a = samples[i];
    if (breakRange && (a.t < breakRange[0] - 0.012 || a.t > breakRange[1] + 0.012)) continue;
    const yaw = Math.atan2(a.tx, a.tz);
    for (let k = 0; k < 3; k++) {
      const rx = a.x + a.nx * (bottomHalf + 0.7 + k * 0.65) + a.tx * (k - 1) * 1.1;
      const rz = a.z + a.nz * (bottomHalf + 0.7 + k * 0.65) + a.tz * (k - 1) * 1.1;
      const gy = heightAt(rx, rz);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(k * 0.4, yaw + k, k * 0.22));
      pushBox(accentPos, accentUV, 0.4 + k * 0.12, 0.26, 0.3, new THREE.Vector3(rx, gy + 0.13, rz), q);
    }
  }

  const group = new THREE.Group();
  group.name = options.name || 'great-wall';

  const stoneGeo = makeBuffer(stonePos, stoneUV, [0.92, 0.9, 0.84, 0.2]);
  const stoneMesh = new THREE.Mesh(stoneGeo, mats.stone);
  stoneMesh.castShadow = true;
  stoneMesh.receiveShadow = true;
  group.add(stoneMesh);

  const brickGeo = makeBuffer(brickPos, brickUV, [1.0, 0.97, 0.91, 0.16]);
  const brickMesh = new THREE.Mesh(brickGeo, mats.wall);
  brickMesh.castShadow = true;
  brickMesh.receiveShadow = true;
  group.add(brickMesh);

  const topGeo = makeBuffer(topPos, topUV, [1.0, 0.98, 0.93, 0.14]);
  const topMesh = new THREE.Mesh(topGeo, mats.walkway);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  const allParapet = crenelMaterialList.concat(merlonGeoList);
  const parapetGeo = mergeWalls(allParapet);
  tintGeometry(parapetGeo, 0.98, 0.95, 0.89, 0.18);
  const parapetMesh = new THREE.Mesh(parapetGeo, mats.wallShade);
  parapetMesh.castShadow = true;
  parapetMesh.receiveShadow = true;
  group.add(parapetMesh);

  if (accentPos.length) {
    const accentGeo = makeBuffer(accentPos, accentUV);
    const accentMesh = new THREE.Mesh(accentGeo, mats.stoneDark);
    accentMesh.castShadow = true;
    accentMesh.receiveShadow = true;
    group.add(accentMesh);
  }

  if (accent2Pos.length) {
    const spoutGeo = makeBuffer(accent2Pos, accent2UV);
    const spoutMesh = new THREE.Mesh(spoutGeo, mats.stone);
    spoutMesh.castShadow = true;
    spoutMesh.receiveShadow = true;
    group.add(spoutMesh);
  }

  if (darkPos.length) {
    const slitGeo = makeBuffer(darkPos, darkUV);
    const slitMesh = new THREE.Mesh(slitGeo, mats.dark);
    slitMesh.castShadow = false;
    slitMesh.receiveShadow = true;
    group.add(slitMesh);
  }

  if (ironPos.length) {
    const railGeo = makeBuffer(ironPos, ironUV);
    const railMesh = new THREE.Mesh(railGeo, mats.iron);
    railMesh.castShadow = true;
    railMesh.receiveShadow = true;
    group.add(railMesh);
  }

  if (warmPos.length) {
    const warmGeo = makeBuffer(warmPos, warmUV, [1.02, 0.94, 0.82, 0.16]);
    const warmMesh = new THREE.Mesh(warmGeo, mats.wallWarm);
    warmMesh.castShadow = true;
    warmMesh.receiveShadow = true;
    group.add(warmMesh);
  }

  for (const end of [samples[0], samples[samples.length - 1]]) {
    const yaw = Math.atan2(end.tx, end.tz);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(topHalf * 2 + 0.1, end.top - end.bottom, 0.9), mats.wall);
    cap.position.set(end.x, (end.top + end.bottom) / 2, end.z);
    cap.rotation.y = yaw;
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(topHalf * 2 + 0.38, 0.3, 1.18), mats.stone);
    crown.position.set(end.x, end.top + 0.06, end.z);
    crown.rotation.y = yaw;
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);
    for (const side of [-1, 1]) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 1.05), mats.stoneDark);
      block.position.set(
        end.x + end.nx * (topHalf + 0.1) * side,
        end.top - 0.7,
        end.z + end.nz * (topHalf + 0.1) * side
      );
      block.rotation.y = yaw;
      block.castShadow = true;
      block.receiveShadow = true;
      group.add(block);
    }
  }

  return {
    group,
    samples,
    length,
    height,
    topAtT: (t) => {
      const local = Math.max(0, Math.min(1, (t - startT) / (endT - startT)));
      const raw = curvePart.getPointAt(startT + local * (endT - startT));
      return heightAt(raw.x, raw.z) + height;
    },
    frameAtT: (t) => getWallFrame(curvePart, t),
  };
}

function mergeWalls(list) {
  const positions = [];
  const uvs = [];
  for (const geo of list) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
    }
    if (uv) {
      for (let i = 0; i < uv.count; i++) uvs.push(uv.getX(i), uv.getY(i));
    }
    if (g !== geo) g.dispose();
    geo.dispose();
  }
  return makeBuffer(positions, uvs);
}

export { mergedMesh };
