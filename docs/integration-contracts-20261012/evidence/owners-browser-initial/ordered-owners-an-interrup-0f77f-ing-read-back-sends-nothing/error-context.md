# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ordered-owners.spec.ts >> an interrupted PUT remains fenced after reopening and matching read-back sends nothing
- Location: tests/browser/ordered-owners.spec.ts:170:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Primary owner', { exact: true })

```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - paragraph: Synthetic profile checks. All service requests are intercepted.
      - paragraph: "Closures: 0"
  - dialog "Account team" [ref=e2]:
    - banner [ref=e3]:
      - heading "Account team" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: The firm's members assigned to this client. Ranked account owners remain on the team until their ownership is explicitly changed.
    - list [ref=e10]:
      - listitem [ref=e11]:
        - generic [ref=e12]:
          - strong [ref=e13]: Olivia Owner
          - generic [ref=e14]: · Account owner
      - listitem [ref=e15]:
        - generic [ref=e16]:
          - strong [ref=e17]: Terry Team
          - generic [ref=e18]: · Analyst
        - button "Remove" [ref=e19] [cursor=pointer]
    - generic [ref=e20]:
      - generic [ref=e21]:
        - text: Add team member
        - combobox "Add team member" [ref=e22]:
          - option "Choose a member" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e23]:
        - text: Role
        - textbox "Role" [ref=e24]
      - button "Add member" [disabled] [ref=e25]
    - group "Ordered account owners" [ref=e26]:
      - generic [ref=e27]: Account owners
      - paragraph [ref=e28]: Up to four owners, in order. Ownership does not grant access to this client.
      - generic [ref=e29]:
        - text: Primary owner
        - combobox "Primary owner" [ref=e30]:
          - option "Unassigned"
          - option "Olivia Owner" [selected]
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e31]:
        - text: Secondary owner
        - combobox "Secondary owner" [ref=e32]:
          - option "Unassigned" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e33]:
        - text: Tertiary owner
        - combobox "Tertiary owner" [ref=e34]:
          - option "Unassigned" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e35]:
        - text: Quaternary owner
        - combobox "Quaternary owner" [ref=e36]:
          - option "Unassigned" [selected]
          - option "Olivia Owner"
          - option "Terry Team"
          - option "Nora New"
      - generic [ref=e37]:
        - button "Read current owners" [ref=e38] [cursor=pointer]
        - button "Save owner order" [disabled] [ref=e39]
    - button "Done" [ref=e41] [cursor=pointer]
```

# Test source

