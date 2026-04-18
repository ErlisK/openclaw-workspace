# Platform Flow Archive: PayPal
## Payout Cadence, CSV Export Schema, Fees, and Integration Patterns

**Source:** PayPal Developer Docs (developer.paypal.com), PayPal Help Center, publicly available PayPal business documentation — verified April 2026  
**Relevance to GigAnalytics:** PayPal is the dominant payment method for Upwork freelancer withdrawals, legacy direct-client arrangements, international gig payments, and many older digital product platforms (some Etsy sellers receive PayPal). It is also the default payout method for many platform gig workers who use PayPal debit cards.

---

## 1. Payout Cadence

### PayPal Balance → Bank Transfer
| Transfer Type | Speed | Cost |
|--------------|-------|------|
| Standard ACH transfer | 3–5 business days | Free |
| Instant transfer to bank/debit card | Within 30 minutes | 1.75% fee (min $0.25, max $25) |
| PayPal debit card (direct spend) | Immediate | No fee (card purchases) |
| Check (mailed) | 5–10 business days | $1.50 |

### How Funds Land in PayPal
- **Received payment:** Immediately available in PayPal balance (no holding period for most established accounts)
- **New accounts or flagged transactions:** May hold funds for up to 21 days for seller protection
- **Upwork → PayPal:** Upwork releases weekly payments every Tuesday; funds appear in PayPal within 1-3 business days (Upwork uses PayPal Payouts API)
- **Etsy → PayPal:** Etsy stopped direct PayPal integration in 2023; Etsy Payments now uses direct bank transfer only

### PayPal Transfer Flow (Freelancer Withdrawal)
```
Upwork payment cleared (Tuesday) 
  → PayPal shows "pending" for 1-2 hours
  → Available balance updated
  → User initiates bank transfer
  → Standard: 3-5 business days to bank
  → Instant: 30 minutes (1.75% fee)
```

---

## 2. CSV Export Schema

### Activity Download (PayPal Dashboard → Activity → Download)
PayPal offers CSV export covering all transactions in a date range. Format varies slightly by account type (Personal vs. Business).

**Key columns in PayPal Activity CSV:**

| Column | Description |
|--------|-------------|
| `Date` | Transaction date (MM/DD/YYYY format) |
| `Time` | Transaction time (HH:MM:SS, timezone in separate column) |
| `TimeZone` | Timezone abbreviation (e.g., PST, EDT) |
| `Name` | Counterparty name (sender or recipient) |
| `Type` | Transaction type (see types below) |
| `Status` | `Completed`, `Pending`, `Failed`, `Reversed`, `Unclaimed` |
| `Currency` | 3-letter ISO code (USD, EUR, GBP...) |
| `Gross` | Pre-fee amount |
| `Fee` | PayPal fee (negative value) |
| `Net` | Post-fee amount |
| `From Email Address` | Sender email |
| `To Email Address` | Recipient email |
| `Transaction ID` | Unique PayPal transaction ID |
| `Shipping Address` | Physical address (relevant for goods) |
| `Address Status` | `Confirmed` or `Unconfirmed` |
| `Item Title` | Item name if applicable |
| `Item ID` | Item ID if applicable |
| `Shipping and Handling Amount` | Shipping cost |
| `Insurance Amount` | Insurance if applicable |
| `Sales Tax` | Sales tax amount |
| `Option 1 Name` / `Option 1 Value` | Custom item attributes |
| `Reference Txn ID` | Parent transaction ID (for refunds, disputes) |
| `Invoice Number` | Invoice number if set by sender |
| `Custom Number` | Custom field from sender |
| `Quantity` | Number of units |
| `Receipt ID` | PayPal receipt ID |
| `Balance` | Running account balance after transaction |

### Key Transaction Types
| Type | Meaning |
|------|---------|
| `Payment Received` | Money received from someone |
| `Payment Sent` | Money sent to someone |
| `Bank Deposit to PP Account` | Incoming bank transfer |
| `Withdrawal to bank account` | Outgoing bank transfer |
| `Transfer from Upwork` | Upwork withdrawal (shows as generic payment received from Upwork) |
| `Refund` | Refund issued or received |
| `Dispute` | Dispute transaction |
| `Credit` | Promotional credit or PayPal reward |
| `Debit Card` | PayPal debit card purchase |

### Common Export Issues (GigAnalytics must handle)
1. **Date format:** MM/DD/YYYY — must normalize to ISO 8601
2. **Timezone mismatch:** PayPal reports timezone per-row as abbreviation (PST, EDT) — ambiguous without year context; normalize to UTC
3. **Fee as negative:** Fee column shows as negative value (e.g., `-2.87`) — must take absolute value for reporting
4. **Multiple currencies:** If user transacts in multiple currencies, each currency gets separate rows with no unified balance view
5. **"Transfer from Upwork" ambiguity:** Upwork withdrawals show as a single lump sum with no breakdown of which jobs contributed to it
6. **Balance column is running total, not transaction amount** — do not confuse with `Gross` or `Net`

---

## 3. Fee Structure

