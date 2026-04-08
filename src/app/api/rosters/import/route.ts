import type { ImportIssue } from "@/features/roster/domain/import-issue";
import {
  importRosterWorkbook,
  type RosterImportResult,
  type RosterImportSummary,
} from "@/features/roster/server/import-roster";
import { validateRosterUpload } from "@/features/roster/server/file-guard";

function emptySummary(): RosterImportSummary {
  return {
    worksheetName: null,
    totalRowsRead: 0,
    validStudents: 0,
    blockingIssues: 0,
    warningIssues: 0,
    infoIssues: 0,
  };
}

function toBlockingIssue(code: string, message: string): ImportIssue {
  return {
    severity: "blocking",
    code,
    message,
  };
}

function errorResult(code: string, message: string): RosterImportResult {
  const issues = [toBlockingIssue(code, message)];

  return {
    ok: false,
    summary: {
      ...emptySummary(),
      blockingIssues: issues.length,
    },
    students: [],
    issues,
  };
}

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const candidateFile = formData.get("file");
  const file = candidateFile instanceof File ? candidateFile : null;
  const guardResult = validateRosterUpload(file);

  if (!guardResult.ok) {
    return Response.json(errorResult(guardResult.code, guardResult.message), {
      status: guardResult.status,
    });
  }

  const uploadFile = file as File;
  const importResult = await importRosterWorkbook(await uploadFile.arrayBuffer());

  return Response.json(importResult, {
    status: importResult.ok ? 200 : 422,
  });
}
