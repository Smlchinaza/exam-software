import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';

function TeacherProfile() {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        if (!user) {
          setError('No user logged in');
          return;
        }

        const profile = await userApi.getProfile();
        setForm({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || ''
        });
      } catch (err) {
        setError('Failed to load profile');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">Not authenticated</div>;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setEditMode(true);
    setSuccess('');
    setError('');
  };

  const handleCancel = () => {
    setEditMode(false);
    setSuccess('');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await userApi.updateProfile({
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email
      });
      setEditMode(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Teacher Profile</h2>
        {success && <div className="mb-4 text-green-600 text-center">{success}</div>}
        {error && <div className="mb-4 text-red-600 text-center">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label className="font-semibold block mb-1" htmlFor="firstName">First Name:</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
              disabled={!editMode}
            />
          </div>
          <div className="mb-4">
            <label className="font-semibold block mb-1" htmlFor="lastName">Last Name:</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={form.lastName}
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
            <span className="font-semibold">Role:</span> {user?.role || 'Teacher'}
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