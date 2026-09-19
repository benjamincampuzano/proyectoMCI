/**
 * Tests del módulo: Enviar (jerarquía visual)
 * Cubre: client/src/utils/transformCouples.js
 *
 * Verifica la conversión de árbol de personas a árbol de parejas
 * (agrupa cónyuges, ordena por sexo, propaga roles, calcula niveles).
 */

import { describe, test, expect } from 'vitest';
import {
  buildIdIndex,
  buildCoupleNetwork,
  computeLevels,
} from '@client-src/utils/transformCouples.js';

// Red de muestra: Pedro y Ana son esposos; tienen como hijo a Juan y María.
const sampleRoot = {
  id: 1,
  name: 'Pedro',
  sex: 'HOMBRE',
  spouseId: 2,
  // El endpoint de red devuelve parejas ya normalizadas en `partners`.
  partners: [
    { id: 1, name: 'Pedro', sex: 'HOMBRE', roles: [] },
    { id: 2, name: 'Ana', sex: 'MUJER', roles: [] },
  ],
  disciples: [
    {
      id: 3,
      name: 'Juan',
      sex: 'HOMBRE',
      spouseId: 4,
      disciples: [],
    },
    {
      id: 4,
      name: 'María',
      sex: 'MUJER',
      spouseId: 3,
      disciples: [],
    },
  ],
};

describe('Módulo: Enviar — transformCouples (client)', () => {
  describe('buildIdIndex', () => {
    test('construye un índice por id', () => {
      const idx = buildIdIndex(sampleRoot);
      expect(idx.get('1')).toBeDefined();
      expect(idx.size).toBe(3); // 1, 3, 4
    });

    test('maneja root null', () => {
      expect(buildIdIndex(null).size).toBe(0);
    });

    test('no duplica ids (idempotente)', () => {
      const idx = buildIdIndex(sampleRoot);
      expect(idx.size).toBe(3);
    });
  });

  describe('buildCoupleNetwork', () => {
    test('devuelve null si root es null', () => {
      expect(buildCoupleNetwork(null)).toBeNull();
    });

    test('agrupa esposo y esposa en un nodo de pareja', () => {
      const couple = buildCoupleNetwork(sampleRoot);
      expect(couple).toBeDefined();
      expect(couple.partners).toHaveLength(2);
      const ids = couple.partners.map(p => p.id);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
    });

    test('ordena partners por sexo (HOMBRE primero)', () => {
      const couple = buildCoupleNetwork(sampleRoot);
      expect(couple.partners[0].sex).toBe('HOMBRE');
      expect(couple.partners[1].sex).toBe('MUJER');
    });

    test('calcula id de pareja concatenando ids ordenados', () => {
      const couple = buildCoupleNetwork(sampleRoot);
      // Pedro=1, Ana=2 → id de pareja
      expect(['1_2', '2_1']).toContain(couple.id);
    });

    test('propaga discípulos pero solo una vez por pareja', () => {
      const couple = buildCoupleNetwork(sampleRoot);
      // Juan y María están en la misma pareja, deben aparecer UNA vez
      expect(couple.disciples).toHaveLength(1);
    });
  });

  describe('computeLevels', () => {
    test('devuelve niveles vacíos para root null', () => {
      expect(computeLevels(null)).toEqual([]);
    });

    test('calcula niveles del árbol', () => {
      const couple = buildCoupleNetwork(sampleRoot);
      const levels = computeLevels(couple);
      expect(levels).toHaveLength(2); // raíz + hijos
      expect(levels[0]).toHaveLength(1);
      expect(levels[1]).toHaveLength(1);
    });
  });
});
