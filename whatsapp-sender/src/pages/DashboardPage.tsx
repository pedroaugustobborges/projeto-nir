import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Send,
  TrendingUp,
  Calendar,
  FileText,
  Filter,
  RefreshCw,
  Users,
  MessageCircle,
  Building2,
} from "lucide-react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase";
import { Template, SendingHistory, HOSPITALS } from "../types";
import { templateService } from "../services/templateService";
import { Button, Select } from "../components/ui";
import Layout from "../components/layout/Layout";

interface DashboardData {
  history: SendingHistory[];
  templates: Template[];
}

interface ChartData {
  date: string;
  total: number;
  individual: number;
  bulk: number;
}

interface HospitalChartData {
  date: string;
  HECAD: number;
  CRER: number;
  HDS: number;
  HUGOL: number;
  [key: string]: string | number;
}

// Soft color palette - consistent with app theme
const COLORS = {
  primary: "#25D366",
  primaryLight: "#25D36620",
  secondary: "#128C7E",
  // Hospital colors - soft and distinct
  hecad: "#10B981", // Emerald
  crer: "#3B82F6", // Blue
  hds: "#8B5CF6", // Purple
  hugol: "#F59E0B", // Amber
};

// Softer colors for Top Templates ranking
const RANK_COLORS = [
  "#10B981", // 1st - Emerald
  "#3B82F6", // 2nd - Blue
  "#8B5CF6", // 3rd - Purple
  "#F59E0B", // 4th - Amber
  "#EC4899", // 5th - Pink
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    history: [],
    templates: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch history with template info
      const { data: historyData, error: historyError } = await supabase
        .from("sending_history")
        .select("*, templates(hospital_id)")
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      // Fetch templates
      const templates = await templateService.getAll();

      setData({
        history: historyData || [],
        templates,
      });
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Dados atualizados!");
  };

  // Filter data based on selections
  const filteredHistory = useMemo(() => {
    return data.history.filter((item) => {
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

      // Hospital filter (via template)
      if (selectedHospital) {
        const template = data.templates.find((t) => t.id === item.template_id);
        if (!template || template.hospital_id !== selectedHospital) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedHospital, selectedTemplate, startDate, endDate]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalMessages = filteredHistory.reduce(
      (sum, item) => sum + (item.total_sent || 1),
      0,
    );
    const totalSends = filteredHistory.length;
    const individualSends = filteredHistory.filter(
      (h) => h.sending_type === "individual",
    ).length;
    const bulkSends = filteredHistory.filter(
      (h) => h.sending_type === "bulk",
    ).length;
    const successRate =
      totalSends > 0
        ? (filteredHistory.filter((h) => h.status === "success").length /
            totalSends) *
          100
        : 0;

    return {
      totalMessages,
      totalSends,
      individualSends,
      bulkSends,
      successRate,
    };
  }, [filteredHistory]);

  // Prepare chart data (last 30 days)
  const chartData = useMemo(() => {
    const days = 30;
    const result: ChartData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayData = filteredHistory.filter(
        (h) => format(parseISO(h.created_at), "yyyy-MM-dd") === dateStr,
      );

      result.push({
        date: format(date, "dd/MM", { locale: ptBR }),
        total: dayData.reduce((sum, h) => sum + (h.total_sent || 1), 0),
        individual: dayData
          .filter((h) => h.sending_type === "individual")
          .reduce((sum, h) => sum + (h.total_sent || 1), 0),
        bulk: dayData
          .filter((h) => h.sending_type === "bulk")
          .reduce((sum, h) => sum + (h.total_sent || 1), 0),
      });
    }

    return result;
  }, [filteredHistory]);

  // Prepare hospital chart data (messages by hospital per day)
  const hospitalChartData = useMemo(() => {
    const days = 14;
    const result: HospitalChartData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");

      const dayEntry: HospitalChartData = {
        date: format(date, "dd/MM", { locale: ptBR }),
        HECAD: 0,
        CRER: 0,
        HDS: 0,
        HUGOL: 0,
      };

      // Count messages per hospital for this day
      data.history.forEach((h) => {
        if (format(parseISO(h.created_at), "yyyy-MM-dd") !== dateStr) return;

        const template = data.templates.find((t) => t.id === h.template_id);
        if (!template?.hospital_id) return;

        const hospitalName = HOSPITALS.find(
          (hosp) => hosp.id === template.hospital_id,
        )?.name;
        if (hospitalName && dayEntry[hospitalName] !== undefined) {
          dayEntry[hospitalName] =
            (dayEntry[hospitalName] as number) + (h.total_sent || 1);
        }
      });

      result.push(dayEntry);
    }

    return result;
  }, [data]);

  // Top templates by usage
  const topTemplates = useMemo(() => {
    const templateCounts: Record<string, { name: string; count: number }> = {};

    filteredHistory.forEach((h) => {
      if (h.template_name) {
        if (!templateCounts[h.template_name]) {
          templateCounts[h.template_name] = { name: h.template_name, count: 0 };
        }
        templateCounts[h.template_name].count += h.total_sent || 1;
      }
    });

    return Object.values(templateCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredHistory]);

  // Hospital options for filter
  const hospitalOptions = [
    { value: "", label: "Todos os Hospitais" },
    ...HOSPITALS.map((h) => ({ value: h.id, label: h.name })),
  ];

  // Template options for filter
  const templateOptions = [
    { value: "", label: "Todos os Templates" },
    ...data.templates.map((t) => ({ value: t.id, label: t.name })),
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-whatsapp-light"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Carregando dashboard...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Visão geral dos disparos de mensagens
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Filtros
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Scorecards - Soft design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Messages */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Total de Mensagens
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.totalMessages.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Período selecionado</span>
            </div>
          </div>

          {/* Total Sends */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Total de Disparos
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.totalSends.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                {metrics.individualSends} individual
              </span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                {metrics.bulkSends} em massa
              </span>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Taxa de Sucesso
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {metrics.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 rounded-full h-2 transition-all duration-500"
                  style={{ width: `${metrics.successRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Templates Used */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  Templates Utilizados
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {topTemplates.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>No período selecionado</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Line Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mensagens por Dia
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Últimos 30 dias
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Individual
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Em Massa
                  </span>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="colorIndividual"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBulk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="individual"
                    name="Individual"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIndividual)"
                  />
                  <Area
                    type="monotone"
                    dataKey="bulk"
                    name="Em Massa"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBulk)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Templates - Softer design */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Templates
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mais utilizados no período
              </p>
            </div>
            {topTemplates.length > 0 ? (
              <div className="space-y-4">
                {topTemplates.map((template, index) => (
                  <div key={template.name} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                      style={{
                        backgroundColor: `${RANK_COLORS[index % RANK_COLORS.length]}15`,
                        color: RANK_COLORS[index % RANK_COLORS.length],
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {template.name}
                      </p>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${(template.count / topTemplates[0].count) * 100}%`,
                            backgroundColor: `${RANK_COLORS[index % RANK_COLORS.length]}80`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {template.count.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
                <FileText className="w-12 h-12 mb-2 opacity-50" />
                <p className="text-sm">Nenhum dado no período</p>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart - Messages by Hospital */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mensagens por Hospital
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Últimos 14 dias
                </p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hospitalChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    type="monotone"
                    dataKey="HECAD"
                    name="HECAD"
                    stroke={COLORS.hecad}
                    strokeWidth={2}
                    dot={{ fill: COLORS.hecad, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="CRER"
                    name="CRER"
                    stroke={COLORS.crer}
                    strokeWidth={2}
                    dot={{ fill: COLORS.crer, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="HDS"
                    name="HDS"
                    stroke={COLORS.hds}
                    strokeWidth={2}
                    dot={{ fill: COLORS.hds, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="HUGOL"
                    name="HUGOL"
                    stroke={COLORS.hugol}
                    strokeWidth={2}
                    dot={{ fill: COLORS.hugol, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Distribuição por Tipo
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Proporção de disparos
              </p>
            </div>
            <div className="h-64 flex items-center justify-center">
              {metrics.totalSends > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Individual", value: metrics.individualSends },
                        { name: "Em Massa", value: metrics.bulkSends },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#8B5CF6" />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                  <Users className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum dado no período</p>
                </div>
              )}
            </div>
            {metrics.totalSends > 0 && (
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Individual ({metrics.individualSends})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Em Massa ({metrics.bulkSends})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
