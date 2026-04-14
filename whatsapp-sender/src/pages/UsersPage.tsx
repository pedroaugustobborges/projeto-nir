import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
  Shield,
  User as UserIcon,
  Check,
  Ban,
  Building2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { User, UserRole, userService, CreateUserData, UpdateUserData } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { HOSPITALS } from '@/types';
import toast from 'react-hot-toast';

type ModalMode = 'create' | 'edit' | 'delete' | null;

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador Corporativo',
  unit_admin: 'Admin de Unidade',
  user: 'Usuário',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { user: currentUser, isAdmin, isUnitAdmin, userHospitals } = useAuth();

  const assignableHospitals = isAdmin
    ? HOSPITALS
    : HOSPITALS.filter(h => userHospitals.includes(h.id));

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'user' as UserRole,
    hospitals: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  // Reset to first page when search or page-size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await userService.getAll();

    const filtered = isUnitAdmin
      ? data.filter(
          u =>
            u.role !== 'admin' &&
            u.hospitals?.some(h => userHospitals.includes(h))
        )
      : data;

    setUsers(filtered);
    setIsLoading(false);
  };

  // --- filtered & paginated data ---
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(startIndex, endIndex),
    [filteredUsers, startIndex, endIndex]
  );

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  // --- modal helpers ---
  const openCreateModal = () => {
    setFormData({ email: '', name: '', password: '', confirmPassword: '', role: 'user', hospitals: [] });
    setFormErrors({});
    setShowPassword(false);
    setModalMode('create');
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      confirmPassword: '',
      role: user.role,
      hospitals: user.hospitals || [],
    });
    setFormErrors({});
    setShowPassword(false);
    setModalMode('edit');
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setModalMode('delete');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData({ email: '', name: '', password: '', confirmPassword: '', role: 'user', hospitals: [] });
    setFormErrors({});
  };

  const toggleHospital = (hospitalId: string) => {
    setFormData(prev => ({
      ...prev,
      hospitals: prev.hospitals.includes(hospitalId)
        ? prev.hospitals.filter(h => h !== hospitalId)
        : [...prev.hospitals, hospitalId],
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (modalMode === 'create') {
      if (!formData.password) {
        errors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 6) {
        errors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Senhas não conferem';
      }
    } else if (modalMode === 'edit' && formData.password) {
      if (formData.password.length < 6) errors.password = 'Senha deve ter pelo menos 6 caracteres';
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Senhas não conferem';
    }

    if (formData.role !== 'admin' && formData.hospitals.length === 0) {
      errors.hospitals = 'Selecione pelo menos um hospital';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        const createData: CreateUserData = {
          email: formData.email,
          name: formData.name,
          password: formData.password,
          role: formData.role,
          hospitals: formData.role === 'admin' ? [] : formData.hospitals,
        };
        await userService.create(createData);
        toast.success('Usuário criado com sucesso!');
      } else if (modalMode === 'edit' && selectedUser) {
        const updateData: UpdateUserData = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          hospitals: formData.role === 'admin' ? [] : formData.hospitals,
        };
        if (formData.password) updateData.password = formData.password;
        await userService.update(selectedUser.id, updateData);
        toast.success('Usuário atualizado com sucesso!');
      }
      closeModal();
      loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await userService.delete(selectedUser.id);
      toast.success('Usuário excluído com sucesso!');
      closeModal();
      loadUsers();
    } catch {
      toast.error('Erro ao excluir usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Usuário desativado' : 'Usuário ativado');
      loadUsers();
    } catch {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const availableRoles: UserRole[] = isAdmin
    ? ['admin', 'unit_admin', 'user']
    : ['unit_admin', 'user'];

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'unit_admin': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'unit_admin': return <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      default: return <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getRoleAvatarClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 dark:bg-purple-900/30';
      case 'unit_admin': return 'bg-amber-100 dark:bg-amber-900/30';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isUnitAdmin
                ? 'Gerencie os usuários dos seus hospitais'
                : 'Gerencie os usuários do sistema'}
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-5 h-5" />
            Novo Usuário
          </button>
        </div>

        {/* Search bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-whatsapp-light focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
              {filteredUsers.length === 0
                ? 'Nenhum usuário encontrado'
                : `${filteredUsers.length} usuário${filteredUsers.length !== 1 ? 's' : ''} encontrado${filteredUsers.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {/* Users Table */}
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-light"></div>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Nenhum resultado para "{searchQuery}"
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Tente buscar por outro nome ou email
                  </p>
                </>
              ) : (
                <>
                  <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhum usuário cadastrado
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Usuário</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Perfil</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Hospitais</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Criado em</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleAvatarClass(user.role)}`}>
                            {getRoleIcon(user.role)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {searchQuery
                                ? highlightMatch(user.name, searchQuery)
                                : user.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {searchQuery
                                ? highlightMatch(user.email, searchQuery)
                                : user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {user.role === 'admin' ? (
                          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">Todos</span>
                        ) : user.hospitals && user.hospitals.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.hospitals.map((hospitalId) => {
                              const hospital = HOSPITALS.find(h => h.id === hospitalId);
                              return hospital ? (
                                <span
                                  key={hospitalId}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                >
                                  {hospital.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">Nenhum</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          disabled={user.id === currentUser?.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            user.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                          } ${user.id === currentUser?.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          {user.is_active ? (
                            <><Check className="w-3 h-3" />Ativo</>
                          ) : (
                            <><Ban className="w-3 h-3" />Inativo</>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filteredUsers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Itens por página:</span>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <button
                      key={option}
                      onClick={() => setItemsPerPage(option)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        itemsPerPage === option
                          ? 'bg-whatsapp-light text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range info */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando{' '}
                <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span>
                {' '}a{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.min(endIndex, filteredUsers.length)}
                </span>
                {' '}de{' '}
                <span className="font-medium text-gray-900 dark:text-white">{filteredUsers.length}</span>
                {' '}usuário{filteredUsers.length !== 1 ? 's' : ''}
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 mx-1">
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400 dark:text-gray-500">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-whatsapp-light text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="label dark:text-gray-300">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${formErrors.name ? 'input-error' : ''}`}
                  placeholder="Nome completo"
                />
                {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="label dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${formErrors.email ? 'input-error' : ''}`}
                  placeholder="email@exemplo.com"
                />
                {formErrors.email && <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="label dark:text-gray-300">
                  {modalMode === 'create' ? 'Senha' : 'Nova Senha (deixe em branco para manter)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={`input pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${formErrors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              {(modalMode === 'create' || formData.password) && (
                <div>
                  <label className="label dark:text-gray-300">Confirmar Senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${formErrors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="••••••••"
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Role */}
              <div>
                <label className="label dark:text-gray-300">Perfil</label>
                <select
                  value={formData.role}
                  onChange={e => {
                    const newRole = e.target.value as UserRole;
                    setFormData({
                      ...formData,
                      role: newRole,
                      hospitals: newRole === 'admin' ? [] : formData.hospitals,
                    });
                  }}
                  className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>

              {/* Hospitals */}
              {formData.role !== 'admin' && (
                <div>
                  <label className="label dark:text-gray-300">
                    Hospitais
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      (selecione os hospitais que o usuário pode acessar)
                    </span>
                  </label>
                  <div className="space-y-2 mt-2">
                    {assignableHospitals.map(hospital => (
                      <label
                        key={hospital.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          formData.hospitals.includes(hospital.id)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.hospitals.includes(hospital.id)}
                          onChange={() => toggleHospital(hospital.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <Building2 className={`w-4 h-4 ${formData.hospitals.includes(hospital.id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        <span className={`font-medium ${formData.hospitals.includes(hospital.id) ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {hospital.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  {formErrors.hospitals && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.hospitals}</p>
                  )}
                </div>
              )}

              {formData.role === 'admin' && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    Administradores Corporativos têm acesso a todos os hospitais e funcionalidades do sistema
                  </span>
                </div>
              )}

              {formData.role === 'unit_admin' && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    Admins de Unidade podem gerenciar usuários dos hospitais aos quais estão vinculados
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary flex-1 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="btn-primary flex-1">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modalMode === 'delete' && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Excluir Usuário</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir o usuário{' '}
                <span className="font-medium text-gray-900 dark:text-white">{selectedUser.name}</span>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="btn-secondary flex-1 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button onClick={handleDelete} disabled={isSaving} className="btn-danger flex-1">
                  {isSaving ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Highlight matching text in search results
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/60 text-gray-900 dark:text-white rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
