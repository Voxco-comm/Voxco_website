const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const workbook = XLSX.readFile(path.join(__dirname, '../Dummy Data for website..xlsx'));
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Found ${data.length} rows in Excel file`);
console.log('First row structure:', Object.keys(data[0]));

// Map the Excel columns to our database fields
// The Excel has these columns (based on the first row):
// OFFERS, __EMPTY (Country), __EMPTY_1 (Number Type), __EMPTY_2 (Specification), 
// PRICING (MRC), __EMPTY_3 (NRC), Other Charges, __EMPTY_4-14 (various fields),
// FEATURES (Voice), __EMPTY_12 (SMS), __EMPTY_13 (Reach), __EMPTY_14 (Emergency Services),
// REQUIREMENTS, __EMPTY_16 (Additional requirements)

const processedData = [];

data.forEach((row, index) => {
  // Skip header row
  if (index === 0) return;
  
  // Skip rows without country
  if (!row.__EMPTY || row.__EMPTY === 'Country') return;
  
  const country = row.__EMPTY;
  const numberType = row.__EMPTY_1 || 'Geographic';
  const specification = row.__EMPTY_2 || '';
  const mrc = parseFloat(row.PRICING) || 0;
  const nrc = parseFloat(row.__EMPTY_3) || 0;
  const currency = row.__EMPTY_9 || 'USD';
  const moq = parseInt(row.__EMPTY_11) || 1;
  
  // Determine SMS/Voice capability
  let smsCapability = 'Both';
  const voiceFeature = row.FEATURES || '';
  const smsFeature = row.__EMPTY_12 || '';
  
  if (smsFeature === 'N/A' && (voiceFeature === '2-way' || voiceFeature === 'inbound' || voiceFeature === 'Outbound')) {
    smsCapability = 'Voice only';
  } else if (smsFeature && smsFeature !== 'N/A' && !voiceFeature) {
    smsCapability = 'SMS only';
  } else if (smsFeature === 'N/A' && !voiceFeature) {
    smsCapability = 'Voice only'; // Default if no info
  }
  
  // Determine direction
  let direction = 'Both';
  if (voiceFeature === 'inbound' || smsFeature === 'Inbound Only') {
    direction = 'Inbound only';
  } else if (voiceFeature === 'Outbound' || smsFeature === 'Outbound Only') {
    direction = 'Outbound only';
  } else if (voiceFeature === '2-way') {
    direction = 'Both';
  }
  
  // Build other_charges JSON
  const otherCharges = {
    inbound_call: parseFloat(row['Other Charges']) || 0,
    outbound_call_fixed: parseFloat(row.__EMPTY_4) || 0,
    outbound_call_mobile: parseFloat(row.__EMPTY_5) || 0,
    inbound_sms: row.__EMPTY_6 === 'N/A' ? null : (parseFloat(row.__EMPTY_6) || 0),
    outbound_sms: row.__EMPTY_7 === 'N/A' ? null : (parseFloat(row.__EMPTY_7) || 0),
    other_fees: row.__EMPTY_8 === 'N/A' ? null : row.__EMPTY_8,
    bill_pulse: row.__EMPTY_10 || null,
  };
  
  // Build features JSON
  const features = {
    voice: voiceFeature || null,
    sms: smsFeature === 'N/A' ? null : smsFeature,
    reach: row.__EMPTY_13 || null,
    emergency_services: row.__EMPTY_14 === 'N/A' ? null : row.__EMPTY_14,
  };
  
  // Build requirements text
  const requirements = [row.REQUIREMENTS, row.__EMPTY_16].filter(Boolean).join(', ');
  
  processedData.push({
    supplier: row.OFFERS || '',
    country: country,
    number_type: numberType,
    specification: specification,
    mrc: mrc,
    nrc: nrc,
    currency: currency,
    moq: moq,
    sms_capability: smsCapability,
    direction: direction,
    other_charges: otherCharges,
    features: features,
    requirements: requirements,
  });
});

console.log(`\nProcessed ${processedData.length} valid rows`);
console.log('\nSample processed data:');
console.log(JSON.stringify(processedData.slice(0, 3), null, 2));

// Save to JSON file for review
fs.writeFileSync(
  path.join(__dirname, '../processed-numbers-data.json'),
  JSON.stringify(processedData, null, 2)
);

console.log('\nProcessed data saved to processed-numbers-data.json');

// Generate SQL import script
const countries = [...new Set(processedData.map(d => d.country))];
console.log(`\nCountries found: ${countries.join(', ')}`);

// Note: This script processes the data. The actual import will need to:
// 1. Ensure countries exist in the database
// 2. Map countries to country_ids
// 3. Generate actual phone numbers (since Excel doesn't have them)
// 4. Insert into the numbers table

console.log('\nNext steps:');
console.log('1. Review processed-numbers-data.json');
console.log('2. Ensure all countries exist in the database');
console.log('3. Generate phone numbers based on specification/prefix');
console.log('4. Import the data using the file upload feature or SQL script');



