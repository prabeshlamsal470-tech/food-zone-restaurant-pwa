// Table URL Mapping System
// Maps unique URLs to numeric table IDs for security while maintaining simplicity

const TABLE_URL_MAPPINGS = {
  // Table 1-5
  'table-alpha-7': 1,
  'table-bravo-12': 2,
  'table-charlie-9': 3,
  'table-delta-15': 4,
  'table-echo-3': 5,
  
  // Table 6-10
  'table-foxtrot-21': 6,
  'table-golf-8': 7,
  'table-hotel-14': 8,
  'table-india-6': 9,
  'table-juliet-19': 10,
  
  // Table 11-15
  'table-kilo-11': 11,
  'table-lima-25': 12,
  'table-mike-4': 13,
  'table-november-17': 14,
  'table-oscar-22': 15,
  
  // Table 16-20
  'table-papa-13': 16,
  'table-quebec-5': 17,
  'table-romeo-18': 18,
  'table-sierra-10': 19,
  'table-tango-24': 20,
  
  // Table 21-25
  'table-uniform-2': 21,
  'table-victor-16': 22,
  'table-whiskey-20': 23,
  'table-xray-1': 24,
  'table-yankee-23': 25
};

// Reverse mapping for getting URL from table number
const TABLE_NUMBER_TO_URL = {};
Object.entries(TABLE_URL_MAPPINGS).forEach(([url, tableNumber]) => {
  TABLE_NUMBER_TO_URL[tableNumber] = url;
});

/**
 * Get table number from URL path
 * @param {string} urlPath - The URL path (e.g., 'table-alpha-7')
 * @returns {number|null} - Table number or null if not found
 */
export function getTableNumberFromUrl(urlPath) {
  // Remove leading slash if present
  const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  return TABLE_URL_MAPPINGS[cleanPath] || null;
}

/**
 * Get URL from table number
 * @param {number} tableNumber - The table number (1-25)
 * @returns {string|null} - URL path or null if not found
 */
export function getUrlFromTableNumber(tableNumber) {
  return TABLE_NUMBER_TO_URL[tableNumber] || null;
}

/**
 * Check if a URL path is a valid table URL
 * @param {string} urlPath - The URL path to check
 * @returns {boolean} - True if valid table URL
 */
export function isValidTableUrl(urlPath) {
  const cleanPath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  return cleanPath in TABLE_URL_MAPPINGS;
}

/**
 * Get all table URLs for QR code generation
 * @returns {Array} - Array of {tableNumber, url, fullUrl} objects
 */
export function getAllTableUrls(baseUrl = 'https://foodzoneduwakot.netlify.app') {
  return Object.entries(TABLE_URL_MAPPINGS).map(([url, tableNumber]) => ({
    tableNumber,
    url,
    fullUrl: `${baseUrl}/${url}`,
    qrText: `Table ${tableNumber}`
  }));
}

export default {
  getTableNumberFromUrl,
  getUrlFromTableNumber,
  isValidTableUrl,
  getAllTableUrls,
  TABLE_URL_MAPPINGS,
  TABLE_NUMBER_TO_URL
};
