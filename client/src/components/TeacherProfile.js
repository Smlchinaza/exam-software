import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function TeacherProfile() {
  const { currentUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || ''
  });
  const [success, setSuccess] = useState('');

  if (!currentUser) {
    return <div className="p-8">Loading profile...</div>;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setEditMode(true);
    setSuccess('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({
      displayName: currentUser.displayName || '',
      email: currentUser.email || ''
    });
    setSuccess('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    // Simulate save
    setEditMode(false);
    setSuccess('Profile updated successfully!');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Teacher Profile</h2>
        {success && <div className="mb-4 text-green-600 text-center">{success}</div>}
        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label className="font-semibold block mb-1" htmlFor="displayName">Name:</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              disabled={!editMode}
            />
          </div>
          <div className="mb-4">
            <label className="font-semibold block mb-1" htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              disabled={!editMode}
            />
          </div>
          <div className="mb-4">
            <span className="font-semibold">Role:</span> {currentUser.role}
          </div>
          <div className="mt-6 text-center">
            {editMode ? (
              <>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">Save</button>
                <button type="button" onClick={handleCancel} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancel</button>
              </>
            ) : (
              <button type="button" onClick={handleEdit} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Edit Profile</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default TeacherProfile; 