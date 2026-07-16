// Merge the samurai GLB's 51 primitives into one draw call.
//
// Both renderers (hero ModelSamurai and footer FarewellSamurai) replace every
// material with a single flat ink MeshBasicMaterial at runtime, so the 33
// source materials carry no visual information — unifying them before join()
// is lossless here, and join() needs identical materials to merge primitives.
//
// Reads the pristine copy from assets/samurai-src.glb (kept local, out of
// the repo), writes the merged model to public/models/samurai.glb.
// NOTE: if assets/samurai-src.glb is missing, the script seeds it from the
// current public copy — only do that on a tree where public/models still
// holds the original unmerged model.
//
// Usage: node scripts/merge-samurai.mjs

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, flatten, join, meshopt, prune, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";

const SRC = "assets/samurai-src.glb";
const OUT = "public/models/samurai.glb";

if (!existsSync(SRC)) {
  mkdirSync("assets", { recursive: true });
  copyFileSync(OUT, SRC);
  console.log(`pristine copy saved: ${OUT} -> ${SRC}`);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
});
const document = await io.read(SRC);
const root = document.getRoot();

// one shared material for every primitive — the renderer overrides it anyway
const shared = root.listMaterials()[0];
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    prim.setMaterial(shared);
  }
}

// merge to one draw call, then meshopt-compress the wire size (drei's
// useGLTF wires the decoder by default, so the runtime needs no changes)
await MeshoptEncoder.ready;
await document.transform(
  dedup(),
  prune(),
  flatten(),
  join(),
  weld(),
  meshopt({ encoder: MeshoptEncoder })
);

await io.write(OUT, document);

const meshes = root.listMeshes();
const prims = meshes.reduce((n, m) => n + m.listPrimitives().length, 0);
console.log(
  `written ${OUT}: ${meshes.length} mesh(es), ${prims} primitive(s), ${(statSync(OUT).size / 1024).toFixed(0)}KB`
);
