import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import applicationService from '../services/applicationService.js';
import StatusBadge from '../components/StatusBadge.jsx';
import StatCard from '../components/StatCard.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Accepted', 'Declined'];
const TRANSITIONS = {
  Applied: ['Interview', 'Rejected'],
  Interview: ['Offer', 'Rejected'],
  Offer: ['Accepted', 'Declined'],
  Rejected: [],
  Accepted: [],
  Declined: []
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

export function Dashboard() {
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter !== 'All statuses') {
        params.status = statusFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }

      const [listRes, statsRes] = await Promise.all([
        applicationService.getApplications(params),
        applicationService.getStats()
      ]);

      setApps(listRes?.data || []);
      setStats(statsRes?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch application data.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(loadData, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await applicationService.deleteApplication(deleteTarget._id);
      setSuccessNotice(`Application for ${deleteTarget.companyName} deleted successfully.`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete application.');
      setDeleteTarget(null);
    }
  };

  const handleStatusChange = async (app, nextStatus) => {
    if (!nextStatus) return;
    try {
      await applicationService.updateStatus(app._id, nextStatus);
      setSuccessNotice(`Updated ${app.companyName} status to ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const counts = stats?.counts || {};

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> JOB SEARCH PIPELINE
          </div>
          <h1>
            Your job search, <span>under control.</span>
          </h1>
          <p className="subtitle">
            Track applications, anticipate interviews, and monitor follow-up dates in real-time.
          </p>
        </div>
        <Link className="button primary" to="/new" id="btn-add-application">
          <span>＋</span> Add application
        </Link>
      </section>

      {successNotice && (
        <div className="alert success-alert">
          <span>✓ {successNotice}</span>
          <button type="button" onClick={() => setSuccessNotice('')}>✕</button>
        </div>
      )}

      {error && (
        <div className="alert error-alert">
          <span>{error}</span>
          <button type="button" onClick={loadData}>Retry</button>
        </div>
      )}

      {/* Required Statistics Cards */}
      <section className="stats-grid">
        <StatCard
          label="Total Applications"
          value={stats?.total ?? 0}
          icon="▤"
          tone="violet"
        />
        <StatCard
          label="Applied"
          value={counts.Applied ?? 0}
          icon="✉"
          tone="blue"
        />
        <StatCard
          label="Interview"
          value={counts.Interview ?? 0}
          icon="✳"
          tone="amber"
        />
        <StatCard
          label="Offer"
          value={counts.Offer ?? 0}
          icon="✧"
          tone="green"
        />
        <StatCard
          label="Accepted"
          value={counts.Accepted ?? 0}
          icon="★"
          tone="emerald"
        />
        <StatCard
          label="Rejected"
          value={counts.Rejected ?? 0}
          icon="✕"
          tone="rose"
        />
        <StatCard
          label="Declined"
          value={counts.Declined ?? 0}
          icon="⊘"
          tone="slate"
        />
      </section>

      {/* Applications List Section */}
      <section className="list-section">
        <div className="section-heading">
          <div>
            <h2>Application Pipeline</h2>
            <p>Every active and historical application stored in MongoDB.</p>
          </div>
          <span className="result-count">
            {apps.length} {apps.length === 1 ? 'application' : 'applications'}
          </span>
        </div>

        {/* Toolbar: Search & Filter */}
        <div className="toolbar">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              id="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company or role..."
              aria-label="Search by company or role"
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </label>

          <div className="filters-group">
            <label className="filter-box">
              <span>Status:</span>
              <select
                id="status-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            {(statusFilter !== 'All statuses' || search) && (
              <button
                type="button"
                className="button secondary reset-btn"
                onClick={() => {
                  setStatusFilter('All statuses');
                  setSearch('');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Applications Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>COMPANY & ROLE</th>
                <th>APPLICATION ID</th>
                <th>JOB TYPE</th>
                <th>APPLIED DATE</th>
                <th>STATUS</th>
                <th>FOLLOW-UP</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-message">
                    <div className="spinner" /> Loading applications…
                  </td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-message">
                    <div className="empty-icon">↗</div>
                    <strong>No applications found</strong>
                    <p>Add a new job application or adjust your search / filter criteria.</p>
                    <Link to="/new" className="button primary small-button">
                      Add application
                    </Link>
                  </td>
                </tr>
              ) : (
                apps.map((app) => {
                  const allowedNext = TRANSITIONS[app.status] || [];
                  const isDeletable = ['Applied', 'Rejected', 'Accepted', 'Declined'].includes(app.status);

                  return (
                    <tr key={app._id} id={`row-${app.applicationId}`}>
                      <td>
                        <div className="company-cell">
                          <span className="company-logo">
                            {(app.companyName || '?').slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <strong>{app.companyName}</strong>
                            <small>{app.jobRole}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code className="app-id">{app.applicationId}</code>
                      </td>
                      <td>
                        <span className="job-type-pill">{app.jobType}</span>
                      </td>
                      <td>{formatDate(app.appliedDate)}</td>
                      <td>
                        <StatusBadge status={app.status} />
                      </td>
                      <td>
                        {app.isOverdue ? (
                          <span className="overdue-badge" title="Past 7-day follow-up window">
                            ! Follow-up Overdue
                          </span>
                        ) : (
                          <span className="muted-date">{formatDate(app.followUpDate)}</span>
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          <Link
                            className="icon-action"
                            title="View details & timeline"
                            to={`/applications/${app._id}`}
                            aria-label={`View details for ${app.companyName}`}
                          >
                            ↗
                          </Link>
                          <Link
                            className="icon-action"
                            title="Edit details"
                            to={`/applications/${app._id}/edit`}
                            aria-label={`Edit ${app.companyName}`}
                          >
                            ✎
                          </Link>
                          <button
                            type="button"
                            className="icon-action danger-action"
                            title={
                              isDeletable
                                ? `Delete application (${app.status})`
                                : `Cannot delete while in ${app.status} status`
                            }
                            disabled={!isDeletable}
                            onClick={() => setDeleteTarget(app)}
                            aria-label={`Delete ${app.companyName}`}
                          >
                            ⌫
                          </button>

                          {allowedNext.length > 0 && (
                            <select
                              className="quick-status"
                              aria-label={`Advance status for ${app.companyName}`}
                              defaultValue=""
                              onChange={(e) => {
                                handleStatusChange(app, e.target.value);
                                e.target.value = '';
                              }}
                            >
                              <option value="" disabled>
                                Move to…
                              </option>
                              {allowedNext.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="list-footer">
          <span>Showing {apps.length} applications</span>
          <div className="legend">
            <span>
              <i className="legend-dot applied" /> Applied
            </span>
            <span>
              <i className="legend-dot interview" /> Interview
            </span>
            <span>
              <i className="legend-dot offer" /> Offer
            </span>
            <span>
              <i className="legend-dot accepted" /> Accepted
            </span>
            <span>
              <i className="legend-dot rejected" /> Rejected
            </span>
            <span>
              <i className="legend-dot declined" /> Declined
            </span>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Confirm Application Deletion"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete the application for "${deleteTarget.companyName}" (${deleteTarget.jobRole})? This action cannot be undone.`
            : ''
        }
        confirmText="Yes, Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDanger={true}
      />
    </>
  );
}

export default Dashboard;
