// Template Types
export interface Template {
  id: string;
  name: string;
  parameter_1?: string | null;
  parameter_2?: string | null;
  parameter_3?: string | null;
  parameter_4?: string | null;
  parameter_5?: string | null;
  parameter_6?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormData {
  name: string;
  parameter_1?: string;
  parameter_2?: string;
  parameter_3?: string;
  parameter_4?: string;
  parameter_5?: string;
  parameter_6?: string;
  image?: File | string | null;
}

// Sending History Types
export type SendingStatus = 'success' | 'failed' | 'pending';
export type SendingType = 'individual' | 'bulk';

export interface SendingHistory {
  id: string;
  template_id?: string;
  template_name: string;
  description?: string;
  phone?: string;
  sending_type: SendingType;
  status: SendingStatus;
  error_message?: string;
  total_sent?: number;
  created_at: string;
}

// Individual Sending Types
export interface IndividualSendingData {
  template_id: string;
  phone: string;
  parameters: Record<string, string>;
}

// Bulk Sending Types
export interface BulkSendingRow {
  phone: string;
  param1?: string;
  param2?: string;
  param3?: string;
  param4?: string;
  param5?: string;
  param6?: string;
}

export interface BulkSendingData {
  description: string;
  template_id: string;
  rows: BulkSendingRow[];
}

// CSV Row Type (used in bulk sending page)
export interface CSVRow {
  phone: string;
  param_1?: string;
  param_2?: string;
  param_3?: string;
  param_4?: string;
  param_5?: string;
  param_6?: string;
}

// CSV Validation
export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  data: CSVRow[];
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
