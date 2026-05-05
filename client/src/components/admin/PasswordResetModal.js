import React, { useState } from 'react';
import { X, Key, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

const PasswordResetModal = ({ 
  isOpen, 
  onClose, 
  admin, 
  onResetComplete,
  isBulk = false,
  selectedAdmins = []
}) => {
  const [reason, setReason] = useState('');
  const [notifyAdmin, setNotifyAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      let endpoint, payload;

      if (isBulk && selectedAdmins.length > 0) {
        // Bulk password reset
        endpoint = '/api/super-admin/bulk-password-reset';
        payload = {
          adminIds: selectedAdmins.map(admin => admin.id),
          reason: reason || 'Bulk password reset by super admin'
        };
      } else {
        // Single admin password reset
        endpoint = `/api/super-admin/school-admins/${admin.id}/reset-password`;
        payload = {
          reason: reason || 'Password reset by super admin',
          notifyAdmin
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to reset password');
      }

      setResult(data);
      
      // Call callback if provided
      if (onResetComplete) {
        onResetComplete(data);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      setResult(null);
      setReason('');
      onClose();
    }
  };

  const getAdminName = (adminItem) => {
    if (adminItem.firstName && adminItem.lastName) {
      return `${adminItem.firstName} ${adminItem.lastName}`;
    }
    return adminItem.email || 'Unknown Admin';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Key className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {isBulk ? 'Bulk Password Reset' : 'Reset Admin Password'}
                  </h3>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Warning Message */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Security Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This action will immediately reset the admin's password and require them to change it on next login.
                      The admin will be unable to access their account until they set a new password.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Information */}
            {!isBulk && admin && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Target Admin</h4>
                <div className="text-sm text-gray-600">
                  <p><strong>Name:</strong> {getAdminName(admin)}</p>
                  <p><strong>Email:</strong> {admin.email}</p>
                  <p><strong>School:</strong> {admin.schoolName || 'Not specified'}</p>
                </div>
              </div>
            )}

            {/* Bulk Admin Information */}
            {isBulk && selectedAdmins.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Target Admins ({selectedAdmins.length})
                </h4>
                <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {selectedAdmins.map((adminItem, index) => (
                    <p key={adminItem.id} className="mb-1">
                      {index + 1}. {getAdminName(adminItem)} - {adminItem.email}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            {!result ? (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Reset (Optional)
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter reason for password reset..."
                  />
                </div>

                {!isBulk && (
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={notifyAdmin}
                        onChange={(e) => setNotifyAdmin(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Send notification email to admin
                      </span>
                    </label>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Error
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 inline" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Result */
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Password Reset Successful
                </h3>
                <div className="mt-2 text-sm text-gray-600">
                  {!isBulk && result.admin && (
                    <div className="text-left bg-gray-50 p-3 rounded-md mb-3">
                      <p><strong>Admin:</strong> {getAdminName(result.admin)}</p>
                      <p><strong>Email:</strong> {result.admin.email}</p>
                      <p><strong>Temporary Password:</strong> 
                        <span className="font-mono bg-gray-200 px-2 py-1 rounded ml-2">
                          {result.temporaryPassword}
                        </span>
                      </p>
                      <p className="mt-2 text-yellow-600">
                        <strong>Important:</strong> The admin will need to change this password on first login.
                      </p>
                    </div>
                  )}
                  
                  {isBulk && result.results && (
                    <div className="text-left bg-gray-50 p-3 rounded-md mb-3">
                      <p><strong>Total Processed:</strong> {result.summary.total}</p>
                      <p><strong>Successful:</strong> {result.summary.successful}</p>
                      <p><strong>Failed:</strong> {result.summary.failed}</p>
                      
                      {result.summary.successful > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-green-600">Successfully Reset:</p>
                          {result.results.filter(r => r.success).map((item, index) => (
                            <p key={index} className="text-xs ml-2">
                              • {item.name} ({item.email})
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {result.summary.failed > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-red-600">Failed:</p>
                          {result.errors.map((error, index) => (
                            <p key={index} className="text-xs ml-2 text-red-600">
                              • Admin ID: {error.adminId} - {error.error}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <p className="text-gray-500">
                    {result.notificationSent ? 'Notification email has been sent.' : 'No notification email was sent.'}
                  </p>
                </div>
                
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetModal;
