import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const pageConfig = {
  "/dashboard": {
    title: "Dashboard",
    description: "Overview of your GitHub activity and AI tweet generation.",
  },
  "/repositories": {
    title: "Repositories",
    description: "Select and manage repositories to track commits.",
  },
  "/tweets": {
    title: "Tweets",
    description: "View and manage all generated tweets.",
  },
};

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentPage = pageConfig[location.pathname] || {
    title: "Dashboard",
    description: "",
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    // Use hard redirect to guarantee layout teardown and cookie re-check.
    window.location.assign('/');
  };

  const displayName = user?.username || user?.email || 'User';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
      <div>
        {/* Breadcrumb */}
        {currentPage.title !== "Dashboard" && (
          <p className="text-sm mb-1">
            <Link
              to="/dashboard"
              className="text-sky-400 hover:text-sky-300 font-medium"
            >
              Dashboard
            </Link>
            <span className="text-gray-500"> / {currentPage.title}</span>
          </p>
        )}

        {/* Title */}
        <h1 className="text-xl font-semibold text-white">
          {currentPage.title}
        </h1>

        {/* Description */}
        <p className="text-sm text-gray-400">
          {currentPage.description}
        </p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full bg-gray-900 px-2 py-1 border border-gray-800 hover:border-gray-700 transition-colors duration-150"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-200">
              {initials}
            </div>
          )}
          <span className="text-sm text-gray-200 max-w-30 truncate">{displayName}</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-lg bg-gray-900 border border-gray-800 shadow-xl py-2 z-20">
            <div className="px-3 pb-2 border-b border-gray-800">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-sm text-white truncate">{displayName}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 transition-colors duration-150"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;