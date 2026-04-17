import React from 'react';
import RepositoryList from '../components/repositories/RepositoryList.jsx';

const Repositories = () => {
  return (
    <div className="bg-gray-950 min-h-screen p-6 rounded-xl border border-gray-900">
      <RepositoryList />
    </div>
  );
};

export default Repositories;

