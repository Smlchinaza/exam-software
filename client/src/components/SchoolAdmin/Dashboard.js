// School Admin Dashboard Component
// Main dashboard for school administrators with statistics and activity monitoring

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
    Users, 
    GraduationCap, 
    FileText, 
    CheckCircle, 
    Clock, 
    TrendingUp,
    AlertCircle,
    Download,
    Eye
} from 'lucide-react';
import { useSchoolSubdomain } from '../../hooks/useSchoolSubdomain';
import { toast } from 'react-hot-toast';

const SchoolAdminDashboard = () => {
    const [stats, setStats] = useState({});
    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingRegistrations, setPendingRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { schoolInfo } = useSchoolSubdomain();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('schoolAdminToken');
            
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const [statsResponse, activityResponse, registrationsResponse] = await Promise.all([
                fetch('/api/school-admin/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/school-admin/dashboard/activity?limit=10', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/school-admin/teacher-registrations/pending', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!statsResponse.ok || !activityResponse.ok || !registrationsResponse.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const statsData = await statsResponse.json();
            const activityData = await activityResponse.json();
            const registrationsData = await registrationsResponse.json();

            setStats(statsData.data);
            setRecentActivity(activityData.data);
            setPendingRegistrations(registrationsData.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (activityType) => {
        const iconMap = {
            'exam_created': <FileText className="h-4 w-4" />,
            'exam_submitted': <CheckCircle className="h-4 w-4" />,
            'teacher_registered': <Users className="h-4 w-4" />,
            'teacher_approved': <CheckCircle className="h-4 w-4" />,
            'teacher_rejected': <AlertCircle className="h-4 w-4" />,
            'teacher_joined': <GraduationCap className="h-4 w-4" />,
            'student_joined': <Users className="h-4 w-4" />
        };
        return iconMap[activityType] || <Clock className="h-4 w-4" />;
    };

    const getActivityColor = (activityType) => {
        const colorMap = {
            'exam_created': 'bg-blue-100 text-blue-800',
            'exam_submitted': 'bg-green-100 text-green-800',
            'teacher_registered': 'bg-yellow-100 text-yellow-800',
            'teacher_approved': 'bg-green-100 text-green-800',
            'teacher_rejected': 'bg-red-100 text-red-800',
            'teacher_joined': 'bg-purple-100 text-purple-800',
            'student_joined': 'bg-indigo-100 text-indigo-800'
        };
        return colorMap[activityType] || 'bg-gray-100 text-gray-800';
    };

    const formatNumber = (num) => {
        return num ? num.toLocaleString() : '0';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">School Admin Dashboard</h1>
                    <p className="text-gray-600 mt-1">Manage your school's teachers, students, and exams</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-sm">
                        {schoolInfo?.name}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchDashboardData}>
                        <Eye className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                            <GraduationCap className="h-4 w-4 mr-2" />
                            Total Teachers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(stats.total_teachers)}
                        </div>
                        {stats.new_teachers_month > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                                +{stats.new_teachers_month} this month
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Total Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(stats.total_students)}
                        </div>
                        {stats.new_students_month > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                                +{stats.new_students_month} this month
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Total Exams
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(stats.total_exams)}
                        </div>
                        {stats.published_exams > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                                {stats.published_exams} published
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Pending Registrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {formatNumber(stats.pending_registrations)}
                        </div>
                        {stats.registrations_week > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                                +{stats.registrations_week} this week
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Pending Teacher Registrations */}
            {pendingRegistrations.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Pending Teacher Registrations</CardTitle>
                        <Button variant="outline" size="sm">
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pendingRegistrations.slice(0, 3).map((registration) => (
                                <TeacherRegistrationCard
                                    key={registration.id}
                                    registration={registration}
                                    onApprove={handleApproveRegistration}
                                    onReject={handleRejectRegistration}
                                    onUpdate={fetchDashboardData}
                                />
                            ))}
                            {pendingRegistrations.length > 3 && (
                                <div className="text-center pt-2">
                                    <Button variant="outline" size="sm">
                                        View {pendingRegistrations.length - 3} more pending registrations
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Activity */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                    <div className="flex items-center space-x-3">
                                        <Badge className={getActivityColor(activity.activity_type)}>
                                            {getActivityIcon(activity.activity_type)}
                                        </Badge>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {activity.description}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                by {activity.actor_name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">
                                            {formatDate(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p>No recent activity</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Exam Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-gray-900">
                                {formatNumber(stats.total_submissions)}
                            </div>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.submissions_week} this week
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Registration Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-green-600">Approved:</span>
                                <span className="font-medium">{stats.approved_registrations || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-red-600">Rejected:</span>
                                <span className="font-medium">{stats.rejected_registrations || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-orange-600">Pending:</span>
                                <span className="font-medium">{stats.pending_registrations || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">System Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-900">All systems operational</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Last checked: {formatDate(new Date())}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// Teacher Registration Card Component
const TeacherRegistrationCard = ({ registration, onApprove, onReject, onUpdate }) => {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        const success = await onApprove(registration.id);
        if (success) {
            onUpdate();
        }
        setLoading(false);
    };

    const handleReject = async () => {
        const reason = prompt('Please provide rejection reason:');
        if (reason) {
            setLoading(true);
            const success = await onReject(registration.id, reason);
            if (success) {
                onUpdate();
            }
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">
                            {registration.first_name} {registration.last_name}
                        </h3>
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        <p>Email: {registration.email}</p>
                        {registration.phone && <p>Phone: {registration.phone}</p>}
                        <p className="text-xs text-gray-500">
                            Registered: {formatDate(registration.created_at)}
                        </p>
                    </div>
                </div>
                <div className="flex space-x-2 ml-4">
                    <Button
                        onClick={handleApprove}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Approve
                    </Button>
                    <Button
                        onClick={handleReject}
                        disabled={loading}
                        size="sm"
                        variant="destructive"
                    >
                        Reject
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Helper functions for the main component
const handleApproveRegistration = async (registrationId) => {
    try {
        const token = localStorage.getItem('schoolAdminToken');
        const response = await fetch(`/api/school-admin/teacher-registrations/${registrationId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to approve registration');
        }

        toast.success('Teacher registration approved successfully');
        return true;
    } catch (error) {
        console.error('Error approving registration:', error);
        toast.error('Failed to approve registration');
        return false;
    }
};

const handleRejectRegistration = async (registrationId, reason) => {
    try {
        const token = localStorage.getItem('schoolAdminToken');
        const response = await fetch(`/api/school-admin/teacher-registrations/${registrationId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason: reason })
        });

        if (!response.ok) {
            throw new Error('Failed to reject registration');
        }

        toast.success('Teacher registration rejected');
        return true;
    } catch (error) {
        console.error('Error rejecting registration:', error);
        toast.error('Failed to reject registration');
        return false;
    }
};

export default SchoolAdminDashboard;
