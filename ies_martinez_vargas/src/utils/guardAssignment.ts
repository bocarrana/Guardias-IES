// ==============================
// Guard Assignment — Ranking Engine
// ==============================
// Pure functions for calculating teacher priority in guard assignment.
// No external dependencies (Supabase, React, etc.)

import { Teacher, Guard, GuardStatus, GuardType } from '../types';

export interface RankedTeacher {
    teacher: Teacher;
    ordinaryCount: number;
    coexistenceCount: number;
    rank: number;   // 1 = most priority (fewest guards)
    hue: number;    // 0 = red (should pick up), 120 = green (has covered enough)
}

/**
 * Counts COMPLETED guards per teacher, split by type (ordinary vs coexistence).
 * Only counts guards where the teacher was the covering_teacher.
 */
export function countGuardsByTeacher(
    guards: Guard[],
    teacherIds: string[]
): Record<string, { ordinary: number; coexistence: number }> {
    const counts: Record<string, { ordinary: number; coexistence: number }> = {};

    // Initialize all teachers with zero counts
    for (const id of teacherIds) {
        counts[id] = { ordinary: 0, coexistence: 0 };
    }

    // Count completed guards where the teacher was the covering teacher
    const idSet = new Set(teacherIds);
    for (const g of guards) {
        if (g.status !== GuardStatus.COMPLETED) continue;
        if (!g.covering_teacher_id || !idSet.has(g.covering_teacher_id)) continue;
        // Exclude internal M_GUARDIA markers
        if (g.subject_id === 'M_GUARDIA') continue;

        const entry = counts[g.covering_teacher_id];
        if (g.type === GuardType.ORDINARY) {
            entry.ordinary++;
        } else if (g.type === GuardType.COEXISTENCE) {
            entry.coexistence++;
        }
    }

    return counts;
}

/**
 * Ranks teachers by assignment priority:
 *   1st: Fewer ORDINARY guards completed (ASC)
 *   2nd: Fewer COEXISTENCE guards completed (tiebreaker ASC)
 *   3rd: Alphabetical name (deterministic tiebreaker)
 *
 * Assigns a continuous HSL hue:
 *   - Rank 1 of N → hue 0   (red)
 *   - Rank N of N → hue 120  (green)
 *   - Intermediates → proportional hue
 *   - If only 1 teacher → hue 60 (neutral yellow)
 */
export function rankTeachers(
    teachers: Teacher[],
    guards: Guard[]
): RankedTeacher[] {
    if (teachers.length === 0) return [];

    const teacherIds = teachers.map(t => t.id);
    const counts = countGuardsByTeacher(guards, teacherIds);

    // Sort by priority
    const sorted = [...teachers].sort((a, b) => {
        const ca = counts[a.id] || { ordinary: 0, coexistence: 0 };
        const cb = counts[b.id] || { ordinary: 0, coexistence: 0 };

        // 1. Fewer ordinary guards = higher priority
        if (ca.ordinary !== cb.ordinary) return ca.ordinary - cb.ordinary;

        // 2. Fewer coexistence guards = higher priority (tiebreaker)
        if (ca.coexistence !== cb.coexistence) return ca.coexistence - cb.coexistence;

        // 3. Alphabetical name (deterministic)
        return a.name.localeCompare(b.name);
    });

    const total = sorted.length;

    return sorted.map((teacher, index) => {
        const c = counts[teacher.id] || { ordinary: 0, coexistence: 0 };
        const rank = index + 1;

        // Continuous hue: 0 (red) → 280 (purple)
        // Single teacher gets neutral green/cyan (140)
        const hue = total === 1 ? 140 : (index / (total - 1)) * 280;

        return {
            teacher,
            ordinaryCount: c.ordinary,
            coexistenceCount: c.coexistence,
            rank,
            hue,
        };
    });
}
