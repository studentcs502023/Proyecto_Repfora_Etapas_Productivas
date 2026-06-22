import bcrypt from "bcryptjs";
import User from "../models/User.model.js";
import ProductiveStage from "../models/ProductiveStage.model.js";
import { recordAuditLog } from "../utils/auditLog.util.js";
import { AUDIT_ACTIONS } from "../utils/enums.js";
import emailService from "./email.service.js";

import { parseCSV, validateApprenticeRow } from "../utils/importParser.util.js";
import notificationService from "./notifications.service.js";
import { buildWelcomeSubject, buildWelcomeMessage } from "../templates/welcomeEmail.template.js";

/**
 * Genera una contraseña temporal siguiendo el patrón Sena + últimos 4 dígitos del ID + *
 * @param {string} nationalId 
 * @returns {string}
 */
const generateTempPassword = (nationalId) => {
    return `Sena${nationalId.slice(-4)}*`;
};

/**
 * Servicio para la gestión de usuarios (Instructores y Aprendices)
 */
class UserService {
    // === INSTRUCTORS ===

    /**
     * Crea un nuevo instructor
     */
    async createInstructor(data, performedBy) {
        const { nationalId, email } = data;

        // 1. Validar unicidad
        const existingUser = await User.findOne({
            $or: [{ nationalId }, { email }],
        });

        if (existingUser) {
            const field = existingUser.nationalId === nationalId ? "ID nacional" : "correo";
            const error = new Error(`Ya existe un usuario con este ${field}`);
            error.statusCode = 409;
            throw error;
        }

        // 2. Preparar datos
        const tempPassword = generateTempPassword(nationalId);
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const instructor = new User({
            ...data,
            password: hashedPassword,
            role: "INSTRUCTOR",
            status: "ACTIVE",
            firstLogin: false,
        });

        // 3. Integración Google Drive (MOCK por ahora)
        // TODO: Implementar googleDriveService.createInstructorFolder
        instructor.driveFolderId = `mock_folder_${nationalId}`;

        await instructor.save();

        // 4. Auditoría
        await recordAuditLog({
            action: AUDIT_ACTIONS.INSTRUCTOR_CREATED || "INSTRUCTOR_CREATED",
            entity: "User",
            entityId: instructor._id,
            performedBy,
            details: { nationalId, email },
        });

        // 5. TODO: Enviar correo de bienvenida

        return instructor;
    }

