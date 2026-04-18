import Modal from './ui/Modal';

const ActionModal = ({
    isOpen,
    title,
    onClose,
    children,
    size = 'lg',
    containerClassName = '',
    noContentScroll = true,
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size={size}
            className={containerClassName}
            noContentScroll={noContentScroll}
        >
            <Modal.Content className="p-0 flex-1 flex flex-col min-h-0">
                <div className="animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
                    {children}
                </div>
            </Modal.Content>
        </Modal>
    );
};

export default ActionModal;
