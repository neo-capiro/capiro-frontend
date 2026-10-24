/** Disconnected, synthetic serving configuration; never a deployment receipt. */
export const capabilityFixtureEnv: Record<string, string | undefined> = {
  CORE_API_BASE_URL: "https://core.synthetic.invalid/api",
  MERI_API_BASE_URL: "https://meri.synthetic.invalid",
  CAPIRO_REQUEST_ORIGIN: "https://frontend.synthetic.invalid",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_DOCUMENT_OPERATION: "create_word",
  CAPIRO_PREVIEW_READ_ONLY: "false",
};

export const capabilityFlags = {
  conversations: "MERI_CONVERSATION_WORKFLOW_ENABLED",
  newConversation: "MERI_FIRST_CHAT_BOOTSTRAP_ENABLED",
  files: "MERI_DOCUMENT_WORKFLOW_ENABLED",
  actions: "MERI_ACTION_WORKFLOW_ENABLED",
  taskUpdates: "MERI_TASK_COMMAND_WORKFLOW_ENABLED",
  conversationApprovals: "MERI_INTENT_APPROVALS_WORKFLOW_ENABLED",
  memory: "MERI_MEMORY_OWNER_REVIEW_ENABLED",
  preferences: "MERI_USER_PREFERENCES_ENABLED",
} as const;

export const allCapabilitiesEnv = {
  ...capabilityFixtureEnv,
  ...Object.fromEntries(
    Object.values(capabilityFlags).map((flag) => [flag, "true"]),
  ),
};

export const previewCapabilitiesEnv = {
  ...allCapabilitiesEnv,
  CAPIRO_REQUEST_ORIGIN: "https://portfolio-preview.app.capiro.ai",
  CAPIRO_EXISTING_APP_URL: "https://portfolio-preview.app.capiro.ai",
  CAPIRO_PREVIEW_READ_ONLY: "true",
  CAPIRO_PREVIEW_MERI_CONVERSATION_ROUTES_ENABLED: "true",
  CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: "a".repeat(40),
  CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST: `sha256:${"b".repeat(64)}`,
  CAPIRO_PREVIEW_MERI_RUNTIME_ORIGIN: "https://meri.synthetic.invalid",
  CAPIRO_PREVIEW_MERI_CONTRACT_PACKAGE_VERSION: "0.1.12",
  CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE:
    "c64f0005cf14d69683aabafa11def4964d766832",
  CAPIRO_PREVIEW_FIRST_CHAT_API_BASE_URL:
    "https://first-chat.synthetic.invalid/api",
};
