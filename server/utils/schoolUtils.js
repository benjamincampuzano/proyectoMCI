const { getLevelByModuleNumber } = require('./levelConstants');

/**
 * Helper to determine if a module is completed based on the enrollment record.
 * Single source of truth: finalGrade >= 7.
 *
 * @param {Object|null} enrollment - The SeminarEnrollment record
 * @returns {boolean} - True if the module is completed, false otherwise.
 */
const isModuleCompleted = (enrollment) => {
    if (!enrollment) return false;

    const grade = enrollment.finalGrade;

    // Validates that grade is a number and >= 7
    // Handles null, undefined, and NaN
    return typeof grade === 'number' && !isNaN(grade) && grade >= 7;
};

/**
 * Grouping of the 6 discipleship classes into 3 sequential modules:
 *   Módulo 1 -> clases 1A + 1B
 *   Módulo 2 -> clases 2A + 2B
 *   Módulo 3 -> clases 3A + 3B
 */
const MODULE_GROUPS = [
    { module: 1, level: '1', classNumbers: [1, 2] },
    { module: 2, level: '2', classNumbers: [3, 4] },
    { module: 3, level: '3', classNumbers: [5, 6] }
];

/**
 * Returns the module group (1-3) to which a class belongs, based on its
 * moduleNumber (1-6). Returns null for unknown numbers.
 */
const getModuleGroup = (moduleNumber) => {
    if (moduleNumber === null || moduleNumber === undefined) return null;
    const level = getLevelByModuleNumber(moduleNumber);
    return level ? parseInt(level.nivel) : null;
};

/**
 * Returns the module group info ({ module, level, classNumbers, label }).
 */
const getModuleInfo = (moduleGroup) => {
    const group = MODULE_GROUPS.find(g => g.module === moduleGroup);
    if (!group) return null;
    return {
        ...group,
        label: `Módulo ${group.module}`,
        classLabels: group.classNumbers.map(num => {
            const level = getLevelByModuleNumber(num);
            return level ? `${level.nivel}${level.seccion}` : `Clase ${num}`;
        })
    };
};

/**
 * Returns the previous module group number, or null if it's the first module.
 */
const getPreviousModuleGroup = (moduleGroup) => {
    return moduleGroup > 1 ? moduleGroup - 1 : null;
};

/**
 * Returns the moduleNumbers (1-6) of the classes that belong to a module group.
 */
const getModuleClassNumbers = (moduleGroup) => {
    const group = MODULE_GROUPS.find(g => g.module === moduleGroup);
    return group ? group.classNumbers : [];
};

module.exports = {
    isModuleCompleted,
    MODULE_GROUPS,
    getModuleGroup,
    getModuleInfo,
    getPreviousModuleGroup,
    getModuleClassNumbers
};
