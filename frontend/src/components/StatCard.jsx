import React from 'react';

export function StatCard({ label, value, icon, tone = 'violet', subtitle }) {
  return (
    <div className={`stat-card stat-tone-${tone}`}>
      <div className={`stat-icon ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <strong className="stat-value">{value ?? 0}</strong>
        {subtitle && <small className="stat-subtitle">{subtitle}</small>}
      </div>
    </div>
  );
}

export default StatCard;
