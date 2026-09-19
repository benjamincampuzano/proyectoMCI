import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FloppyDisk, UserPlus } from '@phosphor-icons/react';
import { Modal, Button, Select, Input, Textarea } from '../ui';

const ATTENDANCE_OPTIONS = [
    { value: 'ASISTE', label: 'Asiste (AS)' },
    { value: 'AUSENCIA_JUSTIFICADA', label: 'Ausencia Justificada (AJ)' },
    { value: 'AUSENCIA_NO_JUSTIFICADA', label: 'Ausencia No Justificada (ANJ)' },
    { value: 'BAJA', label: 'Baja (BAJA)' }
];

const RECORD_TYPES = [
    { value: 'grade', label: 'Nota de clase' },
    { value: 'attendance', label: 'Asistencia' },
    { value: 'finalGrade', label: 'Nota final' },
    { value: 'projectNotes', label: 'Observaciones de proyecto' }
];

const RecordGradeModal = ({ isOpen, onClose, onSaved }) => {
    const [modules, setModules] = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [matrix, setMatrix] = useState([]);
    const [loadingModules, setLoadingModules] = useState(false);
    const [loadingMatrix, setLoadingMatrix] = useState(false);

    const [enrollmentId, setEnrollmentId] = useState('');
    const [recordType, setRecordType] = useState('grade');
    const [classNumber, setClassNumber] = useState(1);
    const [gradeValue, setGradeValue] = useState('');
    const [attendanceValue, setAttendanceValue] = useState('ASISTE');
    const [projectNotes, setProjectNotes] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Load modules when opened
    useEffect(() => {
        if (!isOpen) return;
        const loadModules = async () => {
            setLoadingModules(true);
            setError(null);
            try {
                const res = await api.get('/school/modules');
                setModules(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setError('Error al cargar las clases: ' + (err.response?.data?.error || err.message));
            } finally {
                setLoadingModules(false);
            }
        };
        void Promise.resolve().then(loadModules);
    }, [isOpen]);

    // Load matrix when module changes
    useEffect(() => {
        if (!selectedModuleId) {
            void Promise.resolve().then(() => {
                setMatrix([]);
                setEnrollmentId('');
            });
            return;
        }
        const loadMatrix = async () => {
            setLoadingMatrix(true);
            setError(null);
            try {
                const res = await api.get(`/school/modules/${selectedModuleId}/matrix`);
                setMatrix(res.data?.matrix || []);
            } catch (err) {
                setMatrix([]);
                setError('Error al cargar los estudiantes: ' + (err.response?.data?.error || err.message));
            } finally {
                setLoadingMatrix(false);
            }
        };
        void Promise.resolve().then(loadMatrix);
    }, [selectedModuleId]);

    const resetForm = () => {
        setSelectedModuleId('');
        setEnrollmentId('');
        setRecordType('grade');
        setClassNumber(1);
        setGradeValue('');
        setAttendanceValue('ASISTE');
        setProjectNotes('');
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleModuleChange = (e) => {
        setSelectedModuleId(e.target.value);
        setEnrollmentId('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!enrollmentId) {
            setError('Selecciona un estudiante.');
            return;
        }
        if ((recordType === 'grade' || recordType === 'finalGrade') && (!gradeValue || isNaN(parseFloat(gradeValue)))) {
            setError('Ingresa una nota válida.');
            return;
        }

        const payload = {
            enrollmentId: parseInt(enrollmentId),
            type: recordType,
            key: null,
            value: ''
        };

        if (recordType === 'grade') {
            payload.key = parseInt(classNumber);
            payload.value = parseFloat(gradeValue);
        } else if (recordType === 'attendance') {
            payload.key = parseInt(classNumber);
            payload.value = attendanceValue;
        } else if (recordType === 'finalGrade') {
            payload.value = parseFloat(gradeValue);
        } else {
            payload.value = projectNotes || '';
        }

        setSaving(true);
        setError(null);
        try {
            await api.post('/school/matrix/update', payload);
            toast.success('Cambio registrado correctamente');
            if (onSaved) onSaved();
            handleClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar el cambio');
        } finally {
            setSaving(false);
        }
    };

    const selectedModule = modules.find(m => m.id === parseInt(selectedModuleId || 0));

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Registrar Nota"
            size="md"
            loading={loadingModules || loadingMatrix}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <Select
                    label="Clase / Módulo"
                    value={selectedModuleId}
                    onChange={handleModuleChange}
                    required
                >
                    <option value="">Selecciona una clase...</option>
                    {modules.map(module => (
                        <option key={module.id} value={module.id}>
                            {module.name} ({module._count?.enrollments || 0} inscritos)
                        </option>
                    ))}
                </Select>

                <Select
                    label="Estudiante"
                    value={enrollmentId}
                    onChange={(e) => setEnrollmentId(e.target.value)}
                    required
                    disabled={!selectedModuleId}
                >
                    <option value="">Selecciona un estudiante...</option>
                    {matrix.map(row => (
                        <option key={row.id} value={row.id}>
                            {row.studentName}
                        </option>
                    ))}
                </Select>

                {selectedModule && matrix.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <UserPlus size={16} />
                        Esta clase aún no tiene estudiantes inscritos.
                    </div>
                )}

                <Select
                    label="Tipo de registro"
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    required
                >
                    {RECORD_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </Select>

                {(recordType === 'grade' || recordType === 'attendance') && (
                    <Select
                        label="Número de clase"
                        value={classNumber}
                        onChange={(e) => setClassNumber(parseInt(e.target.value))}
                        required
                    >
                        {(selectedModule?.classCount || 10) === 0 ? (
                            <option value="">Sin clases definidas</option>
                        ) : (
                            [...Array(selectedModule?.classCount || 10)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>Clase {i + 1}</option>
                            ))
                        )}
                    </Select>
                )}

                {recordType === 'grade' && (
                    <Input
                        label="Nota (1 - 10)"
                        type="number"
                        min="1"
                        max="10"
                        step="0.1"
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value)}
                        placeholder="Ej: 8.5"
                        required
                    />
                )}

                {recordType === 'attendance' && (
                    <Select
                        label="Estado de asistencia"
                        value={attendanceValue}
                        onChange={(e) => setAttendanceValue(e.target.value)}
                        required
                    >
                        {ATTENDANCE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </Select>
                )}

                {recordType === 'finalGrade' && (
                    <Input
                        label="Nota final (1 - 10)"
                        type="number"
                        min="1"
                        max="10"
                        step="0.1"
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value)}
                        placeholder="Ej: 9.0"
                        required
                    />
                )}

                {recordType === 'projectNotes' && (
                    <Textarea
                        label="Observaciones de proyecto"
                        value={projectNotes}
                        onChange={(e) => setProjectNotes(e.target.value)}
                        rows={4}
                        placeholder="Escribe las observaciones del proyecto del estudiante..."
                    />
                )}

                {error && (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        {error}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                    <Button type="button" variant="ghost" onClick={handleClose}>Cancelar</Button>
                    <Button
                        type="submit"
                        variant="primary"
                        icon={FloppyDisk}
                        loading={saving}
                        className="min-w-[140px]"
                    >
                        {saving ? 'Guardando...' : 'Registrar'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default RecordGradeModal;