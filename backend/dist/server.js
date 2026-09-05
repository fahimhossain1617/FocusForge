"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const mindRoutes_1 = __importDefault(require("./routes/mindRoutes"));
const diaryRoutes_1 = __importDefault(require("./routes/diaryRoutes"));
const focusRoutes_1 = __importDefault(require("./routes/focusRoutes"));
const learningRoutes_1 = __importDefault(require("./routes/learningRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const noteRoutes_1 = __importDefault(require("./routes/noteRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// Routes
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/mind', mindRoutes_1.default);
app.use('/api/diary', diaryRoutes_1.default);
app.use('/api/focus', focusRoutes_1.default);
app.use('/api/learning', learningRoutes_1.default);
app.use('/api/tasks', taskRoutes_1.default);
app.use('/api/notes', noteRoutes_1.default);
app.use('/api/user', userRoutes_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});
// Start the server
app.listen(port, () => {
    console.log(`🚀 FocusForge Backend running on port ${port}`);
});
