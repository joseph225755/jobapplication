import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import applicationService from '../services/applicationService.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

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

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadApplication = useCallback(async () => {
    try {
      const res = await applicationService.getApplicationById(id);
      setApp(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load application.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleStatusChange = async (nextStatus) => {
    if (!nextStatus) return;
    setUpdatingStatus(true);
    setError('');
    try {
      await applicationService.updateStatus(id, nextStatus);
      setNotice(`Status advanced to ${nextStatus}.`);
      await loadApplication();
    } catch (err) {
      setError(err.message || 'Status transition failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    try {
      await applicationService.deleteApplication(id);
      navigate('/', {
        state: { notice: `Application for ${app.companyName} deleted successfully.` }
      });
    } catch (err) {
      setError(err.message || 'Failed to delete application.');
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-panel">
        <div className="spinner" />
        <p>Loading application details…</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="loading-panel">
        <div className="empty-icon">⚠</div>
        <strong>Application Not Found</strong>
        <p>{error || 'The requested application could not be retrieved from MongoDB.'}</p>
        <Link to="/" className="button secondary">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const allowedNext = TRANSITIONS[app.status] || [];
  const isDeletable = ['Applied', 'Rejected', 'Accepted', 'Declined'].includes(app.status);

  return (
    <>
      <div className="page-heading">
        <Link to="/" className="back-link">
          ← Back to All Applications
        </Link>
        <div className="detail-title-row">
          <span className="detail-logo">
            {app.companyName.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> APPLICATION DETAILS
            </div>
            <h1>{app.companyName}</h1>
            <p className="subtitle">
              {app.jobRole} · <span className="job-type-pill">{app.jobType}</span>
            </p>
          </div>
          <StatusBadge status={app.status} />
        </div>
      </div>

      {notice && (
        <div className="alert success-alert">
          <span>✓ {notice}</span>
          <button type="button" onClick={() => setNotice('')}>✕</button>
        </div>
      )}

      {error && (
        <div className="alert error-alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="detail-layout">
        {/* Main Application Details Card */}
        <section className="form-card detail-card">
          <div className="form-card-heading">
            <div>
              <h2>Opportunity Overview</h2>
              <p>Key data persisted in MongoDB Atlas.</p>
            </div>
            <code className="app-id">{app.applicationId}</code>
          </div>

          <div className="detail-grid">
            <div>
              <span>Company</span>
              <strong>{app.companyName}</strong>
            </div>
            <div>
              <span>Job Role</span>
              <strong>{app.jobRole}</strong>
            </div>
            <div>
              <span>Job Type</span>
              <strong>{app.jobType}</strong>
            </div>
            <div>
              <span>Applied Date</span>
              <strong>{formatDate(app.appliedDate)}</strong>
            </div>
            <div>
              <span>Follow-Up Date</span>
              <strong>
                {formatDate(app.followUpDate)}{' '}
                {app.isOverdue && (
                  <span className="overdue-badge">! Follow-up Overdue</span>
                )}
              </strong>
            </div>
            <div>
              <span>Expected Salary</span>
              <strong>
                {app.expectedSalary !== null && app.expectedSalary !== undefined
                  ? `₹${Number(app.expectedSalary).toLocaleString('en-IN')}`
                  : 'Not specified'}
              </strong>
            </div>
            <div className="detail-notes">
              <span>Notes</span>
              <p>{app.notes || 'No notes added yet for this opportunity.'}</p>
            </div>
          </div>

          <div className="form-actions detail-actions">
            <Link to={`/applications/${id}/edit`} className="button secondary">
              ✎ Edit Details
            </Link>
            <button
              type="button"
              className="button danger-button"
              disabled={!isDeletable}
              onClick={() => setShowDeleteModal(true)}
              title={
                isDeletable
                  ? 'Delete this application'
                  : `Deletion prohibited while in ${app.status} status`
              }
            >
              Delete Application
            </button>
          </div>
        </section>

        {/* Vertical Status Timeline & Advance Status */}
        <aside className="form-card timeline-card">
          <div className="form-card-heading">
            <div>
              <h2>Status Timeline</h2>
              <p>Chronological audit log of state changes.</p>
            </div>
            <span className="timeline-count">{app.statusHistory?.length || 1}</span>
          </div>

          <div className="timeline">
            {(app.statusHistory || []).map((step, idx) => {
              const isLatest = idx === app.statusHistory.length - 1;
              return (
                <div
                  className="timeline-item"
                  key={`${step.status}-${step.changedAt}-${idx}`}
                >
                  <span className={`timeline-node ${isLatest ? 'current' : ''}`}>
                    {isLatest ? '✓' : idx + 1}
                  </span>
                  <div>
                    <strong>{step.status}</strong>
                    <p>{formatDateTime(step.changedAt)}</p>
                    {idx === 0 && <small>Application created</small>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advance Status Controls */}
          <div className="status-next">
            <label htmlFor="nextStatusSelect">Advance Status</label>
            {allowedNext.length > 0 ? (
              <select
                id="nextStatusSelect"
                defaultValue=""
                disabled={updatingStatus}
                onChange={(e) => {
                  handleStatusChange(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="" disabled>
                  {updatingStatus ? 'Updating…' : 'Choose next status…'}
                </option>
                {allowedNext.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            ) : (
              <p className="final-status-note">
                ✓ <strong>{app.status}</strong> is a final status. No further transitions are permitted.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Confirm Application Deletion"
        message={`Are you sure you want to permanently delete the application for "${app.companyName}" (${app.jobRole})? This action cannot be undone.`}
        confirmText="Yes, Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDanger={true}
      />
    </>
  );
}

export default ApplicationDetails;
