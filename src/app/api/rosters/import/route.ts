import type { ImportIssue } from "@/features/roster/domain/import-issue";
import type {
  RosterImportResult,
  RosterImportSummary,
} from "@/features/roster/server/import-roster";
import { importRosterWorkbook } from "@/features/roster/server/import-roster";
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
    intakeState: "failed",
    sourceFormat: "unknown",
    requiresReview: false,
    fallbackUsed: false,
    summary: {
      ...emptySummary(),
      blockingIssues: issues.length,
    },
    students: [],
    stagedStudents: [],
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
  const importResult = await importRosterWorkbook(await uploadFile.arrayBuffer(), {
    fileName: guardResult.fileName,
    mimeType: guardResult.mimeType,
  });

  return Response.json(
    {
      ...importResult,
      sourceFileName: guardResult.fileName,
      sourceFormat: importResult.sourceFormat,
      fallbackUsed: importResult.fallbackUsed,
    },
    {
      status: importResult.ok ? 200 : 422,
    },
  );
}
