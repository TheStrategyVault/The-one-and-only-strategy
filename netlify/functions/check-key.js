const Airtable = require('airtable');
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

exports.handler = async function (event, context) {
  try {
    const { key } = event.queryStringParameters;
    const clientIp = event.headers['x-nf-client-connection-ip'];

    if (!key) {
      throw new Error('Key is missing');
    }

    // Find the record in Airtable that matches the key
    const records = await base(AIRTABLE_TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: `{Key} = "${key}"`,
      })
      .firstPage();

    // If no record was found at all, the key is invalid.
    if (!records.length) {
      return { statusCode: 200, body: JSON.stringify({ isValid: false }) };
    }

    const record = records[0];
    const recordStatus = record.get('Status');
    const loggedIp = record.get('UsedByIP');

    // CASE 1: The key is new and "Available".
    if (recordStatus === 'Available') {
      // This is the first time this key is being used.
      // Lock it to the current IP address and mark it as "Used".
      await base(AIRTABLE_TABLE_NAME).update(record.id, {
        "Status": "Used",
        "UsedByIP": clientIp,
        "DateUsed": new Date().toISOString()
      });
      // Grant access for this first use.
      return { statusCode: 200, body: JSON.stringify({ isValid: true }) };
    }

    // CASE 2: The key has been used before.
    if (recordStatus === 'Used') {
      // This is a returning user. Check if their IP matches the one we saved.
      if (clientIp === loggedIp) {
        // The IPs match. Grant access.
        return { statusCode: 200, body: JSON.stringify({ isValid: true }) };
      } else {
        // The IPs DO NOT match. Deny access.
        return { statusCode: 200, body: JSON.stringify({ isValid: false }) };
      }
    }

    // Default case: If status is not "Available" or "Used", deny access.
    return { statusCode: 200, body: JSON.stringify({ isValid: false }) };

  } catch (error) {
    console.error("An error occurred:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
