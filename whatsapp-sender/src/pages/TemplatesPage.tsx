import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Image,
  Building2,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Template, TemplateFormData, HOSPITALS } from '../types';
import { templateService } from '../services/templateService';
import { Button, Modal, Table, Select } from '../components/ui';
import TemplateForm from '../components/templates/TemplateForm';
import Layout from '../components/layout/Layout';

const ITEMS_PER_PAGE_OPTIONS = [10, 50, 100];

// Helper function to get hospital name from ID
const getHospitalName = (hospitalId?: string | null): string | null => {
  if (!hospitalId) return null;
  const hospital = HOSPITALS.find(h => h.id === hospitalId);
  return hospital?.name || null;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedHospital, searchTerm, itemsPerPage]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await templateService.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadTemplates();
    toast.success('Templates atualizados!');
  };

  // Filter options
  const hospitalOptions = [
    { value: '', label: 'Todos' },
    ...HOSPITALS.map((h) => ({ value: h.id, label: h.name })),
  ];

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Hospital filter
      if (selectedHospital && template.hospital_id !== selectedHospital) {
        return false;
      }

      // Search filter (by name)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!template.name.toLowerCase().includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [templates, selectedHospital, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Paginated data
  const paginatedTemplates = useMemo(() => {
    return filteredTemplates.slice(startIndex, endIndex);
  }, [filteredTemplates, startIndex, endIndex]);

  // Page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await templateService.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template excluído com sucesso');
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast.error('Erro ao excluir template');
    }
  };

  const handleSubmit = async (data: TemplateFormData) => {
    try {
      setSaving(true);

      if (selectedTemplate) {
        const updated = await templateService.update(selectedTemplate.id, data);
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplate.id ? updated : t))
        );
        toast.success('Template atualizado com sucesso');
      } else {
        const created = await templateService.create(data);
        setTemplates((prev) => [created, ...prev]);
        toast.success('Template criado com sucesso');
      }

      setIsModalOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const getParameterCount = (template: Template): number => {
    let count = 0;
    if (template.parameter_1) count++;
    if (template.parameter_2) count++;
    if (template.parameter_3) count++;
    if (template.parameter_4) count++;
    if (template.parameter_5) count++;
    if (template.parameter_6) count++;
    return count;
  };

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (template: Template) => (
        <div className="flex items-center gap-3">
          {template.image_url ? (
            <img
              src={template.image_url}
              alt={template.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Image className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <span className="font-medium text-gray-900 dark:text-white">{template.name}</span>
        </div>
      ),
    },
    {
      key: 'hospital',
      header: 'Hospital',
      render: (template: Template) => {
        const hospitalName = getHospitalName(template.hospital_id);
        return hospitalName ? (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {hospitalName}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">
            Não configurado
          </span>
        );
      },
    },
    {
      key: 'parameters',
      header: 'Parâmetros',
      render: (template: Template) => {
        const count = getParameterCount(template);
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-whatsapp-light/10 text-whatsapp-dark dark:text-whatsapp-light">
            {count} {count === 1 ? 'parâmetro' : 'parâmetros'}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Criado em',
      render: (template: Template) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(template.created_at).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (template: Template) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(template)}
            className="p-2 text-gray-400 hover:text-whatsapp-dark dark:hover:text-whatsapp-light hover:bg-whatsapp-light/10 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteConfirm(template.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Cadastro de Templates
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gerencie seus templates de mensagens para WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4" />
              Novo Template
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {templates.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Filtrados</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {filteredTemplates.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Com Hospital</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {templates.filter((t) => t.hospital_id).length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Sem Hospital</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {templates.filter((t) => !t.hospital_id).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Filtros
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Hospital"
              options={hospitalOptions}
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Buscar por Nome
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Digite para buscar..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-whatsapp-light"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={paginatedTemplates}
          keyExtractor={(template) => template.id as string}
          loading={loading}
          emptyMessage="Nenhum template encontrado com os filtros aplicados."
        />

        {/* Pagination */}
        {!loading && filteredTemplates.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Itens por página:
                </span>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
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

              {/* Page info */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {startIndex + 1}
                </span>{' '}
                a{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.min(endIndex, filteredTemplates.length)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {filteredTemplates.length}
                </span>{' '}
                templates
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                {/* First page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 mx-1">
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 py-1 text-gray-400 dark:text-gray-500"
                      >
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

                {/* Next page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTemplate(null);
        }}
        title={selectedTemplate ? 'Editar Template' : 'Novo Template'}
        size="lg"
      >
        <TemplateForm
          template={selectedTemplate}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setSelectedTemplate(null);
          }}
          loading={saving}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir este template? Esta ação não pode ser
            desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
