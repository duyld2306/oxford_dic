import { BaseService } from "./BaseService.js";
import { UserRepository } from "../repositories/UserRepository.js";
import bcrypt from "bcryptjs";

class InitService extends BaseService {
  constructor(userRepository = null, dependencies = {}) {
    super(userRepository || new UserRepository(), dependencies);
  }

  async initializeDefaultAdmin() {
    return this.execute(
      async () => {
        const adminEmail = "admin@admin.com";
        const adminPassword = "123456";

        // Check if admin account already exists
        const existingAdmin = await this.repository.findOne({
          email: adminEmail,
        });

        if (existingAdmin) {
          // If exists but not superadmin, upgrade to superadmin
          if (existingAdmin.role !== "superadmin") {
            this.log("info", "Upgrading admin account to superadmin...");
            await this.repository.updateById(existingAdmin._id, {
              role: "superadmin",
            });
            this.log("info", "Admin account upgraded to superadmin");
          } else {
            this.log("info", "Default superadmin account already exists");
          }
          return;
        }

        // Create default superadmin account
        this.log("info", "Creating default superadmin account...");

        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        const adminUser = await this.repository.insertOne({
          email: adminEmail,
          password: hashedPassword,
          role: "superadmin",
          fullname: "System Administrator",
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        this.log("info", "Default superadmin account created successfully");
        this.log("info", `Email: ${adminEmail}`);
        this.log("info", `Password: ${adminPassword}`);
        this.log("info", `Role: superadmin`);
        this.log("warn", "Please change the password after first login!");

        return adminUser;
      },
      "initializeDefaultAdmin",
      false
    ); // Don't throw on error
  }

  async initialize() {
    this.log("info", "Running initialization tasks...");
    await this.initializeDefaultAdmin();
    this.log("info", "Initialization completed");
  }
}

const initService = new InitService();
export default initService;
