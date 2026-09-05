"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
// Initialize supabase client (ensure these vars are set in .env)
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const apikey = req.headers['apikey'];
        if (!authHeader && !apikey) {
            req.user = { id: 'guest', isGuest: true };
            return next();
        }
        const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
        if (token === 'guest' || token === supabaseAnonKey || apikey === supabaseAnonKey) {
            req.user = { id: 'guest', isGuest: true };
            return next();
        }
        // Verify the JWT token using Supabase for logged-in users
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            // Gracefully fall back to guest mode
            req.user = { id: 'guest', isGuest: true };
            return next();
        }
        // Attach user to request for downstream handlers
        req.user = user;
        next();
    }
    catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Internal authentication error' });
    }
};
exports.requireAuth = requireAuth;
