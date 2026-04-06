/**
 * Barcode parsing & label auto-population
 */

export const barcodeParser = {
  /**
   * Parse barcode and extract product info
   * Supports EAN-13, QR codes, custom formats
   */
  parseBarcode(barcodeValue) {
    if (!barcodeValue || barcodeValue.length === 0) {
      return null;
    }

    // EAN-13 format check
    if (/^\d{13}$/.test(barcodeValue)) {
      return {
        type: 'ean13',
        value: barcodeValue,
        checksum: this.validateEAN13(barcodeValue),
      };
    }

    // EAN-8 format check
    if (/^\d{8}$/.test(barcodeValue)) {
      return {
        type: 'ean8',
        value: barcodeValue,
        checksum: this.validateEAN8(barcodeValue),
      };
    }

    // QR code (JSON embedded)
    try {
      const parsed = JSON.parse(barcodeValue);
      if (parsed.sku && parsed.name) {
        return {
          type: 'qr',
          value: barcodeValue,
          data: parsed,
        };
      }
    } catch (e) {
      // Not JSON, continue
    }

    // Custom format: SKU|NAME|PRICE
    if (barcodeValue.includes('|')) {
      const parts = barcodeValue.split('|');
      return {
        type: 'custom',
        value: barcodeValue,
        sku: parts[0],
        name: parts[1],
        price: parseFloat(parts[2]) || 0,
      };
    }

    return {
      type: 'unknown',
      value: barcodeValue,
    };
  },

  /**
   * Validate EAN-13 checksum
   */
  validateEAN13(code) {
    if (code.length !== 13) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(code[12]);
  },

  /**
   * Validate EAN-8 checksum
   */
  validateEAN8(code) {
    if (code.length !== 8) return false;
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(code[7]);
  },
};