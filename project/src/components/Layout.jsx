import React from 'react';
import logo from '../assets/Logo Nurkamal final.jpg';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HelpCircle, 
  Home, 
  Ticket, 
  Users, 
  Settings, 
  LogOut,
  Plus,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: location.pathname === '/dashboard' },
    { name: 'Tickets', href: '/tickets', icon: Ticket, current: location.pathname.startsWith('/tickets') },
  ];

  if (user?.role === 'admin') {
    navigation.push(
      { name: 'Users', href: '/users', icon: Users, current: location.pathname === '/users' }
    );
  }

  if (user?.role === 'ruser' || user?.role === 'leader') {
    navigation.push(
      { name: 'Create Ticket', href: '/create-ticket', icon: Plus, current: location.pathname === '/create-ticket' }
    );
  }

  // Add Change Password tab for all users
  navigation.push(
    { name: 'Change Password', href: '/change-password', icon: Settings, current: location.pathname === '/change-password' }
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <img src={logo} alt="Helpdesk Logo" className="h-20 w-auto rounded" />
            <span className="text-xl font-bold text-gray-900">HelpDesk</span>
          </div>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-blue-100 h-8 w-8 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-medium text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role === 'ruser' ? 'Regular User' : user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64 flex-1 flex flex-col">
        <main className="py-8 px-8 flex-1">
          {children}
        </main>
        
        {/* Contact Information Footer */}
        <footer className="bg-white border-t border-gray-200 px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Company Info */}
              <div className="flex items-center space-x-3">
                <img src={logo} alt="Helpdesk Logo" className="h-24 w-auto rounded" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Nurkamal HelpDesk</h3>
                  <p className="text-sm text-gray-600">Professional IT Support Solutions</p>
                </div>
              </div>
              
              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">helpdesk@nurkamal.com</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">04-736 4966</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-600">260E, Jln Datuk Kumbar, Kampung Alor Menong, 05300 Alor Setar, Kedah</span>
                  </div>
                </div>
              </div>
              
              {/* Support Hours */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Support Hours</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Saturday - Thursday: 9:00 AM - 5:00 PM</p>
                  <p className="text-sm text-gray-600">Friday: Closed</p>
                </div>
              </div>
            </div>
            
            {/* Bottom Bar */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <p className="text-sm text-gray-500">
                  © 2025 Nurkamal HelpDesk. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;