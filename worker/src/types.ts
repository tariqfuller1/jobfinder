// Mirrors lib/auto-apply/types.ts in the main app (kept separate so the worker
// deploys on its own without the app's dependencies).

export type FieldOption = { label: string; value: string; decline?: boolean };

export type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "multiselect" | "checkbox" | "file" | "location";
  required: boolean;
  options?: FieldOption[];
  section: "main" | "eeo";
  value: string | string[];
};

export type Claim = {
  id: string;
  ats: "greenhouse" | "lever" | "ashby";
  formUrl: string;
  fields: Field[];
  applicant?: { country?: string };
  resume: { fileName: string; mimeType: string; base64: string } | null;
};

export type SubmitResult = {
  status: "SUBMITTED" | "NEEDS_MANUAL" | "FAILED";
  error?: string;
  screenshotBase64?: string;
};
