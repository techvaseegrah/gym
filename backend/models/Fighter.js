// server/models/Fighter.js

const mongoose = require('mongoose');

// Helper schema for individual skill scores
const ScoreSchema = new mongoose.Schema({
    fighterScore: { type: Number, default: 0 },
    masterScore: { type: Number, default: 0 }
}, { _id: false });

// --- This is the updated assessment schema ---
const assessmentSchema = new mongoose.Schema({
    // Technical Advantage
    stance: ScoreSchema,
    jab: ScoreSchema,
    straight: ScoreSchema,
    left_hook: ScoreSchema,
    right_hook: ScoreSchema,
    thigh_kick: ScoreSchema,
    rib_kick: ScoreSchema,
    face_slap_kick: ScoreSchema,
    inner_kick: ScoreSchema,
    outer_kick: ScoreSchema,
    front_kick: ScoreSchema,
    rise_kick: ScoreSchema,
    boxing_movements: ScoreSchema,
    push_ups: ScoreSchema,
    cambo: ScoreSchema, // Note: Assuming 'Cambo' is a skill name

    // Skill Advantage
    stamina: ScoreSchema,
    speed: ScoreSchema,
    flexibility: ScoreSchema,
    power: ScoreSchema,
    martial_arts_knowledge: ScoreSchema,
    discipline: ScoreSchema,
    
    // Special Grade Score
    specialGradeScore: { type: Number, default: 0 },

    // Keeping the coreLevel object from previous work, can be removed if no longer needed
    coreLevel: {
        power: { type: Number, default: 0, min: 0, max: 100 },
        speed: { type: Number, default: 0, min: 0, max: 100 },
        agility: { type: Number, default: 0, min: 0, max: 100 },
        endurance: { type: Number, default: 0, min: 0, max: 100 },
        technique: { type: Number, default: 0, min: 0, max: 100 },
        footwork: { type: Number, default: 0, min: 0, max: 100 },
    },
}, { _id: false, minimize: false }); // `minimize: false` ensures empty score objects are saved

const fighterSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }, //
    password: { type: String, required: true }, //
    role: { type: String, default: 'fighter' }, //
    rfid: {
        type: String,
        required: true,
        unique: true
    },
    profile_completed: { type: Boolean, default: false }, //
    name: { type: String }, //
    fighterBatchNo: { type: String }, //
    // ... other personal info fields
    age: { type: Number },
    gender: { type: String },
    phNo: { type: String },
    address: { type: String },
    height: { type: String },
    weight: { type: String },
    bloodGroup: { type: String },
    occupation: { type: String },
    dateOfJoining: { type: Date, default: Date.now },
    package: { type: String },
    previousExperience: { type: String },
    medicalIssue: { type: String },
    motto: { type: String },
    martialArtsKnowledge: { type: String },
    goals: { type: [String] },
    referral: { type: String },
    achievements: { type: String }, // Added achievements field
    agreement: { type: Boolean },
    
    assessment: { type: assessmentSchema, default: () => ({}) }, // Use the new schema
    
    faceEncodings: { type: mongoose.Schema.Types.Mixed }, //
    profilePhoto: { type: String } // Store Base64 encoded image string
}, { timestamps: true });

module.exports = mongoose.model('Fighter', fighterSchema);