import fs from 'fs';
import path from 'path';

const filesToRemove = [
  'lib/verify-claim.ts',
  'lib/old-architecture',
];

const filesToUpdate = [
  'lib/migration-layer.ts',
  'app/api/verify/route.ts',
];

async function cleanup() {
  console.log('Starting cleanup of old architecture...');

  // Remove old files
  for (const file of filesToRemove) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Removed: ${file}`);
      }
    } catch (error) {
      console.error(`Error removing ${file}:`, error);
    }
  }

  // Update files to remove old architecture references
  for (const file of filesToUpdate) {
    try {
      if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Remove old architecture imports and references
        content = content
          .replace(/import.*verify-claim.*\n/g, '')
          .replace(/verifyClaimComprehensive/g, '')
          .replace(/\/\/ Old architecture.*\n/g, '')
          .replace(/\/\/ Migration.*\n/g, '');

        fs.writeFileSync(file, content);
        console.log(`Updated: ${file}`);
      }
    } catch (error) {
      console.error(`Error updating ${file}:`, error);
    }
  }

  // Update environment variables
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent
        .replace(/USE_NEW_ARCHITECTURE=.*\n/, '')
        .replace(/COMPARE_RESULTS=.*\n/, '');
      fs.writeFileSync(envPath, envContent);
      console.log('Updated: .env');
    }
  } catch (error) {
    console.error('Error updating .env:', error);
  }

  console.log('Cleanup completed!');
}

cleanup().catch(console.error); 