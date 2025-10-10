const Airtable = require('airtable');
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

exports.handler = async function (event, context) {
  try {
    const { key, course } = event.queryStringParameters;
    const clientIp = event.headers['x-nf-client-connection-ip'];
    
    // LOGGING LINE 1
    console.log(`Function invoked. Key: "${key}", Course: "${course}"`);

    if (!key || !course) {
      throw new Error('Key or course is missing');
    }

    const filterByFormula = `AND({Key} = "${key}", {Course} = "${course}")`;
    
    const records = await base(AIRTABLE_TABLE_NAME)
      .select({
        maxRecords: 1,
        filterByFormula: filterByFormula,
      })
      .firstPage();

    // LOGGING LINE 2
    console.log(`Airtable search complete. Found ${records.length} records.`);

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
    // LOGGING LINE 3
    console.error("Function crashed with an error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
