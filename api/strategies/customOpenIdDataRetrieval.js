async function mapCustomOpenIdDataAzure(accessToken, customOpenIdFields) {
    const customData = {};
    const fieldsQueryURL = `https://graph.microsoft.com/v1.0/me?$select=${customOpenIdFields.join(',')}`;

    const response = await fetch(fieldsQueryURL, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        }
    });


    if (response.ok) {
        const customOpenIdFieldsResult = await response.json();

        // Extract relevant fields from the response
        customOpenIdFields.forEach(field => {
            if (customOpenIdFieldsResult[field]) {
                customData[field] = customOpenIdFieldsResult[field];
            }
        });
    }
    return customData;
}

module.exports = {
    PROVIDER_MAPPERS: {
        microsoft: mapCustomOpenIdDataAzure,
    }
};