// Import the Airtable library
const Airtable = require('airtable');

// Get our secret credentials from the Netlify environment
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

// Connect to our Airtable base
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// This is the main function that Netlify will run
exports.handler = async function (event, context) {
  try {
    // Get the key from the URL query parameter (?key=...)
    const { key } = event.queryStringParameters;

    // Get the IP address of the person making the request
    const clientIp = event.headers['client-ip'];

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

    // If no record was found, or if the status is "Used"
    if (!records.length || records[0].get('Status') === 'Used') {
      return {
        statusCode: 200,
        body: JSON.stringify({ isValid: false }),
      };
    }

    // If we found the key and it's "Available", let's update it!
    const record = records[0];
    await base(AIRTABLE_TABLE_NAME).update(record.id, {
      "Status": "Used",
      "UsedByIP": clientIp,
      "DateUsed": new Date()
    });

    // Send back a success response
    return {
      statusCode: 200,
      body: JSON.stringify({ isValid: true }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