### Sending/Receiving Money (US)
| Scenario | Fee |
|----------|-----|
| Domestic payment (Goods & Services) | 3.49% + $0.49 |
| Domestic payment (Friends & Family) | Free (from PayPal balance) |
| Friends & Family (funded by card) | 2.89% + $0.49 |
| International payment received | 1.5% (in addition to standard rate) |
| Currency conversion | 3-4% markup on mid-market rate |

### Key Gotcha: Goods & Services vs. Friends & Family
- Many freelancers receive payment via "Friends & Family" to avoid the 3.49% fee
- This **waives PayPal seller protection** — no recourse if client reverses payment
- PayPal has been cracking down: "G&F payments for business = against ToS" but enforcement is inconsistent
- **GigAnalytics implication:** Must distinguish G&F vs. G&S in CSV to correctly calculate fee deductions (G&F shows $0 fee; G&S shows standard fee)

### Upwork-Specific PayPal Flow
Upwork uses **PayPal Payouts** (mass payout API) to send freelancer earnings. This appears in PayPal CSV as:
- `Type: Transfer from Upwork`  (or similar PayPal batch payout entry)
- `Gross:` net amount after Upwork's service fee (Upwork has already deducted their fee before sending to PayPal)
- `Fee: 0.00` (PayPal charges Upwork/payer, not freelancer receiver, for Payouts API)

---

## 4. PayPal Reports API (Business Accounts)

PayPal provides a Financial Summary Report accessible via SFTP or REST for business accounts.

**Report types available:**
- Settlement Report: Daily batch of all settled transactions
- Transaction Report: Individual transaction details
- Balance Affecting Payments (BAP): Only transactions that change the balance

**Settlement Report key fields:**
```
transaction_id, transaction_initiation_date, transaction_updated_date,
transaction_amount, transaction_currency_code, transaction_status,
gross_transaction_amount, fee_amount, insurance_amount, shipping_amount,
sales_tax_amount, invoice_id, custom_field, consumer_name, consumer_email_address,
transaction_note, bank_reference_id, ending_balance, available_balance
```

**Availability:** T+1 (previous day's transactions available by 8:00 AM local time)  
**Format:** CSV (pipe-delimited or comma-delimited depending on version)

---

## 5. Calendar and Time Tracking Integration

PayPal has **no native time tracking** or calendar feature. The platform is purely financial.

**Community workaround patterns (from r/freelance, StackExchange):**
- Freelancers add invoice notes in PayPal invoices (e.g., "10 hours @ $85/hr") — this data is in `Item Title` and `Quantity` columns
- Some use PayPal invoice as proxy for time log: hours × rate = invoice amount
- This is unreliable as a time tracking source: no job name linking, no timer, manual entry

**GigAnalytics implication:** PayPal invoices with hour × rate line items could be parsed to extract implicit time data. A $850 invoice with description "10 hours @ $85/hr" could auto-populate a time entry. Edge case — but worth detecting.

---

## 6. GigAnalytics Import Design Notes

### What to Pull
- Primary: Activity CSV export (all transaction types, date range)
- Filter by: `Type = "Payment Received"` OR `Type = "Transfer from Upwork"` (and other platform names)
- Exclude: `Friends & Family` payments from fee calculation (fee = $0 in CSV; effective fee = 0 for received)

### Key Mapping
```
paypal.Gross → income_gross
paypal.Fee → platform_fee (absolute value)
paypal.Net → income_net
paypal.Date + paypal.Time + paypal.TimeZone → transaction_timestamp (normalize to UTC)
paypal.Name → client_identifier (or platform name if platform payment)
paypal.Type → income_category
paypal.Item Title → description (parse for hours if invoice)
```

### Stream Detection Heuristics
```
Name contains "Upwork" → source: upwork_withdrawal
Name contains "Fiverr" → source: fiverr_withdrawal  
Name contains "Etsy" → source: etsy_payment (legacy)
Name is individual (email/name) → source: direct_client
Item Title matches "hours" or "hr" → attempt time parsing
```

---

## 7. UX Flow: User Exporting PayPal CSV

**Current user workflow (AS-IS):**
```
1. Login to PayPal.com
2. Navigate: Activity → All Transactions
3. Select date range (max 12 months per export)
4. Click "Download" → Choose format: CSV
5. Save file (named "Download YYYY-MM-DD to YYYY-MM-DD.CSV")
6. Open in Excel/Sheets → manually categorize
7. Pain: 24 columns, timezone inconsistency, multiple currencies, Upwork lump sums
```

**GigAnalytics TO-BE flow:**
```
1. User uploads PayPal CSV (or connects via PayPal API if available)
2. GigAnalytics auto-detects: "Found 127 transactions: 
   - 43 from Upwork ($8,420 total)
   - 12 direct client payments ($4,100 total)
   - 8 refunds (-$320)
   - 64 purchases/expenses (excluded from income)
3. Auto-maps streams, shows net income per stream after fees
4. Prompt: "Your Upwork payments arrive as lump sums. 
   To see $/hr for Upwork, connect your Upwork account or upload Upwork earnings CSV."
```

**Key friction to resolve:** PayPal lump-sum deposits from platforms (Upwork, Fiverr) obscure which individual jobs contributed — requires platform-level CSV to be overlaid for meaningful analysis.

---

*Sources: PayPal Developer Docs (developer.paypal.com/docs/reports/), PayPal Activity CSV format documentation, PayPal Business Help Center — April 2026*
