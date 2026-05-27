import React, { useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  usePageTitle("Login");
  const navigate = useNavigate();
  const { isAuthenticated, initializing } = useAuth();

  useEffect(() => {
    if (initializing) return;
    if (isAuthenticated) {
      // Prevent back button showing login after OAuth:
      navigate('/dashboard', { replace: true });
    }
  }, [initializing, isAuthenticated, navigate]);

  const handleGitHubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/github`;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Card Container */}
      <div className="bg-gray-900 rounded-xl shadow-2xl p-8 max-w-md w-full shadow-black/30 border border-gray-800">

        {/* Title */}
        <h1 className="text-3xl font-bold text-white text-center">
          AutoTweetAI
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 mt-2 text-center text-sm leading-relaxed">
          Generate tweets from your GitHub commits using AI
        </p>

        {/* GitHub Login Button */}
        <button
          onClick={handleGitHubLogin}
          disabled={initializing}
          className="w-full mt-8 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-600 active:scale-95"
        >
          {/* GitHub Icon (SVG) */}
          <svg
            className="w-5 h-5 flex items-center justify-center gap-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.544 2.914 1.19.092-.926.35-1.557.636-1.914-2.22-.253-4.555-1.113-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.817c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.138 18.194 20 14.44 20 10.017 20 4.484 15.522 0 10 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Continue with GitHub</span>
        </button>

        {/* Footer Text */}
        <p className="text-gray-500 text-xs text-center mt-6">
          We only use GitHub to authenticate and access your commits
        </p>
      </div>
    </div>
  );
};

export default Login;