import { estimateAbility, itemDifficulty, type GradedItem } from './scoring';
import type { Difficulty, QuestionType } from './types';

// ---------------------------------------------------------------------------
// Adaptive next-item selection for the diagnostic.
//
// A 1PL item is most INFORMATIVE (Fisher information p·(1−p) is largest) when
// its difficulty equals the test-taker's ability. So after each answer we
// re-estimate ability from the answers so far and serve the available item
// whose difficulty sits closest to that estimate. Concentrating items near the
// test-taker's level shrinks the standard error faster than a fixed easy→hard
// spread, which is what tightens the reported score range. Before any answer we
// start near the medium tier — on-level for a typical test-taker.
// ---------------------------------------------------------------------------

export const ADAPTIVE_START_ABILITY = 80; // medium difficulty tier

export interface UnitMeta {
  difficulty: Difficulty;
  type?: QuestionType;
}

/**
 * Index (into `candidates`) of the most informative next unit at the current
 * ability estimate. `answered` is the graded items already seen in the same
 * section (sections are scored independently). With no answers the start
 * ability is used. Ties break to the lowest index, so the function is pure and
 * deterministic. Returns -1 for an empty candidate list.
 */
export function pickNextUnitIndex(
  candidates: UnitMeta[],
  answered: GradedItem[],
  startAbility = ADAPTIVE_START_ABILITY,
): number {
  if (candidates.length === 0) return -1;
  const ability = answered.length ? estimateAbility(answered).ability : startAbility;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const dist = Math.abs(itemDifficulty(candidates[i].difficulty, candidates[i].type) - ability);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
