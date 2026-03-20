import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image } from 'lucide-react';

interface FileUploadProps {
  value?: File | string | null;
  onChange: (file: File | null) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export default function FileUpload({
  value,
  onChange,
  accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
  maxSize = 5 * 1024 * 1024, // 5MB
  label,
  error,
  disabled = false,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onChange(acceptedFiles[0]);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const getPreviewUrl = () => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return URL.createObjectURL(value);
  };

  const previewUrl = getPreviewUrl();
  const fileName = value instanceof File ? value.name : null;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive ? 'border-whatsapp-light bg-whatsapp-light/5 dark:bg-whatsapp-light/10' : 'border-gray-300 dark:border-gray-600'}
          ${error ? 'border-red-500' : ''}
          ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60' : 'hover:border-whatsapp-light'}
        `}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-32 max-w-full mx-auto rounded-lg"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {fileName && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                {fileName}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              {isDragActive ? (
                <Upload className="w-10 h-10 text-whatsapp-light" />
              ) : (
                <Image className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDragActive
                  ? 'Solte o arquivo aqui...'
                  : 'Arraste uma imagem ou clique para selecionar'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                PNG, JPG, GIF ou WEBP (máx. {Math.round(maxSize / 1024 / 1024)}MB)
              </p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
