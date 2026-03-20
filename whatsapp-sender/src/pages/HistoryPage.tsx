import { useState, useEffect } from 'react';
import { RefreshCw, User, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { SendingHistory, SendingStatus, SendingType } from '../types';
import { historyService } from '../services/historyService';
import { Button, Table } from '../components/ui';
import Layout from '../components/layout/Layout';

export default function HistoryPage() {
  const [history, setHistory] = useState<SendingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | SendingType>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await historyService.getAll();
      setHistory(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: SendingStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: SendingStatus) => {
    switch (status) {
      case 'success':
        return 'Sucesso';
      case 'failed':
        return 'Falhou';
      case 'pending':
        return 'Pendente';
    }
  };

  const getStatusClass = (status: SendingStatus) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const filteredHistory = history.filter(
    (item) => filter === 'all' || item.sending_type === filter
  );

  const columns = [
    {
      key: 'type',
      header: 'Tipo',
      render: (item: SendingHistory) => (
        <div className="flex items-center gap-2">
          {item.sending_type === 'individual' ? (
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {item.sending_type === 'individual' ? 'Individual' : 'Em Massa'}
          </span>
        </div>
      ),
    },
    {
      key: 'template_name',
      header: 'Template',
      render: (item: SendingHistory) => (
        <span className="font-medium text-gray-900 dark:text-white">{item.template_name}</span>
      ),
    },
    {
      key: 'details',
      header: 'Detalhes',
      render: (item: SendingHistory) => (
        <div className="text-sm">
          {item.sending_type === 'individual' ? (
            <span className="text-gray-600 dark:text-gray-400">
              Telefone:{' '}
              <span className="font-mono">
                {item.phone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
              </span>
            </span>
          ) : (
            <span className="text-gray-600 dark:text-gray-400">
              {item.total_sent} mensagens enviadas
              {item.description && (
                <span className="text-gray-400 dark:text-gray-500"> • {item.description}</span>
              )}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: SendingHistory) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(item.status)}`}
        >
          {getStatusIcon(item.status)}
          {getStatusLabel(item.status)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Data/Hora',
      render: (item: SendingHistory) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(item.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  const stats = {
    total: history.length,
    individual: history.filter((h) => h.sending_type === 'individual').length,
    bulk: history.filter((h) => h.sending_type === 'bulk').length,
    success: history.filter((h) => h.status === 'success').length,
    failed: history.filter((h) => h.status === 'failed').length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Visualize o histórico de mensagens enviadas
            </p>
          </div>
          <Button variant="outline" onClick={loadHistory} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Individual</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.individual}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Em Massa</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.bulk}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Sucesso</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.success}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Falhas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-whatsapp-light text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('individual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'individual'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setFilter('bulk')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'bulk'
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Em Massa
          </button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={filteredHistory}
          keyExtractor={(item) => item.id as string}
          loading={loading}
          emptyMessage="Nenhum registro encontrado"
        />
      </div>
    </Layout>
  );
}