    /**
     * Obtiene lista de instructores con filtros y paginación
     */
    async getInstructors(filters = {}) {
        const {
            status,
            instructorType,
            knowledgeArea,
            search,
            isActive,
            page = 1,
            limit = 20,
        } = filters;

        const query = { role: "INSTRUCTOR" };

        if (isActive !== undefined && isActive !== 'all') {
            query.isActive = isActive === 'true' || isActive === true;
        }

        if (status) query.status = status;
        if (instructorType) query.instructorType = instructorType;
        if (knowledgeArea) {
            query.knowledgeArea = { $regex: knowledgeArea, $options: "i" };
        }

        if (search) {
            query.$or = [
                { nationalId: { $regex: search, $options: "i" } },
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;
        const [instructors, total] = await Promise.all([
            User.find(query)
                .select("-password")
                .sort({ fullName: 1 })
                .skip(skip)
                .limit(Number(limit)),
            User.countDocuments(query),
        ]);

        return {
            instructors,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Obtiene detalle de un instructor por ID
     */
    async getInstructorById(id) {
        const instructor = await User.findOne({
            _id: id,
            role: "INSTRUCTOR",
            isActive: true,
        }).select("-password");

        if (!instructor) {
            const error = new Error("Instructor no encontrado");
            error.statusCode = 404;
            throw error;
        }

        // Conteo virtual de aprendices activos
        const activeApprenticesCount = await ProductiveStage.countDocuments({
            $or: [
                { followupInstructor: id },
                { technicalInstructor: id },
                { projectInstructor: id }
            ],
            status: { $nin: ["COMPLETED", "ARCHIVED"] },
        });

        const instructorObj = instructor.toObject();
        instructorObj.activeApprenticesCount = activeApprenticesCount;

        return instructorObj;
    }

    /**
     * Actualiza datos básicos de un instructor
     */
    async updateInstructor(id, data, performedBy) {
        const allowedFields = ["fullName", "email", "phone", "instructorType", "knowledgeArea"];
        const updates = {};
        
        Object.keys(data).forEach(key => {
            if (allowedFields.includes(key)) updates[key] = data[key];
        });

        if (updates.email) {
            const existingEmail = await User.findOne({ 
                email: updates.email, 
                _id: { $ne: id } 
            });
            if (existingEmail) {
                const error = new Error("El correo ya está en uso por otro usuario");
                error.statusCode = 409;
                throw error;
            }
        }

        const instructor = await User.findOneAndUpdate(
            { _id: id, role: "INSTRUCTOR", isActive: true },
            { $set: updates },
            { returnDocument: 'after', runValidators: true }
        ).select("-password");

        if (!instructor) {
            const error = new Error("Instructor no encontrado");
            error.statusCode = 404;
            throw error;
        }

        await recordAuditLog({
            action: AUDIT_ACTIONS.INSTRUCTOR_UPDATED || "INSTRUCTOR_UPDATED",
            entity: "User",
            entityId: id,
            performedBy,
            details: updates,
        });

        return instructor;
    }

    /**
     * Cambia el estado de un instructor
     */
    async changeInstructorStatus(id, { status, reason }, performedBy) {
        const instructor = await User.findOne({ _id: id, role: "INSTRUCTOR", isActive: true });

        if (!instructor) {
            const error = new Error("Instructor no encontrado");
            error.statusCode = 404;
            throw error;
        }

        if (instructor.status === status) {
            const error = new Error(`El instructor ya tiene el estado ${status}`);
            error.statusCode = 400;
            throw error;
        }

        const previousStatus = instructor.status;
        instructor.status = status;
        await instructor.save();

        let affectedApprentices = [];
        if (status === "CONTRACT_ENDED") {
            // Identificar aprendices con etapa productiva activa
            const stages = await ProductiveStage.find({
                $or: [
                    { followupInstructor: id },
                    { technicalInstructor: id },
                    { projectInstructor: id }
                ],
                status: { $nin: ["COMPLETED", "ARCHIVED"] }
            }).populate("apprentice", "fullName nationalId");

            affectedApprentices = stages.map(s => ({
                stageId: s._id,
                apprenticeId: s.apprentice._id,
                fullName: s.apprentice.fullName,
                modality: s.modality
            }));
        }

        await recordAuditLog({
            action: AUDIT_ACTIONS.INSTRUCTOR_STATUS_CHANGED || "INSTRUCTOR_STATUS_CHANGED",
            entity: "User",
            entityId: id,
            performedBy,
            details: { previousStatus, newStatus: status, reason },
        });

        // Enviar correo de notificación
        const estadoLabel = status === 'ACTIVE' ? 'Activada' : (status === 'INACTIVE' ? 'Inactivada' : 'Finalizada');
        try {
            await emailService.send({
                to: instructor.email,
                subject: `Estado de cuenta actualizado a ${estadoLabel} - REPFORA E.P.`,
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #39a900; text-align: center;">REPFORA E.P. — SENA</h2>
                        <p>Estimado/a <strong>${instructor.fullName}</strong>,</p>
                        <p>El estado de tu cuenta en el sistema ha sido cambiado a: <strong>${estadoLabel}</strong>.</p>
                        ${status === 'INACTIVE' ? '<p>Tu cuenta ha sido bloqueada temporalmente y no podrás acceder a tus funciones hasta nueva orden.</p>' : ''}
                        ${status === 'ACTIVE' ? '<p>Ya puedes acceder nuevamente a la plataforma y continuar con tus labores.</p>' : ''}
                        <p><strong>Motivo:</strong> ${reason}</p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="font-size: 12px; color: #666;">Este es un mensaje automático. Por favor no respondas a este correo.</p>
                        </div>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('[UserService] Error enviando correo de cambio de estado:', emailErr.message);
        }

        return { instructor, affectedApprentices };
    }

    /**
     * Reasigna aprendices de un instructor a otro
     */
    async reassignApprentices(data, performedBy) {
        const { oldInstructorId, newInstructorId, productiveStageIds } = data;

        const newInstructor = await User.findOne({ 
            _id: newInstructorId, 
            role: "INSTRUCTOR", 
            status: "ACTIVE", 
            isActive: true 
        });

        if (!newInstructor) {
            const error = new Error("El nuevo instructor no existe o no está activo");
            error.statusCode = 400;
            throw error;
        }

        const results = await Promise.all(productiveStageIds.map(async (stageId) => {
            const stage = await ProductiveStage.findById(stageId);
            if (!stage) return { stageId, success: false, reason: "No encontrado" };

            let updated = false;
            if (stage.followupInstructor?.toString() === oldInstructorId) {
                stage.followupInstructor = newInstructorId;
                updated = true;
            }
            if (stage.technicalInstructor?.toString() === oldInstructorId) {
                stage.technicalInstructor = newInstructorId;
                updated = true;
            }
            if (stage.projectInstructor?.toString() === oldInstructorId) {
                stage.projectInstructor = newInstructorId;
                updated = true;
            }

            if (updated) {
                await stage.save();
                // TODO: Mover carpeta en Drive
                // TODO: Notificar al aprendiz y al nuevo instructor
                return { stageId, success: true };
            }

            return { stageId, success: false, reason: "No pertenecía al instructor original" };
        }));

        await recordAuditLog({
            action: AUDIT_ACTIONS.INSTRUCTOR_REASSIGNMENT || "INSTRUCTOR_REASSIGNMENT",
            entity: "User",
            performedBy,
            details: { oldInstructorId, newInstructorId, productiveStageIds },
        });

        return results;
    }

    // === APPRENTICES ===

    /**
     * Crea un aprendiz individualmente
     */
    async createApprentice(data, performedBy) {
        const { nationalId, email } = data;

        const existingUser = await User.findOne({
            $or: [{ nationalId }, { email }],
        });

        if (existingUser) {
            const field = existingUser.nationalId === nationalId ? "ID nacional" : "correo";
            const error = new Error(`Ya existe un usuario con este ${field}`);
            error.statusCode = 409;
            throw error;
        }

        const tempPassword = nationalId; // As per RF-002 (password equals ID)
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        const apprentice = new User({
            ...data,
            password: hashedPassword,
            role: "APPRENTICE",
            status: "ACTIVE",
            firstLogin: true,
        });

        await apprentice.save();
        console.log(`[UserService] Aprendiz creado: ${apprentice.fullName} (${apprentice.nationalId}) - Email: ${apprentice.email}`);

        await recordAuditLog({
            action: AUDIT_ACTIONS.APPRENTICE_CREATED || "APPRENTICE_CREATED",
            entity: "User",
            entityId: apprentice._id,
            performedBy,
            details: { nationalId, email },
        });

        console.log('[UserService] Disparando correo de bienvenida vía notificationService...');
        notificationService.send({
            type: "SYSTEM_WELCOME",
            recipients: [apprentice._id.toString()],
            title: buildWelcomeSubject(),
            message: buildWelcomeMessage(),
        }).catch(err => console.error('[UserService] Error enviando notificación de bienvenida:', err.message));
        console.log('[UserService] Correo de bienvenida procesado.');

        return apprentice;
    }

    /**
     * Obtiene lista de aprendices con filtros
     */
    async getApprentices(filters = {}) {
        const {
            enrollmentNumber,
            program,
            trainingLevel,
            trainingCenter,
            search,
            isActive,
            page = 1,
            limit = 20,
        } = filters;

        const query = { role: "APPRENTICE" };

        if (isActive !== undefined && isActive !== 'all') {
            query.isActive = isActive === 'true' || isActive === true;
        }

        if (enrollmentNumber) query.enrollmentNumber = enrollmentNumber;
        if (program) query.program = { $regex: program, $options: "i" };
        if (trainingLevel) query.trainingLevel = trainingLevel;
        if (trainingCenter) query.trainingCenter = trainingCenter;

        if (search) {
            query.$or = [
                { nationalId: { $regex: search, $options: "i" } },
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;
        const [apprentices, total] = await Promise.all([
            User.find(query)
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            User.countDocuments(query),
        ]);

        return {
            apprentices,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Obtiene lista de aprendices filtrada para un instructor específico
     * Solo devuelve aprendices que tengan una EP asignada a ese instructor
     */
    async getApprenticesForInstructor(instructorId, filters = {}) {
        const {
            search,
            enrollmentNumber,
            program,
            isActive,
            page = 1,
            limit = 20,
        } = filters;

        const ProductiveStage = (await import('../models/ProductiveStage.model.js')).default;

        const assignedEPs = await ProductiveStage.find({
            isActive: true,
            $or: [
                { followupInstructor: instructorId },
                { technicalInstructor: instructorId },
                { projectInstructor: instructorId }
            ]
        }).select('apprentice').lean();

        const apprenticeIds = [...new Set(assignedEPs.map(ep => ep.apprentice.toString()))];

        const query = { _id: { $in: apprenticeIds }, role: 'APPRENTICE' };

        if (isActive !== undefined && isActive !== 'all') {
            query.isActive = isActive === 'true' || isActive === true;
        }

        if (enrollmentNumber) query.enrollmentNumber = enrollmentNumber;
        if (program) query.program = { $regex: program, $options: 'i' };

        if (search) {
            query.$or = [
                { nationalId: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { enrollmentNumber: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;
        const [apprentices, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ fullName: 1 })
                .skip(skip)
                .limit(Number(limit)),
            User.countDocuments(query),
        ]);

        return {
            apprentices,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Obtiene detalle de un aprendiz por ID
     */

    async getApprenticeById(id) {
        const apprentice = await User.findOne({
            _id: id,
            role: "APPRENTICE",
            isActive: true,
        }).select("-password");

        if (!apprentice) {
            const error = new Error("Aprendiz no encontrado");
            error.statusCode = 404;
            throw error;
        }

        return apprentice;
    }

    /**
     * Actualiza un aprendiz. Lógica diferente según quién edita.
     */
    async updateApprentice(id, data, userRole, performedBy) {
        let updates = {};

        if (userRole === "APPRENTICE") {
            // Un aprendiz solo puede editar su teléfono y correo
            if (data.phone) updates.phone = data.phone;
            if (data.email) updates.email = data.email;
        } else if (userRole === "ADMIN") {
            // Admin puede editar casi todo excepto ID y rol
            const forbidden = ["nationalId", "role", "password"];
            Object.keys(data).forEach(key => {
                if (!forbidden.includes(key)) updates[key] = data[key];
            });
        }

        if (updates.email) {
            const existingEmail = await User.findOne({ 
                email: updates.email, 
                _id: { $ne: id } 
            });
            if (existingEmail) {
                const error = new Error("El correo ya está en uso por otro usuario");
                error.statusCode = 409;
                throw error;
            }
        }

        const apprentice = await User.findOneAndUpdate(
            { _id: id, role: "APPRENTICE", isActive: true },
            { $set: updates },
            { returnDocument: 'after', runValidators: true }
        ).select("-password");

        if (!apprentice) {
            const error = new Error("Aprendiz no encontrado");
            error.statusCode = 404;
            throw error;
        }

        await recordAuditLog({
            action: AUDIT_ACTIONS.APPRENTICE_UPDATED || "APPRENTICE_UPDATED",
            entity: "User",
            entityId: id,
            performedBy,
            details: updates,
        });

        return apprentice;
    }

    /**
     * Importación masiva de aprendices desde un archivo CSV
     */
    async importApprentices(fileBuffer, performedBy) {
        const rows = parseCSV(fileBuffer);
        const results = {
            imported: 0,
            skipped: 0,
            errors: []
        };
        const newApprentices = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const error = validateApprenticeRow(row);

            if (error) {
                results.errors.push({ row: i + 2, nationalId: row.nationalId, reason: error });
                continue;
            }

            try {
                // Verificar si ya existe
                const existing = await User.findOne({ nationalId: row.nationalId });
                if (existing) {
                    results.skipped++;
                    continue;
                }

                const tempPassword = row.nationalId; // As per RF-002
                const hashedPassword = await bcrypt.hash(tempPassword, 12);

                const apprentice = new User({
                    ...row,
                    password: hashedPassword,
                    role: "APPRENTICE",
                    status: "ACTIVE",
                    firstLogin: true
                });

                await apprentice.save();
                newApprentices.push(apprentice);
                results.imported++;
            } catch (err) {
                results.errors.push({ row: i + 2, nationalId: row.nationalId, reason: err.message });
            }
        }

        await recordAuditLog({
            action: AUDIT_ACTIONS.APPRENTICE_IMPORTED || "APPRENTICE_IMPORTED",
            entity: "User",
            performedBy,
            details: { importedCount: results.imported, errorCount: results.errors.length },
        });

        if (newApprentices.length > 0) {
            notificationService.send({
                type: "SYSTEM_WELCOME",
                recipients: newApprentices.map(a => a._id.toString()),
                title: buildWelcomeSubject(),
                message: buildWelcomeMessage(),
            }).catch(err => console.error("Error enviando correos de importación:", err));
        }

        return results;
    }

    // === DEACTIVATE (Soft Delete) ===

    async deactivateInstructor(id, performedBy) {
        const instructor = await User.findOneAndUpdate(
            { _id: id, role: "INSTRUCTOR", isActive: true },
            { $set: { isActive: false, status: "INACTIVE" } },
            { returnDocument: 'after' }
        ).select("-password");

        if (!instructor) {
            const error = new Error("Instructor no encontrado o ya desactivado");
            error.statusCode = 404;
            throw error;
        }

        await recordAuditLog({
            action: "INSTRUCTOR_DEACTIVATED",
            entity: "User",
            entityId: id,
            performedBy,
            details: { nationalId: instructor.nationalId, fullName: instructor.fullName }
        });

        // Enviar correo de notificación
        try {
            await emailService.send({
                to: instructor.email,
                subject: 'Cuenta Eliminada - REPFORA E.P.',
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #39a900; text-align: center;">REPFORA E.P. — SENA</h2>
                        <p>Estimado/a <strong>${instructor.fullName}</strong>,</p>
                        <p>Tu cuenta en el sistema REPFORA E.P. ha sido <strong>inactivada/eliminada</strong>.</p>
                        <p>Ya no tienes acceso a la plataforma. Para cualquier duda, comunícate con el administrador del sistema o tu coordinador.</p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="font-size: 12px; color: #666;">Este es un mensaje automático. Por favor no respondas a este correo.</p>
                        </div>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('[UserService] Error enviando correo de deactivación:', emailErr.message);
        }

        return instructor;
    }

    async deactivateApprentice(id, performedBy) {
        const apprentice = await User.findOneAndUpdate(
            { _id: id, role: "APPRENTICE", isActive: true },
            { $set: { isActive: false } },
            { returnDocument: 'after' }
        ).select("-password");

        if (!apprentice) {
            const error = new Error("Aprendiz no encontrado o ya desactivado");
            error.statusCode = 404;
            throw error;
        }

        await recordAuditLog({
            action: "APPRENTICE_DEACTIVATED",
            entity: "User",
            entityId: id,
            performedBy,
            details: { nationalId: apprentice.nationalId, fullName: apprentice.fullName }
        });

        // Enviar correo de notificación
        try {
            await emailService.send({
                to: apprentice.email,
                subject: 'Cuenta Eliminada - REPFORA E.P.',
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #39a900; text-align: center;">REPFORA E.P. — SENA</h2>
                        <p>Estimado/a <strong>${apprentice.fullName}</strong>,</p>
                        <p>Tu cuenta en el sistema REPFORA E.P. ha sido <strong>inactivada/eliminada</strong>.</p>
                        <p>Ya no tienes acceso a la plataforma. Para cualquier duda, comunícate con tu instructor o coordinador.</p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="font-size: 12px; color: #666;">Este es un mensaje automático. Por favor no respondas a este correo.</p>
                        </div>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('[UserService] Error enviando correo de deactivación de aprendiz:', emailErr.message);
        }

        return apprentice;
    }

    async activateInstructor(id, performedBy) {
        const instructor = await User.findOneAndUpdate(
            { _id: id, role: "INSTRUCTOR", isActive: false },
            { $set: { isActive: true, status: "ACTIVE" } },
            { returnDocument: 'after' }
        ).select("-password");

        if (!instructor) {
            const error = new Error("Instructor no encontrado o ya está activo");
            error.statusCode = 404;
            throw error;
        }

        await recordAuditLog({
            action: "INSTRUCTOR_ACTIVATED",
            entity: "User",
            entityId: id,
            performedBy,
            details: { nationalId: instructor.nationalId, fullName: instructor.fullName }
        });

        // Enviar correo de notificación
        try {
            await emailService.send({
                to: instructor.email,
                subject: 'Cuenta Restaurada - REPFORA E.P.',
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #39a900; text-align: center;">REPFORA E.P. — SENA</h2>
                        <p>Estimado/a <strong>${instructor.fullName}</strong>,</p>
                        <p>Tu cuenta en el sistema REPFORA E.P. ha sido <strong>restaurada y activada</strong> nuevamente.</p>
                        <p>Ya puedes acceder al sistema y continuar con tus funciones regulares.</p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="font-size: 12px; color: #666;">Este es un mensaje automático. Por favor no respondas a este correo.</p>
                        </div>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('[UserService] Error enviando correo de activación de instructor:', emailErr.message);
        }

        return instructor;
    }

    async activateApprentice(id, performedBy) {
        const apprentice = await User.findOneAndUpdate(
            { _id: id, role: "APPRENTICE", isActive: false },
            { $set: { isActive: true } },
            { returnDocument: 'after' }
        ).select("-password");

        if (!apprentice) {
            const error = new Error("Aprendiz no encontrado o ya está activo");
            error.statusCode = 404;
            throw error;
        }

        await recordAuditLog({
            action: "APPRENTICE_ACTIVATED",
            entity: "User",
            entityId: id,
            performedBy,
            details: { nationalId: apprentice.nationalId, fullName: apprentice.fullName }
        });

        // Enviar correo de notificación
        try {
            await emailService.send({
                to: apprentice.email,
                subject: 'Cuenta Restaurada - REPFORA E.P.',
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #39a900; text-align: center;">REPFORA E.P. — SENA</h2>
                        <p>Estimado/a <strong>${apprentice.fullName}</strong>,</p>
                        <p>Tu cuenta en el sistema REPFORA E.P. ha sido <strong>restaurada y activada</strong> nuevamente.</p>
                        <p>Ya puedes acceder al sistema y continuar con tu proceso.</p>
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="font-size: 12px; color: #666;">Este es un mensaje automático. Por favor no respondas a este correo.</p>
                        </div>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('[UserService] Error enviando correo de activación de aprendiz:', emailErr.message);
        }

        return apprentice;
    }
}

export default new UserService();
