import { useState, useEffect } from 'react';
import { Send, Download, Upload, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Template, CSVRow } from '../types';
import { templateService } from '../services/templateService';
import { whatsappService } from '../services/whatsappService';
import { historyService } from '../services/historyService';
import { parseCSV, downloadSampleCSV } from '../utils/csvParser';
import { Button, Select, FileUpload, Table } from '../components/ui';
import Layout from '../components/layout/Layout';

export default function BulkSendingPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const data = await templateService.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCsvFile(null);
    setCsvData([]);
    setCsvErrors([]);
  };

  const handleFileChange = async (file: File | null) => {
    setCsvFile(file);
    setCsvData([]);
    setCsvErrors([]);

    if (!file || !selectedTemplate) return;

    try {
      setLoading(true);
      const result = await parseCSV(file, selectedTemplate);

      if (result.errors.length > 0) {
        setCsvErrors(result.errors);
      }

      if (result.data.length > 0) {
        setCsvData(result.data);
      }
    } catch (error) {
      console.error('Erro ao processar CSV:', error);
      toast.error('Erro ao processar arquivo CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    if (!selectedTemplate) {
      toast.error('Selecione um template primeiro');
      return;
    }
    downloadSampleCSV(selectedTemplate);
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || csvData.length === 0) return;

    try {
      setSending(true);
      setSendProgress({ sent: 0, total: csvData.length });

      // Send messages via WhatsApp API
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        await whatsappService.sendIndividual({
          phone: row.phone.replace(/\D/g, ''),
          templateId: selectedTemplateId,
          parameters: {
            param_1: row.param_1 || '',
            param_2: row.param_2 || '',
            param_3: row.param_3 || '',
            param_4: row.param_4 || '',
            param_5: row.param_5 || '',
            param_6: row.param_6 || '',
          },
        });
        setSendProgress({ sent: i + 1, total: csvData.length });
      }

      // Log bulk sending to history
      await historyService.createBulk({
        template_id: selectedTemplateId,
        template_name: selectedTemplate.name,
        total_sent: csvData.length,
        description: csvFile?.name || 'Disparo em massa',
      });

      toast.success(`${csvData.length} mensagens enviadas com sucesso!`);

      // Reset form
      setCsvFile(null);
      setCsvData([]);
      setCsvErrors([]);
    } catch (error) {
      console.error('Erro ao enviar mensagens:', error);
      toast.error('Erro ao enviar mensagens');
    } finally {
      setSending(false);
      setSendProgress({ sent: 0, total: 0 });
    }
  };

  const templateOptions = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const previewColumns = [
    { key: 'phone', header: 'Telefone' },
    ...(selectedTemplate?.parameter_1 ? [{ key: 'param_1', header: selectedTemplate.parameter_1 }] : []),
    ...(selectedTemplate?.parameter_2 ? [{ key: 'param_2', header: selectedTemplate.parameter_2 }] : []),
    ...(selectedTemplate?.parameter_3 ? [{ key: 'param_3', header: selectedTemplate.parameter_3 }] : []),
    ...(selectedTemplate?.parameter_4 ? [{ key: 'param_4', header: selectedTemplate.parameter_4 }] : []),
    ...(selectedTemplate?.parameter_5 ? [{ key: 'param_5', header: selectedTemplate.parameter_5 }] : []),
    ...(selectedTemplate?.parameter_6 ? [{ key: 'param_6', header: selectedTemplate.parameter_6 }] : []),
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Disparo em Massa</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Envie mensagens para múltiplos contatos usando um arquivo CSV
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Template"
              options={templateOptions}
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder={templatesLoading ? 'Carregando...' : 'Selecione um template'}
              disabled={templatesLoading || sending}
              required
            />

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleDownloadSample}
                disabled={!selectedTemplateId || sending}
              >
                <Download className="w-4 h-4" />
                Baixar CSV de Exemplo
              </Button>
            </div>
          </div>

          {selectedTemplateId && (
            <FileUpload
              label="Arquivo CSV"
              value={csvFile}
              onChange={handleFileChange}
              accept={{ 'text/csv': ['.csv'] }}
              maxSize={10 * 1024 * 1024}
              disabled={sending}
            />
          )}

          {/* Errors */}
          {csvErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-red-800 dark:text-red-400">
                    Erros encontrados no CSV
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    {csvErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {csvErrors.length > 5 && (
                      <li className="font-medium">
                        ... e mais {csvErrors.length - 5} erros
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {csvData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Prévia dos Dados ({csvData.length} registros)
                </h3>
                <button
                  onClick={() => {
                    setCsvFile(null);
                    setCsvData([]);
                    setCsvErrors([]);
                  }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Limpar
                </button>
              </div>

              <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <Table
                  columns={previewColumns}
                  data={csvData.slice(0, 10)}
                  keyExtractor={(_row, index) => String(index)}
                />
              </div>

              {csvData.length > 10 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Mostrando 10 de {csvData.length} registros
                </p>
              )}
            </div>
          )}

          {/* Progress */}
          {sending && (
            <div className="bg-whatsapp-light/10 dark:bg-whatsapp-light/20 border border-whatsapp-light/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-whatsapp-dark dark:border-whatsapp-light"></div>
                <div>
                  <p className="font-medium text-whatsapp-dark dark:text-whatsapp-light">
                    Enviando mensagens...
                  </p>
                  <p className="text-sm text-whatsapp-dark/70 dark:text-whatsapp-light/70">
                    {sendProgress.sent} de {sendProgress.total} enviadas
                  </p>
                </div>
              </div>
              <div className="mt-3 bg-white dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-whatsapp-light transition-all duration-300"
                  style={{
                    width: `${(sendProgress.sent / sendProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={handleSubmit}
              disabled={csvData.length === 0 || sending}
              loading={sending}
            >
              <Send className="w-4 h-4" />
              Enviar {csvData.length > 0 ? `${csvData.length} Mensagens` : 'Mensagens'}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Upload className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800 dark:text-blue-400">
                Como usar o disparo em massa
              </h4>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Selecione o template que deseja usar</li>
                <li>Baixe o CSV de exemplo para ver o formato correto</li>
                <li>Preencha o CSV com os dados dos contatos (máximo 200 linhas)</li>
                <li>Faça o upload do arquivo preenchido</li>
                <li>Revise os dados e clique em enviar</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
