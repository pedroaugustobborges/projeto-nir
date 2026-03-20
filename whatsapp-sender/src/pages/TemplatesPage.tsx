import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { Template, TemplateFormData } from '../types';
import { templateService } from '../services/templateService';
import { Button, Modal, Table } from '../components/ui';
import TemplateForm from '../components/templates/TemplateForm';
import Layout from '../components/layout/Layout';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

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
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={templates}
          keyExtractor={(template) => template.id as string}
          loading={loading}
          emptyMessage="Nenhum template cadastrado. Clique em 'Novo Template' para começar."
        />
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
