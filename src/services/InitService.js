import UserModel from "../models/User.js";

const userModel = new UserModel();

class InitService {
  async initializeDefaultAdmin() {
    try {
      const adminEmail = "admin@admin.com";
      const adminPassword = "123456";

      // Check if admin account already exists
      const existingAdmin = await userModel.findByEmail(adminEmail);

      if (existingAdmin) {
        console.log("✅ Default admin account already exists");
        return;
      }

      // Create default admin account
      console.log("🔧 Creating default admin account...");
      
      const adminUser = await userModel.create({
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        fullname: "System Administrator",
      });

      // Auto-verify the admin account
      await userModel.verifyUser(adminUser._id);

      console.log("✅ Default admin account created successfully");
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log("   ⚠️  Please change the password after first login!");
    } catch (error) {
      console.error("❌ Failed to create default admin account:", error.message);
      // Don't throw - allow the application to continue even if admin creation fails
    }
  }

  async initialize() {
    console.log("🚀 Running initialization tasks...");
    await this.initializeDefaultAdmin();
    console.log("✅ Initialization completed\n");
  }
}

const initService = new InitService();
export default initService;
