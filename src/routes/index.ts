import { Router } from "express";
import userRoutes from "./userRoutes.js";
import tandaRoutes from "./tandaRoutes.js";

const router = Router();

router.use("/users", userRoutes);
router.use("/tandas", tandaRoutes);

export default router;
