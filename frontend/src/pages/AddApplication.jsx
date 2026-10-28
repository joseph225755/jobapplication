import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import applicationService from '../services/applicationService.js';

const getTodayString = () => new Date().toLocaleDateString('en-CA');

export function AddApplication() {
  const navigate = useNavigate();
  const today = getTodayString();

  const [form, setForm] = useState({
    companyName: '',
    jobRole: '',
    jobType: 'Full-time',
    appliedDate: today,
    expectedSalary: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific validation error on change
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

    if (!form.appliedDate) {
      newErrors.appliedDate = 'Applied date is required.';
    } else if (form.appliedDate > today) {
      newErrors.appliedDate = 'Applied date cannot be in the future.';
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
        appliedDate: form.appliedDate,
        expectedSalary: form.expectedSalary === '' ? null : Number(form.expectedSalary),
        notes: form.notes ? form.notes.trim() : ''
      };

      const res = await applicationService.createApplication(payload);
      const created = res?.data;
      navigate(`/applications/${created._id}`, {
        state: { notice: `Application for ${created.companyName} created successfully!` }
      });
    } catch (err) {
      setServerError(err.message || 'Failed to create application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <Link to="/" className="back-link">
          ← Back to applications
        </Link>
        <div className="eyebrow">
          <span className="eyebrow-line" /> NEW OPPORTUNITY
        </div>
        <h1>Track a new application</h1>
        <p className="subtitle">
          Record your submission details. An application ID and 7-day follow-up date will be generated automatically.
        </p>
      </div>

      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div className="form-card-heading">
          <div>
            <h2>Application Details</h2>
            <p>
              Fields marked with <b>*</b> are required.
            </p>
          </div>
          <span className="form-step">
            NEW <i>/</i> APPLIED
          </span>
        </div>

        {serverError && (
          <div className="alert error-alert">
            <span>{serverError}</span>
          </div>
        )}

        <div className="form-grid">
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
              placeholder="e.g. Infosys, Google, Microsoft"
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
              placeholder="e.g. Graduate Engineer Trainee, Full Stack Developer"
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

          {/* Applied Date */}
          <div className="field">
            <label htmlFor="appliedDate">
              Applied Date <b>*</b>
            </label>
            <input
              type="date"
              id="appliedDate"
              name="appliedDate"
              value={form.appliedDate}
              max={today}
              onChange={handleChange}
              required
              className={errors.appliedDate ? 'input-error' : ''}
            />
            <small className="field-hint">
              Follow-up date will be set to exactly 7 calendar days after applied date.
            </small>
            {errors.appliedDate && <span className="field-error">{errors.appliedDate}</span>}
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
              placeholder="Referral name, job portal URL, interview prep notes, contact person..."
              rows={4}
              maxLength={2000}
            />
          </div>
        </div>

        <div className="form-actions">
          <Link to="/" className="button secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="button primary"
            disabled={submitting}
            id="btn-submit-application"
          >
            {submitting ? 'Creating Application…' : 'Create Application →'}
          </button>
        </div>
      </form>
    </>
  );
}

export default AddApplication;
