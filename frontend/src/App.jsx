import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AddApplication from './pages/AddApplication.jsx';
import EditApplication from './pages/EditApplication.jsx';
import ApplicationDetails from './pages/ApplicationDetails.jsx';
import NotFound from './pages/NotFound.jsx';

function Shell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="crumb-sep">/</span>
            <span>Job Applications</span>
          </div>
          <span className="today-pill">
            <span className="online-dot" /> Career Tracker Active
          </span>
        </header>

        <div className="page-wrap">{children}</div>

        <footer>
          ApplyFlow <span>·</span> Professional MERN Stack Job Application Tracker
        </footer>
      </main>
    </div>
  );
}

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<AddApplication />} />
        <Route path="/applications/:id" element={<ApplicationDetails />} />
        <Route path="/applications/:id/edit" element={<EditApplication />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}

export default App;
