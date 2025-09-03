const Airtable = require('airtable');
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

exports.handler = async function (event, context) {
  try {
    const { key } = event.queryStringParameters;
    const clientIp = event.headers['client-ip'];

    // --- NEW LOGGING LINE 1 ---
    // This will show us if the function is receiving the key you type.
    console.log("Function received key:", key);

    if (!key) {
      throw new Error('Key is missing');
    }

    const records = await base(AIRTABLE_TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{Key} = "${key}"`,
      })
      .firstPage();

    // --- NEW LOGGING LINE 2 ---
    // This will tell us if Airtable found a matching record.
    console.log("Airtable found this many records:", records.length);

    if (!records.length || records[0].get('Status') === 'Used') {
      return {
        statusCode: 200,
        body: JSON.stringify({ isValid: false }),
      };
    }

    const record = records[0];
    await base(AIRTABLE_TABLE_NAME).update(record.id, {
      "Status": "Used",
      "UsedByIP": clientIp,
      "DateUsed": new Date()
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({ isValid: true }),
    };

  } catch (error) {
    // This will log any other unexpected errors.
    console.error("An error occurred:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
