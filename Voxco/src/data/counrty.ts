export interface Country {
  country_name: string
  country_code: string
  regulator: string
  number_allocation: {
    end_user_documentation: {
      individual: string[]
      business: string[]
    }
    address_requirements: string
  }
  sub_allocation: {
    allowed: boolean
    rules: string
  }
  number_porting: {
    end_user_documentation: {
      individual: string[]
      business: string[]
    }
    process_notes: string
  }
}

export const Countries: Country[] = [
  {
    country_name: 'Canada',
    country_code: 'CA',
    regulator: 'Canadian Radio-television and Telecommunications Commission (CRTC)',
    number_allocation: {
      end_user_documentation: {
        individual: [''],
        business: [''],
      },
      address_requirements: 'Geographic numbers are tied to specific regions.[6]',
    },
    sub_allocation: {
      allowed: true,
      rules: 'Sub-allocation to resellers is permitted. The primary carrier must obtain usage data from its resellers to demonstrate that 75% of all held numbers (including resold ones) are assigned to end-users to be eligible for new number allocations. Failure to report usage can lead to CRTC audits.[7]',
    },
    number_porting: {
      end_user_documentation: {
        individual: [
          'Recent phone invoice (dated within the last 30 days)',
          'Utility bill with personal address',
          'Government-issued ID',
          'PIN Code (for mobile numbers) [8]',
        ],
        business: [
          'Recent phone invoice (dated within the last 30 days)',
          'Commercial registry or equivalent showing business address',
          'PIN Code (for mobile numbers) [8]',
        ],
      },
      process_notes: 'The number must remain active with the current provider until porting is complete. The process typically takes up to 15 days after document validation. One-time porting fees may apply.',
    },
  },
  // Add other countries as needed - keeping the structure but truncating for brevity
  {
    country_name: 'United Kingdom',
    country_code: 'UK',
    regulator: 'Office of Communications (Ofcom)',
    number_allocation: {
      end_user_documentation: {
        individual: ['Proof of Address (e.g., Utility bill, Tax notice)'],
        business: [''],
      },
      address_requirements: 'For Local numbers, a valid UK address is required. For Mobile and Toll-Free numbers, a worldwide address is acceptable.',
    },
    sub_allocation: {
      allowed: true,
      rules: "Sub-allocation of numbers to resellers is permitted with no restrictions on the number of tiers. However, the primary provider to whom Ofcom originally allocated the numbers retains ultimate responsibility for their use and must ensure compliance with Ofcom's rules. Ofcom has published a 'Good Practice Guide' which sets an expectation that primary providers will conduct due diligence on their reseller customers.",
    },
    number_porting: {
      end_user_documentation: {
        individual: ['Copy of the most recent bill from the current provider [9]'],
        business: ['Copy of the most recent bill from the current provider [9]'],
      },
      process_notes: 'Number portability is mandated by Ofcom to be free of direct charges to the consumer. Wholesale charges between providers are permitted but must be cost-oriented.',
    },
  },
]

