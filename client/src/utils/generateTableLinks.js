// Script to generate all 25 encrypted table links
import { generateAllTableCodes } from './tableEncryption.js';

// Generate and display all table codes
const generateTableLinks = () => {
  console.log('🔐 FOOD ZONE - ENCRYPTED TABLE LINKS');
  console.log('=====================================');
  console.log('');
  
  const tableCodes = generateAllTableCodes();
  
  tableCodes.forEach(({ tableNumber, encryptedCode, url }) => {
    console.log(`Table ${tableNumber.toString().padStart(2, '0')}: ${url}`);
  });
  
  console.log('');
  console.log('📋 QR CODE GENERATION:');
  console.log('Use these URLs to generate QR codes for each table');
  console.log('');
  console.log('🔒 SECURITY FEATURES:');
  console.log('- Each code is unique and encrypted');
  console.log('- Cannot be guessed or accessed without QR code');
  console.log('- Includes hash verification for authenticity');
  console.log('- Random elements prevent pattern recognition');
  
  return tableCodes;
};

// Export for use in other components
export { generateTableLinks };

// Auto-run when imported in development
if (process.env.NODE_ENV === 'development') {
  generateTableLinks();
}
