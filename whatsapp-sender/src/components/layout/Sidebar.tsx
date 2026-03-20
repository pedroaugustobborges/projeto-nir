import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  Send,
  Users,
  History,
  MessageCircle,
  LogOut,
  Sun,
  Moon,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const navigation = [
  {
    name: 'Cadastro de Templates',
    href: '/templates',
    icon: FileText,
  },
  {
    name: 'Disparo Individual',
    href: '/individual',
    icon: Send,
  },
  {
    name: 'Disparo em Massa',
    href: '/bulk',
    icon: Users,
  },
  {
    name: 'Histórico',
    href: '/history',
    icon: History,
  },
];

const adminNavigation = [
  {
    name: 'Usuários',
    href: '/users',
    icon: UserCog,
  },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-300">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-gradient-to-br from-whatsapp-light to-whatsapp-dark rounded-lg flex items-center justify-center shadow-lg">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white">WhatsApp</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Disparo</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="mb-2">
          <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Menu
          </p>
        </div>
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200 ${
                isActive
                  ? 'bg-whatsapp-light/10 dark:bg-whatsapp-light/20 text-whatsapp-dark dark:text-whatsapp-light font-medium'
                  : ''
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <div className="mt-6 mb-2">
              <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Administração
              </p>
            </div>
            {adminNavigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all duration-200 ${
                    isActive
                      ? 'bg-whatsapp-light/10 dark:bg-whatsapp-light/20 text-whatsapp-dark dark:text-whatsapp-light font-medium'
                      : ''
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? (
            <>
              <Sun className="w-5 h-5" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              <span>Modo Escuro</span>
            </>
          )}
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-9 h-9 bg-gradient-to-br from-whatsapp-light/20 to-whatsapp-dark/20 dark:from-whatsapp-light/30 dark:to-whatsapp-dark/30 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-whatsapp-dark dark:text-whatsapp-light">
              {user ? getInitials(user.name) : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
