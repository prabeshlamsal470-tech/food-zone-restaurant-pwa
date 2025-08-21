// Table encryption utility for secure table access
// Uses a combination of base64 encoding and custom transformation

const SECRET_KEY = 'FZ2024_SECURE_TABLE_ACCESS';

// Generate a hash-like string from table number
const generateTableHash = (tableNumber) => {
  const str = `${SECRET_KEY}_${tableNumber}_${SECRET_KEY}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
};

// Encrypt table number to secure code
export const encryptTableNumber = (tableNumber) => {
  if (!tableNumber || tableNumber < 1 || tableNumber > 25) {
    throw new Error('Invalid table number');
  }
  
  const hash = generateTableHash(tableNumber);
  const encoded = btoa(`${tableNumber}:${hash}`);
  
  // Add some random characters to make it look more complex
  const randomPrefix = Math.random().toString(36).substring(2, 5).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  
  return `${randomPrefix}${encoded}${randomSuffix}`;
};

// Decrypt secure code back to table number
export const decryptTableCode = (encryptedCode) => {
  try {
    if (!encryptedCode || encryptedCode.length < 8) {
      return null;
    }
    
    // Remove random prefix (3 chars) and suffix (2 chars)
    const encoded = encryptedCode.substring(3, encryptedCode.length - 2);
    const decoded = atob(encoded);
    const [tableNumber, hash] = decoded.split(':');
    
    const tableNum = parseInt(tableNumber);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 25) {
      return null;
    }
    
    // Verify hash
    const expectedHash = generateTableHash(tableNum);
    if (hash !== expectedHash) {
      return null;
    }
    
    return tableNum;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Generate all 25 encrypted table codes
export const generateAllTableCodes = () => {
  const tableCodes = [];
  for (let i = 1; i <= 25; i++) {
    tableCodes.push({
      tableNumber: i,
      encryptedCode: encryptTableNumber(i),
      url: `https://foodzone.com.np/${encryptTableNumber(i)}`
    });
  }
  return tableCodes;
};
