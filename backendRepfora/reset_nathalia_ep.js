import { conectarMongo } from "./src/config/db.js";
import User from "./src/models/User.model.js";
import ProductiveStage from "./src/models/ProductiveStage.model.js";
import Document from "./src/models/Document.model.js";

const run = async () => {
  try {
    await conectarMongo();

    const nathalia = await User.findOne({ nationalId: '12345678' });
    if (!nathalia) {
      console.error('❌ No se encontró a Nathalia (12345678)');
      process.exit(1);
    }

    const eps = await ProductiveStage.find({ apprentice: nathalia._id });
    if (eps.length > 0) {
      for (const ep of eps) {
        await Document.deleteMany({ productiveStage: ep._id });
        await ProductiveStage.deleteOne({ _id: ep._id });
        console.log(`🗑️ Etapa productiva y documentos eliminados para Nathalia.`);
      }
    } else {
      console.log(`ℹ️ Nathalia no tenía etapas productivas pendientes.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

run();
