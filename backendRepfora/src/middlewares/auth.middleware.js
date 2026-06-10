import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { errorResponse } from "../utils/response.util.js";
import User from "../models/User.model.js";

/**
 * Middleware para verificar JWT y el estado del primer login.
 */
export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return errorResponse(res, 401, "Acceso no autorizado: Token no proporcionado");
        }

        const token = authHeader.split(" ")[1];

        // Verificar validez del token
        const decoded = jwt.verify(token, env.JWT_SECRET);

        // Buscar usuario en DB para verificar estado actual (lock, active, firstLogin)
        const user = await User.findById(decoded.id).select("-password");

        if (!user || !user.isActive) {
            return errorResponse(res, 401, "Acceso no autorizado: Usuario inválido o inactivo");
        }

        // Inyectar usuario en request
        req.user = {
            id: user._id,
            nationalId: user.nationalId,
            role: user.role,
            fullName: user.fullName,
            firstLogin: user.firstLogin
        };

        // Regla: Si tiene el flag `firstLogin` activo, solo puede ir a rutas de cambiar contraseña.
        const isChangingPassword = req.path === "/change-password-first" || req.path === "/change-password";

        if (user.firstLogin && !isChangingPassword) {
            console.log(`[AuthMiddleware] Usuario ${user.nationalId} bloqueado por firstLogin. Ruta: ${req.method} ${req.originalUrl}`);
            return errorResponse(res, 403, "Debe cambiar su contraseña inicial antes de continuar", {
                requiresPasswordChange: true
            });
        }

        console.log(`[AuthMiddleware] Usuario ${user.nationalId} (${user.role}) autorizado para: ${req.method} ${req.originalUrl}`);
        next();
    } catch (error) {
        console.error("❌ Auth Middleware Error:", error.message);
        return errorResponse(res, 401, "Acceso no autorizado: Token inválido o expirado");
    }
};
