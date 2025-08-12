import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import '../css/Layout.css';

function Layout({ title, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="layout-container flex flex-row min-h-screen">
      <Sidebar className={sidebarOpen ? 'open' : 'closed'} onToggle={toggleSidebar} />
      <div className={`main-content flex flex-col flex-grow ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Header title={title} onSidebarToggle={toggleSidebar} />
        <main className="content-wrapper flex-grow p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default Layout;