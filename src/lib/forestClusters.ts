/**
 * forestClusters.ts
 *
 * Clustered grove distribution for the forest scene.
 * Generates tree placements with:
 *   • 4 named thematic "groves" spread across the canvas
 *   • 72 % of trees placed near a grove center via normal distribution
 *   • 28 % scattered freely (but still biased to valley / lower planting zone)
 *   • Minimum-spacing check to keep identity labels from overlapping
 *   • Per-grove shape palettes for visual color coherence
 */

import { PRESET_TREE_SHAPES, type TreeShapePreset } from '@/constants/treeShapes';
import { pickShapeByWorldEcology } from '@/lib/worldEcology';

// ─── Cluster configuration ────────────────────────────────────────────────────

export interface ClusterConfig {
  /** Human-readable grove name */
  label: string;
  /** Grove centre x as a fraction of scene width  [0, 1] */
  cx: number;
  /** Grove centre y as a fraction of scene height [0, 1] */
  cy: number;
  /** x standard-deviation as a fraction of width  */
  sx: number;
  /** y standard-deviation as a fraction of height */
  sy: number;
  /** Tree shape IDs preferred in this grove */
  shapeIds: string[];
}

/**
 * Four thematic groves.  cy values sit in the lower ⅔ of the planting zone
 * (roughly h×0.70 – h×0.82) so trees avoid the mountain-ridge silhouette.
 */
export const FOREST_CLUSTERS: ClusterConfig[] = [
  {
    label: '粉樱花林',
    cx: 0.14,
    cy: 0.80,
    sx: 0.07,
    sy: 0.036,
    shapeIds: [
      'cherry-blossom',
      'sakura-cloud',
      'plum-pink',
      'blossom-white',
      'birch-white',
    ],
  },
  {
    label: '深绿针叶林',
    cx: 0.39,
    cy: 0.73,
    sx: 0.10,
    sy: 0.044,
    shapeIds: [
      'pine-classic',
      'spruce-dark',
      'fir-slim',
      'larch-gold',
      'teardrop-cedar',
      'cedar-layered',
      'cedar-blue',
      'cypress-column',
      'cedar-mint',
      'birch-bare-silver',
    ],
  },
  {
    label: '秋色阔叶林',
    cx: 0.64,
    cy: 0.79,
    sx: 0.09,
    sy: 0.038,
    shapeIds: [
      'autumn-round',
      'red-maple-star',
      'orange-watercolor',
      'maple-wide',
      'maple-crimson',
      'yellow-poplar',
      'ginkgo-fan',
      'beech-copper',
      'chestnut-amber',
      'aspen-quiver',
      'maple-bare-ember',
    ],
  },
  {
    label: '草甸混交林',
    cx: 0.86,
    cy: 0.76,
    sx: 0.07,
    sy: 0.038,
    shapeIds: [
      'round-lime',
      'oak-broad',
      'oak-bare-winter',
      'elm-vase',
      'weeping-willow',
      'pear-soft',
      'olive-rounded',
      'apple-fruit',
      'canopy-bubble',
      'moss-round',
    ],
  },
];

/** Fraction of trees assigned to a named grove (remainder are free-scatter). */
export const CLUSTER_PROBABILITY = 0.72;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** N(mean, std) approximation via 6-point Irwin-Hall convolution. */
function sampleNormal(mean: number, std: number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += Math.random();
  // (s − 3) ~ N(0, √0.5).  Dividing by √0.5 normalises to N(0,1).
  return mean + ((s - 3) / Math.sqrt(0.5)) * std;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

interface PlacedRecord {
  cx: number;
  cy: number;
  size: number;
}

/**
 * Minimum centre-to-centre distance = (sizeA + sizeB) × factor.
 * 0.5 ≈ touching edges; 0.6 gives a little breathing room.
 */
const MIN_SPACING_FACTOR = 0.6;

function collides(
  cx: number,
  cy: number,
  size: number,
  placed: PlacedRecord[],
): boolean {
  for (const t of placed) {
    const minD = (size + t.size) * MIN_SPACING_FACTOR;
    const dx = cx - t.cx;
    const dy = cy - t.cy;
    if (dx * dx + dy * dy < minD * minD) return true;
  }
  return false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GeneratedTreePlacement {
  /** Horizontal centre of the tree base in pixels from scene left */
  cx: number;
  /** Vertical position of the tree base in pixels from scene top  */
  cy: number;
  size: number;
  shape: TreeShapePreset;
  /** null = free-scatter tree */
  clusterIndex: number | null;
}

/**
 * Generate `count` tree placements using a clustered grove distribution.
 *
 * @param count - Number of trees to produce
 * @param w     - Scene width  (px)
 * @param h     - Scene height (px)
 * @param minY  - Top    of planting zone (px from top, e.g. h × 0.55)
 * @param maxY  - Bottom of planting zone (px from top, e.g. h × 0.85)
 */
export function generateClusteredTrees(
  count: number,
  w: number,
  h: number,
  minY: number,
  maxY: number,
): GeneratedTreePlacement[] {
  const results: GeneratedTreePlacement[] = [];
  const placed: PlacedRecord[] = [];
  const zoneH = maxY - minY;

  // ── 1. Pre-assign grove or free-scatter, keeping grove sizes balanced ──────
  const assignments: Array<number | null> = [];
  const tallies = new Array(FOREST_CLUSTERS.length).fill(0);

  for (let i = 0; i < count; i++) {
    if (Math.random() < CLUSTER_PROBABILITY) {
      // Assign to the least-populated grove so distributions stay roughly even
      const minTally = Math.min(...tallies);
      const candidates = tallies
        .map((t, idx) => (t === minTally ? idx : -1))
        .filter((n) => n >= 0);
      const idx = candidates[Math.floor(Math.random() * candidates.length)];
      assignments.push(idx);
      tallies[idx]++;
    } else {
      assignments.push(null);
    }
  }

  // ── 2. Generate positions ─────────────────────────────────────────────────
  for (let i = 0; i < count; i++) {
    const ci = assignments[i];
    const size = 84 + Math.random() * 58;
    let cx = 0;
    let cy = 0;
    let shape: TreeShapePreset;

    if (ci !== null) {
      // ── Grove tree: normal distribution around cluster centre ─────────────
      const cluster = FOREST_CLUSTERS[ci];
      // Cluster cy is a fraction of full scene height; clamp into planting zone
      const targetCy = clamp(cluster.cy * h, minY, maxY);
      let tries = 0;
      do {
        cx = clamp(
          sampleNormal(cluster.cx * w, cluster.sx * w),
          size,
          w - size,
        );
        cy = clamp(
          sampleNormal(targetCy, cluster.sy * h),
          minY + size * 0.3,
          maxY - size * 0.1,
        );
        tries++;
      } while (collides(cx, cy, size, placed) && tries < 16);

      // Pick a shape from the grove's thematic palette
      shape = pickShapeByWorldEcology(cx, w, cluster.shapeIds);
    } else {
      // ── Free-scatter: skip the top ~30 % of the zone (ridge area) ─────────
      let tries = 0;
      do {
        cx = size + Math.random() * (w - size * 2);
        // Bias toward lower portion of planting zone: skip upper 30 %
        cy = minY + zoneH * 0.30 + Math.random() * zoneH * 0.70;
        tries++;
      } while (collides(cx, cy, size, placed) && tries < 16);

      shape = pickShapeByWorldEcology(cx, w);
    }

    results.push({ cx, cy, size, shape, clusterIndex: ci });
    placed.push({ cx, cy, size });
  }

  return results;
}
