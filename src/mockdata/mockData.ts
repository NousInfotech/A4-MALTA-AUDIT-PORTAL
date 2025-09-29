const mockJournalEntriesResponse = {
  data: {
    getJournalEntriesResponse: {
      data: [
        {
          id: "jre100",
          date: "2023-10-31T09:00:00Z",
          type: "Invoice",
          amount: 250.0,
          currency: "USD",
          description: "Software license fee - Client X",
          lineItems: [
            { id: "jli100", account: "Sales Revenue", debit: 0, credit: 250.0 },
            {
              id: "jli101",
              account: "Accounts Receivable",
              debit: 250.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre101",
          date: "2023-10-30T11:15:00Z",
          type: "Expense",
          amount: 75.5,
          currency: "USD",
          description: "Travel expenses for meeting",
          lineItems: [
            {
              id: "jli102",
              account: "Travel Expenses",
              debit: 75.5,
              credit: 0,
            },
            { id: "jli103", account: "Bank Account", debit: 0, credit: 75.5 },
          ],
        },
        {
          id: "jre102",
          date: "2023-10-29T16:00:00Z",
          type: "Payroll",
          amount: 1200.0,
          currency: "USD",
          description: "Bi-weekly payroll for employee Y",
          lineItems: [
            {
              id: "jli104",
              account: "Payroll Expense",
              debit: 1200.0,
              credit: 0,
            },
            { id: "jli105", account: "Cash", debit: 0, credit: 1200.0 },
          ],
        },
        {
          id: "jre103",
          date: "2023-10-28T08:30:00Z",
          type: "Revenue",
          amount: 500.0,
          currency: "USD",
          description: "Consulting services provided",
          lineItems: [
            {
              id: "jli106",
              account: "Consulting Revenue",
              debit: 0,
              credit: 500.0,
            },
            {
              id: "jli107",
              account: "Accounts Receivable",
              debit: 500.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre104",
          date: "2023-10-27T13:00:00Z",
          type: "Bill",
          amount: 300.0,
          currency: "USD",
          description: "Utility bill - October",
          lineItems: [
            {
              id: "jli108",
              account: "Utility Expense",
              debit: 300.0,
              credit: 0,
            },
            {
              id: "jli109",
              account: "Accounts Payable",
              debit: 0,
              credit: 300.0,
            },
          ],
        },
        {
          id: "jre105",
          date: "2023-10-26T10:00:00Z",
          type: "Invoice",
          amount: 150.75,
          currency: "USD",
          description: "Sale of goods to client A",
          lineItems: [
            {
              id: "jli110",
              account: "Sales Revenue",
              debit: 0,
              credit: 150.75,
            },
            {
              id: "jli111",
              account: "Accounts Receivable",
              debit: 150.75,
              credit: 0,
            },
          ],
        },
        {
          id: "jre106",
          date: "2023-10-25T14:30:00Z",
          type: "Expense",
          amount: 50.0,
          currency: "USD",
          description: "Office supplies purchase",
          lineItems: [
            {
              id: "jli112",
              account: "Office Expenses",
              debit: 50.0,
              credit: 0,
            },
            { id: "jli113", account: "Cash", debit: 0, credit: 50.0 },
          ],
        },
        {
          id: "jre107",
          date: "2023-10-24T09:45:00Z",
          type: "Deposit",
          amount: 1000.0,
          currency: "USD",
          description: "Initial capital investment",
          lineItems: [
            { id: "jli114", account: "Bank Account", debit: 1000.0, credit: 0 },
            {
              id: "jli115",
              account: "Owner's Equity",
              debit: 0,
              credit: 1000.0,
            },
          ],
        },
        {
          id: "jre108",
          date: "2023-10-23T11:00:00Z",
          type: "Payment",
          amount: 750.0,
          currency: "USD",
          description: "Payment received from Client B",
          lineItems: [
            { id: "jli116", account: "Bank Account", debit: 750.0, credit: 0 },
            {
              id: "jli117",
              account: "Accounts Receivable",
              debit: 0,
              credit: 750.0,
            },
          ],
        },
        {
          id: "jre109",
          date: "2023-10-22T17:00:00Z",
          type: "Journal Entry",
          amount: 200.0,
          currency: "USD",
          description: "Adjusting entry for depreciation",
          lineItems: [
            {
              id: "jli118",
              account: "Depreciation Expense",
              debit: 200.0,
              credit: 0,
            },
            {
              id: "jli119",
              account: "Accumulated Depreciation",
              debit: 0,
              credit: 200.0,
            },
          ],
        },
        {
          id: "jre110",
          date: "2023-10-21T09:00:00Z",
          type: "Invoice",
          amount: 450.0,
          currency: "EUR",
          description: "Sale of services to Client C",
          lineItems: [
            { id: "jli120", account: "Sales Revenue", debit: 0, credit: 450.0 },
            {
              id: "jli121",
              account: "Accounts Receivable",
              debit: 450.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre111",
          date: "2023-10-20T14:00:00Z",
          type: "Expense",
          amount: 30.0,
          currency: "GBP",
          description: "Software subscription",
          lineItems: [
            {
              id: "jli122",
              account: "Software Expense",
              debit: 30.0,
              credit: 0,
            },
            { id: "jli123", account: "Bank Account", debit: 0, credit: 30.0 },
          ],
        },
        {
          id: "jre112",
          date: "2023-10-19T10:30:00Z",
          type: "Payroll",
          amount: 900.0,
          currency: "USD",
          description: "Weekly payroll for employee Z",
          lineItems: [
            {
              id: "jli124",
              account: "Payroll Expense",
              debit: 900.0,
              credit: 0,
            },
            { id: "jli125", account: "Cash", debit: 0, credit: 900.0 },
          ],
        },
        {
          id: "jre113",
          date: "2023-10-18T16:45:00Z",
          type: "Revenue",
          amount: 800.0,
          currency: "USD",
          description: "Project completion payment",
          lineItems: [
            {
              id: "jli126",
              account: "Service Revenue",
              debit: 0,
              credit: 800.0,
            },
            {
              id: "jli127",
              account: "Accounts Receivable",
              debit: 800.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre114",
          date: "2023-10-17T11:00:00Z",
          type: "Bill",
          amount: 120.0,
          currency: "USD",
          description: "Internet service bill",
          lineItems: [
            {
              id: "jli128",
              account: "Internet Expense",
              debit: 120.0,
              credit: 0,
            },
            {
              id: "jli129",
              account: "Accounts Payable",
              debit: 0,
              credit: 120.0,
            },
          ],
        },
        {
          id: "jre115",
          date: "2023-10-16T09:15:00Z",
          type: "Invoice",
          amount: 600.0,
          currency: "CAD",
          description: "Product sale - Client D",
          lineItems: [
            { id: "jli130", account: "Sales Revenue", debit: 0, credit: 600.0 },
            {
              id: "jli131",
              account: "Accounts Receivable",
              debit: 600.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre116",
          date: "2023-10-15T13:00:00Z",
          type: "Expense",
          amount: 45.0,
          currency: "USD",
          description: "Marketing campaign costs",
          lineItems: [
            {
              id: "jli132",
              account: "Marketing Expense",
              debit: 45.0,
              credit: 0,
            },
            { id: "jli133", account: "Cash", debit: 0, credit: 45.0 },
          ],
        },
        {
          id: "jre117",
          date: "2023-10-14T10:00:00Z",
          type: "Deposit",
          amount: 2500.0,
          currency: "USD",
          description: "Loan proceeds received",
          lineItems: [
            { id: "jli134", account: "Bank Account", debit: 2500.0, credit: 0 },
            { id: "jli135", account: "Loan Payable", debit: 0, credit: 2500.0 },
          ],
        },
        {
          id: "jre118",
          date: "2023-10-13T15:30:00Z",
          type: "Payment",
          amount: 950.0,
          currency: "USD",
          description: "Payment made to Vendor E",
          lineItems: [
            {
              id: "jli136",
              account: "Accounts Payable",
              debit: 950.0,
              credit: 0,
            },
            { id: "jli137", account: "Bank Account", debit: 0, credit: 950.0 },
          ],
        },
        {
          id: "jre119",
          date: "2023-10-12T17:00:00Z",
          type: "Journal Entry",
          amount: 100.0,
          currency: "USD",
          description: "Correction of prior entry",
          lineItems: [
            {
              id: "jli138",
              account: "Miscellaneous Expense",
              debit: 100.0,
              credit: 0,
            },
            { id: "jli139", account: "Cash", debit: 0, credit: 100.0 },
          ],
        },
        {
          id: "jre120",
          date: "2023-10-11T09:00:00Z",
          type: "Invoice",
          amount: 180.0,
          currency: "USD",
          description: "Subscription renewal - Client F",
          lineItems: [
            {
              id: "jli140",
              account: "Subscription Revenue",
              debit: 0,
              credit: 180.0,
            },
            {
              id: "jli141",
              account: "Accounts Receivable",
              debit: 180.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre121",
          date: "2023-10-10T14:30:00Z",
          type: "Expense",
          amount: 25.0,
          currency: "USD",
          description: "Postage and shipping",
          lineItems: [
            {
              id: "jli142",
              account: "Shipping Expense",
              debit: 25.0,
              credit: 0,
            },
            { id: "jli143", account: "Cash", debit: 0, credit: 25.0 },
          ],
        },
        {
          id: "jre122",
          date: "2023-10-09T11:00:00Z",
          type: "Payroll",
          amount: 1100.0,
          currency: "USD",
          description: "Bi-weekly payroll for employee P",
          lineItems: [
            {
              id: "jli144",
              account: "Payroll Expense",
              debit: 1100.0,
              credit: 0,
            },
            { id: "jli145", account: "Bank Account", debit: 0, credit: 1100.0 },
          ],
        },
        {
          id: "jre123",
          date: "2023-10-08T16:00:00Z",
          type: "Revenue",
          amount: 700.0,
          currency: "USD",
          description: "Training session fees",
          lineItems: [
            {
              id: "jli146",
              account: "Training Revenue",
              debit: 0,
              credit: 700.0,
            },
            {
              id: "jli147",
              account: "Accounts Receivable",
              debit: 700.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre124",
          date: "2023-10-07T10:00:00Z",
          type: "Bill",
          amount: 500.0,
          currency: "USD",
          description: "Rent payment - October",
          lineItems: [
            { id: "jli148", account: "Rent Expense", debit: 500.0, credit: 0 },
            {
              id: "jli149",
              account: "Accounts Payable",
              debit: 0,
              credit: 500.0,
            },
          ],
        },
        {
          id: "jre125",
          date: "2023-10-06T09:30:00Z",
          type: "Invoice",
          amount: 320.0,
          currency: "USD",
          description: "Consulting services to Client G",
          lineItems: [
            {
              id: "jli150",
              account: "Consulting Revenue",
              debit: 0,
              credit: 320.0,
            },
            {
              id: "jli151",
              account: "Accounts Receivable",
              debit: 320.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre126",
          date: "2023-10-05T14:00:00Z",
          type: "Expense",
          amount: 15.0,
          currency: "USD",
          description: "Bank service charges",
          lineItems: [
            { id: "jli152", account: "Bank Charges", debit: 15.0, credit: 0 },
            { id: "jli153", account: "Bank Account", debit: 0, credit: 15.0 },
          ],
        },
        {
          id: "jre127",
          date: "2023-10-04T10:00:00Z",
          type: "Deposit",
          amount: 400.0,
          currency: "USD",
          description: "Cash sale from store",
          lineItems: [
            { id: "jli154", account: "Bank Account", debit: 400.0, credit: 0 },
            { id: "jli155", account: "Sales Revenue", debit: 0, credit: 400.0 },
          ],
        },
        {
          id: "jre128",
          date: "2023-10-03T13:00:00Z",
          type: "Payment",
          amount: 280.0,
          currency: "USD",
          description: "Supplier payment - Vendor H",
          lineItems: [
            {
              id: "jli156",
              account: "Accounts Payable",
              debit: 280.0,
              credit: 0,
            },
            { id: "jli157", account: "Bank Account", debit: 0, credit: 280.0 },
          ],
        },
        {
          id: "jre129",
          date: "2023-10-02T16:00:00Z",
          type: "Journal Entry",
          amount: 50.0,
          currency: "USD",
          description: "Prepaid insurance adjustment",
          lineItems: [
            {
              id: "jli158",
              account: "Insurance Expense",
              debit: 50.0,
              credit: 0,
            },
            {
              id: "jli159",
              account: "Prepaid Insurance",
              debit: 0,
              credit: 50.0,
            },
          ],
        },
        {
          id: "jre130",
          date: "2023-10-01T09:00:00Z",
          type: "Invoice",
          amount: 90.0,
          currency: "USD",
          description: "Small product sale - Client I",
          lineItems: [
            { id: "jli160", account: "Sales Revenue", debit: 0, credit: 90.0 },
            {
              id: "jli161",
              account: "Accounts Receivable",
              debit: 90.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre131",
          date: "2023-09-30T11:00:00Z",
          type: "Expense",
          amount: 60.0,
          currency: "USD",
          description: "Team lunch expense",
          lineItems: [
            {
              id: "jli162",
              account: "Meals & Entertainment",
              debit: 60.0,
              credit: 0,
            },
            { id: "jli163", account: "Cash", debit: 0, credit: 60.0 },
          ],
        },
        {
          id: "jre132",
          date: "2023-09-29T15:00:00Z",
          type: "Revenue",
          amount: 1100.0,
          currency: "USD",
          description: "Large project milestone payment",
          lineItems: [
            {
              id: "jli164",
              account: "Project Revenue",
              debit: 0,
              credit: 1100.0,
            },
            {
              id: "jli165",
              account: "Accounts Receivable",
              debit: 1100.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre133",
          date: "2023-09-28T10:00:00Z",
          type: "Bill",
          amount: 200.0,
          currency: "USD",
          description: "Advertising services bill",
          lineItems: [
            {
              id: "jli166",
              account: "Advertising Expense",
              debit: 200.0,
              credit: 0,
            },
            {
              id: "jli167",
              account: "Accounts Payable",
              debit: 0,
              credit: 200.0,
            },
          ],
        },
        {
          id: "jre134",
          date: "2023-09-27T14:00:00Z",
          type: "Invoice",
          amount: 75.0,
          currency: "USD",
          description: "Maintenance services - Client J",
          lineItems: [
            {
              id: "jli168",
              account: "Service Revenue",
              debit: 0,
              credit: 75.0,
            },
            {
              id: "jli169",
              account: "Accounts Receivable",
              debit: 75.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre135",
          date: "2023-09-26T09:00:00Z",
          type: "Expense",
          amount: 10.0,
          currency: "USD",
          description: "Coffee and snacks for office",
          lineItems: [
            {
              id: "jli170",
              account: "Office Supplies",
              debit: 10.0,
              credit: 0,
            },
            { id: "jli171", account: "Cash", debit: 0, credit: 10.0 },
          ],
        },
        {
          id: "jre136",
          date: "2023-09-25T13:00:00Z",
          type: "Payment",
          amount: 400.0,
          currency: "USD",
          description: "Loan repayment",
          lineItems: [
            { id: "jli172", account: "Loan Payable", debit: 400.0, credit: 0 },
            { id: "jli173", account: "Bank Account", debit: 0, credit: 400.0 },
          ],
        },
        {
          id: "jre137",
          date: "2023-09-24T17:00:00Z",
          type: "Journal Entry",
          amount: 300.0,
          currency: "USD",
          description: "Inventory adjustment for spoilage",
          lineItems: [
            {
              id: "jli174",
              account: "Cost of Goods Sold",
              debit: 300.0,
              credit: 0,
            },
            { id: "jli175", account: "Inventory", debit: 0, credit: 300.0 },
          ],
        },
        {
          id: "jre138",
          date: "2023-09-23T10:00:00Z",
          type: "Invoice",
          amount: 550.0,
          currency: "USD",
          description: "Graphic design work - Client K",
          lineItems: [
            {
              id: "jli176",
              account: "Design Revenue",
              debit: 0,
              credit: 550.0,
            },
            {
              id: "jli177",
              account: "Accounts Receivable",
              debit: 550.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre139",
          date: "2023-09-22T12:00:00Z",
          type: "Expense",
          amount: 150.0,
          currency: "USD",
          description: "Software license renewal",
          lineItems: [
            {
              id: "jli178",
              account: "Software Expense",
              debit: 150.0,
              credit: 0,
            },
            { id: "jli179", account: "Bank Account", debit: 0, credit: 150.0 },
          ],
        },
        {
          id: "jre140",
          date: "2023-09-21T10:00:00Z",
          type: "Payroll",
          amount: 1300.0,
          currency: "USD",
          description: "Bi-weekly payroll for employee Q",
          lineItems: [
            {
              id: "jli180",
              account: "Payroll Expense",
              debit: 1300.0,
              credit: 0,
            },
            { id: "jli181", account: "Cash", debit: 0, credit: 1300.0 },
          ],
        },
        {
          id: "jre141",
          date: "2023-09-20T14:00:00Z",
          type: "Revenue",
          amount: 900.0,
          currency: "USD",
          description: "Website development services",
          lineItems: [
            {
              id: "jli182",
              account: "Web Development Revenue",
              debit: 0,
              credit: 900.0,
            },
            {
              id: "jli183",
              account: "Accounts Receivable",
              debit: 900.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre142",
          date: "2023-09-19T11:00:00Z",
          type: "Bill",
          amount: 80.0,
          currency: "USD",
          description: "Phone bill",
          lineItems: [
            { id: "jli184", account: "Phone Expense", debit: 80.0, credit: 0 },
            {
              id: "jli185",
              account: "Accounts Payable",
              debit: 0,
              credit: 80.0,
            },
          ],
        },
        {
          id: "jre143",
          date: "2023-09-18T09:00:00Z",
          type: "Invoice",
          amount: 210.0,
          currency: "USD",
          description: "Product sale - Client L",
          lineItems: [
            { id: "jli186", account: "Sales Revenue", debit: 0, credit: 210.0 },
            {
              id: "jli187",
              account: "Accounts Receivable",
              debit: 210.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre144",
          date: "2023-09-17T13:00:00Z",
          type: "Expense",
          amount: 35.0,
          currency: "USD",
          description: "Office cleaning supplies",
          lineItems: [
            {
              id: "jli188",
              account: "Cleaning Expense",
              debit: 35.0,
              credit: 0,
            },
            { id: "jli189", account: "Cash", debit: 0, credit: 35.0 },
          ],
        },
        {
          id: "jre145",
          date: "2023-09-16T10:00:00Z",
          type: "Deposit",
          amount: 1500.0,
          currency: "USD",
          description: "Investment from partner",
          lineItems: [
            { id: "jli190", account: "Bank Account", debit: 1500.0, credit: 0 },
            {
              id: "jli191",
              account: "Partner's Capital",
              debit: 0,
              credit: 1500.0,
            },
          ],
        },
        {
          id: "jre146",
          date: "2023-09-15T15:00:00Z",
          type: "Payment",
          amount: 600.0,
          currency: "USD",
          description: "Vendor payment for raw materials",
          lineItems: [
            {
              id: "jli192",
              account: "Accounts Payable",
              debit: 600.0,
              credit: 0,
            },
            { id: "jli193", account: "Bank Account", debit: 0, credit: 600.0 },
          ],
        },
        {
          id: "jre147",
          date: "2023-09-14T17:00:00Z",
          type: "Journal Entry",
          amount: 70.0,
          currency: "USD",
          description: "Accrued interest expense",
          lineItems: [
            {
              id: "jli194",
              account: "Interest Expense",
              debit: 70.0,
              credit: 0,
            },
            {
              id: "jli195",
              account: "Accrued Expenses",
              debit: 0,
              credit: 70.0,
            },
          ],
        },
        {
          id: "jre148",
          date: "2023-09-13T09:00:00Z",
          type: "Invoice",
          amount: 1200.0,
          currency: "USD",
          description: "Annual service contract - Client M",
          lineItems: [
            {
              id: "jli196",
              account: "Service Revenue",
              debit: 0,
              credit: 1200.0,
            },
            {
              id: "jli197",
              account: "Accounts Receivable",
              debit: 1200.0,
              credit: 0,
            },
          ],
        },
        {
          id: "jre149",
          date: "2023-09-12T14:00:00Z",
          type: "Expense",
          amount: 85.0,
          currency: "USD",
          description: "Employee training fees",
          lineItems: [
            {
              id: "jli198",
              account: "Training Expense",
              debit: 85.0,
              credit: 0,
            },
            { id: "jli199", account: "Cash", debit: 0, credit: 85.0 },
          ],
        },
        {
          id: "jre150",
          date: "2023-09-11T10:00:00Z",
          type: "Payroll",
          amount: 1000.0,
          currency: "USD",
          description: "Weekly payroll for employee R",
          lineItems: [
            {
              id: "jli200",
              account: "Payroll Expense",
              debit: 1000.0,
              credit: 0,
            },
            { id: "jli201", account: "Bank Account", debit: 0, credit: 1000.0 },
          ],
        },
        {
          id: "jre151",
          date: "2023-09-10T15:00:00Z",
          type: "Revenue",
          amount: 400.0,
          currency: "USD",
          description: "Rental income",
          lineItems: [
            { id: "jli202", account: "Rental Income", debit: 0, credit: 400.0 },
            { id: "jli203", account: "Cash", debit: 400.0, credit: 0 },
          ],
        },
        {
          id: "jre152",
          date: "2023-09-09T11:00:00Z",
          type: "Bill",
          amount: 180.0,
          currency: "USD",
          description: "Cloud hosting services",
          lineItems: [
            {
              id: "jli204",
              account: "Cloud Hosting Expense",
              debit: 180.0,
              credit: 0,
            },
            {
              id: "jli205",
              account: "Accounts Payable",
              debit: 0,
              credit: 180.0,
            },
          ],
        },
      ],
    },
  },
};






// #####################################################################################################################



const getLedgerAccounts = {
  "data": [
    {
      "id": "lea_27z51XvLgE5PzG608gB2eB",
      "name": "Cash at Bank",
      "code": "1001",
      "type": "ASSET",
      "status": "ACTIVE",
      "currency": "USD",
      "description": "Bank account for daily operations",
      "balance": {
        "amount": 15000.50,
        "currency": "USD"
      },
      "created_at": "2023-01-15T10:00:00Z",
      "updated_at": "2023-01-15T10:00:00Z"
    },
    {
      "id": "lea_27z51XvLgE5PzG608gB2eC",
      "name": "Accounts Receivable",
      "code": "1200",
      "type": "ASSET",
      "status": "ACTIVE",
      "currency": "USD",
      "description": "Money owed by customers",
      "balance": {
        "amount": 7500.20,
        "currency": "USD"
      },
      "created_at": "2023-01-15T10:05:00Z",
      "updated_at": "2023-01-15T10:05:00Z"
    },
    {
      "id": "lea_27z51XvLgE5PzG608gB2eD",
      "name": "Sales Revenue",
      "code": "4000",
      "type": "REVENUE",
      "status": "ACTIVE",
      "currency": "USD",
      "description": "Revenue from product sales",
      "balance": {
        "amount": 25000.00,
        "currency": "USD"
      },
      "created_at": "2023-01-15T10:10:00Z",
      "updated_at": "2023-01-15T10:10:00Z"
    },
    {
      "id": "lea_27z51XvLgE5PzG608gB2eE",
      "name": "Cost of Goods Sold",
      "code": "5000",
      "type": "EXPENSE",
      "status": "ACTIVE",
      "currency": "USD",
      "description": "Direct costs attributable to the production of goods",
      "balance": {
        "amount": -12000.00,
        "currency": "USD"
      },
      "created_at": "2023-01-15T10:15:00Z",
      "updated_at": "2023-01-15T10:15:00Z"
    }
  ],
  "meta": {
    "items_on_page": 4,
    "cursor": null,
    "limit": 20,
    "page": 1
  }
}
