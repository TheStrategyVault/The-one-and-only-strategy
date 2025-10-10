const Airtable = require('airtable');
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

exports.handler = async function (event, context) {
  try {
    // Get both the key AND the course from the URL
    const { key, course } = event.queryStringParameters;
    const clientIp = event.headers['x-nf-client-connection-ip'];

    if (!key || !course) {
      throw new Error('Key or course is missing');
    }

    // This is the new, more specific search formula.
    // It looks for a record where the Key AND the Course match.
    const filterByFormula = `AND({Key} = "${key}", {Course} = "${course}")`;

    const records = await base(AIRTABLE_TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: filterByFormula,
      })
      .firstPage();

    // If no record was found, the key is invalid for this course.
    if (!records.length) {
      return { statusCode: 200, body: JSON.stringify({ isValid: false }) };
    }

    const record = records[0];
    const recordStatus = record.get('Status');
    const loggedIp = record.get('UsedByIP');

    if (recordStatus === 'Available') {
      await base(AIRTABLE_TABLE_NAME).update(record.id, {
        "Status": "Used",
        "UsedByIP": clientIp,
        "DateUsed": new Date().toISOString()
      });
      return { statusCode: 200, body: JSON.stringify({ isValid: true }) };
    }

    if (recordStatus === 'Used') {
      if (clientIp && loggedIp && clientIp === loggedIp) {
        return { statusCode: 200, body: JSON.stringify({ isValid: true }) };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ isValid: false }) };

  } catch (error) {
    console.error("An error occurred:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
