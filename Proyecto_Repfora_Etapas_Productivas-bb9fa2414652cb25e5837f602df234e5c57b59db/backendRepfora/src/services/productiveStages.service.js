import ProductiveStage from "../models/ProductiveStage.model.js";
import User from "../models/User.model.js";
import Company from "../models/Company.model.js";
import { getConfig } from "../utils/configHelper.util.js";
import { calculateEpDeadline, daysUntil } from "../utils/dateHelper.util.js";
import { recordAuditLog } from "../utils/auditLog.util.js";
import { AUDIT_ACTIONS, EP_STATUSES } from "../utils/enums.js";
import notificationService from "./notifications.service.js";
import { findOrCreateFolder, getRootFolderId, getDriveClient } from "../utils/googleDrive.util.js";

class ProductiveStageService {
    /**
     * Registra una nueva etapa productiva (Aprendiz)
     */
    async registerEP(apprenticeId, data, performedBy) {
        // 1. Verificar aprendiz
        const apprentice = await User.findOne({ _id: apprenticeId, role: "APPRENTICE", isActive: true });
        if (!apprentice) {
            const error = new Error("Aprendiz no encontrado o inactivo");
            error.statusCode = 404;
            throw error;
        }

        // 2. Verificar que no tenga EP activa (permitir re-registro si fue rechazada)
        const existingEP = await ProductiveStage.findOne({
            apprentice: apprenticeId,
            status: { $nin: ["COMPLETED", "ARCHIVED", "PENDING_REGISTRATION"] },
            isActive: true
        });
        if (existingEP) {
            const error = new Error("Ya tienes una etapa productiva activa o en proceso");
            error.statusCode = 409;
            throw error;
        }

        // Si existe una EP rechazada (PENDING_REGISTRATION), la archivamos como histórico
        await ProductiveStage.updateMany(
            { apprentice: apprenticeId, status: "PENDING_REGISTRATION", isActive: true },
            { $set: { isActive: false, isHistorical: true } }
        );

        // 3. Verificar elegibilidad de matrícula
        if (!apprentice.enrollmentExpiryDate) {
            const error = new Error("No tienes registrada una fecha de fin de etapa lectiva. Contacta al administrador.");
            error.statusCode = 400;
            throw error;
        }

        const monthsNew = await getConfig("EP_DEADLINE_MONTHS_NEW_ENROLLMENT");
        const yearsOld = await getConfig("EP_DEADLINE_YEARS_OLD_ENROLLMENT");
        
        const deadline = calculateEpDeadline(
            apprentice.enrollmentExpiryDate,
            apprentice.isPreNov2024,
            monthsNew,
            yearsOld
        );

        if (new Date() > deadline) {
            const error = new Error("Tu plazo para registrar la etapa productiva ha vencido.");
            error.statusCode = 400;
            throw error;
        }

        // 4. Verificar empresa
        let companySnapshot = { ...data.companySnapshot };
        if (data.companyId) {
            const company = await Company.findById(data.companyId);
            if (!company) {
                const error = new Error("La empresa seleccionada no existe");
                error.statusCode = 404;
                throw error;
            }
            companySnapshot.companyName = company.name;
            companySnapshot.taxId = company.taxId;
            companySnapshot.address = company.address;
        } else {
            // Es una nueva empresa, validamos que el snapshot tenga lo necesario
            if (!companySnapshot.companyName || !companySnapshot.taxId) {
                const error = new Error("Debe proporcionar los datos de la nueva empresa");
                error.statusCode = 400;
                throw error;
            }
        }

        // 6. Crear EP
        const ep = new ProductiveStage({
            apprentice: apprenticeId,
            company: data.companyId,
            modality: data.modality,
            status: "PENDING_APPROVAL",
            registrationDate: new Date(),
            startDate: data.startDate,
            estimatedEndDate: data.estimatedEndDate,
            companySnapshot
        });

        await ep.save();

        // 7. Auditoría y Notificación
        await recordAuditLog({
            action: AUDIT_ACTIONS.EP_REGISTERED || "EP_REGISTERED",
            entity: "ProductiveStage",
            entityId: ep._id,
            performedBy,
            details: { modality: data.modality }
        });

        // TODO: Enviar notificación al ADMIN

        return ep;
    }

