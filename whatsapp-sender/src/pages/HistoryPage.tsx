import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  User,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Phone,
  Eye,
  Filter,
} from "lucide-react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  parseISO,
  isWithinInterval,
} from "date-fns";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase";
import { SendingHistory, SendingStatus, Template, HOSPITALS } from "../types";
import { templateService } from "../services/templateService";
import { Button, Table, Select } from "../components/ui";
import Layout from "../components/layout/Layout";

const ITEMS_PER_PAGE_OPTIONS = [10, 50, 100, 500];

export default function HistoryPage() {
  const [history, setHistory] = useState<SendingHistory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SendingHistory | null>(null);

  // Filters
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Parse phone list from JSON string
  const parsePhoneList = (phoneList?: string): string[] => {
    if (!phoneList) return [];
    try {
      return JSON.parse(phoneList);
    } catch {
      return [];
    }
  };

  // Format phone number for display
  const formatPhone = (phone: string): string => {
    // Remove country code if present for display
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 13 && cleanPhone.startsWith("55")) {
      const local = cleanPhone.slice(2);
      return local.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedHospital, selectedTemplate, selectedType, startDate, endDate, itemsPerPage]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch history with template info
      const { data: historyData, error: historyError } = await supabase
        .from("sending_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // Fetch templates
      const templatesData = await templateService.getAll();

      setHistory(historyData || []);
      setTemplates(templatesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: SendingStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: SendingStatus) => {
    switch (status) {
      case "success":
        return "Sucesso";
      case "failed":
        return "Falhou";
      case "pending":
        return "Pendente";
    }
  };

  const getStatusClass = (status: SendingStatus) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  // Filter options
  const hospitalOptions = [
    { value: "", label: "Todos os Hospitais" },
    ...HOSPITALS.map((h) => ({ value: h.id, label: h.name })),
  ];

  const templateOptions = [
    { value: "", label: "Todos os Templates" },
    ...templates.map((t) => ({ value: t.id, label: t.name })),
  ];

  const typeOptions = [
    { value: "", label: "Todos os Tipos" },
    { value: "individual", label: "Individual" },
    { value: "bulk", label: "Em Massa" },
  ];

  // Filter data
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Date filter
      const itemDate = parseISO(item.created_at);
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));

      if (!isWithinInterval(itemDate, { start, end })) {
        return false;
      }

      // Template filter
      if (selectedTemplate && item.template_id !== selectedTemplate) {
        return false;
      }

      // Type filter
      if (selectedType && item.sending_type !== selectedType) {
        return false;
      }

      // Hospital filter (via template)
      if (selectedHospital) {
        const template = templates.find((t) => t.id === item.template_id);
        if (!template || template.hospital_id !== selectedHospital) {
          return false;
        }
      }

      return true;
    });
  }, [history, templates, selectedHospital, selectedTemplate, selectedType, startDate, endDate]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Paginated data
  const paginatedHistory = useMemo(() => {
    return filteredHistory.slice(startIndex, endIndex);
  }, [filteredHistory, startIndex, endIndex]);

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
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const columns = [
    {
      key: "type",
      header: "Tipo",
      render: (item: SendingHistory) => (
        <div className="flex items-center gap-2">
          {item.sending_type === "individual" ? (
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {item.sending_type === "individual" ? "Individual" : "Em Massa"}
          </span>
        </div>
      ),
    },
    {
      key: "template_name",
      header: "Template",
      render: (item: SendingHistory) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {item.template_name}
        </span>
      ),
    },
    {
      key: "details",
      header: "Detalhes",
      render: (item: SendingHistory) => (
        <div className="text-sm">
          {item.sending_type === "individual" ? (
            <span className="text-gray-600 dark:text-gray-400">
              Telefone:{" "}
              <span className="font-mono">
                {item.phone?.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
              </span>
            </span>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-gray-600 dark:text-gray-400">
                {item.total_sent} mensagens enviadas
                {item.description && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {" "}
                    - {item.description}
                  </span>
                )}
              </span>
              {item.phone_list && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Ver telefones
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
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
      key: "created_at",
      header: "Data/Hora",
      render: (item: SendingHistory) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(item.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];

  const stats = {
    total: filteredHistory.length,
    individual: filteredHistory.filter((h) => h.sending_type === "individual").length,
    bulk: filteredHistory.filter((h) => h.sending_type === "bulk").length,
    success: filteredHistory.filter((h) => h.status === "success").length,
    failed: filteredHistory.filter((h) => h.status === "failed").length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Histórico
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Visualize o histórico de mensagens enviadas
            </p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.total}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Individual
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.individual}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Em Massa</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.bulk}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Sucesso</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.success}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Falhas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.failed}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="Hospital"
              options={hospitalOptions}
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
            />
            <Select
              label="Template"
              options={templateOptions}
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            />
            <Select
              label="Tipo"
              options={typeOptions}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-whatsapp-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-whatsapp-light"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={paginatedHistory}
          keyExtractor={(item) => item.id as string}
          loading={loading}
          emptyMessage="Nenhum registro encontrado"
        />

        {/* Pagination */}
        {!loading && filteredHistory.length > 0 && (
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
                          ? "bg-whatsapp-light text-white"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page info */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {startIndex + 1}
                </span>{" "}
                a{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.min(endIndex, filteredHistory.length)}
                </span>{" "}
                de{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {filteredHistory.length}
                </span>{" "}
                registros
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-1">
                {/* First page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Primeira pagina"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                {/* Previous page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Pagina anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 mx-1">
                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
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
                            ? "bg-whatsapp-light text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>

                {/* Next page */}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Proxima pagina"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Last page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Ultima pagina"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phone List Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalhes do Disparo
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedItem.template_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Section */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Data/Hora
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(selectedItem.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Enviado
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {selectedItem.total_sent} mensagens
                  </p>
                </div>
                {selectedItem.description && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Arquivo
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {selectedItem.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Phone List */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefones ({parsePhoneList(selectedItem.phone_list).length})
                </h4>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
                {parsePhoneList(selectedItem.phone_list).map((phone, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                  >
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-6">
                      {index + 1}.
                    </span>
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                      {formatPhone(phone)}
                    </span>
                  </div>
                ))}
                {parsePhoneList(selectedItem.phone_list).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Lista de telefones não disponível
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
