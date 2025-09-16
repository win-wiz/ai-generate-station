#!/usr/bin/env tsx

/**
 * Cloudflare D1 Deployment Script
 * 
 * This script handles:
 * 1. Creating D1 database
 * 2. Generating and applying migrations
 * 3. Setting up production environment
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface D1Config {
  databaseName: string;
  accountId?: string;
  databaseId?: string;
}

class D1Deployer {
  private config: D1Config;
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.config = {
      databaseName: "ai-generate-station-db",
    };
  }

  /**
   * Execute command with error handling
   */
  private executeCommand(command: string, description: string): string {
    try {
      console.log(`🔄 ${description}...`);
      const result = execSync(command, { 
        encoding: "utf-8", 
        cwd: this.projectRoot,
        stdio: ["inherit", "pipe", "pipe"]
      });
      console.log(`✅ ${description} completed`);
      return result;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Check if wrangler is installed
   */
  private checkWrangler(): void {
    try {
      execSync("wrangler --version", { stdio: "ignore" });
    } catch {
      console.log("📦 Installing Wrangler CLI...");
      this.executeCommand("npm install -g wrangler", "Installing Wrangler");
    }
  }

  /**
   * Create D1 database
   */
  private async createDatabase(): Promise<void> {
    console.log("🗄️ Creating Cloudflare D1 database...");
    
    try {
      const output = this.executeCommand(
        `wrangler d1 create ${this.config.databaseName}`,
        "Creating D1 database"
      );

      // Extract database ID from output
      const dbIdMatch = output.match(/database_id = "([^"]+)"/);
      if (dbIdMatch) {
        this.config.databaseId = dbIdMatch[1];
        console.log(`📝 Database ID: ${this.config.databaseId}`);
      }

      // Extract account ID if available
      const accountIdMatch = output.match(/account_id = "([^"]+)"/);
      if (accountIdMatch) {
        this.config.accountId = accountIdMatch[1];
        console.log(`🏢 Account ID: ${this.config.accountId}`);
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log("ℹ️ Database already exists, continuing...");
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate migration files
   */
  private generateMigrations(): void {
    console.log("📄 Generating migration files...");
    
    this.executeCommand(
      "pnpm drizzle-kit generate",
      "Generating Drizzle migrations"
    );
  }

  /**
   * Apply migrations to D1
   */
  private applyMigrations(): void {
    console.log("🚀 Applying migrations to D1...");
    
    const migrationsDir = join(this.projectRoot, "drizzle");
    if (!existsSync(migrationsDir)) {
      console.log("⚠️ No migrations directory found, generating first...");
      this.generateMigrations();
    }

    this.executeCommand(
      `wrangler d1 migrations apply ${this.config.databaseName}`,
      "Applying migrations to D1"
    );
  }

  /**
   * Update environment configuration
   */
  private updateEnvironment(): void {
    console.log("⚙️ Updating environment configuration...");
    
    const envPath = join(this.projectRoot, ".env");
    let envContent = "";
    
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, "utf-8");
    }

    // Update or add D1 configuration
    const updates = [
      `DATABASE_URL="d1-remote"`,
      ...(this.config.accountId ? [`CLOUDFLARE_ACCOUNT_ID="${this.config.accountId}"`] : []),
      ...(this.config.databaseId ? [`CLOUDFLARE_DATABASE_ID="${this.config.databaseId}"`] : []),
    ];

    updates.forEach(update => {
      const [key] = update.split("=");
      const regex = new RegExp(`^${key}=.*$`, "m");
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, update);
      } else {
        envContent += `\n${update}`;
      }
    });

    writeFileSync(envPath, envContent.trim() + "\n");
    console.log("✅ Environment configuration updated");
  }

  /**
   * Display deployment summary
   */
  private displaySummary(): void {
    console.log("\n🎉 D1 Deployment Summary:");
    console.log("========================");
    console.log(`Database Name: ${this.config.databaseName}`);
    if (this.config.databaseId) {
      console.log(`Database ID: ${this.config.databaseId}`);
    }
    if (this.config.accountId) {
      console.log(`Account ID: ${this.config.accountId}`);
    }
    console.log("\n📋 Next Steps:");
    console.log("1. Update your wrangler.toml with the database binding");
    console.log("2. Set CLOUDFLARE_D1_TOKEN in your environment");
    console.log("3. Deploy your application with: wrangler deploy");
  }

  /**
   * Main deployment process
   */
  async deploy(): Promise<void> {
    try {
      console.log("🚀 Starting Cloudflare D1 deployment...\n");

      this.checkWrangler();
      await this.createDatabase();
      this.generateMigrations();
      this.applyMigrations();
      this.updateEnvironment();
      this.displaySummary();

      console.log("\n✅ D1 deployment completed successfully!");

    } catch (error) {
      console.error("\n❌ Deployment failed:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

// Run deployment if script is executed directly
if (require.main === module) {
  const deployer = new D1Deployer();
  deployer.deploy().catch(console.error);
}

export { D1Deployer };