/** Historical names only for the unchanged 116-case producer corpus.
 * Full namespaces are asserted separately; no new export is hidden from qualification.
 */
export const originalNewsletterNames = [
  "NEWSLETTER_BLOCK_KINDS",
  "NEWSLETTER_BLOCK_LABELS",
  "NEWSLETTER_COLUMN_RATIOS",
  "NEWSLETTER_FONT_CATALOG",
  "NEWSLETTER_SOCIAL_ICON_STYLES",
  "NEWSLETTER_SOCIAL_PLATFORMS",
  "NEWSLETTER_SOCIAL_SHARE_PLATFORMS",
  "NEWSLETTER_SURVEY_SECTION_TYPES",
  "NEWSLETTER_SYSTEM_FONTS",
  "NEWSLETTER_TEMPLATE_ID",
  "applyNewsletterBrandKit",
  "cloneNewsletterBlocks",
  "createNewsletterBlock",
  "createNewsletterLayout",
  "createNewsletterSection",
  "createNewsletterSurveyQuestion",
  "defaultNewsletterBrandKit",
  "defaultNewsletterConfig",
  "defaultNewsletterSocialSettings",
  "defaultNewsletterSocialShare",
  "defaultNewsletterStyles",
  "defaultNewsletterSurveyDefinition",
  "findNewsletterBlock",
  "governmentAffairsNewsletter",
  "newsletterBlockVisible",
  "newsletterBrandButtonStyle",
  "newsletterCatalogFont",
  "newsletterCatalogStyle",
  "newsletterCustomVideoThumbnail",
  "newsletterDesignFontRequests",
  "newsletterDesignFonts",
  "newsletterId",
  "newsletterSocialPlatform",
  "newsletterSocialSettings",
  "newsletterSourceClients",
  "newsletterVideoSource",
  "newsletterWebFontUrls",
  "visitNewsletterBlocks",
];

export const receivingNewsletterNames = [
  "NEWSLETTER_RECEIVE_LIMITS",
  "parseNewsletterCampaign",
  "parseNewsletterChecks",
  "parseNewsletterDocumentList",
  "parseNewsletterHtmlCheck",
  "parseNewsletterOutreachRecord",
  "parseNewsletterOutreachStage",
  "parseNewsletterPreview",
  "parseNewsletterRecordDiscriminator",
  "parseNewsletterReservedMetadata",
  "parseNewsletterStageReceipt",
];

export const completeNewsletterNames = [
  ...originalNewsletterNames,
  ...receivingNewsletterNames,
].sort();

export function originalNewsletterExports(namespace) {
  return Object.fromEntries(
    originalNewsletterNames.map((name) => [name, namespace[name]]),
  );
}

/** Node's CJS namespace wrappers are not public named exports. */
export function publicNewsletterNames(namespace) {
  return Object.keys(namespace)
    .filter(
      (name) => !["default", "__esModule", "module.exports"].includes(name),
    )
    .sort();
}
