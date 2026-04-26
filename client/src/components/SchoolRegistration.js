import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
 // eslint-disable-next-line
import { schoolApi, API_URL } from '../services/api';
 // eslint-disable-next-line
import { Building2, Mail, Lock, User, Globe, MapPin, Phone } from 'lucide-react';
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
    requesterName: '',
    requesterEmail: '',
    requesterPhone: '',
    proposedAdminEmail: '',
    proposedAdminFirstName: '',
    proposedAdminLastName: '',
    message: ''
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

    if (!formData.requesterName.trim()) {
      setError('Your name is required');
      return false;
    }

    if (!formData.requesterEmail.trim()) {
      setError('Your email is required');
      return false;
    }

    if (!formData.proposedAdminEmail.trim()) {
      setError('Proposed admin email is required');
      return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.requesterEmail)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!emailRegex.test(formData.proposedAdminEmail)) {
      setError('Please enter a valid proposed admin email address');
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

      const requestData = {
        schoolName: formData.name,
        stateId: formData.stateId,
        requesterName: formData.requesterName,
        requesterEmail: formData.requesterEmail,
        requesterPhone: formData.requesterPhone,
        schoolAddress: formData.address,
        schoolCity: formData.city,
        schoolType: formData.type,
        proposedAdminEmail: formData.proposedAdminEmail,
        proposedAdminFirstName: formData.proposedAdminFirstName,
        proposedAdminLastName: formData.proposedAdminLastName,
        message: formData.message
      };

      const response = await fetch(`${API_URL}/schools/request-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration request failed');
      }

      setRegistrationData(data);
      setSuccess(true);
    } catch (err) {
      setError(err.error || err.message || 'Failed to register school');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

// eslint-disable-next-line
  const handleNavigateToDashboard = () => {
    navigate('/teacher/dashboard');
  };

  // Success message screen
  if (success && registrationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Request Submitted!</h1>
            <p className="text-gray-600">Your school registration is pending approval</p>
          </div>

          {/* Request Information */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Details</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <Building2 className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">School Name</p>
                  <p className="text-lg font-medium text-gray-900">{registrationData.request.schoolName}</p>
                </div>
              </div>
              {selectedState && (
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">State</p>
                    <p className="text-lg font-medium text-gray-900">{registrationData.request.state}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start">
                <Building2 className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Request ID</p>
                  <p className="text-sm font-mono text-gray-900 break-all">{registrationData.request.id}</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">Submitted At</p>
                  <p className="text-lg font-medium text-gray-900">{new Date(registrationData.request.submittedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requester Information */}
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <User className="w-5 h-5 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-lg font-medium text-gray-900">{registrationData.requester.name}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-medium text-gray-900">{registrationData.requester.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Proposed Admin Information */}
          <div className="bg-green-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Proposed Admin Account</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <User className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Admin Email</p>
                  <p className="text-lg font-medium text-gray-900">{registrationData.proposedAdmin.email}</p>
                </div>
              </div>
              {registrationData.proposedAdmin.firstName && (
                <div className="flex items-start">
                  <User className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Admin Name</p>
                    <p className="text-lg font-medium text-gray-900">
                      {registrationData.proposedAdmin.firstName} {registrationData.proposedAdmin.lastName}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/register')}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Submit Another Request
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex-1 bg-gray-200 text-gray-900 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Go to Login
            </button>
          </div>

          {/* Info Message */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Next Steps:</strong> Our team will review your registration request within 2-3 business days. 
              You'll receive an email at {registrationData.requester.email} once a decision has been made. 
              If approved, the proposed admin account will be created and login credentials will be provided.
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request School Registration</h1>
          <p className="text-gray-600">Submit your school for admin review and approval</p>
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

          {/* Requester Information */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Your Information
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="requesterName" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="requesterName"
                      name="requesterName"
                      value={formData.requesterName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your full name"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="requesterEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      id="requesterEmail"
                      name="requesterEmail"
                      value={formData.requesterEmail}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your email address"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="requesterPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Phone <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    id="requesterPhone"
                    name="requesterPhone"
                    value={formData.requesterPhone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your phone number"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Proposed Admin Information */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Proposed School Admin
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="proposedAdminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="proposedAdminEmail"
                    name="proposedAdminEmail"
                    value={formData.proposedAdminEmail}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="admin@school.edu"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="proposedAdminFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin First Name <span className="text-gray-500 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="proposedAdminFirstName"
                    name="proposedAdminFirstName"
                    value={formData.proposedAdminFirstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="John"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="proposedAdminLastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Last Name <span className="text-gray-500 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="proposedAdminLastName"
                    name="proposedAdminLastName"
                    value={formData.proposedAdminLastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Doe"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Message <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional information about the school or your request..."
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting Request...' : 'Submit Registration Request'}
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
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Info:</strong> This submits a registration request for review. Once approved, an admin account will be created for your school and you'll receive login credentials.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistration;
