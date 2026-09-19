/**
 * Tests del módulo: UI transversal — Linear Colors
 * Cubre: client/src/utils/linearColors.js
 *
 * Verifica las utilidades para manipular los colores del tema Linear:
 *  - getLinearColor(path): acceso por path con fallback.
 *  - withOpacity(color, opacity): añade canal alpha.
 *  - adjustBrightness(color, amount): aclara/oscurece un color.
 *  - blendColors(c1, c2, ratio): mezcla dos colores.
 *  - getContrastColor(background): blanco o negro según luminancia.
 *  - isValidLinearColor(color): validador de formato.
 *  - generateCSSVariables(customColors): genera vars CSS.
 */

import { describe, test, expect } from 'vitest';
import {
    linearColors,
    getLinearColor,
    withOpacity,
    adjustBrightness,
    blendColors,
    getContrastColor,
    isValidLinearColor,
    generateCSSVariables,
} from '@client-src/utils/linearColors.js';

describe('Módulo: UI — Linear Colors (client)', () => {
    describe('linearColors', () => {
        test('expone la paleta del tema', () => {
            expect(linearColors).toBeDefined();
            expect(linearColors.brand.indigo).toBe('#5e6ad2');
            expect(linearColors.status.success).toBe('#27a644');
        });
    });

    describe('getLinearColor', () => {
        test('devuelve el color en el path dado', () => {
            expect(getLinearColor('brand.indigo')).toBe('#5e6ad2');
            expect(getLinearColor('backgrounds.marketing')).toBe('#08090a');
        });

        test('devuelve el fallback si el path no existe', () => {
            expect(getLinearColor('foo.bar.baz', '#ff0000')).toBe('#ff0000');
            expect(getLinearColor('')).toBe('#000000'); // fallback por defecto
        });

        test('devuelve el fallback ante error', () => {
            expect(getLinearColor(null)).toBe('#000000');
        });
    });

    describe('withOpacity', () => {
        test('añade opacidad a un color hex', () => {
            const result = withOpacity('#ff0000', 0.5);
            expect(result).toBe('rgba(255, 0, 0, 0.5)');
        });

        test('reemplaza la opacidad si ya es rgba', () => {
            const result = withOpacity('rgba(255, 0, 0, 0.8)', 0.3);
            expect(result).toMatch(/rgba\(255,\s*0,\s*0,\s*0\.3\)$/);
        });

        test('devuelve el color tal cual si no es string', () => {
            expect(withOpacity(123, 0.5)).toBe(123);
            expect(withOpacity(null, 0.5)).toBe(null);
        });
    });

    describe('adjustBrightness', () => {
        test('aclara un color con amount positivo', () => {
            const result = adjustBrightness('#000000', 50);
            expect(result).toBe('#323232');
        });

        test('oscurece un color con amount negativo', () => {
            const result = adjustBrightness('#ffffff', -50);
            expect(result).toBe('#cdcdcd');
        });

        test('NO supera el máximo (255)', () => {
            const result = adjustBrightness('#ffffff', 100);
            // 255 + 100 = 355 → cap 255 → ff
            expect(result).toMatch(/^#[f]{2}[f]{2}[f]{2}$/);
        });

        test('NO baja del mínimo (0)', () => {
            const result = adjustBrightness('#000000', -100);
            expect(result).toMatch(/^#0{6}$/);
        });
    });

    describe('blendColors', () => {
        test('mezcla 50/50 por defecto', () => {
            const result = blendColors('#000000', '#ffffff');
            // Mitad entre negro y blanco: gris medio
            expect(result).toBe('#7f7f7f');
        });

        test('mezcla 100% del segundo color con ratio=1', () => {
            const result = blendColors('#000000', '#ff0000', 1);
            expect(result).toBe('#ff0000');
        });

        test('mezcla 100% del primer color con ratio=0', () => {
            const result = blendColors('#ff0000', '#000000', 0);
            expect(result).toBe('#ff0000');
        });
    });

    describe('getContrastColor', () => {
        test('devuelve negro para fondos claros', () => {
            expect(getContrastColor('#ffffff')).toBe('#000000');
        });

        test('devuelve blanco para fondos oscuros', () => {
            expect(getContrastColor('#000000')).toBe('#ffffff');
        });

        test('devuelve blanco por defecto si no hay color', () => {
            expect(getContrastColor(null)).toBe('#f7f8f8');
        });
    });

    describe('isValidLinearColor', () => {
        test('true para hex válido (6 caracteres)', () => {
            expect(isValidLinearColor('#ff0000')).toBe(true);
        });

        test('true para hex válido (3 caracteres)', () => {
            expect(isValidLinearColor('#f00')).toBe(true);
        });

        test('true para rgba válido', () => {
            expect(isValidLinearColor('rgba(255, 0, 0, 0.5)')).toBe(true);
        });

        test('true para rgb válido', () => {
            expect(isValidLinearColor('rgb(255, 0, 0)')).toBe(true);
        });

        test('false para formatos no soportados', () => {
            expect(isValidLinearColor('red')).toBe(false);
            expect(isValidLinearColor('#xyz')).toBe(false);
            expect(isValidLinearColor('hsl(0, 100%, 50%)')).toBe(false);
        });

        test('false para no-strings', () => {
            expect(isValidLinearColor(null)).toBe(false);
            expect(isValidLinearColor(123)).toBe(false);
        });
    });

    describe('generateCSSVariables', () => {
        test('genera variables para todos los colores base', () => {
            const vars = generateCSSVariables();
            expect(vars['--ln-brand-indigo']).toBeDefined();
            expect(vars['--ln-status-success']).toBeDefined();
            expect(typeof vars).toBe('object');
        });

        test('acepta colores custom y los mezcla', () => {
            const vars = generateCSSVariables({
                custom: { primary: '#abcdef' },
            });
            expect(vars['--ln-custom-primary']).toBe('#abcdef');
        });
    });
});
