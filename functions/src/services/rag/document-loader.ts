import fs from 'fs';
import Papa from 'papaparse';
import logger from '../firebase/logger';

export interface Document {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

/**
 * Load documents from JSON file
 *
 * File format:
 * [
 *   {
 *     "id": "doc-1",
 *     "text": "Document content here...",
 *     "metadata": { "source": "manual", "tags": ["ai"] }
 *   },
 *   ...
 * ]
 */
export async function loadDocumentsFromJSON(
  filePath: string,
): Promise<Document[]> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      throw new Error('Root must be an array of documents');
    }

    const validated: Document[] = parsed.map((doc, index) => {
      if (!doc.id) {
        throw new Error(`Document at index ${index} missing required 'id'`);
      }

      if (!doc.text || typeof doc.text !== 'string') {
        throw new Error(
          `Document ${doc.id} has invalid 'text' field (must be string)`,
        );
      }

      return {
        id: String(doc.id),
        text: doc.text.trim(),
        metadata: doc.metadata || {},
      };
    });

    logger.info(`Loaded ${validated.length} documents from JSON`, {
      filePath,
      documentCount: validated.length,
    });

    return validated;
  } catch (error) {
    if (error instanceof Error) {
      const msg = `Failed to load documents from ${filePath}: ${error.message}`;
      logger.error(msg);
      const e = new Error(msg);
      (e as any).cause = error;
      throw e;
    }
    throw error;
  }
}

/**
 * Load documents from CSV file using papaparse
 *
 * CSV format (first row is headers):
 * id,text,source
 * doc-1,"Document text here",wikipedia
 * doc-2,"Another document",article
 *
 * Supports:
 * - Quoted fields with commas
 * - Escaped quotes
 * - Different delimiters (auto-detected or specified)
 */
export async function loadDocumentsFromCSV(
  filePath: string,
  textColumn: string = 'text',
): Promise<Document[]> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Use papaparse for robust CSV parsing
    const result = Papa.parse(content, {
      header: true, // Use first row as column names
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h) => h.trim(),
    });

    if (result.errors.length > 0) {
      const errorMsg = result.errors.map((e) => e.message).join('; ');
      throw new Error(`CSV parsing error: ${errorMsg}`);
    }

    const rows = result.data as any[];

    if (rows.length === 0) {
      throw new Error('CSV file is empty (no data rows)');
    }

    // Validate headers
    const firstRow = rows[0];
    if (!firstRow.id || !firstRow[textColumn]) {
      const availableHeaders = Object.keys(firstRow).join(', ');
      throw new Error(
        `CSV must have 'id' and '${textColumn}' columns. ` +
          `Found: ${availableHeaders}`,
      );
    }

    const documents: Document[] = rows.map((row, rowIndex) => {
      const id = String(row.id || '').trim();
      const text = String(row[textColumn] || '').trim();

      if (!id || !text) {
        throw new Error(
          `Row ${rowIndex + 2} missing required 'id' or '${textColumn}'`,
        );
      }

      const metadata: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        if (key !== 'id' && key !== textColumn && value) {
          metadata[key] = value;
        }
      });

      return { id, text, metadata };
    });

    logger.info(`Loaded ${documents.length} documents from CSV`, {
      filePath,
      documentCount: documents.length,
      textColumn,
    });

    return documents;
  } catch (error) {
    if (error instanceof Error) {
      const msg = `Failed to load documents from CSV ${filePath}: ${error.message}`;
      logger.error(msg);
      const customError = new Error(msg);
      throw customError;
    }
    throw error;
  }
}

/**
 * Load documents from API endpoint
 */
export async function loadDocumentsFromAPI(
  url: string,
  authToken?: string,
): Promise<Document[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('API response must be an array of documents');
    }

    const validated: Document[] = data.map((doc, index) => {
      if (!doc.id) {
        throw new Error(`Document at index ${index} missing required 'id'`);
      }

      if (!doc.text || typeof doc.text !== 'string') {
        throw new Error(
          `Document ${doc.id} has invalid 'text' field (must be string)`,
        );
      }

      return {
        id: String(doc.id),
        text: doc.text.trim(),
        metadata: doc.metadata || {},
      };
    });

    logger.info(`Loaded ${validated.length} documents from API`, {
      url,
      documentCount: validated.length,
    });

    return validated;
  } catch (error) {
    if (error instanceof Error) {
      const msg = `Failed to load documents from API ${url}: ${error.message}`;
      const e = new Error(msg);
      (e as any).cause = error;
      logger.error(msg);
      throw e;
    }
    throw error;
  }
}
