import { seedSuperadmin } from "./seedSuperadmin.js";
import { seedTemplates } from "./seedtemplate.js"


await seedTemplates();
await seedSuperadmin();