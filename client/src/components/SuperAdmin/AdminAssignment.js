import React from 'react';
import { Users, Settings } from 'lucide-react';

const AdminAssignment = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-gray-600 mt-1">
            Manage school administrators and their permissions
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Assign New Admin
        </button>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Admin Management Coming Soon
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          This feature will allow you to assign, manage, and monitor school administrators 
          across all registered schools. You'll be able to create admin accounts, 
          update permissions, and track admin activity.
        </p>
        <div className="mt-6 space-y-2">
          <div className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">Planned Features:</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• Create and assign admin accounts</div>
            <div>• Update admin credentials and permissions</div>
            <div>• Transfer admin responsibilities</div>
            <div>• Monitor admin activity and performance</div>
            <div>• Bulk admin management tools</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignment;
