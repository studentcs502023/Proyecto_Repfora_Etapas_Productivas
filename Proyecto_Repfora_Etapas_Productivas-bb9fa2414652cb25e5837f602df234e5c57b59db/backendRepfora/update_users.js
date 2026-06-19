import { conectarMongo } from "./src/config/db.js";
import User from "./src/models/User.model.js";

const run = async () => {
  try {
    await conectarMongo();
    const result = await User.updateMany({ firstLogin: true }, { firstLogin: false });
    console.log(`✅ Se actualizaron ${result.modifiedCount} usuarios existentes a firstLogin: false`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running script:", error);
    process.exit(1);
  }
};

run();
