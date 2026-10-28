import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import applicationService from '../services/applicationService.js';

export function EditApplication() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});

  // Original read-only values
  const [originalMeta, setOriginalMeta] = useState({
    applicationId: '',
    appliedDate: '',
    status: ''
  });

  // Editable form fields
  const [form, setForm] = useState({
    companyName: '',
    jobRole: '',
    jobType: 'Full-time',
    expectedSalary: '',
    notes: ''
  });

  useEffect(() => {
    let isMounted = true;
    applicationService
      .getApplicationById(id)
      .then((res) => {
        if (!isMounted) return;
        const app = res?.data;
        if (app) {
          setOriginalMeta({
            applicationId: app.applicationId,
            appliedDate: app.appliedDate ? new Date(app.appliedDate).toISOString().slice(0, 10) : '',
            status: app.status
          });
          setForm({
            companyName: app.companyName || '',
            jobRole: app.jobRole || '',
            jobType: app.jobType || 'Full-time',
            expectedSalary: app.expectedSalary !== null && app.expectedSalary !== undefined ? String(app.expectedSalary) : '',
            notes: app.notes || ''
          });
        }
      })
      .catch((err) => {
        if (isMounted) setServerError(err.message || 'Failed to load application.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!form.companyName.trim()) {
      newErrors.companyName = 'Company name is required.';
    }

    if (!form.jobRole.trim()) {
      newErrors.jobRole = 'Job role is required.';
    }

    if (!form.jobType) {
      newErrors.jobType = 'Job type is required.';
    }

    if (form.expectedSalary !== '' && form.expectedSalary !== null) {
      const num = Number(form.expectedSalary);
      if (Number.isNaN(num) || num < 0) {
        newErrors.expectedSalary = 'Expected salary must be a non-negative number.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        jobRole: form.jobRole.trim(),
        jobType: form.jobType,
        expectedSalary: form.expectedSalary === '' ? null : Number(form.expectedSalary),
        notes: form.notes ? form.notes.trim() : ''
      };

      await applicationService.updateApplication(id, payload);
      navigate(`/applications/${id}`, {
        state: { notice: 'Application updated successfully!' }
      });
    } catch (err) {
      setServerError(err.message || 'Failed to update application.');
    } finally {
      setSubmitting(false);
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

  return (
    <>
      <div className="page-heading">
        <Link to={`/applications/${id}`} className="back-link">
          ← Back to application
        </Link>
        <div className="eyebrow">
          <span className="eyebrow-line" /> EDIT APPLICATION
        </div>
        <h1>Update details for {originalMeta.applicationId}</h1>
        <p className="subtitle">
          Modify company details, job role, or notes. Application ID and applied date remain permanent.
        </p>
      </div>

      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div className="form-card-heading">
          <div>
            <h2>Edit Opportunity</h2>
            <p>
              Fields marked with <b>*</b> are required.
            </p>
          </div>
          <span className="form-step">
            STATUS: <i>{originalMeta.status}</i>
          </span>
        </div>

        {serverError && (
          <div className="alert error-alert">
            <span>{serverError}</span>
          </div>
        )}

        <div className="form-grid">
          {/* Read-only Application ID */}
          <div className="field">
            <label>Application ID (Immutable)</label>
            <input value={originalMeta.applicationId} disabled readOnly className="input-disabled" />
            <small className="field-hint">Application IDs are permanently assigned by the backend.</small>
          </div>

          {/* Read-only Applied Date */}
          <div className="field">
            <label>Applied Date (Immutable)</label>
            <input value={originalMeta.appliedDate} disabled readOnly className="input-disabled" />
            <small className="field-hint">Applied date cannot be modified once created.</small>
          </div>

          {/* Company Name */}
          <div className="field">
            <label htmlFor="companyName">
              Company Name <b>*</b>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={form.companyName}
              onChange={handleChange}
              required
              maxLength={120}
              className={errors.companyName ? 'input-error' : ''}
            />
            {errors.companyName && <span className="field-error">{errors.companyName}</span>}
          </div>

          {/* Job Role */}
          <div className="field">
            <label htmlFor="jobRole">
              Job Role <b>*</b>
            </label>
            <input
              id="jobRole"
              name="jobRole"
              type="text"
              value={form.jobRole}
              onChange={handleChange}
              required
              maxLength={120}
              className={errors.jobRole ? 'input-error' : ''}
            />
            {errors.jobRole && <span className="field-error">{errors.jobRole}</span>}
          </div>

          {/* Job Type */}
          <div className="field">
            <label htmlFor="jobType">
              Job Type <b>*</b>
            </label>
            <select
              id="jobType"
              name="jobType"
              value={form.jobType}
              onChange={handleChange}
              required
              className={errors.jobType ? 'input-error' : ''}
            >
              <option value="Full-time">Full-time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
            {errors.jobType && <span className="field-error">{errors.jobType}</span>}
          </div>

          {/* Expected Salary */}
          <div className="field">
            <label htmlFor="expectedSalary">
              Expected Salary <span className="optional">OPTIONAL</span>
            </label>
            <div className={`input-prefix ${errors.expectedSalary ? 'input-error' : ''}`}>
              <span>₹</span>
              <input
                type="number"
                min="0"
                step="1"
                id="expectedSalary"
                name="expectedSalary"
                value={form.expectedSalary}
                onChange={handleChange}
                placeholder="e.g. 500000"
              />
            </div>
            {errors.expectedSalary && <span className="field-error">{errors.expectedSalary}</span>}
          </div>

          {/* Notes */}
          <div className="field full-field">
            <label htmlFor="notes">
              Notes <span className="optional">OPTIONAL</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              maxLength={2000}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link to={`/applications/${id}`} className="button secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="button primary"
            disabled={submitting}
            id="btn-update-application"
          >
            {submitting ? 'Saving Changes…' : 'Save Changes →'}
          </button>
        </div>
      </form>
    </>
  );
}

export default EditApplication;
