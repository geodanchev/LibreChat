const { Schema , mongoose} = require('mongoose');
const { SystemRoles } = require('librechat-data-provider');

// Session sub-schema
const SessionSchema = new Schema(
    {
        refreshToken: {
            type: String,
            default: '',
        },
    },
    { _id: false }
);

// Backup code sub-schema
const BackupCodeSchema = new Schema(
    {
        codeHash: { type: String, required: true },
        used: { type: Boolean, default: false },
        usedAt: { type: Date, default: null },
    },
    { _id: false }
);

const userSchema = new Schema(
    {
        name: {
            type: String,
        },
        username: {
            type: String,
            lowercase: true,
            default: '',
        },
        email: {
            type: String,
            required: [true, "can't be blank"],
            lowercase: true,
            unique: true,
            match: [/\S+@\S+.\S+/, 'is invalid'],
            index: true,
        },
        emailVerified: {
            type: Boolean,
            required: true,
            default: false,
        },
        password: {
            type: String,
            trim: true,
            minlength: 8,
            maxlength: 128,
        },
        avatar: {
            type: String,
            required: false,
        },
        provider: {
            type: String,
            required: true,
            default: 'local',
        },
        role: {
            type: String,
            default: SystemRoles.USER,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        facebookId: {
            type: String,
            unique: true,
            sparse: true,
        },
        openidId: {
            type: String,
            unique: true,
            sparse: true,
        },
        ldapId: {
            type: String,
            unique: true,
            sparse: true,
        },
        githubId: {
            type: String,
            unique: true,
            sparse: true,
        },
        discordId: {
            type: String,
            unique: true,
            sparse: true,
        },
        appleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        plugins: {
            type: Array,
        },
        customOpenIdData: {
            type: Map,
            of: String
        },
        twoFactorEnabled: {
            type: Boolean,
            default: false,
        },
        totpSecret: {
            type: String,
        },
        backupCodes: {
            type: [BackupCodeSchema],
        },
        refreshToken: {
            type: [SessionSchema],
        },
        expiresAt: {
            type: Date,
            expires: 604800, // 7 days in seconds
        },
        termsAccepted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);



const User = mongoose.model('User', userSchema);

module.exports = User;
