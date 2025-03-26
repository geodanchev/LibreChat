const mongoose = require('mongoose');
const { userSchema } = require('@librechat/data-schemas');

const customUserSchema = new mongoose.Schema({
    ...userSchema.obj, // Spread the existing schema fields
    // Add your custom fields here
    customOpenIdData: {
        type: Map,
        of: String
    },
});

const User = mongoose.model('User', customUserSchema);

module.exports = User;
