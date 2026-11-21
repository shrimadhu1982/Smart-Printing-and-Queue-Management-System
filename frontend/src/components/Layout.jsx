import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Layout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar isMobileOpen={isMobileOpen} closeMobile={() => setIsMobileOpen(false)} />
      <div className="main-content">
        <Navbar toggleMobile={() => setIsMobileOpen(!isMobileOpen)} />
        <main className="page-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
