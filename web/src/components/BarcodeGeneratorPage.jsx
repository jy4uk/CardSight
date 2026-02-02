import { useState, useRef } from 'react';
import { Download, QrCode, Loader2, FileText, Package } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

// UPC-A check digit calculation
function calculateUPCACheckDigit(code) {
  const digits = code.split('').map(Number);
  let sum = 0;
  
  // Sum odd positions (1st, 3rd, 5th, etc.)
  for (let i = 0; i < 11; i += 2) {
    sum += digits[i];
  }
  sum *= 3;
  
  // Sum even positions (2nd, 4th, 6th, etc.)
  for (let i = 1; i < 11; i += 2) {
    sum += digits[i];
  }
  
  // Calculate check digit
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
}

// Generate valid UPC-A code
function generateUPCACode() {
  // Generate first 11 digits
  let code = '';
  for (let i = 0; i < 11; i++) {
    code += Math.floor(Math.random() * 10);
  }
  
  // Calculate and append check digit
  const checkDigit = calculateUPCACheckDigit(code);
  return code + checkDigit;
}

// Create barcode SVG
function createBarcodeSVG(code, width = 150, height = 50) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  JsBarcode(canvas, code, {
    format: 'UPC',
    width: 2,
    height: 40,
    displayValue: true,
    fontSize: 10,
    margin: 0,
    background: '#ffffff',
    lineColor: '#000000'
  });
  
  return canvas.toDataURL('image/svg+xml');
}

export default function BarcodeGeneratorPage() {
  const [count, setCount] = useState(200);
  const [barcodes, setBarcodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef(null);

  const generateBarcodes = () => {
    setIsGenerating(true);
    const newBarcodes = [];
    
    for (let i = 0; i < count; i++) {
      newBarcodes.push(generateUPCACode());
    }
    
    setBarcodes(newBarcodes);
    setIsGenerating(false);
  };

  const downloadPDF = async () => {
    if (barcodes.length === 0) return;
    
    setIsDownloading(true);
    
    try {
      // Create PDF with exact label dimensions: 1.6" x 0.6"
      // In points: 1.6 * 72 = 115.2pt, 0.6 * 72 = 43.2pt
      const labelWidthPt = 115.2; // 1.6 inches in points
      const labelHeightPt = 43.2; // 0.6 inches in points
      
      // Load logo image
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = '/CardSafari.png';
      });
      
      // Create canvas for logo
      const logoCanvas = document.createElement('canvas');
      const logoSize = 120; // High res logo
      logoCanvas.width = logoSize;
      logoCanvas.height = logoSize;
      const logoCtx = logoCanvas.getContext('2d');
      logoCtx.drawImage(logoImg, 0, 0, logoSize, logoSize);
      const logoData = logoCanvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [labelWidthPt, labelHeightPt]
      });
      
      // Layout: logo on left, barcode on right
      // Leave ~30% empty at the bottom, ~15% total horizontal padding
      const horizontalPadding = labelWidthPt * 0.075; // 7.5% on each side
      const usableWidth = labelWidthPt - (horizontalPadding * 2);
      const usableHeight = labelHeightPt * 0.70; // Use top 70% of label
      const topPadding = 2;
      
      const logoDisplaySize = 26; // Logo size in points
      const logoX = horizontalPadding; // Left padding
      const logoY = topPadding + (usableHeight - logoDisplaySize) / 2; // Centered in usable area
      
      const barcodeX = logoX + logoDisplaySize + 4; // After logo with small gap
      const barcodeWidth = usableWidth - logoDisplaySize - 4; // Fill remaining usable width
      const barcodeHeight = usableHeight - 2; // Fit in usable height area
      
      for (let i = 0; i < barcodes.length; i++) {
        if (i > 0) {
          pdf.addPage([labelWidthPt, labelHeightPt], 'landscape');
        }
        
        // Add logo on left
        pdf.addImage(logoData, 'PNG', logoX, logoY, logoDisplaySize, logoDisplaySize);
        
        // Create canvas for barcode
        const canvas = document.createElement('canvas');
        canvas.width = 300; // High resolution
        canvas.height = 120;
        
        JsBarcode(canvas, barcodes[i], {
          format: 'UPC',
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 14,
          margin: 2,
          background: '#ffffff',
          lineColor: '#000000'
        });
        
        // Add barcode to PDF on the right
        const barcodeImgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(barcodeImgData, 'PNG', barcodeX, 2, barcodeWidth, barcodeHeight);
      }
      
      // Download PDF
      pdf.save(`upc-barcodes-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">UPC-A Barcode Generator</h1>
          <p className="text-slate-600 dark:text-slate-400">Generate printable barcodes for 1.6" × 0.6" Rollo labels</p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label htmlFor="count" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Number of Barcodes
              </label>
              <input
                id="count"
                type="number"
                min="0"
                max="1000"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter number of barcodes to generate"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Maximum 1000 barcodes per PDF</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={generateBarcodes}
                disabled={isGenerating || count < 1}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    Generate Barcodes
                  </>
                )}
              </button>

              <button
                onClick={downloadPDF}
                disabled={barcodes.length === 0 || isDownloading}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          {barcodes.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Preview</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">{barcodes.length} barcodes generated</span>
              </div>
              
              {/* Preview Grid */}
              <div 
                ref={previewRef}
                className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 rounded-lg"
              >
                {barcodes.slice(0, 24).map((barcode, index) => (
                  <div key={index} className="bg-white p-1 rounded border border-slate-200 dark:border-slate-600">
                    <img
                      src={createBarcodeSVG(barcode, 60, 20)}
                      alt={`Barcode ${index + 1}`}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
              
              {barcodes.length > 24 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                  Showing first 24 of {barcodes.length} barcodes
                </p>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">Label Specifications</p>
                <ul className="space-y-1">
                  <li>• Size: 1.6" × 0.6" Rollo labels</li>
                  <li>• Format: UPC-A with check digits</li>
                  <li>• Layout: Logo on left, barcode on right</li>
                  <li>• Print with custom paper size: 1.6" × 0.6"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
