import { useState, useEffect, useMemo } from "react";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Building2,
  XCircle,
  AlertOctagon,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import { Template, HOSPITALS } from "../types";
import { templateService } from "../services/templateService";
import { whatsappService } from "../services/whatsappService";
import { historyService } from "../services/historyService";
import { useAuth } from "../contexts/AuthContext";
import { Button, Input, Select, ImageThumbnail } from "../components/ui";
import Layout from "../components/layout/Layout";

interface SendError {
  message: string;
  errorType?: string;
  expectedParams?: string[];
  receivedParams?: string[];
}

// Helper function to get hospital name from ID
const getHospitalName = (hospitalId?: string | null): string | null => {
  if (!hospitalId) return null;
  const hospital = HOSPITALS.find((h) => h.id === hospitalId);
  return hospital?.name || null;
};

export default function IndividualSendingPage() {
  const { filterByUserHospitals } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [phone, setPhone] = useState("");
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const data = await templateService.getAll();
      // Filter templates by user's assigned hospitals
      const filteredData = filterByUserHospitals(data);
      setTemplates(filteredData);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      toast.error("Erro ao carregar templates");
    } finally {
      setTemplatesLoading(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Validate phone number in real-time
  const phoneValidation = useMemo(() => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return null; // Don't validate incomplete numbers
    return whatsappService.validatePhone(cleanPhone);
  }, [phone]);

  const getTemplateParameters = (
    template: Template,
  ): { key: string; label: string }[] => {
    const params: { key: string; label: string }[] = [];
    // Use the exact parameter name as the key for Colmeia API (case-sensitive)
    if (template.parameter_1)
      params.push({ key: template.parameter_1, label: template.parameter_1 });
    if (template.parameter_2)
      params.push({ key: template.parameter_2, label: template.parameter_2 });
    if (template.parameter_3)
      params.push({ key: template.parameter_3, label: template.parameter_3 });
    if (template.parameter_4)
      params.push({ key: template.parameter_4, label: template.parameter_4 });
    if (template.parameter_5)
      params.push({ key: template.parameter_5, label: template.parameter_5 });
    if (template.parameter_6)
      params.push({ key: template.parameter_6, label: template.parameter_6 });
    if (template.parameter_7)
      params.push({ key: template.parameter_7, label: template.parameter_7 });
    if (template.parameter_8)
      params.push({ key: template.parameter_8, label: template.parameter_8 });
    if (template.parameter_9)
      params.push({ key: template.parameter_9, label: template.parameter_9 });
    if (template.parameter_10)
      params.push({ key: template.parameter_10, label: template.parameter_10 });
    if (template.parameter_11)
      params.push({ key: template.parameter_11, label: template.parameter_11 });
    if (template.parameter_12)
      params.push({ key: template.parameter_12, label: template.parameter_12 });
    return params;
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setParameters({});
    setSuccess(false);
    setSendError(null);
  };

  const handleParameterChange = (key: string, value: string) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  const formatPhone = (value: string): string => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");

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
      toast.error("Selecione um template");
      return false;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error("Telefone inválido. Use o formato (XX) XXXXX-XXXX");
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
      setSendError(null);

      const phoneDigits = phone.replace(/\D/g, "");

      // Send message via WhatsApp API with template's hospital and campaign configuration
      const result = await whatsappService.sendIndividual({
        phone: phoneDigits,
        templateId: selectedTemplateId,
        parameters,
        hospitalId: selectedTemplate.hospital_id || undefined,
        campaignActionId: selectedTemplate.campaign_action_id || undefined,
      });

      if (!result.success) {
        // Show error to user
        setSendError({
          message: result.message,
          errorType: result.errorType,
          expectedParams: result.errorDetails?.expectedParams,
          receivedParams: result.errorDetails?.receivedParams,
        });
        toast.error(result.message);
        return;
      }

      // Determine warning message based on phone validation
      const warningMessage = phoneValidation?.isPotentiallyInvalid
        ? phoneValidation.reason
        : (result.warning || undefined);

      // Log to history only on success
      await historyService.createIndividual({
        template_id: selectedTemplateId,
        template_name: selectedTemplate.name,
        phone: phoneDigits,
        parameters,
        warning: warningMessage,
      });

      setSuccess(true);
      if (warningMessage) {
        toast.success("Mensagem enviada com ressalva!");
      } else {
        toast.success("Mensagem enviada com sucesso!");
      }

      // Reset form after success
      setPhone("");
      setParameters({});
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao enviar mensagem";
      setSendError({ message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const templateOptions = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const templateParams = selectedTemplate
    ? getTemplateParameters(selectedTemplate)
    : [];

  // Check if template has proper Colmeia configuration
  const hasColmeiaConfig =
    selectedTemplate?.hospital_id && selectedTemplate?.campaign_action_id;
  const hospitalName = selectedTemplate
    ? getHospitalName(selectedTemplate.hospital_id)
    : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Disparo Individual
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Envie mensagens para um único contato
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Select
              label="Template"
              options={templateOptions}
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder={
                templatesLoading ? "Carregando..." : "Selecione um template"
              }
              disabled={templatesLoading || loading}
              required
            />

            {/* Template configuration indicator */}
            {selectedTemplate &&
              (hasColmeiaConfig ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <span className="text-sm text-blue-800 dark:text-blue-300">
                      Hospital: <strong>{hospitalName}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Configuração incompleta
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Este template não possui hospital/campanha configurados.
                      Edite o template para definir essas configurações.
                    </p>
                  </div>
                </div>
              ))}

            <Input
              label="Celular"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(XX) XXXXX-XXXX"
              disabled={loading}
              required
            />

            {/* Phone validation warning */}
            {phoneValidation && !phoneValidation.isValid && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <Phone className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Número inválido
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    {phoneValidation.reason}
                  </p>
                </div>
              </div>
            )}

            {phoneValidation && phoneValidation.isValid && phoneValidation.isPotentiallyInvalid && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Atenção
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    {phoneValidation.reason}. A mensagem pode não ser entregue se o número não existir no WhatsApp.
                  </p>
                </div>
              </div>
            )}

            {templateParams.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Parâmetros do Template
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templateParams.map((param) => (
                    <Input
                      key={param.key}
                      label={param.label}
                      value={parameters[param.key] || ""}
                      onChange={(e) =>
                        handleParameterChange(param.key, e.target.value)
                      }
                      placeholder={`Digite o ${param.label.toLowerCase()}`}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedTemplate?.image_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Imagem de Referência
                </h3>
                <ImageThumbnail
                  imageUrl={selectedTemplate.image_url}
                  alt={selectedTemplate.name}
                  title={selectedTemplate.name}
                />
              </div>
            )}

            {/* Error Display */}
            {sendError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  {sendError.errorType === "invalid_campaign" ? (
                    <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <p className="font-medium text-red-800 dark:text-red-300">
                      Falha ao enviar mensagem
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {sendError.message}
                    </p>
                    {sendError.expectedParams &&
                      sendError.expectedParams.length > 0 && (
                        <div className="text-xs text-red-600 dark:text-red-400 space-y-1 pt-2 border-t border-red-200 dark:border-red-700">
                          <p>
                            <strong>Parâmetros esperados:</strong>{" "}
                            {sendError.expectedParams.join(", ")}
                          </p>
                          {sendError.receivedParams && (
                            <p>
                              <strong>Parâmetros enviados:</strong>{" "}
                              {sendError.receivedParams.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              {success && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    Enviado com sucesso!
                  </span>
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
