import { useState, useEffect } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Template } from '../types';
import { templateService } from '../services/templateService';
import { whatsappService } from '../services/whatsappService';
import { historyService } from '../services/historyService';
import { Button, Input, Select } from '../components/ui';
import Layout from '../components/layout/Layout';

export default function IndividualSendingPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [phone, setPhone] = useState('');
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [success, setSuccess] = useState(false);

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

  const getTemplateParameters = (template: Template): { key: string; label: string }[] => {
    const params: { key: string; label: string }[] = [];
    // Use the actual parameter name (lowercase) as the key for Colmeia API
    if (template.parameter_1) params.push({ key: template.parameter_1.toLowerCase(), label: template.parameter_1 });
    if (template.parameter_2) params.push({ key: template.parameter_2.toLowerCase(), label: template.parameter_2 });
    if (template.parameter_3) params.push({ key: template.parameter_3.toLowerCase(), label: template.parameter_3 });
    if (template.parameter_4) params.push({ key: template.parameter_4.toLowerCase(), label: template.parameter_4 });
    if (template.parameter_5) params.push({ key: template.parameter_5.toLowerCase(), label: template.parameter_5 });
    if (template.parameter_6) params.push({ key: template.parameter_6.toLowerCase(), label: template.parameter_6 });
    return params;
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setParameters({});
    setSuccess(false);
  };

  const handleParameterChange = (key: string, value: string) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  const formatPhone = (value: string): string => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');

    // Format as Brazilian phone
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setSuccess(false);
  };

  const validateForm = (): boolean => {
    if (!selectedTemplateId) {
      toast.error('Selecione um template');
      return false;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error('Telefone inválido. Use o formato (XX) XXXXX-XXXX');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !selectedTemplate) return;

    try {
      setLoading(true);
      setSuccess(false);

      const phoneDigits = phone.replace(/\D/g, '');

      // Send message via WhatsApp API
      await whatsappService.sendIndividual({
        phone: phoneDigits,
        templateId: selectedTemplateId,
        parameters,
      });

      // Log to history
      await historyService.createIndividual({
        template_id: selectedTemplateId,
        template_name: selectedTemplate.name,
        phone: phoneDigits,
        parameters,
      });

      setSuccess(true);
      toast.success('Mensagem enviada com sucesso!');

      // Reset form after success
      setPhone('');
      setParameters({});
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const templateOptions = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const templateParams = selectedTemplate ? getTemplateParameters(selectedTemplate) : [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disparo Individual</h1>
          <p className="text-gray-500 mt-1">
            Envie mensagens para um único contato
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              label="Template"
              options={templateOptions}
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder={templatesLoading ? 'Carregando...' : 'Selecione um template'}
              disabled={templatesLoading || loading}
              required
            />

            <Input
              label="Telefone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(XX) XXXXX-XXXX"
              disabled={loading}
              required
            />

            {templateParams.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Parâmetros do Template
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templateParams.map((param) => (
                    <Input
                      key={param.key}
                      label={param.label}
                      value={parameters[param.key] || ''}
                      onChange={(e) => handleParameterChange(param.key, e.target.value)}
                      placeholder={`Digite o ${param.label.toLowerCase()}`}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedTemplate?.image_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Imagem de Referência
                </h3>
                <img
                  src={selectedTemplate.image_url}
                  alt={selectedTemplate.name}
                  className="max-h-48 rounded-lg border border-gray-200"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              {success && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Enviado com sucesso!</span>
                </div>
              )}
              <div className="flex-1" />
              <Button type="submit" loading={loading}>
                <Send className="w-4 h-4" />
                Enviar Mensagem
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
