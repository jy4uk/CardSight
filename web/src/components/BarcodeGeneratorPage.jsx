import { useMemo, useRef, useState } from 'react';
import { Download, QrCode, Loader2, FileText, Package, Tag } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { fetchInventory } from '../api';

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
  const [priceLabelInput, setPriceLabelInput] = useState('');
  const [isPricePdfDownloading, setIsPricePdfDownloading] = useState(false);
  const [isLoadingInventoryPrices, setIsLoadingInventoryPrices] = useState(false);
  const [repeatByQuantity, setRepeatByQuantity] = useState(false);
  const [labelLengthMm, setLabelLengthMm] = useState(40);
  const previewRef = useRef(null);

  const priceLabels = useMemo(() => {
    const lines = priceLabelInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    return lines
      .map((raw) => {
        const match = raw.replace(/,/g, ' ').match(/\d+(?:\.\d{1,2})?/);
        if (!match) return null;
        const n = Number(match[0]);
        if (Number.isNaN(n)) return null;
        const fixed = n.toFixed(2);
        const csvText = fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed;
        const pdfText = fixed.endsWith('.00') ? `$${fixed.slice(0, -3)}` : `$${fixed}`;
        return {
          raw,
          price: csvText,
          pdfText,
        };
      })
      .filter(Boolean);
  }, [priceLabelInput]);

  const loadPricesFromInventory = async () => {
    setIsLoadingInventoryPrices(true);
    try {
      const data = await fetchInventory();
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch inventory');
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const prices = [];

      for (const item of items) {
        const p = item?.front_label_price ?? item?.purchase_price;
        if (p === null || p === undefined || p === '') continue;
        const n = Number(p);
        if (Number.isNaN(n)) continue;

        const qtyRaw = item?.quantity;
        const qty = repeatByQuantity && qtyRaw != null ? Math.max(1, Number(qtyRaw) || 1) : 1;
        for (let i = 0; i < qty; i++) {
          prices.push(n.toFixed(2));
        }
      }

      setPriceLabelInput(prices.join('\n'));
    } catch (error) {
      console.error('Failed to load inventory prices:', error);
      alert(error?.message || 'Failed to load inventory prices');
    } finally {
      setIsLoadingInventoryPrices(false);
    }
  };

  const downloadPriceLabelsCsv = () => {
    if (priceLabels.length === 0) return;

    const escapeCsv = (value) => {
      const s = String(value ?? '');
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = ['Price', ...priceLabels.map((l) => escapeCsv(l.price))];
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `price-labels-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPriceLabelsPdf = async () => {
    if (priceLabels.length === 0) return;

    setIsPricePdfDownloading(true);
    try {
      // Label dimensions for 12mm tape
      const TAPE_HEIGHT_MM = 12;
      const labelWidthMm = Math.max(25, Math.min(60, Number(labelLengthMm) || 40));

      // Load logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = () => reject(new Error('Failed to load logo'));
        logoImg.src = '/CardSafari.png';
      });

      // Convert logo to base64
      const logoAspect = logoImg.width / logoImg.height;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = logoImg.width;
      tempCanvas.height = logoImg.height;
      tempCanvas.getContext('2d').drawImage(logoImg, 0, 0);
      const logoBase64 = tempCanvas.toDataURL('image/png');

      // Create PDF - portrait orientation means [width, height] is interpreted directly
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [labelWidthMm, TAPE_HEIGHT_MM],
      });

      // Layout constants
      const MARGIN = 0.5;
      const GAP = 1;
      
      // Logo sizing: fit within left portion, max 10mm wide, vertically centered
      const logoMaxWidth = 10;
      const logoMaxHeight = TAPE_HEIGHT_MM - (MARGIN * 2);
      let logoW = logoMaxHeight * logoAspect;
      let logoH = logoMaxHeight;
      if (logoW > logoMaxWidth) {
        logoW = logoMaxWidth;
        logoH = logoW / logoAspect;
      }
      const logoX = MARGIN;
      const logoY = (TAPE_HEIGHT_MM - logoH) / 2;

      // Price area starts after logo + gap
      const priceAreaLeft = logoX + logoW + GAP;
      const priceAreaRight = labelWidthMm - MARGIN;
      const priceAreaWidth = priceAreaRight - priceAreaLeft;

      // Generate each label
      for (let i = 0; i < priceLabels.length; i++) {
        if (i > 0) {
          pdf.addPage([labelWidthMm, TAPE_HEIGHT_MM], 'portrait');
        }

        // Draw logo
        pdf.addImage(logoBase64, 'PNG', logoX, logoY, logoW, logoH);

        // Draw price - right aligned, vertically centered
        const priceText = priceLabels[i].pdfText;
        
        // Start with large font, scale down if needed
        let fontSize = 24;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(fontSize);
        
        let textWidth = pdf.getTextWidth(priceText);
        while (textWidth > priceAreaWidth && fontSize > 8) {
          fontSize -= 1;
          pdf.setFontSize(fontSize);
          textWidth = pdf.getTextWidth(priceText);
        }

        // Calculate vertical center (jsPDF text Y is baseline, so offset by ~1/3 of font height)
        const fontHeightMm = fontSize * 0.353; // approx mm per pt
        const textY = (TAPE_HEIGHT_MM / 2) + (fontHeightMm / 3);

        pdf.setTextColor(0, 0, 0);
        pdf.text(priceText, priceAreaRight, textY, { align: 'right' });
      }

      pdf.save(`price-labels-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating price label PDF:', error);
      alert('Failed to generate price label PDF: ' + error.message);
    } finally {
      setIsPricePdfDownloading(false);
    }
  };

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
    // Label dimensions: 1.6" × 0.6" → 1" = 72pt
    const labelWidthPt = 1.6 * 72;  // 115.2pt
    const labelHeightPt = 0.6 * 72; // 43.2pt

    // Load logo image
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
      logoImg.src = '/beltwayTCG.png'; // Make sure this file exists in your /public folder
    });

    // Create canvas for logo (preserve aspect ratio)
    const logoCanvas = document.createElement('canvas');
    const logoCtx = logoCanvas.getContext('2d');

    const aspectRatio = logoImg.width / logoImg.height;
    const logoHeight = 120;
    const logoWidth = logoHeight * aspectRatio;

    logoCanvas.width = logoWidth;
    logoCanvas.height = logoHeight;

    logoCtx.drawImage(logoImg, 0, 0, logoWidth, logoHeight);
    const logoData = logoCanvas.toDataURL('image/png', 1.0);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [labelWidthPt, labelHeightPt]
    });

    // Layout calculations
    const horizontalPadding = labelWidthPt * 0.075; // 7.5% each side
    const usableWidth = labelWidthPt - (horizontalPadding * 2);
    const usableHeight = labelHeightPt * 0.70; // top 70% for content
    const topPadding = 2;

    // Logo placement
    const logoDisplayHeight = 26;
    const logoDisplayWidth = logoDisplayHeight * aspectRatio;
    const logoX = horizontalPadding;
    const logoY = topPadding + (usableHeight - logoDisplayHeight) / 2;

    // Barcode placement
    const barcodeX = logoX + logoDisplayWidth + 4; // 4pt gap
    const barcodeWidth = usableWidth - logoDisplayWidth - 4;
    const barcodeHeight = usableHeight - 2;

    // Loop through all barcodes
    for (let i = 0; i < barcodes.length; i++) {
      if (i > 0) pdf.addPage([labelWidthPt, labelHeightPt], 'landscape');

      // Add logo
      pdf.addImage(logoData, 'PNG', logoX, logoY, logoDisplayWidth, logoDisplayHeight);

      // Generate barcode on canvas
      const canvas = document.createElement('canvas');
      canvas.width = 300;
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

      const barcodeImgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(barcodeImgData, 'PNG', barcodeX, 2, barcodeWidth, barcodeHeight);
    }

    // Save PDF
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
          <p className="text-slate-600 dark:text-slate-400">Generate printable barcodes for 1.5" × 0.5" Rollo labels</p>
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
                inputMode="decimal"
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

          {/* Price Labels */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">Price Labels</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Paste one price per line. Generates a CSV and a 12mm-tape label PDF using the CardSafari logo on the left and the price on the right.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  For minimal whitespace, set your printer cut option to <span className="font-medium">Small Margin</span> (this is a printer setting; the PDF can’t force it).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                      Label length (mm)
                    </label>
                    <input
                      inputMode="decimal"
                      min="25"
                      max="60"
                      value={labelLengthMm}
                      onChange={(e) => setLabelLengthMm(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">12mm tape height × 25-60mm length</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={loadPricesFromInventory}
                    disabled={isLoadingInventoryPrices}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {isLoadingInventoryPrices ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading inventory...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4" />
                        Load from Inventory
                      </>
                    )}
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Uses `front_label_price` (fallback: `purchase_price`)
                  </span>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 mb-3 select-none">
                  <input
                    type="checkbox"
                    checked={repeatByQuantity}
                    onChange={(e) => setRepeatByQuantity(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600"
                  />
                  Repeat labels by item quantity (if present)
                </label>

                <textarea
                  value={priceLabelInput}
                  onChange={(e) => setPriceLabelInput(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={'12.99\n4.00\n19.50'}
                />

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {priceLabels.length} label{priceLabels.length === 1 ? '' : 's'} parsed
                  </span>
                </div>

                <div className="flex gap-4 mt-4">
                  <button
                    onClick={downloadPriceLabelsCsv}
                    disabled={priceLabels.length === 0}
                    className="flex-1 bg-slate-700 text-white py-3 px-6 rounded-lg font-medium hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download CSV
                  </button>

                  <button
                    onClick={downloadPriceLabelsPdf}
                    disabled={priceLabels.length === 0 || isPricePdfDownloading}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isPricePdfDownloading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Download Label PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
