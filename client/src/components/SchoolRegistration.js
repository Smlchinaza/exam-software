import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolApi } from '../services/api';
import { Building2, Mail, Lock, User, Globe, MapPin } from 'lucide-react';
import StateSelector from './StateSelector';

const SchoolRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    stateId: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    type: 'secondary',
    isPublic: true,
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
    adminFirstName: '',
    adminLastName: ''
  });
  const [selectedState, setSelectedState] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleStateChange = (state) => {
    setSelectedState(state);
    setFormData(prev => ({
      ...prev,
      stateId: state ? state.id : ''
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('School name is required');
      return false;
    }

    if (!formData.stateId) {
      setError('Please select a state');
      return false;
    }

    if (!formData.adminEmail.trim()) {
      setError('Admin email is required');
      return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.adminPassword) {
      setError('Password is required');
      return false;
    }

    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.adminPassword !== formData.adminConfirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await schoolApi.registerSchool({
        name: formData.name,
        domain: formData.domain || null,
        stateId: formData.stateId,
        address: formData.address || null,
        city: formData.city || null,
        postalCode: formData.postalCode || null,
        phone: formData.phone || null,
        type: formData.type,
        isPublic: formData.isPublic,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName
      });

      // Save token to localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.admin));
      localStorage.setItem('schoolId', response.school.id);

      setRegistrationData(response);
      setSuccess(true);
    } catch (err) {
      setError(err.error || err.message || 'Failed to register school');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToDashboard = () => {
    navigate('/teacher/dashboard');
  };

  // Success message screen
  if (success && registrationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">School Registered Successfully!</h1>
            <p className="text-gray-600">Your school is now ready to use</p>
          </div>

          {/* School Information */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">School Information</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <Building2 className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">School Name</p>
                  <p className="text-lg font-medium text-gray-900">{registrationData.school.name}</p>
                </div>
              </div>
              {selectedState && (
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">State</p>
                    <p className="text-lg font-medium text-gray-900">{selectedState.name}</p>
                  </div>
                </div>
              )}
              {registrationData.school.city && (
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="text-lg font-medium text-gray-900">{registrationData.school.city}</p>
                  </div>
                </div>
              )}
              {registrationData.school.domain && (
                <div className="flex items-start">
                  <Globe className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Domain</p>
                    <p className="text-lg font-medium text-gray-900">{registrationData.school.domain}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start">
                <Globe className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">School ID</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{registrationData.school.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Account Information */}
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Account Created</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <User className="w-5 h-5 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Admin Name</p>
                  <p className="text-lg font-medium text-gray-900">
                    {registrationData.admin.first_name} {registrationData.admin.last_name}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-medium text-gray-900">{registrationData.admin.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Lock className="w-5 h-5 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <p className="text-lg font-medium text-gray-900 capitalize">{registrationData.admin.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* JWT Token (for reference) */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">JWT Token (saved automatically):</p>
            <div className="bg-white p-3 rounded border border-gray-200 overflow-auto max-h-24">
              <p className="text-xs font-mono text-gray-700 break-all">{registrationData.token}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">Token expires in: {registrationData.expiresIn}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleNavigateToDashboard}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Back to Login
            </button>
          </div>

          {/* Info Message */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Next Steps:</strong> You're now logged in as the school admin. You can invite teachers and manage exams from your dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register School</h1>
          <p className="text-gray-600">Create your school account and get started</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* School Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              School Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Spectra Group of Schools"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* State Selection */}
          <div>
            <StateSelector
              selectedState={selectedState}
              onStateChange={handleStateChange}
              error={!selectedState && error ? 'Please select a state' : ''}
              disabled={loading}
            />
          </div>

          {/* School Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="e.g., Lagos"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
            </div>

            {/* School Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                School Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              >
                <option value="primary">Primary School</option>
                <option value="secondary">Secondary School</option>
                <option value="tertiary">Tertiary Institution</option>
                <option value="vocational">Vocational/Technical</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="School address"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              disabled={loading}
            />
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="e.g., +2348012345678"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                placeholder="e.g., 100001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                disabled={loading}
              />
            </div>
          </div>

          {/* School Type (Public/Private) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Type
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isPublic"
                  value={true}
                  checked={formData.isPublic === true}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: true }))}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">Public School</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isPublic"
                  value={false}
                  checked={formData.isPublic === false}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: false }))}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700">Private School</span>
              </label>
            </div>
          </div>

          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
              School Domain <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="url"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleInputChange}
              placeholder="e.g., school.example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Admin Email */}
          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Email *
            </label>
            <input
              type="email"
              id="adminEmail"
              name="adminEmail"
              value={formData.adminEmail}
              onChange={handleInputChange}
              placeholder="admin@school.edu"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Admin First Name */}
          <div>
            <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700 mb-1">
              Admin First Name <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="adminFirstName"
              name="adminFirstName"
              value={formData.adminFirstName}
              onChange={handleInputChange}
              placeholder="John"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Admin Last Name */}
          <div>
            <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700 mb-1">
              Admin Last Name <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="adminLastName"
              name="adminLastName"
              value={formData.adminLastName}
              onChange={handleInputChange}
              placeholder="Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Admin Password */}
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="adminPassword"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleInputChange}
              placeholder="Min 8 characters"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="adminConfirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              id="adminConfirmPassword"
              name="adminConfirmPassword"
              value={formData.adminConfirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Registering...' : 'Register School'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have a school?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Log in here
            </button>
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Info:</strong> Registration creates both your school account and an admin account with your provided email and password. State selection is required for proper multi-tenant organization.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistration;
