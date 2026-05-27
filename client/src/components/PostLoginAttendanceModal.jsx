import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import ModalAttendance from './ModalAttendance';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STORAGE_PREFIX = 'selfAttendance_';

const PostLoginAttendanceModal = () => {
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!loading && user && !hasChecked) {
      const today = format(new Date(), 'yyyy-MM-dd');
      const key = `${STORAGE_PREFIX}${user.id}_${today}`;
      if (!localStorage.getItem(key)) {
        setShowModal(true);
      }
      setHasChecked(true);
    }
    if (!loading && !user) {
      setHasChecked(false);
    }
  }, [loading, user, hasChecked]);

  const handleSave = async (report) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const key = `${STORAGE_PREFIX}${user.id}_${today}`;
    try {
      await api.post('/attendance/self-report', {
        type: report.type,
        date: report.date,
        attended: report.attended,
      });
      localStorage.setItem(key, 'true');
      setShowModal(false);
      toast.success('Asistencia registrada');
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al registrar asistencia';
      toast.error(msg);
    }
  };

  const handleClose = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <ModalAttendance
      isOpen={showModal}
      onClose={handleClose}
      initialType={null}
      user={user}
      onSave={handleSave}
      requireReport={true}
      allowOutsideClose={false}
    />
  );
};

export default PostLoginAttendanceModal;
