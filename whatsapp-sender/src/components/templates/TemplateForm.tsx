import { useState, useEffect } from 'react';
import { Template, TemplateFormData } from '../../types';
import { Button, Input, FileUpload } from '../ui';

interface TemplateFormProps {
  template?: Template | null;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const PARAMETER_LABELS = [
  'Parâmetro 1',
  'Parâmetro 2',
  'Parâmetro 3',
  'Parâmetro 4',
  'Parâmetro 5',
  'Parâmetro 6',
];

export default function TemplateForm({
  template,
  onSubmit,
  onCancel,
  loading = false,
}: TemplateFormProps) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    parameter_1: '',
    parameter_2: '',
    parameter_3: '',
    parameter_4: '',
    parameter_5: '',
    parameter_6: '',
    image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        parameter_1: template.parameter_1 || '',
        parameter_2: template.parameter_2 || '',
        parameter_3: template.parameter_3 || '',
        parameter_4: template.parameter_4 || '',
        parameter_5: template.parameter_5 || '',
        parameter_6: template.parameter_6 || '',
        image: template.image_url || null,
      });
    }
  }, [template]);

  const handleChange = (field: keyof TemplateFormData, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getVisibleParameters = (): number => {
    // Show parameters progressively based on which ones are filled
    let count = 1; // Always show at least parameter 1

    if (formData.parameter_1?.trim()) count = 2;
    if (formData.parameter_2?.trim()) count = 3;
    if (formData.parameter_3?.trim()) count = 4;
    if (formData.parameter_4?.trim()) count = 5;
    if (formData.parameter_5?.trim()) count = 6;

    return count;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do template é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit(formData);
  };

  const visibleParameters = getVisibleParameters();
  const parameterFields = [
    { key: 'parameter_1', value: formData.parameter_1 },
    { key: 'parameter_2', value: formData.parameter_2 },
    { key: 'parameter_3', value: formData.parameter_3 },
    { key: 'parameter_4', value: formData.parameter_4 },
    { key: 'parameter_5', value: formData.parameter_5 },
    { key: 'parameter_6', value: formData.parameter_6 },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Nome do Template"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Ex: Confirmação de Consulta"
        error={errors.name}
        required
        disabled={loading}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Parâmetros Dinâmicos
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Preencha o nome de cada variável do template
          </span>
        </div>

        <div className="space-y-3">
          {parameterFields.slice(0, visibleParameters).map((field, index) => (
            <Input
              key={field.key}
              label={PARAMETER_LABELS[index]}
              value={field.value}
              onChange={(e) =>
                handleChange(field.key as keyof TemplateFormData, e.target.value)
              }
              placeholder={`Ex: ${['nome', 'data', 'hora', 'local', 'telefone', 'email'][index]}`}
              hint={index === visibleParameters - 1 && index < 5 ? 'Preencha para habilitar o próximo parâmetro' : undefined}
              disabled={loading}
            />
          ))}
        </div>

        {visibleParameters < 6 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Você pode adicionar até 6 parâmetros. Preencha o parâmetro atual para ver o próximo.
          </p>
        )}
      </div>

      <FileUpload
        label="Imagem de Referência (opcional)"
        value={formData.image}
        onChange={(file) => handleChange('image', file)}
        error={errors.image}
        disabled={loading}
      />

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {template ? 'Salvar Alterações' : 'Criar Template'}
        </Button>
      </div>
    </form>
  );
}
