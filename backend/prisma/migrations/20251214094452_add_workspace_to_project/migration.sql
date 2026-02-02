-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "workspace_id" BIGINT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("workspace_id") ON DELETE SET NULL ON UPDATE CASCADE;
