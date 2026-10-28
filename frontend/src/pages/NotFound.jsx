import React from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="loading-panel">
      <div className="empty-icon">404</div>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist in ApplyFlow.</p>
      <Link to="/" className="button primary">
        Back to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
