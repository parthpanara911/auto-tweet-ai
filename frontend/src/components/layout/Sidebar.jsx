import React from 'react';
import { NavLink } from 'react-router-dom';

const navLinkBase =
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150';

const Sidebar = () => {
  return (
    <aside className="hidden md:flex md:flex-col w-60 bg-black border-r border-gray-800 p-4">
      <div className="mb-8">
        <span className="text-xl font-semibold text-white tracking-tight">AutoTweetAI</span>
      </div>

      <nav className="space-y-1 text-gray-300">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${navLinkBase} ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-900/60'}`
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/repositories"
          className={({ isActive }) =>
            `${navLinkBase} ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-900/60'}`
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Repositories</span>
        </NavLink>

        <NavLink
          to="/commits"
          className={({ isActive }) =>
            `${navLinkBase} ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-900/60'}`
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span>Commits</span>
        </NavLink>

        <NavLink
          to="/tweets"
          className={({ isActive }) =>
            `${navLinkBase} ${isActive ? 'bg-gray-900 text-white' : 'hover:bg-gray-900/60'}`
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span>Tweets</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

