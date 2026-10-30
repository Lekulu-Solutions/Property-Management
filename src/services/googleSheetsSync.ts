import { EthiopianMonth, WorkbookState } from '../data/initialLedgerData';
import { buildExactTemplateSheets } from '../utils/excelParser';

export interface GoogleSheetConnectionInfo {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncedAt: string;
  yearEC: string;
  isLockedReadOnlyForExternal: boolean;
  externalReadOnlyLinkEnabled: boolean;
  ownerEmail: string;
}

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string;
}

/**
 * Lists Google Spreadsheets created/managed by this app via the `drive.file` scope.
 */
export async function listAppGoogleSheets(
  accessToken: string
): Promise<DriveSpreadsheetItem[]> {
  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=15&orderBy=modifiedTime desc&fields=files(id,name,webViewLink,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

/**
 * Enforces read-only permissions for external users on Google Drive and restricts
 * edit permissions strictly to the owner / application integration.
 */
export async function enforceDriveReadOnlyLock(
  accessToken: string,
  spreadsheetId: string,
  enableAnyoneReaderLink: boolean
): Promise<void> {
  // 1. Restrict viewer copying/downloading and prevent non-owners from re-sharing
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=id,copyRequiresWriterPermission,writersCanShare`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        copyRequiresWriterPermission: true,
        writersCanShare: false,
      }),
    }
  );

  // 2. Inspect existing permissions and downgrade any non-owner writer/commenter to reader
  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?fields=permissions(id,type,role,emailAddress)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (permRes.ok) {
    const permData = await permRes.json();
    const permissions: { id: string; type: string; role: string }[] =
      permData.permissions || [];

    for (const p of permissions) {
      if (p.role !== 'owner' && p.role !== 'reader') {
        // Downgrade any external editor/commenter strictly to 'reader'
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions/${p.id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader' }),
          }
        );
      }
    }

    const hasAnyoneReader = permissions.some((p) => p.type === 'anyone');
    if (enableAnyoneReaderLink && !hasAnyoneReader) {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
          }),
        }
      );
    } else if (!enableAnyoneReaderLink && hasAnyoneReader) {
      const anyonePerm = permissions.find((p) => p.type === 'anyone');
      if (anyonePerm) {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions/${anyonePerm.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    }
  }
}

/**
 * Creates a brand-new Google Sheet matching the exact 4-sheet schema and formatting
 * of the original Excel template, populates all values, and locks sheet ranges + Drive permissions.
 */
export async function createAndSyncGoogleSheet(
  accessToken: string,
  state: WorkbookState,
  activeMonth: EthiopianMonth,
  userEmail: string,
  options?: {
    customTitle?: string;
    enableExternalReadOnlyLink?: boolean;
  }
): Promise<GoogleSheetConnectionInfo> {
  const templateSheets = buildExactTemplateSheets(state, activeMonth);
  const title =
    options?.customTitle?.trim() ||
    `መስፍን እና ዘውድነሽ - የኪራይ ንብረት እና ወጪ (${state.yearEC})`;

  // 1. Create Spreadsheet with the 4 exact sheets
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        locale: 'en_US',
      },
      sheets: templateSheets.map((s, idx) => ({
        properties: {
          sheetId: idx + 1,
          title: s.sheetName,
          index: idx,
          gridProperties: {
            rowCount: Math.max(s.rows.length + 10, 60),
            columnCount: Math.max(s.colWidths.length + 2, 12),
            frozenRowCount: 1,
          },
        },
      })),
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Sheet (${createRes.status}): ${errText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId: string = createdData.spreadsheetId;
  const spreadsheetUrl: string =
    createdData.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Sync all values, formatting, and protected ranges
  return syncToExistingGoogleSheet(
    accessToken,
    spreadsheetId,
    state,
    activeMonth,
    userEmail,
    {
      spreadsheetTitle: title,
      spreadsheetUrl,
      enableExternalReadOnlyLink: Boolean(options?.enableExternalReadOnlyLink),
    }
  );
}

/**
 * Synchronizes the current WorkbookState into an existing Google Sheet,
 * matching the exact 4-tab structure, formatting, and locking all sheets so external users are read-only.
 */
export async function syncToExistingGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  state: WorkbookState,
  activeMonth: EthiopianMonth,
  userEmail: string,
  options?: {
    spreadsheetTitle?: string;
    spreadsheetUrl?: string;
    enableExternalReadOnlyLink?: boolean;
  }
): Promise<GoogleSheetConnectionInfo> {
  const templateSheets = buildExactTemplateSheets(state, activeMonth);

  // 1. Fetch spreadsheet metadata first to inspect existing sheets & protected ranges
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Failed to read Google Sheet (${metaRes.status}): ${errText}`);
  }

  const meta = await metaRes.json();
  const spreadsheetTitle: string =
    options?.spreadsheetTitle ||
    meta.properties?.title ||
    `መስፍን እና ዘውድነሽ (${state.yearEC})`;
  const spreadsheetUrl: string =
    options?.spreadsheetUrl ||
    meta.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const existingSheets: {
    properties: { sheetId: number; title: string };
    protectedRanges?: { protectedRangeId: number }[];
  }[] = meta.sheets || [];

  const structureRequests: unknown[] = [];
  const titleToSheetId: Record<string, number> = {};

  existingSheets.forEach((s) => {
    titleToSheetId[s.properties.title] = s.properties.sheetId;
    // Remove old protected ranges before re-applying clean sheet locks
    if (Array.isArray(s.protectedRanges)) {
      s.protectedRanges.forEach((pr) => {
        if (pr.protectedRangeId) {
          structureRequests.push({
            deleteProtectedRange: {
              protectedRangeId: pr.protectedRangeId,
            },
          });
        }
      });
    }
  });

  // Ensure all 4 required template sheets exist
  templateSheets.forEach((ts, idx) => {
    if (titleToSheetId[ts.sheetName] === undefined) {
      // If the first sheet is default "Sheet1" and unused, rename it to the first template sheet
      if (
        idx === 0 &&
        existingSheets.length === 1 &&
        existingSheets[0].properties.title === 'Sheet1'
      ) {
        const firstId = existingSheets[0].properties.sheetId;
        titleToSheetId[ts.sheetName] = firstId;
        structureRequests.push({
          updateSheetProperties: {
            properties: {
              sheetId: firstId,
              title: ts.sheetName,
            },
            fields: 'title',
          },
        });
      } else {
        const generatedId = 100 + idx;
        titleToSheetId[ts.sheetName] = generatedId;
        structureRequests.push({
          addSheet: {
            properties: {
              sheetId: generatedId,
              title: ts.sheetName,
              index: idx,
              gridProperties: {
                rowCount: Math.max(ts.rows.length + 10, 60),
                columnCount: Math.max(ts.colWidths.length + 2, 12),
                frozenRowCount: 1,
              },
            },
          },
        });
      }
    }
  });

  if (structureRequests.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: structureRequests }),
      }
    );
  }

  // 2. Clear existing values in the 4 tabs so no stale rows remain
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: templateSheets.map((ts) => `'${ts.sheetName}'!A1:Z120`),
      }),
    }
  );

  // 3. Batch update all 4 sheets with the exact Excel template data
  const valueRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: templateSheets.map((ts) => ({
          range: `'${ts.sheetName}'!A1`,
          majorDimension: 'ROWS',
          values: ts.rows,
        })),
      }),
    }
  );

  if (!valueRes.ok) {
    const errText = await valueRes.text();
    throw new Error(`Failed to write values to Google Sheet (${valueRes.status}): ${errText}`);
  }

  // 4. Apply column widths, title/header styling, and Protected Ranges locking external edits
  const formatAndLockRequests: unknown[] = [];

  templateSheets.forEach((ts) => {
    const sheetId = titleToSheetId[ts.sheetName];
    if (sheetId === undefined) return;

    // Set column widths
    ts.colWidths.forEach((wch, colIdx) => {
      formatAndLockRequests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: colIdx,
            endIndex: colIdx + 1,
          },
          properties: {
            pixelSize: Math.max(wch * 8, 90),
          },
          fields: 'pixelSize',
        },
      });
    });

    // Style top title row (Row 0)
    formatAndLockRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: ts.colWidths.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.06, green: 0.09, blue: 0.16 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 11,
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });

    // Lock entire sheet with ProtectedRange so only the application integration / owner can edit
    formatAndLockRequests.push({
      addProtectedRange: {
        protectedRange: {
          range: {
            sheetId,
          },
          description:
            'Locked by Mesfin & Zewdnesh Financial Ledger Integration — Read-Only for External Users',
          warningOnly: false,
          editors: userEmail
            ? {
                users: [userEmail],
              }
            : undefined,
        },
      },
    });
  });

  if (formatAndLockRequests.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formatAndLockRequests }),
      }
    );
  }

  // 5. Enforce Google Drive file-level Read-Only permissions for external users
  await enforceDriveReadOnlyLock(
    accessToken,
    spreadsheetId,
    Boolean(options?.enableExternalReadOnlyLink)
  );

  return {
    spreadsheetId,
    spreadsheetTitle,
    spreadsheetUrl,
    lastSyncedAt: new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    yearEC: state.yearEC,
    isLockedReadOnlyForExternal: true,
    externalReadOnlyLinkEnabled: Boolean(options?.enableExternalReadOnlyLink),
    ownerEmail: userEmail,
  };
}
