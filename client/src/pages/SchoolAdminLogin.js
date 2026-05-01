// School Admin Login Page
// Login page for school administrators with subdomain-based authentication

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { School, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useSchoolSubdomain } from '../hooks/useSchoolSubdomain';
import { toast } from 'react-hot-toast';

const SchoolAdminLogin = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { schoolInfo, loading: subdomainLoading } = useSchoolSubdomain();

    useEffect(() => {
        // Check if already logged in
        const token = localStorage.getItem('schoolAdminToken');
        if (token) {
            navigate('/dashboard');
        }

        // Check for subdomain errors
        const subdomainError = searchParams.get('error');
        if (subdomainError === 'no_subdomain') {
            setError('Please access your school admin panel through your school subdomain');
        } else if (subdomainError === 'school_not_found') {
            setError('School not found. Please check your subdomain and try again');
        }
    }, [navigate, searchParams]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/school-admin/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store token
                localStorage.setItem('schoolAdminToken', data.data.token);
                
                // Store admin info for quick access
                localStorage.setItem('schoolAdminInfo', JSON.stringify(data.data.admin));
                
                toast.success(`Welcome back, ${data.data.admin.first_name}!`);
                navigate('/dashboard');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    if (subdomainLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading school information...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Logo and School Info */}
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <School className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">School Admin</h1>
                            <p className="text-sm text-gray-600">Management Portal</p>
                        </div>
                    </div>
                    
                    {schoolInfo ? (
                        <div className="bg-white rounded-lg p-4 shadow-sm border">
                            <p className="text-sm font-medium text-gray-900">{schoolInfo.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Accessing via: {schoolInfo.subdomain}.examplatform.com
                            </p>
                        </div>
                    ) : (
                        <Alert className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Please access this page through your school's subdomain
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Login Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center text-xl">Sign In</CardTitle>
                        <p className="text-center text-sm text-gray-600">
                            Enter your credentials to access your school admin dashboard
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Alert */}
                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        placeholder="admin@school.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="pl-10"
                                        disabled={isLoading || !schoolInfo}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="pl-10 pr-10"
                                        disabled={isLoading || !schoolInfo}
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePasswordVisibility}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <button
                                        type="button"
                                        onClick={() => {/* TODO: Implement forgot password */}}
                                        className="font-medium text-blue-600 hover:text-blue-500"
                                    >
                                        Forgot your password?
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || !schoolInfo}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        {/* Help Links */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Need help?{' '}
                                <button
                                    onClick={() => {/* TODO: Implement help */}}
                                    className="font-medium text-blue-600 hover:text-blue-500"
                                >
                                    Contact Support
                                </button>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500">
                        © 2024 Exam Platform. All rights reserved.
                    </p>
                    <div className="mt-2 space-x-4">
                        <button className="text-xs text-gray-500 hover:text-gray-700">
                            Privacy Policy
                        </button>
                        <button className="text-xs text-gray-500 hover:text-gray-700">
                            Terms of Service
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchoolAdminLogin;
