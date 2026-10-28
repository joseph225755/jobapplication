import React, { useEffect } from 'react';

export function ConfirmModal({ isOpen, title, message, confirmText = 'Delete', onConfirm, onCancel, isDanger = true }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-icon ${isDanger ? 'danger' : 'info'}`}>
            {isDanger ? '⚠' : 'ℹ'}
          </div>
          <div>
            <h3 id="modal-title" className="modal-title">{title}</h3>
            <p className="modal-message">{message}</p>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`button ${isDanger ? 'danger-button-solid' : 'primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
