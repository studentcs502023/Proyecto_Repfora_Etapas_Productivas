import { conectarMongo } from "./src/config/db.js";
import User from "./src/models/User.model.js";
import ProductiveStage from "./src/models/ProductiveStage.model.js";

const run = async () => {
  try {
    await conectarMongo();

    // 1. Buscar a Nathalia por su cédula
    const nathalia = await User.findOne({ nationalId: '12345678' });
    if (!nathalia) {
      console.error('❌ No se encontró al usuario con cédula 12345678');
      process.exit(1);
    }
    console.log(`✅ Usuario encontrado: ${nathalia.fullName} (${nathalia._id})`);

    // 2. Buscar su Etapa Productiva
    const ep = await ProductiveStage.findOne({ apprentice: nathalia._id, isActive: true });
    if (!ep) {
      console.error('❌ No se encontró una Etapa Productiva activa para este usuario');
      process.exit(1);
    }
    console.log(`📋 EP encontrada: ID=${ep._id} | Estado actual: ${ep.status}`);

    // 3. Cambiar el estado a CERTIFICATION
    ep.status = 'CERTIFICATION';
    await ep.save();
    console.log(`✅ Estado actualizado a: CERTIFICATION`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

run();
