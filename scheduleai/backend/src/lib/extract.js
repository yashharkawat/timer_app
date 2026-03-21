// Phase 2: Server-side text extraction from PDF/DOCX
// Uncomment and add pdf-parse + mammoth dependencies when ready

export async function extractText(buffer, filename) {
  if (filename.endsWith('.pdf')) {
    return extractFromPDF(buffer);
  } else if (filename.endsWith('.docx')) {
    return extractFromDOCX(buffer);
  }
  throw new Error('Unsupported file type');
}

async function extractFromPDF(buffer) {
  const pdfParse = (await import('pdf-parse')).default;
  const result = await pdfParse(buffer);
  return result.text;
}

async function extractFromDOCX(buffer) {
  const mammoth = (await import('mammoth')).default;
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
