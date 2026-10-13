from pathlib import Path
p=Path('/workspace/capiro-next-modules/apps/web/test/browser/next-modules-task-links.spec.ts');s=p.read_text().replace('  clientId,','  bootstrap,\n  clientId,',1);s+='''
for (const directClient of [null, otherClientId]) {
  test(`linked task uses current project membership when direct client is ${directClient ? "different" : "absent"}`, async ({page}) => {
    const projectId = "52000000-0000-4000-8000-000000000001";
    const project = {
      id: projectId, name: "Current client project", description: "", color: "#123456", privacy: "team",
      defaultView: "list", sections: [], fields: [], members: [], startOn: null, dueOn: null,
      health: "on_track", clientId, ownerId: "test-user", version: 1, archived: false,
      createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", access: "editor",
    };
    await setup(page, {
      "planner.bootstrap": {...bootstrap, projects: [project]},
      "planner.task": {...nextTask, clientId: directClient, memberships: [{projectId, sectionId: null, sortOrder: 0}]},
    });
    await page.goto(`/modules/planner?clientId=${clientId}&task=${taskId}`);
    await expect(page.getByRole("dialog",{name:nextTask.name,exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Edit task",exact:true})).toBeEnabled();
    await expect(page.getByRole("dialog")).toContainText(project.name);
  });
}
''';p.write_text(s)
