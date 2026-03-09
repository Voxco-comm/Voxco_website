import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Free LLM API options:
// 1. Groq (recommended - fast & free): GROQ_API_KEY from https://console.groq.com/keys
// 2. Hugging Face: HUGGINGFACE_API_KEY from https://huggingface.co/settings/tokens
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const HUGGINGFACE_API_URL = 'https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2'

interface CountryRequirementsRequest {
  countryName: string
  countryCode?: string
  countryId?: string
  numberType?: string
  direction?: string
  smsCapability?: string
  provider?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CountryRequirementsRequest = await request.json()
    const { countryName, countryCode, countryId, numberType, direction, smsCapability, provider } = body

    if (!countryName) {
      return NextResponse.json(
        { error: 'Country name is required' },
        { status: 400 }
      )
    }

    // Try to get cached requirements from database first
    // Only use cache if it's not older than 1 month
    if (countryId && numberType && direction && smsCapability) {
      const supabase = await createClient()

      // Calculate date 1 month ago
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      // Check for existing requirements matching the combination that are less than 1 month old
      const { data: cachedReq, error: cacheError } = await supabase
        .from('number_requirements')
        .select('requirements, updated_at')
        .eq('country_id', countryId)
        .eq('number_type', numberType)
        .eq('direction', direction)
        .eq('sms_capability', smsCapability)
        .gte('updated_at', oneMonthAgo.toISOString())
        .single()

      if (!cacheError && cachedReq?.requirements && Object.keys(cachedReq.requirements).length > 0) {
        // Return cached requirements (less than 1 month old)
        const prefixAreaCode = await getPrefixAreaCode(countryName, countryCode)
        console.log(`Using cached requirements for ${countryName} (updated: ${cachedReq.updated_at})`)
        return NextResponse.json({
          requirements: cachedReq.requirements,
          prefix_area_code: prefixAreaCode,
          cached: true,
        })
      }
    }

    // Use Hugging Face Inference API to generate requirements
    const combinationContext = `
- Number Type: ${numberType || 'Geographic'}
- Direction: ${direction || 'Both (Inbound and Outbound)'}
- SMS Capability: ${smsCapability || 'Both (SMS and Voice)'}`

    const prompt = `You are an expert in telecommunications regulations. Provide detailed regulatory requirements for phone number allocation in ${countryName}${provider ? ` from provider ${provider}` : ''}.

Consider these specific parameters:${combinationContext}

Return a JSON object with this exact structure:
{
  "number_allocation": {
    "end_user_documentation": {
      "individual": ["list of required documents for individuals"],
      "business": ["list of required documents for businesses"]
    },
    "address_requirements": "description of address requirements"
  },
  "sub_allocation": {
    "allowed": true or false,
    "rules": "description of sub-allocation rules"
  },
  "number_porting": {
    "end_user_documentation": {
      "individual": ["list of required documents for porting"],
      "business": ["list of required documents for porting"]
    },
    "process_notes": "description of porting process"
  }
}

Make sure the language is in English.
Make sure the JSON is valid.
Make sure the JSON is not empty.
Make sure the JSON is not null.
Make sure the JSON is not undefined.
Make sure the JSON is not an empty object.
Make sure the JSON is not an empty array.
Make sure the JSON is not an empty string.
Make sure the JSON is not an empty number.
Make sure the JSON is not an empty boolean.
Be specific and accurate. If information is not available, use reasonable defaults based on common telecommunications regulations.`

    let requirements
    const groqApiKey = process.env.GROQ_API_KEY
    const hfApiKey = process.env.HUGGINGFACE_API_KEY

