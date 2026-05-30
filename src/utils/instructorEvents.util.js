import ProductiveStage from '../models/ProductiveStage.model.js';
import User from '../models/User.model.js';
import notificationService from '../services/notifications.service.js';

export const instructorClients = new Map();

// Función que emite a los instructores conectados
export const notifyInstructorSSE = (instructorId, eventData) => {
    const res = instructorClients.get(instructorId.toString());
    if (res) {
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    }
};

// Caché en memoria: Solución robusta blindada por si MongoDB no tiene "Pre-images" habilitadas
const epInstructorCache = new Map();

export const initInstructorWatchdog = async () => {
    // 1. Cargamos el estado actual al vuelo (sin tocar configuración del Admin)
    try {
        const eps = await ProductiveStage.find({ isActive: true, followupInstructor: { $ne: null } })
                                         .select('_id followupInstructor');
        eps.forEach(ep => epInstructorCache.set(ep._id.toString(), ep.followupInstructor.toString()));
    } catch (e) {
        console.error('[Instructor Watchdog] Error cargando caché:', e.message);
    }

    // 2. Iniciamos el Change Stream
    // updateLookup: Solicita el nuevo documento completo a MongoDB
    const changeStream = ProductiveStage.watch([], { 
        fullDocument: 'updateLookup',
        fullDocumentBeforeChange: 'whenAvailable' 
    });

    changeStream.on('change', async (change) => {
        try {
            if (change.operationType === 'update' || change.operationType === 'replace') {
                const epId = change.documentKey._id.toString();
                const updatedFields = change.updateDescription?.updatedFields || {};
                
                // Si el evento detecta que se alteró el instructor de seguimiento
                if ('followupInstructor' in updatedFields) {
                    const ep = change.fullDocument;
                    if (!ep) return;

                    // Obtenemos los datos del aprendiz para mostrar en la alerta
                    const apprentice = await User.findById(ep.apprentice).select('fullName enrollmentNumber');
                    if (!apprentice) return;

                    const newInstructorId = updatedFields.followupInstructor?.toString();
                    
                    // Extraer viejo instructor: Priorizamos MongoDB nativo, si falla, usamos nuestra Caché
                    const oldInstructorId = change.fullDocumentBeforeChange?.followupInstructor?.toString() || epInstructorCache.get(epId);

                    // ESCENARIO A: Emitir al NUEVO instructor (Asignación)
                    if (newInstructorId && newInstructorId !== oldInstructorId) {
                        await notificationService.send({
                            type: 'INFO',
                            recipients: [newInstructorId],
                            title: 'Nuevo Aprendiz Asignado',
                            message: `Se le ha asignado el aprendiz ${apprentice.fullName} (Ficha: ${apprentice.enrollmentNumber}) para seguimiento.`,
                            metadata: { entity: 'ProductiveStage', entityId: ep._id }
                        });

                        notifyInstructorSSE(newInstructorId, { 
                            type: 'NEW_APPRENTICE_ASSIGNED', 
                            apprenticeName: apprentice.fullName,
                            ficha: apprentice.enrollmentNumber
                        });
                    }

                    // ESCENARIO B: Emitir al VIEJO instructor (Reasignación / Remoción)
                    if (oldInstructorId && oldInstructorId !== newInstructorId) {
                        await notificationService.send({
                            type: 'WARNING',
                            recipients: [oldInstructorId],
                            title: 'Aprendiz Reasignado',
                            message: `El aprendiz ${apprentice.fullName} (Ficha: ${apprentice.enrollmentNumber}) ya no está bajo tu supervisión.`,
                            metadata: { entity: 'User', entityId: apprentice._id }
                        });
                        
                        notifyInstructorSSE(oldInstructorId, { 
                            type: 'APPRENTICE_REMOVED', 
                            apprenticeName: apprentice.fullName,
                            ficha: apprentice.enrollmentNumber
                        });
                    }

                    // 3. Actualizar nuestra Caché local
                    if (newInstructorId) {
                        epInstructorCache.set(epId, newInstructorId);
                    } else {
                        epInstructorCache.delete(epId);
                    }
                }
            }
        } catch (error) {
            console.error('[Instructor Watchdog] Error procesando evento SSE:', error.message);
        }
    });

    console.log('👁️ [Instructor Watchdog] Change Stream Activo y Blindado.');
};

// Autoejecución al momento de que Node.js importa este utilitario
initInstructorWatchdog();
