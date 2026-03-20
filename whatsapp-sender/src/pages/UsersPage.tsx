import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { User, userService, CreateUserData, UpdateUserData } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type ModalMode = 'create' | 'edit' | 'delete' | null;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { user: currentUser } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'admin' | 'user',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await userService.getAll();
    setUsers(data);
    setIsLoading(false);
  };

  const openCreateModal = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
      role: 'user',
    });
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
    setFormData({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
      role: 'user',
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }

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
      if (formData.password.length < 6) {
        errors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Senhas não conferem';
      }
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
        };
        await userService.create(createData);
        toast.success('Usuário criado com sucesso!');
      } else if (modalMode === 'edit' && selectedUser) {
        const updateData: UpdateUserData = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
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
    } catch (error) {
      toast.error('Erro ao excluir usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active });
      toast.success(
        user.is_active ? 'Usuário desativado' : 'Usuário ativado'
      );
      loadUsers();
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Usuários
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gerencie os usuários do sistema
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-5 h-5" />
            Novo Usuário
          </button>
        </div>

        {/* Users Table */}
        <div className="card dark:bg-gray-800 dark:border-gray-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-whatsapp-light"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhum usuário cadastrado
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Usuário
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Perfil
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Criado em
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              user.role === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-900/30'
                                : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                          >
                            {user.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          disabled={user.id === currentUser?.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            user.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                          } ${
                            user.id === currentUser?.id
                              ? 'cursor-not-allowed opacity-50'
                              : 'cursor-pointer'
                          }`}
                        >
                          {user.is_active ? (
                            <>
                              <Check className="w-3 h-3" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <Ban className="w-3 h-3" />
                              Inativo
                            </>
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
      </div>

      {/* Create/Edit Modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    formErrors.name ? 'input-error' : ''
                  }`}
                  placeholder="Nome completo"
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="label dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    formErrors.email ? 'input-error' : ''
                  }`}
                  placeholder="email@exemplo.com"
                />
                {formErrors.email && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="label dark:text-gray-300">
                  {modalMode === 'create'
                    ? 'Senha'
                    : 'Nova Senha (deixe em branco para manter)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={`input pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.password ? 'input-error' : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              {(modalMode === 'create' || formData.password) && (
                <div>
                  <label className="label dark:text-gray-300">
                    Confirmar Senha
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      formErrors.confirmPassword ? 'input-error' : ''
                    }`}
                    placeholder="••••••••"
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Role */}
              <div>
                <label className="label dark:text-gray-300">Perfil</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'admin' | 'user',
                    })
                  }
                  className="input dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary flex-1 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex-1"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Excluir Usuário
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir o usuário{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedUser.name}
                </span>
                ? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="btn-secondary flex-1 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="btn-danger flex-1"
                >
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