    // Try Groq API first (recommended - faster and more reliable)
    if (groqApiKey) {
      try {
        const groqResponse = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: 'You are an expert in telecommunications regulations. Always respond with valid JSON only, no additional text.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        })

        if (groqResponse.ok) {
          const groqData = await groqResponse.json()
          const generatedText = groqData.choices?.[0]?.message?.content || ''
          console.log('Groq generated text:', generatedText)

          try {
            // const jsonMatch = generatedText.match(/\{[\s\S]*\}/)

            requirements = JSON.parse(generatedText)
            console.log('Groq requirements:', requirements)

          } catch (parseError) {
            console.error('Failed to parse Groq response:', parseError)
          }
        } else {
          console.error('Groq API error:', await groqResponse.text())
        }
      } catch (apiError) {
        console.error('Groq API call failed:', apiError)
      }
    }
    // Fall back to Hugging Face if Groq didn't work
    else if (hfApiKey && !requirements) {
      try {
        const hfResponse = await fetch(HUGGINGFACE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hfApiKey}`,
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 1000,
              temperature: 0.7,
              return_full_text: false,
            },
          }),
        })

        if (hfResponse.ok) {
          const hfData = await hfResponse.json()
          let generatedText = ''

          if (Array.isArray(hfData) && hfData[0]?.generated_text) {
            generatedText = hfData[0].generated_text
          } else if (hfData.generated_text) {
            generatedText = hfData.generated_text
          } else if (typeof hfData === 'string') {
            generatedText = hfData
          }

          try {
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              requirements = JSON.parse(jsonMatch[0])
            }
          } catch (parseError) {
            console.error('Failed to parse HF response:', parseError)
          }
        } else {
          console.error('Hugging Face API error:', await hfResponse.text())
        }
      } catch (apiError) {
        console.error('Hugging Face API call failed:', apiError)
      }
    } else if (!groqApiKey && !hfApiKey) {
      console.log('No API key set (GROQ_API_KEY or HUGGINGFACE_API_KEY), using default requirements')
    }

    // Fallback to default requirements if API didn't return valid data
    if (!requirements) {
      requirements = getDefaultRequirements(countryName, provider)
    }

    // Get prefix/area code information (simplified - you might want to use a separate API)
    const prefixAreaCode = await getPrefixAreaCode(countryName, countryCode)
    console.log('Prefix/area code:', prefixAreaCode, countryId, numberType, direction, smsCapability)

    // Cache the requirements in the database if we have the necessary IDs
    if (countryId && numberType && direction && smsCapability) {
      try {
        const supabase = await createClient();
        console.log('Inserting requirements...'); // Better log message
    
        const { data, error } = await supabase
          .from('number_requirements')
          .insert({
            country_id: countryId,
            number_type: numberType,
            direction: direction,
            sms_capability: smsCapability,
            requirements: requirements,
            updated_at: new Date().toISOString(),
          })
          .select(); // Optional: adds the inserted row to 'data' for confirmation
    
        if (error) {
          console.warn('Failed to insert requirements:', error.message, error);
          // Or throw error if you want it to bubble up
        } else {
          console.log('Successfully inserted:', data);
        }
      } catch (cacheErr) {
        console.warn('Failed to cache requirements:', cacheErr);
      }
    }

    return NextResponse.json({
      requirements,
      prefix_area_code: prefixAreaCode,
      cached: false,
    })
  } catch (error: any) {
    console.error('Error fetching country requirements:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch country requirements',
        message: error.message,
        requirements: getDefaultRequirements('Unknown', undefined),
        prefix_area_code: { prefixes: [], area_codes: [] },
      },
      { status: 500 }
    )
  }
}

function getDefaultRequirements(countryName: string, provider?: string): any {
  return {
    number_allocation: {
      end_user_documentation: {
        individual: [
          'Government-issued ID',
          'Proof of address (utility bill or bank statement)',
          'Recent phone invoice (if applicable)',
        ],
        business: [
          'Business registration certificate',
          'Commercial registry document',
          'Proof of business address',
          'Authorized representative ID',
        ],
      },
      address_requirements: `Valid address in ${countryName} is required for geographic numbers.`,
    },
    sub_allocation: {
      allowed: true,
      rules: `Sub-allocation rules for ${countryName}${provider ? ` (${provider})` : ''}. Please verify with local regulator.`,
    },
    number_porting: {
      end_user_documentation: {
        individual: ['Recent phone invoice from current provider', 'Account PIN/Password'],
        business: [
          'Recent phone invoice from current provider',
          'Business authorization letter',
          'Account PIN/Password',
        ],
      },
      process_notes: `Number porting process for ${countryName} typically takes 5-15 business days after document validation.`,
    },
  }
}

async function getPrefixAreaCode(
  countryName: string,
  countryCode?: string
): Promise<{ prefixes: string[]; area_codes: string[] }> {
  // Comprehensive list of country phone prefixes and major area codes
  const countryPrefixMap: Record<string, { prefix: string; areaCodes: string[] }> = {
    // North America
    'United States': { prefix: '+1', areaCodes: ['201', '202', '203', '212', '213', '214', '305', '310', '312', '323', '347', '404', '415', '469', '480', '503', '512', '602', '617', '646', '650', '702', '713', '718', '786', '818', '832', '858', '917', '929', '949'] },
    'Canada': { prefix: '+1', areaCodes: ['204', '226', '236', '249', '250', '289', '306', '343', '365', '403', '416', '418', '431', '437', '438', '450', '506', '514', '519', '548', '579', '581', '587', '604', '613', '639', '647', '705', '709', '778', '780', '807', '819', '825', '867', '873', '902', '905'] },
    'Mexico': { prefix: '+52', areaCodes: ['55', '33', '81', '222', '442', '662', '744', '998'] },

    // Europe
    'United Kingdom': { prefix: '+44', areaCodes: ['20', '21', '23', '24', '28', '29', '113', '114', '115', '116', '117', '118', '121', '131', '141', '151', '161', '171', '181', '191'] },
    'Germany': { prefix: '+49', areaCodes: ['30', '40', '69', '89', '211', '221', '231', '341', '351', '361', '371', '381', '391', '421', '431', '441', '451', '461', '471', '481', '511', '521', '531', '541', '551', '561', '571', '581', '611', '621', '631', '641', '651', '661', '671', '681', '711', '721', '731', '741', '751', '761', '771', '781', '791', '811', '821', '831', '841', '851', '861', '871', '881', '911', '921', '931', '941', '951', '961', '971', '981', '991'] },
    'France': { prefix: '+33', areaCodes: ['1', '2', '3', '4', '5', '6', '7', '9'] },
    'Italy': { prefix: '+39', areaCodes: ['02', '06', '010', '011', '040', '041', '045', '049', '050', '051', '055', '059', '070', '071', '075', '079', '080', '081', '085', '089', '090', '091', '095', '099'] },
    'Spain': { prefix: '+34', areaCodes: ['91', '93', '94', '95', '96', '971', '972', '973', '974', '975', '976', '977', '978', '979', '980', '981', '982', '983', '984', '985', '986', '987', '988'] },
    'Netherlands': { prefix: '+31', areaCodes: ['10', '13', '14', '15', '20', '23', '24', '26', '30', '33', '35', '36', '38', '40', '43', '45', '46', '50', '53', '55', '58', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79'] },
    'Belgium': { prefix: '+32', areaCodes: ['2', '3', '4', '9', '10', '11', '12', '13', '14', '15', '16', '19', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '63', '64', '65', '67', '68', '69', '71', '80', '81', '82', '83', '84', '85', '86', '87', '89'] },
    'Switzerland': { prefix: '+41', areaCodes: ['21', '22', '24', '26', '27', '31', '32', '33', '34', '41', '43', '44', '52', '55', '56', '58', '61', '62', '71', '81', '91'] },
    'Austria': { prefix: '+43', areaCodes: ['1', '316', '512', '662', '732'] },
    'Poland': { prefix: '+48', areaCodes: ['12', '22', '32', '42', '52', '58', '61', '71', '81', '85', '89', '91', '94'] },
    'Portugal': { prefix: '+351', areaCodes: ['21', '22', '231', '232', '233', '234', '235', '236', '238', '239', '241', '242', '243', '244', '245', '249', '251', '252', '253', '254', '255', '256', '258', '259', '261', '262', '263', '265', '266', '268', '269', '271', '272', '273', '274', '275', '276', '277', '278', '279', '281', '282', '283', '284', '285', '286', '289', '291', '292', '295', '296'] },
    'Sweden': { prefix: '+46', areaCodes: ['8', '31', '40', '42', '46', '90'] },
    'Norway': { prefix: '+47', areaCodes: ['21', '22', '23', '31', '32', '33', '35', '37', '38', '51', '52', '53', '55', '56', '57', '61', '62', '63', '66', '67', '69', '71', '72', '73', '74', '75', '76', '77', '78', '79'] },
    'Denmark': { prefix: '+45', areaCodes: [] },
    'Finland': { prefix: '+358', areaCodes: ['9', '13', '14', '15', '16', '17', '19', '2', '3', '5', '6', '8'] },
    'Ireland': { prefix: '+353', areaCodes: ['1', '21', '22', '23', '24', '25', '26', '27', '28', '29', '402', '404', '41', '42', '43', '44', '45', '46', '47', '49', '504', '505', '506', '509', '51', '52', '53', '56', '57', '58', '59', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '74', '76', '90', '91', '93', '94', '95', '96', '97', '98', '99'] },
    'Greece': { prefix: '+30', areaCodes: ['21', '22', '23', '24', '25', '26', '27', '28'] },
    'Czech Republic': { prefix: '+420', areaCodes: ['2', '311', '312', '313', '314', '315', '316', '317', '318', '319', '321', '325', '326', '327', '328', '37', '38', '39', '41', '46', '47', '48', '49', '51', '53', '54', '55', '56', '57', '58', '59'] },
    'Hungary': { prefix: '+36', areaCodes: ['1', '22', '23', '24', '25', '26', '27', '28', '29', '32', '33', '34', '35', '36', '37', '42', '44', '45', '46', '47', '48', '49', '52', '53', '54', '56', '57', '59', '62', '63', '66', '68', '69', '72', '73', '74', '75', '76', '77', '78', '79', '82', '83', '84', '85', '87', '88', '89', '92', '93', '94', '95', '96', '99'] },
    'Romania': { prefix: '+40', areaCodes: ['21', '31', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241', '242', '243', '244', '245', '246', '247', '248', '249', '250', '251', '252', '253', '254', '255', '256', '257', '258', '259', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269'] },
    'Bulgaria': { prefix: '+359', areaCodes: ['2', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '41', '42', '43', '44', '45', '46', '47', '48', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '68', '69', '71', '72', '73', '74', '75', '76', '77', '78', '79', '82', '84', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'] },
    'Croatia': { prefix: '+385', areaCodes: ['1', '20', '21', '22', '23', '31', '32', '33', '34', '35', '40', '42', '43', '44', '47', '48', '49', '51', '52', '53'] },
    'Slovakia': { prefix: '+421', areaCodes: ['2', '31', '32', '33', '34', '35', '36', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '51', '52', '53', '54', '55', '56', '57', '58'] },
    'Slovenia': { prefix: '+386', areaCodes: ['1', '2', '3', '4', '5', '7'] },
    'Serbia': { prefix: '+381', areaCodes: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39'] },
    'Ukraine': { prefix: '+380', areaCodes: ['44', '45', '46', '47', '48', '51', '52', '53', '54', '55', '56', '57', '61', '62', '63', '64', '65', '66', '67', '68', '69'] },
    'Russia': { prefix: '+7', areaCodes: ['495', '499', '812', '343', '383', '351', '846', '831', '861', '863', '843', '347', '391', '473', '342', '4012', '4722', '8442', '8452', '8552', '8652', '8672', '8712'] },
    'Turkey': { prefix: '+90', areaCodes: ['212', '216', '224', '232', '242', '252', '262', '272', '282', '312', '322', '324', '332', '342', '352', '362', '372', '382', '392', '412', '422', '432', '442', '452', '462', '472', '482'] },
    'Luxembourg': { prefix: '+352', areaCodes: [] },
    'Malta': { prefix: '+356', areaCodes: ['21', '22', '23', '25', '27'] },
    'Cyprus': { prefix: '+357', areaCodes: ['22', '23', '24', '25', '26'] },
    'Iceland': { prefix: '+354', areaCodes: [] },
    'Estonia': { prefix: '+372', areaCodes: ['2', '32', '33', '34', '35', '38', '39', '44', '45', '46', '47', '48', '6', '7'] },
    'Latvia': { prefix: '+371', areaCodes: ['2', '63', '64', '65', '66', '67'] },
    'Lithuania': { prefix: '+370', areaCodes: ['310', '313', '315', '318', '319', '340', '342', '343', '345', '346', '347', '349', '37', '380', '381', '382', '383', '385', '386', '387', '389', '41', '421', '422', '425', '426', '427', '428', '440', '441', '443', '444', '445', '446', '447', '448', '449', '450', '451', '452', '453', '454', '455', '456', '457', '458', '459', '460', '464', '469', '5', '6', '7', '8'] },
    'Albania': { prefix: '+355', areaCodes: ['4', '22', '23', '24', '26', '27', '32', '33', '34', '35', '36', '52', '53', '54', '55', '56', '57', '58', '59', '62', '63', '64', '65', '66', '67', '68', '69', '82', '83', '84', '85', '86', '87', '88', '89'] },
    'North Macedonia': { prefix: '+389', areaCodes: ['2', '31', '32', '33', '34', '42', '43', '44', '45', '46', '47', '48'] },
    'Montenegro': { prefix: '+382', areaCodes: ['20', '30', '31', '32', '33', '40', '41', '50', '51', '52', '67', '68', '69'] },
    'Bosnia and Herzegovina': { prefix: '+387', areaCodes: ['30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59'] },
    'Moldova': { prefix: '+373', areaCodes: ['22', '230', '231', '235', '236', '237', '241', '242', '243', '244', '246', '247', '248', '249', '250', '251', '252', '254', '256', '258', '259', '262', '263', '264', '265', '268', '269', '271', '272', '273', '291', '293', '294', '297', '298', '299'] },
    'Belarus': { prefix: '+375', areaCodes: ['152', '154', '162', '163', '165', '17', '174', '176', '177', '178', '212', '214', '216', '222', '2232', '2233', '2234', '2235', '2236', '2237', '2238', '2239', '2240', '2241', '2242', '2243', '2244', '2245', '2246', '2247', '2248', '232', '236', '29', '33', '44'] },

    // Asia
    'China': { prefix: '+86', areaCodes: ['10', '20', '21', '22', '23', '24', '25', '27', '28', '29', '311', '312', '313', '314', '315', '316', '317', '318', '319', '351', '352', '353', '354', '355', '356', '357', '358', '359', '371', '372', '373', '374', '375', '376', '377', '378', '379', '391', '392', '393', '394', '395', '396', '411', '412', '413', '414', '415', '416', '417', '418', '419', '431', '432', '433', '434', '435', '436', '437', '438', '439', '451', '452', '453', '454', '455', '456', '457', '458', '459', '471', '472', '473', '474', '475', '476', '477', '478', '479', '511', '512', '513', '514', '515', '516', '517', '518', '519', '531', '532', '533', '534', '535', '536', '537', '538', '539', '551', '552', '553', '554', '555', '556', '557', '558', '559', '571', '572', '573', '574', '575', '576', '577', '578', '579', '591', '592', '593', '594', '595', '596', '597', '598', '599', '731', '732', '733', '734', '735', '736', '737', '738', '739', '751', '752', '753', '754', '755', '756', '757', '758', '759', '760', '762', '763', '766', '768', '769', '771', '772', '773', '774', '775', '776', '777', '778', '779', '791', '792', '793', '794', '795', '796', '797', '798', '799', '812', '813', '816', '817', '818', '819', '831', '832', '833', '834', '835', '836', '837', '838', '839', '851', '852', '853', '854', '855', '856', '857', '858', '859', '871', '872', '873', '874', '875', '876', '877', '878', '879', '891', '892', '893', '894', '895', '896', '897', '898', '899', '898', '901', '902', '903', '906', '908', '909', '911', '912', '913', '914', '915', '916', '917', '919', '931', '932', '933', '934', '935', '936', '937', '938', '939', '941', '943', '951', '952', '953', '954', '955', '956', '957', '971', '972', '973', '974', '975', '976', '979', '991', '992', '993', '994', '995', '996', '997', '998', '999'] },
    'Japan': { prefix: '+81', areaCodes: ['3', '6', '11', '22', '25', '26', '27', '28', '29', '42', '43', '44', '45', '46', '47', '48', '49', '52', '53', '54', '55', '58', '59', '72', '73', '75', '76', '77', '78', '79', '82', '83', '84', '86', '87', '88', '89', '92', '93', '95', '96', '97', '98', '99'] },
    'South Korea': { prefix: '+82', areaCodes: ['2', '31', '32', '33', '41', '42', '43', '44', '51', '52', '53', '54', '55', '61', '62', '63', '64'] },
    'India': { prefix: '+91', areaCodes: ['11', '20', '22', '33', '40', '44', '79', '80', '120', '124', '129', '135', '141', '144', '145', '151', '154', '160', '161', '164', '172', '175', '177', '180', '181', '183', '184', '186', '191', '194', '212', '217', '218', '221', '228', '230', '231', '233', '234', '235', '236', '237', '238', '240', '241', '250', '251', '253', '257', '260', '261', '262', '263', '265', '268', '278', '281', '285', '286', '288', '291', '294', '295', '341', '342', '343', '345', '347', '350', '351', '353', '354', '355', '357', '360', '361', '364', '369', '373', '381', '385', '389', '422', '423', '424', '427', '431', '435', '442', '444', '452', '454', '462', '465', '471', '474', '477', '481', '484', '485', '487', '491', '497', '512', '515', '522', '532', '535', '542', '545', '548', '551', '552', '562', '565', '568', '571', '581', '585', '591', '595', '612', '621', '631', '641', '651', '657', '661', '663', '671', '674', '680', '712', '721', '731', '744', '751', '755', '761', '771', '788', '821', '824', '831', '836', '838', '863', '866', '870', '877', '884', '891'] },
    'Indonesia': { prefix: '+62', areaCodes: ['21', '22', '24', '31', '341', '342', '343', '351', '352', '353', '354', '355', '356', '357', '358', '361', '362', '363', '364', '365', '366', '367', '368', '370', '371', '372', '373', '376', '380', '381', '382', '383', '384', '385', '386', '387', '388', '389', '401', '402', '403', '404', '405', '408', '410', '411', '413', '414', '417', '418', '419', '420', '421', '422', '423', '424', '426', '427', '428', '429', '430', '431', '432', '434', '435', '438', '443', '451', '452', '453', '454', '455', '458', '461', '464', '465', '471', '472', '473', '474', '481', '482', '484', '485', '511', '512', '513', '514', '517', '518', '519', '522', '525', '526', '527', '528', '532', '534', '536', '537', '538', '539', '541', '542', '545', '548', '549', '551', '553', '556', '558', '561', '562', '563', '564', '565', '567', '568', '571', '581', '583', '585', '586', '610', '620', '621', '622', '623', '624', '625', '626', '627', '628', '629', '631', '632', '633', '634', '635', '636', '639', '641', '642', '643', '644', '645', '646', '650', '651', '652', '653', '654', '655', '656', '657', '658', '659', '711', '712', '713', '714', '715', '716', '717', '718', '719', '721', '722', '723', '724', '725', '726', '727', '728', '729', '730', '731', '732', '733', '734', '735', '736', '737', '738', '739', '741', '743', '745', '746', '747', '748', '751', '752', '753', '754', '755', '756', '757', '758', '759', '760', '761', '762', '763', '764', '765', '766', '767', '768', '769', '770', '771', '772', '773', '774', '775', '776', '777', '778', '779', '811', '812', '813', '814', '816', '817', '818', '901', '902', '903', '904', '951', '952', '953', '954', '955', '956', '957', '958', '959', '966', '967', '969', '971', '975', '977', '978', '979', '981', '983', '984', '986'] },
    'Thailand': { prefix: '+66', areaCodes: ['2', '32', '33', '34', '35', '36', '37', '38', '39', '42', '43', '44', '45', '52', '53', '54', '55', '56', '73', '74', '75', '76', '77'] },
    'Vietnam': { prefix: '+84', areaCodes: ['24', '28', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212', '213', '214', '215', '216', '218', '219', '220', '221', '222', '225', '226', '227', '228', '229', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241', '251', '252', '254', '255', '256', '257', '258', '259', '260', '261', '262', '263', '269', '270', '271', '272', '273', '274', '275', '276', '277', '290', '291', '292', '293', '294', '296', '297', '299'] },
    'Philippines': { prefix: '+63', areaCodes: ['2', '32', '33', '34', '35', '36', '38', '42', '43', '44', '45', '46', '47', '48', '49', '52', '53', '54', '55', '56', '62', '63', '64', '65', '68', '72', '74', '75', '77', '78', '82', '83', '84', '85', '86', '87', '88'] },
    'Malaysia': { prefix: '+60', areaCodes: ['3', '4', '5', '6', '7', '82', '83', '84', '85', '86', '87', '88', '89', '9'] },
    'Singapore': { prefix: '+65', areaCodes: ['6'] },
    'Hong Kong': { prefix: '+852', areaCodes: ['2', '3', '5', '6', '9'] },
    'Taiwan': { prefix: '+886', areaCodes: ['2', '3', '4', '5', '6', '7', '8', '37', '49', '89'] },
    'Pakistan': { prefix: '+92', areaCodes: ['21', '42', '51', '52', '41', '61', '22', '71', '81', '91', '68', '62', '53', '55', '56', '48', '44', '46', '57', '64', '47', '454', '63', '66', '243', '244', '922', '923', '297'] },
    'Bangladesh': { prefix: '+880', areaCodes: ['2', '31', '41', '421', '431', '441', '451', '461', '468', '471', '481', '491', '501', '511', '521', '531', '541', '551', '561', '571', '581', '591', '601', '611', '621', '631', '641', '651', '661', '671', '681', '691', '701', '721', '731', '741', '751', '761', '771', '781', '791', '801', '811', '821', '822', '831', '841', '851', '861', '871', '881', '891', '901', '911', '921', '922', '923', '924', '925', '926', '927', '928', '929', '930', '931', '941', '951', '961'] },
    'Sri Lanka': { prefix: '+94', areaCodes: ['11', '21', '23', '24', '25', '26', '27', '31', '32', '33', '34', '35', '36', '37', '38', '41', '45', '47', '51', '52', '54', '55', '57', '63', '65', '66', '67', '81', '91'] },
    'Nepal': { prefix: '+977', areaCodes: ['1', '10', '21', '23', '24', '25', '26', '27', '29', '31', '33', '35', '36', '37', '38', '41', '42', '44', '46', '47', '48', '51', '53', '56', '57', '61', '63', '64', '66', '67', '68', '69', '71', '74', '75', '76', '77', '78', '79', '81', '82', '83', '84', '87', '91', '92', '93', '94', '95', '96', '97', '99'] },
    'Myanmar': { prefix: '+95', areaCodes: ['1', '2', '42', '43', '45', '51', '52', '53', '54', '55', '56', '57', '58', '59', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89'] },
    'Cambodia': { prefix: '+855', areaCodes: ['23', '24', '25', '26', '32', '33', '34', '35', '36', '42', '43', '44', '52', '53', '54', '55', '62', '63', '64', '65', '66', '72', '73', '74', '75'] },
    'Laos': { prefix: '+856', areaCodes: ['20', '21', '23', '25', '28', '30', '31', '34', '36', '38', '41', '42', '45', '51', '52', '54', '55', '56', '58', '61', '64', '71', '74', '81', '84', '86', '88'] },
    'Mongolia': { prefix: '+976', areaCodes: ['11', '12', '13', '14', '15', '21', '22', '23', '24', '25', '26', '31', '32', '33', '34', '35', '36', '37', '38', '41', '42', '43', '44', '45', '46', '48', '51', '52', '54', '56', '58', '62', '63', '70', '75', '76', '84', '85', '86'] },
    'Kazakhstan': { prefix: '+7', areaCodes: ['7172', '7212', '7222', '7232', '7242', '7252', '7262', '7272', '7282', '7292', '7302', '7312', '7322', '7332', '7342', '7352', '7362', '7372'] },
    'Uzbekistan': { prefix: '+998', areaCodes: ['61', '62', '63', '65', '66', '67', '69', '71', '72', '73', '74', '75', '76', '79'] },
    'Saudi Arabia': { prefix: '+966', areaCodes: ['11', '12', '13', '14', '16', '17', '2', '3', '4', '6', '7'] },
    'United Arab Emirates': { prefix: '+971', areaCodes: ['2', '3', '4', '6', '7', '9', '50', '52', '54', '55', '56'] },
    'Qatar': { prefix: '+974', areaCodes: [] },
    'Kuwait': { prefix: '+965', areaCodes: [] },
    'Bahrain': { prefix: '+973', areaCodes: [] },
    'Oman': { prefix: '+968', areaCodes: ['22', '23', '24', '25', '26', '27'] },
    'Jordan': { prefix: '+962', areaCodes: ['2', '3', '5', '6', '7'] },
    'Lebanon': { prefix: '+961', areaCodes: ['1', '3', '4', '5', '6', '7', '8', '9', '70', '71', '76', '78', '79', '81'] },
    'Israel': { prefix: '+972', areaCodes: ['2', '3', '4', '8', '9', '50', '52', '53', '54', '55', '57', '58', '72', '73', '74', '76', '77'] },
    'Iraq': { prefix: '+964', areaCodes: ['1', '21', '23', '24', '25', '30', '32', '33', '36', '37', '40', '42', '43', '50', '53', '60', '62', '66'] },
    'Iran': { prefix: '+98', areaCodes: ['21', '22', '23', '24', '25', '26', '28', '31', '34', '35', '38', '41', '44', '45', '51', '54', '56', '58', '61', '66', '71', '74', '76', '77', '81', '83', '84', '86', '87'] },
    'Afghanistan': { prefix: '+93', areaCodes: ['20', '21', '22', '23', '25', '26', '27', '30', '31', '32', '33', '34', '40', '41', '42', '43', '50', '51', '52', '53', '54', '60', '61', '62', '63', '64', '65', '66', '67', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79'] },

    // Africa
    'South Africa': { prefix: '+27', areaCodes: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '21', '22', '23', '27', '28', '31', '32', '33', '34', '35', '36', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '56', '57', '58'] },
    'Egypt': { prefix: '+20', areaCodes: ['2', '3', '40', '45', '46', '47', '48', '50', '55', '57', '62', '64', '65', '66', '68', '69', '82', '84', '86', '88', '92', '93', '95', '96', '97'] },
    'Nigeria': { prefix: '+234', areaCodes: ['1', '2', '9', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '41', '42', '43', '44', '45', '46', '47', '48', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89'] },
    'Kenya': { prefix: '+254', areaCodes: ['20', '40', '41', '42', '43', '44', '45', '46', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69'] },
    'Ethiopia': { prefix: '+251', areaCodes: ['11', '22', '25', '26', '33', '34', '35', '46', '47', '48', '55', '56', '57', '58'] },
    'Ghana': { prefix: '+233', areaCodes: ['20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '42', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59'] },
    'Tanzania': { prefix: '+255', areaCodes: ['22', '23', '24', '25', '26', '27', '28'] },
    'Uganda': { prefix: '+256', areaCodes: ['31', '39', '41', '42', '43', '44', '45', '46', '47', '48', '52', '54', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79'] },
    'Morocco': { prefix: '+212', areaCodes: ['522', '523', '524', '525', '526', '527', '528', '529', '530', '531', '532', '533', '534', '535', '536', '537', '538', '539'] },
    'Algeria': { prefix: '+213', areaCodes: ['21', '23', '24', '25', '26', '27', '29', '31', '32', '33', '34', '35', '36', '37', '38', '41', '43', '44', '45', '46', '48', '49'] },
    'Tunisia': { prefix: '+216', areaCodes: ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'] },
    'Libya': { prefix: '+218', areaCodes: ['21', '22', '23', '24', '25', '26', '27', '31', '41', '42', '43', '44', '45', '47', '48', '51', '52', '54', '55', '57', '61', '62', '63', '64', '67', '68', '71', '73', '81', '82', '84'] },
    'Cameroon': { prefix: '+237', areaCodes: ['2', '3', '6', '7', '9'] },
    'Ivory Coast': { prefix: '+225', areaCodes: ['20', '21', '22', '23', '24', '25', '27', '30', '31', '32', '33', '34', '35', '36', '37', '38'] },
    'Senegal': { prefix: '+221', areaCodes: ['30', '33', '77', '78'] },
    'Zimbabwe': { prefix: '+263', areaCodes: ['4', '9', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '39', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68'] },
    'Zambia': { prefix: '+260', areaCodes: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] },
    'Botswana': { prefix: '+267', areaCodes: ['2', '3', '4', '5', '6', '7'] },
    'Namibia': { prefix: '+264', areaCodes: ['61', '62', '63', '64', '65', '66', '67'] },
    'Mozambique': { prefix: '+258', areaCodes: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '21', '23', '24', '25', '26', '27', '28', '29', '51', '52', '53', '54', '55', '56', '82', '84', '86', '87'] },
    'Madagascar': { prefix: '+261', areaCodes: ['20', '22', '23', '24', '25', '26', '27', '28', '29'] },
    'Mauritius': { prefix: '+230', areaCodes: ['2', '4', '5', '6', '7'] },
    'Rwanda': { prefix: '+250', areaCodes: ['25', '78', '79'] },
    'Burundi': { prefix: '+257', areaCodes: ['22', '29', '71', '72', '75', '76', '77', '79'] },
    'Malawi': { prefix: '+265', areaCodes: ['1', '8', '9'] },
    'Angola': { prefix: '+244', areaCodes: ['2', '22', '23', '24', '25', '26', '27', '28', '31', '32', '34', '35', '36', '41', '47', '49', '51', '53', '54', '55', '56', '61', '64', '65', '71', '72', '77'] },
    'Democratic Republic of the Congo': { prefix: '+243', areaCodes: ['1', '2', '3', '5', '6', '8', '9', '81', '82', '84', '85', '89', '97', '98', '99'] },
    'Republic of the Congo': { prefix: '+242', areaCodes: ['22', '81', '82', '83', '84', '94', '95', '96', '97', '98', '99'] },
    'Gabon': { prefix: '+241', areaCodes: ['1', '2', '4', '6', '7'] },
    'Equatorial Guinea': { prefix: '+240', areaCodes: ['222', '333', '551', '555'] },

    // Oceania
    'Australia': { prefix: '+61', areaCodes: ['2', '3', '7', '8', '4'] },
    'New Zealand': { prefix: '+64', areaCodes: ['3', '4', '6', '7', '9', '21', '22', '27'] },
    'Fiji': { prefix: '+679', areaCodes: [] },
    'Papua New Guinea': { prefix: '+675', areaCodes: [] },

    // South America
    'Brazil': { prefix: '+55', areaCodes: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'] },
    'Argentina': { prefix: '+54', areaCodes: ['11', '220', '221', '223', '230', '236', '237', '249', '260', '261', '263', '264', '266', '280', '291', '294', '297', '298', '299', '336', '341', '342', '343', '345', '348', '351', '353', '358', '362', '364', '370', '376', '379', '380', '381', '383', '385', '387', '388'] },
    'Chile': { prefix: '+56', areaCodes: ['2', '32', '33', '34', '35', '41', '42', '43', '45', '51', '52', '53', '55', '57', '58', '61', '63', '64', '65', '67', '68', '71', '72', '73', '75'] },
    'Colombia': { prefix: '+57', areaCodes: ['1', '2', '4', '5', '6', '7', '8'] },
    'Peru': { prefix: '+51', areaCodes: ['1', '41', '42', '43', '44', '51', '52', '53', '54', '56', '61', '62', '63', '64', '65', '66', '67', '72', '73', '74', '76', '82', '83', '84'] },
    'Venezuela': { prefix: '+58', areaCodes: ['212', '234', '235', '237', '238', '239', '240', '241', '242', '243', '244', '245', '246', '247', '248', '249', '251', '252', '253', '254', '255', '256', '257', '258', '259', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269', '271', '272', '273', '274', '275', '276', '277', '278', '279', '281', '282', '283', '284', '285', '286', '287', '288', '289', '291', '292', '293', '294', '295'] },
    'Ecuador': { prefix: '+593', areaCodes: ['2', '3', '4', '5', '6', '7', '8', '9'] },
    'Bolivia': { prefix: '+591', areaCodes: ['2', '3', '4', '6', '7'] },
    'Paraguay': { prefix: '+595', areaCodes: ['21', '24', '25', '26', '27', '28', '31', '32', '33', '36', '38', '39', '41', '42', '43', '44', '45', '46', '47', '48', '61', '71', '72', '73', '75', '76', '81', '83', '85', '86'] },
    'Uruguay': { prefix: '+598', areaCodes: ['2', '42', '43', '44', '45', '46', '47', '52', '53', '54', '55', '56', '57', '62', '63', '64', '72', '73', '74', '75'] },

    // Central America & Caribbean
    'Panama': { prefix: '+507', areaCodes: [] },
    'Costa Rica': { prefix: '+506', areaCodes: [] },
    'Guatemala': { prefix: '+502', areaCodes: [] },
    'Honduras': { prefix: '+504', areaCodes: [] },
    'El Salvador': { prefix: '+503', areaCodes: [] },
    'Nicaragua': { prefix: '+505', areaCodes: [] },
    'Jamaica': { prefix: '+1876', areaCodes: [] },
    'Trinidad and Tobago': { prefix: '+1868', areaCodes: [] },
    'Dominican Republic': { prefix: '+1809', areaCodes: [] },
    'Puerto Rico': { prefix: '+1787', areaCodes: [] },
    'Cuba': { prefix: '+53', areaCodes: ['7', '21', '22', '23', '24', '31', '32', '33', '41', '42', '43', '45', '46', '47', '48'] },
    'Haiti': { prefix: '+509', areaCodes: [] },
    'Bahamas': { prefix: '+1242', areaCodes: [] },
    'Barbados': { prefix: '+1246', areaCodes: [] },
  }

  // Try to find exact match first
  let mapped = countryPrefixMap[countryName]

  // If not found, try case-insensitive partial match
  if (!mapped) {
    const countryKey = Object.keys(countryPrefixMap).find(
      (key) =>
        key.toLowerCase() === countryName.toLowerCase() ||
        key.toLowerCase().includes(countryName.toLowerCase()) ||
        countryName.toLowerCase().includes(key.toLowerCase())
    )
    if (countryKey) {
      mapped = countryPrefixMap[countryKey]
    }
  }

  if (mapped) {
    return {
      prefixes: [mapped.prefix],
      area_codes: mapped.areaCodes,
    }
  }

  // Fallback: Use ISO country code to get prefix
  const isoCodeToPrefixMap: Record<string, string> = {
    'AF': '+93', 'AL': '+355', 'DZ': '+213', 'AS': '+1684', 'AD': '+376', 'AO': '+244', 'AI': '+1264',
    'AG': '+1268', 'AR': '+54', 'AM': '+374', 'AW': '+297', 'AU': '+61', 'AT': '+43', 'AZ': '+994',
    'BS': '+1242', 'BH': '+973', 'BD': '+880', 'BB': '+1246', 'BY': '+375', 'BE': '+32', 'BZ': '+501',
    'BJ': '+229', 'BM': '+1441', 'BT': '+975', 'BO': '+591', 'BA': '+387', 'BW': '+267', 'BR': '+55',
    'BN': '+673', 'BG': '+359', 'BF': '+226', 'BI': '+257', 'KH': '+855', 'CM': '+237', 'CA': '+1',
    'CV': '+238', 'KY': '+1345', 'CF': '+236', 'TD': '+235', 'CL': '+56', 'CN': '+86', 'CO': '+57',
    'KM': '+269', 'CG': '+242', 'CD': '+243', 'CK': '+682', 'CR': '+506', 'CI': '+225', 'HR': '+385',
    'CU': '+53', 'CY': '+357', 'CZ': '+420', 'DK': '+45', 'DJ': '+253', 'DM': '+1767', 'DO': '+1809',
    'EC': '+593', 'EG': '+20', 'SV': '+503', 'GQ': '+240', 'ER': '+291', 'EE': '+372', 'ET': '+251',
    'FJ': '+679', 'FI': '+358', 'FR': '+33', 'GA': '+241', 'GM': '+220', 'GE': '+995', 'DE': '+49',
    'GH': '+233', 'GR': '+30', 'GD': '+1473', 'GT': '+502', 'GN': '+224', 'GW': '+245', 'GY': '+592',
    'HT': '+509', 'HN': '+504', 'HK': '+852', 'HU': '+36', 'IS': '+354', 'IN': '+91', 'ID': '+62',
    'IR': '+98', 'IQ': '+964', 'IE': '+353', 'IL': '+972', 'IT': '+39', 'JM': '+1876', 'JP': '+81',
    'JO': '+962', 'KZ': '+7', 'KE': '+254', 'KI': '+686', 'KP': '+850', 'KR': '+82', 'KW': '+965',
    'KG': '+996', 'LA': '+856', 'LV': '+371', 'LB': '+961', 'LS': '+266', 'LR': '+231', 'LY': '+218',
    'LI': '+423', 'LT': '+370', 'LU': '+352', 'MO': '+853', 'MK': '+389', 'MG': '+261', 'MW': '+265',
    'MY': '+60', 'MV': '+960', 'ML': '+223', 'MT': '+356', 'MH': '+692', 'MR': '+222', 'MU': '+230',
    'MX': '+52', 'FM': '+691', 'MD': '+373', 'MC': '+377', 'MN': '+976', 'ME': '+382', 'MA': '+212',
    'MZ': '+258', 'MM': '+95', 'NA': '+264', 'NR': '+674', 'NP': '+977', 'NL': '+31', 'NZ': '+64',
    'NI': '+505', 'NE': '+227', 'NG': '+234', 'NO': '+47', 'OM': '+968', 'PK': '+92', 'PW': '+680',
    'PA': '+507', 'PG': '+675', 'PY': '+595', 'PE': '+51', 'PH': '+63', 'PL': '+48', 'PT': '+351',
    'PR': '+1787', 'QA': '+974', 'RO': '+40', 'RU': '+7', 'RW': '+250', 'WS': '+685', 'SM': '+378',
    'SA': '+966', 'SN': '+221', 'RS': '+381', 'SC': '+248', 'SL': '+232', 'SG': '+65', 'SK': '+421',
    'SI': '+386', 'SB': '+677', 'SO': '+252', 'ZA': '+27', 'ES': '+34', 'LK': '+94', 'SD': '+249',
    'SR': '+597', 'SZ': '+268', 'SE': '+46', 'CH': '+41', 'SY': '+963', 'TW': '+886', 'TJ': '+992',
    'TZ': '+255', 'TH': '+66', 'TL': '+670', 'TG': '+228', 'TO': '+676', 'TT': '+1868', 'TN': '+216',
    'TR': '+90', 'TM': '+993', 'UG': '+256', 'UA': '+380', 'AE': '+971', 'GB': '+44', 'US': '+1',
    'UY': '+598', 'UZ': '+998', 'VU': '+678', 'VE': '+58', 'VN': '+84', 'YE': '+967', 'ZM': '+260',
    'ZW': '+263'
  }

  if (countryCode && isoCodeToPrefixMap[countryCode.toUpperCase()]) {
    return {
      prefixes: [isoCodeToPrefixMap[countryCode.toUpperCase()]],
      area_codes: [],
    }
  }

  return { prefixes: [], area_codes: [] }
}



