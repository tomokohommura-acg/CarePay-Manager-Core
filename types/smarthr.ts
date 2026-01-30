// SmartHR API レスポンス型定義

export interface SmartHRDepartment {
  id: string;
  name: string;
  full_path_name: string;
}

export interface SmartHREmploymentType {
  id: string;
  name: string;
}

export interface SmartHRCustomFieldValue {
  id: string;
  name: string;
}

export interface SmartHRCustomField {
  id: string;
  name: string;
  value: string | SmartHRCustomFieldValue | null;
  template: {
    id: string;
    name: string;
  };
}

export interface SmartHRCrew {
  id: string;
  emp_code: string | null;
  last_name: string;
  first_name: string;
  department: string | SmartHRDepartment | null;  // 文字列またはオブジェクト
  employment_type: string | SmartHREmploymentType | null;  // 文字列またはオブジェクト
  custom_fields: SmartHRCustomField[];
  entered_at: string | null;
  resigned_at: string | null;
}

export interface SmartHRCustomFieldTemplateElement {
  id: string;
  name: string;
}

export interface SmartHRCustomFieldTemplate {
  id: string;
  name: string;
  type: 'string' | 'enum' | 'date' | 'file' | 'address' | 'number';
  elements?: SmartHRCustomFieldTemplateElement[];
}

export interface SmartHRCrewsResponse {
  data: SmartHRCrew[];
  // ページネーション用
  meta?: {
    total_count: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

export interface SmartHRError {
  code: string;
  message: string;
}
