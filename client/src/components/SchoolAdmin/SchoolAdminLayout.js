// School Admin Layout Component
// Main layout wrapper for school admin dashboard with navigation and sidebar

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
    LayoutDashboard, 
    Users, 
    GraduationCap, 
    FileText, 
    Settings, 
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    UserCircle,
    School,
    TrendingUp,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { useSchoolSubdomain } from '../../hooks/useSchoolSubdomain';
import { toast } from 'react-hot-toast';

const SchoolAdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [adminProfile, setAdminProfile] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { schoolInfo } = useSchoolSubdomain();

    useEffect(() => {
        fetchAdminProfile();
        fetchPendingCount();
    }, []);

    const fetchAdminProfile = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch('/api/school-admin/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAdminProfile(data.data.admin);
            } else {
                localStorage.removeItem('schoolAdminToken');
                navigate('/login');
            }
        } catch (error) {
            console.error('Error fetching admin profile:', error);
            localStorage.removeItem('schoolAdminToken');
            navigate('/login');
        }
    };

    const fetchPendingCount = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            if (!token) return;

            const response = await fetch('/api/school-admin/teacher-registrations/stats/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setPendingCount(data.data.pending_count || 0);
            }
        } catch (error) {
            console.error('Error fetching pending count:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('schoolAdminToken');
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const navigation = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
            current: location.pathname === '/dashboard'
        },
        {
            name: 'Teacher Registrations',
            href: '/teacher-registrations',
            icon: Users,
            current: location.pathname === '/teacher-registrations',
            badge: pendingCount > 0 ? pendingCount : null
        },
        {
            name: 'Teachers',
            href: '/teachers',
            icon: GraduationCap,
            current: location.pathname === '/teachers'
        },
        {
            name: 'Students',
            href: '/students',
            icon: Users,
            current: location.pathname === '/students'
        },
        {
            name: 'Exams',
            href: '/exams',
            icon: FileText,
            current: location.pathname === '/exams'
        },
        {
            name: 'Analytics',
            href: '/analytics',
            icon: TrendingUp,
            current: location.pathname === '/analytics'
        },
        {
            name: 'Settings',
            href: '/settings',
            icon: Settings,
            current: location.pathname === '/settings'
        }
    ];

    const notifications = [
        {
            id: 1,
            type: 'warning',
            title: 'Pending Teacher Registrations',
            message: `${pendingCount} teacher registration(s) awaiting approval`,
            time: '2 hours ago',
            icon: AlertTriangle,
            action: '/teacher-registrations'
        },
        {
            id: 2,
            type: 'success',
            title: 'System Update',
            message: 'New features have been added to the dashboard',
            time: '1 day ago',
            icon: CheckCircle,
            action: null
        }
    ];

    const getNotificationColor = (type) => {
        switch (type) {
            case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'success': return 'bg-green-50 border-green-200 text-green-800';
            case 'error': return 'bg-red-50 border-red-200 text-red-800';
            default: return 'bg-gray-50 border-gray-200 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 lg:hidden bg-gray-600 bg-opacity-75"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:inset-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo and School Info */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <School className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
                                {schoolInfo && (
                                    <p className="text-xs text-gray-600">{schoolInfo.name}</p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`
                                    flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors
                                    ${item.current 
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                `}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <div className="flex items-center space-x-3">
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.name}</span>
                                </div>
                                {item.badge && (
                                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                                        {item.badge}
                                    </Badge>
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* Admin Profile */}
                    <div className="p-4 border-t">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <UserCircle className="h-6 w-6 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {adminProfile?.first_name} {adminProfile?.last_name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {adminProfile?.email}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="w-full"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Top Navigation */}
                <header className="bg-white shadow-sm border-b">
                    <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="lg:hidden"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            
                            {/* Search Bar */}
                            <div className="hidden md:flex items-center space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSearchOpen(!searchOpen)}
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                                {searchOpen && (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            className="w-64 pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Notifications */}
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                                    className="relative"
                                >
                                    <Bell className="h-5 w-5" />
                                    {pendingCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                            {pendingCount}
                                        </span>
                                    )}
                                </Button>

                                {/* Notifications Dropdown */}
                                {notificationsOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                                        <div className="p-4 border-b">
                                            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={`p-4 border-b last:border-b-0 ${getNotificationColor(notification.type)}`}
                                                    >
                                                        <div className="flex items-start space-x-3">
                                                            <notification.icon className="h-5 w-5 mt-0.5" />
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium">{notification.title}</p>
                                                                <p className="text-xs mt-1 opacity-80">{notification.message}</p>
                                                                <p className="text-xs mt-2 opacity-60">{notification.time}</p>
                                                                {notification.action && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="mt-2 text-xs"
                                                                        onClick={() => navigate(notification.action)}
                                                                    >
                                                                        View Details
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-gray-500">
                                                    <p className="text-sm">No notifications</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className="flex items-center space-x-3">
                                <div className="hidden sm:block text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {adminProfile?.first_name} {adminProfile?.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">School Administrator</p>
                                </div>
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <UserCircle className="h-5 w-5 text-gray-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default SchoolAdminLayout;