    /**
     * Obtiene lista de EPs con filtros (Admin/Instructor)
     */
    async getEPs(filters = {}, user) {
        const { status, modality, apprenticeId, instructorId, search, page = 1, limit = 20 } = filters;
        
        let query = { isActive: true };

        // Restricción para instructores
        if (user.role === "INSTRUCTOR") {
            query.$or = [
                { followupInstructor: user.id },
                { technicalInstructor: user.id },
                { projectInstructor: user.id }
            ];
        }

        if (status) query.status = status;
        if (modality) query.modality = modality;
        if (apprenticeId) query.apprentice = apprenticeId;
        if (instructorId) {
            query.$or = [
                { followupInstructor: instructorId },
                { technicalInstructor: instructorId },
                { projectInstructor: instructorId }
            ];
        }

        const skip = (page - 1) * limit;
        
        // Búsqueda por texto (requiere populate previo o agregación, por simplicidad usamos regex en path)
        let populateQuery = {
            path: "apprentice",
            select: "fullName nationalId enrollmentNumber email program"
        };

        if (search) {
            // Nota: En una DB grande esto es ineficiente sin índices de texto o búsqueda previa de IDs
            const apprentices = await User.find({
                role: "APPRENTICE",
                $or: [
                    { fullName: { $regex: search, $options: "i" } },
                    { enrollmentNumber: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            query.apprentice = { $in: apprentices.map(a => a._id) };
        }

        const [eps, total] = await Promise.all([
            ProductiveStage.find(query)
                .populate(populateQuery)
                .populate("company", "name taxId")
                .populate("followupInstructor technicalInstructor projectInstructor", "fullName email")
                .sort({ registrationDate: -1 })
                .skip(skip)
                .limit(Number(limit)),
            ProductiveStage.countDocuments(query)
        ]);

        return {
            eps,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Aprueba una etapa productiva (Admin)
     */
    async approveEP(id, data, performedBy) {
        const ep = await ProductiveStage.findById(id).populate("apprentice");
        
        if (!ep) {
            const error = new Error("Etapa productiva no encontrada");
            error.statusCode = 404;
            throw error;
        }

        if (ep.status !== "PENDING_APPROVAL") {
            const error = new Error("La etapa productiva no está pendiente de aprobación");
            error.statusCode = 400;
            throw error;
        }

        // 1. Obtener límites de configuración
        const level = ep.apprentice.trainingLevel;
        const maxBitacoras = await getConfig(`MAX_LOGBOOKS_${level}`);
        const requiredTrackings = await getConfig(`REQUIRED_TRACKINGS_${level}`);

        // 1.5. Crear la empresa si era propuesta por el aprendiz y no existe
        if (!ep.company) {
            const newCompany = new Company({
                name: ep.companySnapshot.companyName,
                taxId: ep.companySnapshot.taxId,
                address: ep.companySnapshot.address || 'Pendiente',
                phone: ep.companySnapshot.companyPhone || ep.companySnapshot.supervisorPhone || '0000000',
                email: ep.companySnapshot.companyEmail || ep.companySnapshot.supervisorEmail || 'pendiente@correo.com',
                contacts: [{
                    fullName: ep.companySnapshot.supervisorName || 'Pendiente',
                    jobTitle: ep.companySnapshot.apprenticeJobTitle || 'Supervisor',
                    phone: ep.companySnapshot.supervisorPhone,
                    email: ep.companySnapshot.supervisorEmail,
                    isPrimary: true
                }]
            });
            await newCompany.save();
            ep.company = newCompany._id;
        }

        // 2. Actualizar datos
        ep.status = "ACTIVE";
        ep.approvalDate = new Date();
        ep.maxBitacoras = maxBitacoras;
        ep.requiredTrackings = requiredTrackings;
        if (data.startDate) ep.startDate = data.startDate;
        if (data.estimatedEndDate) ep.estimatedEndDate = data.estimatedEndDate;

        // 3. Google Drive - Crear carpeta real para el aprendiz
        try {
            const rootId = getRootFolderId();
            const nationalId = ep.apprentice?.nationalId;
            if (nationalId && rootId) {
                const folderId = await findOrCreateFolder(getDriveClient(), nationalId, rootId);
                ep.driveFolderId = folderId;
                ep.driveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;
            } else {
                ep.driveFolderId = null;
                ep.driveFolderUrl = null;
            }
        } catch (driveErr) {
            console.warn('[productiveStages.service] No se pudo crear carpeta Drive para EP:', driveErr.message);
            ep.driveFolderId = null;
            ep.driveFolderUrl = null;
        }

        await ep.save();

        await recordAuditLog({
            action: AUDIT_ACTIONS.EP_APPROVED || "EP_APPROVED",
            entity: "ProductiveStage",
            entityId: id,
            performedBy,
            details: { maxBitacoras, requiredTrackings }
        });

        notificationService.send({
            type: "EP_APPROVED",
            recipients: [ep.apprentice.toString()],
            title: "Etapa Productiva Aprobada",
            message: `Tu etapa productiva ha sido aprobada. Ya puedes consultar los detalles y continuar con el proceso.`,
            metadata: { entity: "ProductiveStage", entityId: ep._id }
        });

        return ep;
    }

    /**
     * Asigna instructores a una etapa productiva
     */
    async assignInstructors(id, data, performedBy) {
        const ep = await ProductiveStage.findById(id);
        if (!ep) {
            const error = new Error("Etapa productiva no encontrada");
            error.statusCode = 404;
            throw error;
        }

        if (ep.status === "PENDING_REGISTRATION" || ep.status === "PENDING_APPROVAL") {
            const error = new Error("Debe aprobar la etapa productiva antes de asignar instructores");
            error.statusCode = 400;
            throw error;
        }

        const { followupInstructorId, technicalInstructorId, projectInstructorId } = data;

        // Validar según modalidad
        if (!followupInstructorId) {
            const error = new Error("El instructor de seguimiento es obligatorio para todas las modalidades");
            error.statusCode = 400;
            throw error;
        }

        const updates = { followupInstructor: followupInstructorId };

        if (ep.modality === "INDIVIDUAL_PRODUCTIVE_PROJECT") {
            if (!technicalInstructorId) {
                const error = new Error("El instructor técnico es obligatorio para proyectos individuales");
                error.statusCode = 400;
                throw error;
            }
            updates.technicalInstructor = technicalInstructorId;
        }

        if (ep.modality === "GROUP_PRODUCTIVE_PROJECT") {
            if (!technicalInstructorId || !projectInstructorId) {
                const error = new Error("Los instructores técnico y de proyecto son obligatorios para proyectos grupales");
                error.statusCode = 400;
                throw error;
            }
            updates.technicalInstructor = technicalInstructorId;
            updates.projectInstructor = projectInstructorId;
        }

        // Validar que los instructores existan y tengan el tipo correcto
        const instructorIds = Object.values(updates);
        const instructors = await User.find({ _id: { $in: instructorIds }, role: "INSTRUCTOR", status: "ACTIVE" });

        if (instructors.length !== instructorIds.length) {
            const error = new Error("Uno o más instructores no son válidos o no están activos");
            error.statusCode = 400;
            throw error;
        }

        // Aplicar actualizaciones
        Object.assign(ep, updates);
        await ep.save();

        await recordAuditLog({
            action: AUDIT_ACTIONS.EP_INSTRUCTOR_ASSIGNED || "EP_INSTRUCTOR_ASSIGNED",
            entity: "ProductiveStage",
            entityId: id,
            performedBy,
            details: updates
        });

        // Notificar a cada instructor asignado
        await ep.populate("apprentice", "fullName enrollmentNumber program");
        const apprenticeName = ep.apprentice?.fullName || "N/D";
        const apprenticeFicha = ep.apprentice?.enrollmentNumber || "N/D";
        const apprenticeProgram = ep.apprentice?.program || "N/D";

        for (const instructorId of instructorIds) {
            const instructor = instructors.find(i => i._id.toString() === instructorId.toString());
            const roleLabel = instructorId.toString() === followupInstructorId?.toString()
                ? "Seguimiento"
                : instructorId.toString() === technicalInstructorId?.toString()
                    ? "Tecnico"
                    : "Proyecto";

            notificationService.send({
                type: "APPRENTICE_ASSIGNED",
                recipients: [instructorId.toString()],
                title: "Nuevo Aprendiz Asignado",
                message: `Se te ha asignado un nuevo aprendiz como instructor ${roleLabel.toLowerCase()}: ${apprenticeName} | Programa: ${apprenticeProgram} | Ficha: ${apprenticeFicha}. Revisa tu lista de aprendices para mas detalles.`,
                metadata: { entity: "ProductiveStage", entityId: ep._id.toString() }
            });
        }

        // Notificar a los administradores sobre la asignacion
        const admins = await User.find({ role: "ADMIN", isActive: true }).select("_id");
        if (admins.length > 0) {
            const instructorNames = instructors.map(i => `${i.fullName} (${i.email})`).join(", ");
            notificationService.send({
                type: "APPRENTICE_ASSIGNED",
                recipients: admins.map(a => a._id.toString()),
                title: "Instructores Asignados a Aprendiz",
                message: `Se han asignado instructores al aprendiz ${apprenticeName} | Programa: ${apprenticeProgram} | Ficha: ${apprenticeFicha}. Instructores: ${instructorNames}.`,
                metadata: { entity: "ProductiveStage", entityId: ep._id.toString() }
            });
        }

        return ep;
    }

    /**
     * Avanza el estado automáticamente basado en el progreso
     * Invocado por BitacoraService y TrackingService
     */
    async checkAndAdvanceStatus(id) {
        const ep = await ProductiveStage.findById(id);
        if (!ep) return;

        let changed = false;

        // ACTIVE -> IN_FOLLOWUP: Primer seguimiento completado
        if (ep.status === "ACTIVE" && ep.completedTrackings >= 1) {
            ep.status = "IN_FOLLOWUP";
            changed = true;
        }

        // IN_FOLLOWUP -> CERTIFICATION: Todo entregado
        if (ep.status === "IN_FOLLOWUP" && 
            ep.completedBitacoras >= ep.maxBitacoras && 
            ep.completedTrackings >= ep.requiredTrackings) {
            ep.status = "CERTIFICATION";
            changed = true;
        }

        if (changed) {
            await ep.save();
            // TODO: Notificar cambios de estado críticos
        }
    }

    /**
     * Cierra la etapa productiva (Admin)
     */
    async completeEP(id, performedBy) {
        const ep = await ProductiveStage.findById(id);
        if (!ep || ep.status !== "CERTIFICATION") {
            const error = new Error("La etapa no está en fase de certificación");
            error.statusCode = 400;
            throw error;
        }

        // Validar requisitos finales
        const errors = {};
        if (ep.completedBitacoras < ep.maxBitacoras) {
            errors.bitacoras = `${ep.completedBitacoras} de ${ep.maxBitacoras} completadas`;
        }
        if (ep.completedTrackings < ep.requiredTrackings) {
            errors.trackings = `${ep.completedTrackings} de ${ep.requiredTrackings} completados`;
        }

        // TODO: Validar documentos aprobados (Módulo 9)
        // TODO: Validar novedades resueltas (Módulo 10)

        if (Object.keys(errors).length > 0) {
            const error = new Error("No se puede completar la etapa. Requisitos pendientes.");
            error.statusCode = 400;
            error.details = errors;
            throw error;
        }

        ep.status = "COMPLETED";
        ep.completionDate = new Date();
        await ep.save();

        await recordAuditLog({
            action: AUDIT_ACTIONS.EP_COMPLETED || "EP_COMPLETED",
            entity: "ProductiveStage",
            entityId: id,
            performedBy
        });

        return ep;
    }
    /**
     * Rechaza una etapa productiva (Admin)
     */
    async rejectEP(id, { reason }, performedBy) {
        const ep = await ProductiveStage.findById(id);
        if (!ep || ep.status !== "PENDING_APPROVAL") {
            const error = new Error("La etapa no está pendiente de aprobación");
            error.statusCode = 400;
            throw error;
        }

        ep.status = "PENDING_REGISTRATION"; // Vuelve a inicio para que el aprendiz corrija
        ep.comments.push({
            text: `RECHAZO DE REGISTRO: ${reason}`,
            author: performedBy
        });

        await ep.save();

        await recordAuditLog({
            action: AUDIT_ACTIONS.EP_REJECTED || "EP_REJECTED",
            entity: "ProductiveStage",
            entityId: id,
            performedBy,
            details: { reason }
        });

        notificationService.send({
            type: "EP_REJECTED",
            recipients: [ep.apprentice.toString()],
            title: "Etapa Productiva Rechazada",
            message: `Tu solicitud de etapa productiva ha sido rechazada. Motivo: ${reason}. Ingresa para corregir y volver a enviar.`,
            metadata: { entity: "ProductiveStage", entityId: ep._id }
        });

        return ep;
    }

    /**
     * Agrega un comentario al hilo de la EP
     */
    async addComment(id, { text }, performedBy) {
        const ep = await ProductiveStage.findById(id);
        if (!ep) {
            const error = new Error("Etapa productiva no encontrada");
            error.statusCode = 404;
            throw error;
        }

        ep.comments.push({
            text,
            author: performedBy
        });

        await ep.save();

        notificationService.send({
            type: "EP_COMMENT_ADDED",
            recipients: [ep.apprentice.toString()],
            title: "Nuevo Comentario en tu Etapa",
            message: `Has recibido un nuevo comentario en tu etapa productiva: "${text.substring(0, 120)}"`,
            metadata: { entity: "ProductiveStage", entityId: ep._id }
        });

        return ep;
    }

    /**
     * Obtiene detalle de una EP por ID con validación de acceso
     */
    async getEPById(id, user) {
        const ep = await ProductiveStage.findById(id)
            .populate("apprentice", "fullName nationalId enrollmentNumber email phone trainingLevel isPreNov2024 enrollmentExpiryDate")
            .populate("company")
            .populate("followupInstructor technicalInstructor projectInstructor", "fullName email phone");

        if (!ep) {
            const error = new Error("Etapa productiva no encontrada");
            error.statusCode = 404;
            throw error;
        }

        // Validación de acceso
        if (user.role === "APPRENTICE" && ep.apprentice._id.toString() !== user.id.toString()) {
            const error = new Error("No tienes permiso para ver esta etapa productiva");
            error.statusCode = 403;
            throw error;
        }

        if (user.role === "INSTRUCTOR") {
            const isAssigned = [
                ep.followupInstructor?._id.toString(),
                ep.technicalInstructor?._id.toString(),
                ep.projectInstructor?._id.toString()
            ].includes(user.id.toString());

            if (!isAssigned) {
                const error = new Error("No estás asignado a esta etapa productiva");
                error.statusCode = 403;
                throw error;
            }
        }

        return ep;
    }

    /**
     * Obtiene la etapa activa del aprendiz autenticado
     */
    async getMyApprenticeEP(apprenticeId) {
        return await ProductiveStage.find({ apprentice: apprenticeId, isActive: true })
            .sort({ isHistorical: 1, createdAt: -1 })
            .populate("company")
            .populate("followupInstructor technicalInstructor projectInstructor", "fullName email phone");
    }

    /**
     * Realiza una asignación rápida de instructor de seguimiento a un aprendiz (para pruebas)
     */
    async quickAssign(apprenticeId, instructorId, performedBy) {
        // 1. Validar aprendiz
        const apprentice = await User.findOne({ _id: apprenticeId, role: "APPRENTICE" });
        if (!apprentice) {
            const error = new Error("Aprendiz no encontrado");
            error.statusCode = 404;
            throw error;
        }

        // 2. Validar instructor
        const instructor = await User.findOne({ _id: instructorId, role: "INSTRUCTOR", status: "ACTIVE" });
        if (!instructor) {
            const error = new Error("Instructor no encontrado o inactivo");
            error.statusCode = 404;
            throw error;
        }

        // 3. Buscar si ya existe una etapa productiva activa/pendiente
        let ep = await ProductiveStage.findOne({ apprentice: apprenticeId, isActive: true });

        const level = apprentice.trainingLevel || "TECHNOLOGIST";
        const maxBitacoras = await getConfig(`MAX_LOGBOOKS_${level}`) || 13;
        const requiredTrackings = await getConfig(`REQUIRED_TRACKINGS_${level}`) || 3;

        if (ep) {
            // Actualizar etapa existente
            ep.followupInstructor = instructorId;
            ep.maxBitacoras = maxBitacoras;
            ep.requiredTrackings = requiredTrackings;
            if (ep.status === "PENDING_APPROVAL" || ep.status === "PENDING_REGISTRATION") {
                ep.status = "ACTIVE";
                ep.approvalDate = new Date();
            }
            await ep.save();
        } else {
            // Crear una empresa dummy para la asignación rápida si no hay ninguna
            let company = await Company.findOne();
            if (!company) {
                company = new Company({
                    name: "Empresa de Pruebas",
                    taxId: "900000000-1",
                    address: "Calle Ficticia 123",
                    phone: "3001234567",
                    email: "contacto@pruebas.com",
                    contacts: [{
                        fullName: "Contacto Prueba",
                        jobTitle: "Supervisor de Pruebas",
                        phone: "3001234567",
                        email: "contacto@pruebas.com",
                        isPrimary: true
                    }]
                });
                await company.save();
            }

            // Crear carpeta en Google Drive para el aprendiz
            let driveFolderId = null;
            let driveFolderUrl = null;
            try {
                const rootId = getRootFolderId();
                if (rootId && apprentice.nationalId) {
                    const folderId = await findOrCreateFolder(getDriveClient(), apprentice.nationalId, rootId);
                    driveFolderId = folderId;
                    driveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;
                }
            } catch (driveErr) {
                console.warn('[productiveStages.service] No se pudo crear carpeta Drive para EP:', driveErr.message);
            }

            // Crear una nueva etapa productiva activa
            ep = new ProductiveStage({
                apprentice: apprenticeId,
                company: company._id,
                modality: "APPRENTICESHIP_CONTRACT",
                status: "ACTIVE",
                registrationDate: new Date(),
                approvalDate: new Date(),
                startDate: new Date(),
                estimatedEndDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 meses
                maxBitacoras,
                requiredTrackings,
                followupInstructor: instructorId,
                companySnapshot: {
                    companyName: company.name,
                    taxId: company.taxId,
                    address: company.address,
                    apprenticeJobTitle: "Aprendiz de Pruebas",
                    supervisorName: "Supervisor de Pruebas",
                    supervisorEmail: "supervisor@pruebas.com",
                    supervisorPhone: "3001234567"
                },
                driveFolderId,
                driveFolderUrl
            });
            await ep.save();
        }

        await recordAuditLog({
            action: AUDIT_ACTIONS.EP_INSTRUCTOR_ASSIGNED || "EP_INSTRUCTOR_ASSIGNED",
            entity: "ProductiveStage",
            entityId: ep._id,
            performedBy,
            details: { followupInstructor: instructorId }
        });

        notificationService.send({
            type: "APPRENTICE_ASSIGNED",
            recipients: [instructorId.toString()],
            title: "Nuevo Aprendiz Asignado",
            message: `Se te ha asignado un nuevo aprendiz como instructor de seguimiento: ${apprentice.fullName} | Programa: ${apprentice.program || 'N/D'} | Ficha: ${apprentice.enrollmentNumber || 'N/D'}. Revisa tu lista de aprendices para mas detalles.`,
            metadata: { entity: "ProductiveStage", entityId: ep._id.toString() }
        });

        // Notificar a los administradores
        const admins = await User.find({ role: "ADMIN", isActive: true }).select("_id");
        if (admins.length > 0) {
            notificationService.send({
                type: "APPRENTICE_ASSIGNED",
                recipients: admins.map(a => a._id.toString()),
                title: "Instructor Asignado a Aprendiz",
                message: `El instructor ${instructor.fullName} (${instructor.email}) ha sido asignado al aprendiz ${apprentice.fullName} | Programa: ${apprentice.program || 'N/D'} | Ficha: ${apprentice.enrollmentNumber || 'N/D'} como instructor de seguimiento.`,
                metadata: { entity: "ProductiveStage", entityId: ep._id.toString() }
            });
        }

        return ep;
    }
}

export default new ProductiveStageService();
