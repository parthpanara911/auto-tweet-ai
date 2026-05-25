import React from 'react';
import { NavLink } from 'react-router-dom';

const navLinkBase =
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`fixed md:static top-0 left-0 h-screen w-60 bg-black border-r border-gray-800 p-4 z-50 transform transition-transform duration-300 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:flex md:flex-col`}>
        <div className="mb-8">
          <span className="text-xl font-semibold text-white">
            AutoTweetAI
          </span>
        </div>

        <nav className="space-y-1 text-gray-300">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-900/60'}`
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Dashboard
          </NavLink>

          <NavLink
            to="/repositories"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-900/60'}`
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Repositories
          </NavLink>

          <NavLink
            to="/tweets"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-900/60'}`
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            Tweets
          </NavLink>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;