import express from 'express';
import tandaRoutes from './routes/tandas.js';
const app = express();
app.use(express.json());
app.use('/tandas', tandaRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map