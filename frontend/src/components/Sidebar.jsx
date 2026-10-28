import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import applicationService from '../services/applicationService.js';

export function Sidebar() {
  const [dbHealthy, setDbHealthy] = useState(false);

  useEffect(() => {
    applicationService
      .getHealth()
      .then((res) => {
        setDbHealthy(Boolean(res?.data?.databaseConnected));
      })
      .catch(() => setDbHealthy(false));
  }, []);

  return (
    <aside className="sidebar">
      <Link className="brand" to="/" title="ApplyFlow Tracker">
        <span className="brand-mark">A</span>
        <span>
          ApplyFlow
          <small>CAREER WORKSPACE</small>
        </span>
      </Link>

      <div className="nav-label">WORKSPACE</div>
      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <span>▦</span> Dashboard
      </NavLink>
      <NavLink
        to="/new"
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <span>＋</span> Add application
      </NavLink>

      <div className="sidebar-note">
        <span className="note-icon">✦</span>
        <strong>Stay in flow.</strong>
        <p>Log your applications, keep follow-ups timely, and stay focused on landing the offer.</p>
      </div>

      <div className="sidebar-foot">
        <span className="avatar">JJ</span>
        <div>
          <strong>Job Seeker</strong>
          <small>{dbHealthy ? 'MongoDB Connected' : 'Database Pending'}</small>
        </div>
        <span
          className="online-dot"
          title={dbHealthy ? 'MongoDB connected' : 'Database disconnected'}
          style={{ background: dbHealthy ? '#42c99a' : '#f59e0b' }}
        />
      </div>
    </aside>
  );
}

export default Sidebar;
