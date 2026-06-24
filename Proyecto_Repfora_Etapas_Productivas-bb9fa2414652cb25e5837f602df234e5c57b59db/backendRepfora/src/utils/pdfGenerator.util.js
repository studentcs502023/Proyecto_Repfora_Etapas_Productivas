import PDFDocument from 'pdfkit';
import User from '../models/User.model.js';

/**
 * Generate a PDF buffer from structured data.
 * @param {Object} params
 * @param {string}   params.title
 * @param {string}   [params.subtitle]
 * @param {Object[]} params.sections   - [{ heading, rows: [[col1, col2, ...]] }]
 * @param {Object}   [params.summary]  - key-value pairs shown at the bottom
 * @returns {Promise<Buffer>}
 */
const generatePdf = ({ title, subtitle, sections, summary }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(18).fillColor('#39a900').text('REPFORA E.P. — SENA', { align: 'center' });
    doc.fontSize(14).fillColor('#000').text(title, { align: 'center' });
    if (subtitle) doc.fontSize(10).fillColor('#666').text(subtitle, { align: 'center' });
    doc.moveDown();
    doc.fontSize(9).text(`Generated: ${new Date().toLocaleString('es-CO')}`, { align: 'right' });
    doc.moveDown();

    // Sections
    for (const section of sections) {
      doc.fontSize(12).fillColor('#000').text(section.heading, { underline: true });
      doc.moveDown(0.5);
      if (section.rows && section.rows.length > 0) {
        for (const row of section.rows) {
          // Flatten row if it contains nested objects/arrays to avoid PDFKit errors
          const rowText = row.map(cell => String(cell)).join('   |   ');
          doc.fontSize(9).text(rowText);
        }
      } else {
        doc.fontSize(9).text('No data available');
      }
      doc.moveDown();
    }

    // Summary
    if (summary) {
      doc.moveDown();
      doc.fontSize(11).text('Summary', { underline: true });
      doc.moveDown(0.5);
      for (const [key, val] of Object.entries(summary)) {
        doc.fontSize(9).text(`${key}: ${val}`);
      }
    }

    doc.end();
  });
};

/**
 * Generate a novelty report PDF and upload to Google Drive
 */
const generateNoveltyPDF = async (noveltyData) => {
  const sections = [
    {
      heading: 'Datos de la Novedad',
      rows: [
        ['Tipo', noveltyData.type || 'N/D'],
        ['Descripcion', noveltyData.description || 'N/D'],
        ['Fecha de Ocurrencia', noveltyData.occurrenceDate ? new Date(noveltyData.occurrenceDate).toLocaleDateString('es-CO') : 'N/D'],
        ['Estado', noveltyData.status || 'PENDING'],
      ]
    }
  ];

  const pdfBuffer = await generatePdf({
    title: 'Reporte de Novedad',
    subtitle: `Novedad #${noveltyData._id || 'N/D'}`,
    sections,
    summary: {
      'Reportado por': noveltyData.reportedBy || 'N/D',
      'Fecha de reporte': new Date().toLocaleString('es-CO'),
    }
  });

  const file = {
    originalname: `novedad_${noveltyData._id || Date.now()}.pdf`,
    buffer: pdfBuffer,
    mimetype: 'application/pdf',
  };

  const { uploadToApprenticeFolder } = await import('./googleDrive.util.js');
  const apprentice = await User.findById(noveltyData.apprentice).select('nationalId');
  if (!apprentice) {
    return { driveFileId: null, driveFileUrl: null, fileName: null };
  }
  try {
    return await uploadToApprenticeFolder(file, apprentice.nationalId, 'novedades');
  } catch (driveErr) {
    console.error('[Google Drive] Error uploading novelty PDF:', driveErr.message);
    return { driveFileId: null, driveFileUrl: null, fileName: file.originalname };
  }
};

export default {
  generatePdf,
  generateNoveltyPDF
};
