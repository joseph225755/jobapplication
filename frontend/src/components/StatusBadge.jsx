import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;
  const normalized = status.toLowerCase();
  return (
    <span className={`status-badge status-${normalized}`}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}

export default StatusBadge;
