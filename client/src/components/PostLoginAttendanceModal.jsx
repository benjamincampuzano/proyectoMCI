import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
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
    // TODO: Enviar al backend
    // await api.post('/attendance/self-report', report);
    localStorage.setItem(key, 'true');
    setShowModal(false);
    toast.success('Asistencia registrada');
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