```ts
  85  |   await expect(
  86  |     page.getByText(/clearing a position does not promote/i),
  87  |   ).toBeVisible();
  88  |   await expect(page.getByLabel("Secondary owner", { exact: true })).toHaveValue(
  89  |     members[1]!.id,
  90  |   );
  91  |   await page.getByRole("button", { name: "Read current owners" }).click();
  92  |   await expect(page.getByText(/current owners reloaded/i)).toBeVisible();
  93  |   await expect(page.getByLabel("Primary owner", { exact: true })).toHaveValue(
  94  |     "",
  95  |   );
  96  |   await expect(page.getByLabel("Secondary owner", { exact: true })).toHaveValue(
  97  |     members[1]!.id,
  98  |   );
  99  |   expect(state.writes).toEqual([]);
  100 | });
  101 | test("unavailable historical owners keep their rank and ranked members have no roster Remove", async ({
  102 |   page,
  103 | }) => {
  104 |   const { state, unexpected } = await installProfileCurrentState(page);
  105 |   state.owners = receipt([members[0]!.id, members[1]!.id], 7);
  106 |   state.owners.owners[0] = {
  107 |     ...state.owners.owners[0]!,
  108 |     available: false,
  109 |     person: null,
  110 |   };
  111 |   state.members = state.members.filter(
  112 |     (member) => member.id !== members[0]!.id,
  113 |   );
  114 |   state.team = state.team.map((member, index) => ({
  115 |     ...member,
  116 |     ownerRank: index + 1,
  117 |     ownerAvailable: index !== 0,
  118 |   }));
  119 |   await page.goto("/profile-current-state.html?mode=team");
  120 |   await expect(page.getByLabel("Primary owner", { exact: true })).toHaveValue(
  121 |     members[0]!.id,
  122 |   );
  123 |   await expect(
  124 |     page.getByRole("option", { name: `Unavailable owner · ${members[0]!.id}` }),
  125 |   ).toBeAttached();
  126 |   await expect(page.getByLabel("Secondary owner", { exact: true })).toHaveValue(
  127 |     members[1]!.id,
  128 |   );
  129 |   await expect(
  130 |     page
  131 |       .getByRole("listitem")
  132 |       .filter({ hasText: "Terry Team" })
  133 |       .getByRole("button", { name: "Remove" }),
  134 |   ).toHaveCount(0);
  135 |   expect(state.writes).toEqual([]);
  136 |   expect(unexpected).toEqual([]);
  137 | });
  138 | test("409 requires read-back and a fresh deliberate versioned save, never automatic retry", async ({
  139 |   page,
  140 | }) => {
  141 |   const { state } = await installProfileCurrentState(page);
  142 |   state.write = (route) =>
  143 |     json(route, { message: "owner_version_changed" }, 409);
  144 |   await page.goto("/profile-current-state.html?mode=team");
  145 |   await page
  146 |     .getByLabel("Primary owner", { exact: true })
  147 |     .selectOption(members[2]!.id);
  148 |   await page.getByRole("button", { name: "Save owner order" }).click();
  149 |   await expect(
  150 |     page.getByText(/owner change result needs review/i),
  151 |   ).toBeVisible();
  152 |   await expect(
  153 |     page.getByRole("button", { name: "Save owner order" }),
  154 |   ).toBeDisabled();
  155 |   state.owners = receipt([members[1]!.id], 9);
  156 |   await page.getByRole("button", { name: "Read current owners" }).click();
  157 |   await expect(page.getByText(/current owners reloaded/i)).toBeVisible();
  158 |   await expect(page.getByLabel("Primary owner", { exact: true })).toHaveValue(
  159 |     members[2]!.id,
  160 |   );
  161 |   expect(state.writes).toHaveLength(1);
  162 |   state.write = (route) => json(route, receipt([members[2]!.id], 10));
  163 |   await page.getByRole("button", { name: "Save owner order" }).click();
  164 |   await expect(page.getByText(/owner order saved/i)).toBeVisible();
  165 |   expect(state.writes.map((write) => write.body)).toEqual([
  166 |     { expectedVersion: 3, userIds: [members[2]!.id] },
  167 |     { expectedVersion: 9, userIds: [members[2]!.id] },
  168 |   ]);
  169 | });
  170 | test("an interrupted PUT remains fenced after reopening and matching read-back sends nothing", async ({
  171 |   page,
  172 | }) => {
  173 |   const { state } = await installProfileCurrentState(page);
  174 |   let release!: () => void;
  175 |   const held = new Promise<void>((resolve) => {
  176 |     release = resolve;
  177 |   });
  178 |   state.write = async (route) => {
  179 |     await held;
  180 |     await json(route, state.owners).catch(() => undefined);
  181 |   };
  182 |   await page.goto("/profile-current-state.html?mode=team");
  183 |   await page
  184 |     .getByLabel("Primary owner", { exact: true })
> 185 |     .selectOption(members[2]!.id);
      |      ^ Error: locator.selectOption: Test timeout of 30000ms exceeded.
  186 |   await page.getByRole("button", { name: "Save owner order" }).click();
  187 |   await expect.poll(() => state.writes.length).toBe(1);
  188 |   await profileEvent(page, "unmount");
  189 |   state.owners = receipt([members[2]!.id], 4);
  190 |   release();
  191 |   await profileEvent(page, "open");
  192 |   await expect(
  193 |     page.getByText(/owner change result needs review/i),
  194 |   ).toBeVisible();
  195 |   await expect(
  196 |     page.getByRole("button", { name: "Save owner order" }),
  197 |   ).toBeDisabled();
  198 |   await page.getByRole("button", { name: "Read current owners" }).click();
  199 |   await expect(
  200 |     page.getByText(/current owners match the submitted order/i),
  201 |   ).toBeVisible();
  202 |   expect(state.writes).toHaveLength(1);
  203 | });
  204 | test("background read cannot silently rebase a draft, and replacing the actor clears that editor", async ({
  205 |   page,
  206 | }) => {
  207 |   const { state } = await installProfileCurrentState(page);
  208 |   await page.goto("/profile-current-state.html?mode=team");
  209 |   await page
  210 |     .getByLabel("Primary owner", { exact: true })
  211 |     .selectOption(members[2]!.id);
  212 |   state.owners = receipt([members[1]!.id], 5);
  213 |   await profileEvent(page, "refresh");
  214 |   await expect(page.getByText(/saved owner source changed/i)).toBeVisible();
  215 |   await expect(
  216 |     page.getByRole("button", { name: "Save owner order" }),
  217 |   ).toBeDisabled();
  218 |   await expect(page.getByLabel("Primary owner", { exact: true })).toHaveValue(
  219 |     members[2]!.id,
  220 |   );
  221 |   await profileEvent(page, "identity", {
  222 |     ...profileIdentity,
  223 |     role: "standard_user",
  224 |   });
  225 |   await expect(page.getByLabel("Primary owner", { exact: true })).toHaveValue(
  226 |     members[1]!.id,
  227 |   );
  228 |   await expect(
  229 |     page.getByLabel("Primary owner", { exact: true }),
  230 |   ).toBeDisabled();
  231 |   expect(state.writes).toEqual([]);
  232 | });
  233 | 
```