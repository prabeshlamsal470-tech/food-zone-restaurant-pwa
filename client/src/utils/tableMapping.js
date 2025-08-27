// Simple table URL mapping for Food Zone tables
// Maps custom URLs to table numbers 1-25

const TABLE_URL_MAPPING = {
  'T1TMToxUFZJMEQ=8W': 1,
  'OHVMjoySFNEWVM=AO': 2,
  'VFQMzo2UEc5WFg=SW': 3,
  '68BNDpBWDQ1WDI=15': 4,
  'JITNTpGNFMxVzc=0I': 5,
  'D5MNjpKQ0ZYVkM=S5': 6,
  'R1MNzpOSzNUVUg=W4': 7,
  'WXMODpSUlJQVE0=HQ': 8,
  'XNWOTpWWkZMU1I=PD': 9,
  'T1ZMTA6WVA5WlQxI8': 10,
  'HKYMTE6VUhNM1RX57': 11,
  'FNIMTI6UTlZN1VSL7': 12,
  'SI9MTM6TTJBQlZNG7': 13,
  '3YPMTQ6SFVNRldIKH': 14,
  '2ROMTU6RE1ZSlhDWL': 15,
  '99FMTY6OUZBTlk3LX': 16,
  'VJ5MTc6NTdNUloyES': 17,
  'FP2MTg6WllWWlg=J2': 18,
  'EEMMTk6MzdPWlo4RY': 19,
  'A52MjA6T1Y2SEg2D6': 20,
  'D67MjE6VDJVREdC3V': 21,
  'ZV4MjI6WEFJOUZHTF': 22,
  'U03MjM6WElYV0tKHS': 23,
  '8PFMjQ6VEJBMExFSF': 24,
  '4L0MjU6UDNNNE054A': 25
};

// Get table number from URL code
export const getTableNumberFromCode = (urlCode) => {
  return TABLE_URL_MAPPING[urlCode] || null;
};

// Get URL code from table number
export const getUrlCodeFromTableNumber = (tableNumber) => {
  const entry = Object.entries(TABLE_URL_MAPPING).find(([code, num]) => num === tableNumber);
  return entry ? entry[0] : null;
};

// Check if URL code is valid
export const isValidTableCode = (urlCode) => {
  return urlCode in TABLE_URL_MAPPING;
};

// Get all table mappings
export const getAllTableMappings = () => {
  return Object.entries(TABLE_URL_MAPPING).map(([code, tableNumber]) => ({
    tableNumber,
    urlCode: code,
    fullUrl: `https://foodzone.com.np/${code}`
  }));
};

export default TABLE_URL_MAPPING;
