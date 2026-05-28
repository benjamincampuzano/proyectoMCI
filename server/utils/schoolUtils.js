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

module.exports = {
    isModuleCompleted
};
